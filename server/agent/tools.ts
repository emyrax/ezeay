import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";
import * as schema from "../../db/schema";
import {
  agentMemories,
  agentPracticeAttempts,
  agentRoutines,
  courseEnrollments,
  courses,
  quizAttempts,
  studyMaterials,
  users,
} from "../../db/schema";
import type { KnowledgeChunk } from "../rag";
import type { TutorCitation } from "../../types/tutor";
import type {
  AgentPendingAction,
  AgentToolName,
  AgentToolSpec,
} from "../../types/agent";
import {
  executeTool,
  listTools,
  type ComposioToolExecutionInput,
} from "../integrations/composio";
import {
  AGENT_TOOLKITS,
  getAgentToolkitActions,
  isAgentToolAllowed,
  type AgentToolkitAction,
} from "../../data/agentToolkitCatalog";
import {
  cleanInt,
  cleanOptionalText,
  cleanStringArray,
  cleanText,
  dedupeCitations,
} from "./sanitize";
import {
  nextRoutineRunAt,
  routineCron,
  sanitizeRoutineInput,
} from "./routines";

export type AgentToolDb = NeonHttpDatabase<typeof schema>;

export interface AgentToolContext {
  userId: string;
  conversationId?: string;
  db: AgentToolDb;
  embed: (text: string) => Promise<number[]>;
  searchKnowledgeChunks: (
    userId: string,
    queryEmbedding: number[],
    sourceTypes: string[],
    sourceIds?: string[],
    limit?: number,
  ) => Promise<KnowledgeChunk[]>;
}

export interface AgentToolOutput {
  ok: boolean;
  summary: string;
  data?: unknown;
  citations?: TutorCitation[];
  error?: string;
  pendingAction?: AgentPendingAction;
}

export interface AgentTool {
  spec: AgentToolSpec;
  normalizeArgs: (raw: unknown) => Record<string, unknown> | null;
  execute: (
    ctx: AgentToolContext,
    args: Record<string, unknown>,
    callId: string,
  ) => Promise<AgentToolOutput>;
}

function citation(title: string, content: string): TutorCitation {
  return {
    quote: cleanText(content, 240),
    source: cleanText(title, 160) || "Study material",
  };
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function cleanScheduleDate(value: unknown): string | null {
  const text = cleanText(value, 10);
  if (!DATE_PATTERN.test(text)) return null;
  const date = new Date(`${text}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10) === text ? text : null;
}

function cleanScheduleTime(value: unknown): string | null {
  const text = cleanText(value, 5);
  return TIME_PATTERN.test(text) ? text : null;
}

function optionalInt(value: unknown, min: number, max: number): number | null {
  if (value === undefined || value === null || value === "") return null;
  return cleanInt(value, min, max);
}

function normalizeScheduleTasks(
  value: unknown,
): { date: string; title: string; time?: string; durationMinutes?: number; subject?: string; notes?: string }[] {
  if (!Array.isArray(value)) return [];
  const tasks: {
    date: string;
    title: string;
    time?: string;
    durationMinutes?: number;
    subject?: string;
    notes?: string;
  }[] = [];
  const seen = new Set<string>();

  for (const item of value.slice(0, 60)) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const raw = item as Record<string, unknown>;
    const date = cleanScheduleDate(raw.date);
    const title = cleanText(raw.title, 200);
    if (!date || title.length < 2) continue;
    const time = cleanScheduleTime(raw.time) ?? undefined;
    const durationMinutes = optionalInt(raw.durationMinutes, 5, 240) ?? undefined;
    const subject = cleanOptionalText(raw.subject, 80) ?? undefined;
    const notes = cleanOptionalText(raw.notes, 500) ?? undefined;
    const key = `${date}|${time ?? ""}|${title.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    tasks.push({ date, title, time, durationMinutes, subject, notes });
  }

  return tasks;
}

const REMEMBER_KINDS = new Set(["fact", "preference", "goal"]);

const savePlan: AgentTool = {
  spec: {
    name: "save_plan",
    label: "Build a study schedule",
    description:
      "Prepare dated study sessions for the learner's local Schedule. This action always waits for the learner's approval before anything is saved.",
    scope: "schedule",
    approval: "confirm",
    execution: "client",
    parameters: {
      type: "object",
      properties: {
        tasks: {
          type: "array",
          maxItems: 60,
          minItems: 1,
          items: {
            type: "object",
            properties: {
              date: { type: "string", description: "Date in YYYY-MM-DD format." },
              title: { type: "string", maxLength: 200 },
              time: { type: "string", description: "Optional start time in HH:MM format." },
              durationMinutes: { type: "integer", minimum: 5, maximum: 240 },
              subject: { type: "string", maxLength: 80 },
              notes: { type: "string", maxLength: 500 },
            },
            required: ["date", "title"],
            additionalProperties: false,
          },
        },
        reminderMinutes: {
          type: "integer",
          minimum: 0,
          maximum: 1440,
          description: "Optional reminder lead time. Only add one when the learner asks for reminders.",
        },
      },
      required: ["tasks"],
      additionalProperties: false,
    },
  },
  normalizeArgs(raw) {
    if (!raw || typeof raw !== "object") return null;
    const args = raw as Record<string, unknown>;
    const tasks = normalizeScheduleTasks(args.tasks);
    if (tasks.length === 0) return null;
    return {
      target: "local",
      tasks,
      reminderMinutes: optionalInt(args.reminderMinutes, 0, 1440),
    };
  },
  async execute() {
    return {
      ok: false,
      summary: "This schedule change needs the learner's approval.",
      error: "approval_required",
    };
  },
};

const updateScheduleTask: AgentTool = {
  spec: {
    name: "update_schedule_task",
    label: "Update a scheduled task",
    description:
      "Prepare a change to one existing task in the learner's local Schedule. This action always waits for approval.",
    scope: "schedule",
    approval: "confirm",
    execution: "client",
    parameters: {
      type: "object",
      properties: {
        taskId: { type: "string", maxLength: 80 },
        date: { type: "string", description: "New date in YYYY-MM-DD format." },
        title: { type: "string", maxLength: 200 },
        time: { type: ["string", "null"], description: "New start time in HH:MM format, or null to clear it." },
        durationMinutes: { type: ["integer", "null"], minimum: 5, maximum: 240 },
        subject: { type: ["string", "null"], maxLength: 80 },
        notes: { type: ["string", "null"], maxLength: 500 },
      },
      required: ["taskId"],
      additionalProperties: false,
    },
  },
  normalizeArgs(raw) {
    if (!raw || typeof raw !== "object") return null;
    const args = raw as Record<string, unknown>;
    const taskId = cleanText(args.taskId, 80);
    if (!taskId) return null;
    const updates: Record<string, unknown> = { taskId };

    if ("date" in args) {
      const date = cleanScheduleDate(args.date);
      if (!date) return null;
      updates.date = date;
    }
    if ("title" in args) {
      const title = cleanText(args.title, 200);
      if (title.length < 2) return null;
      updates.title = title;
    }
    if ("time" in args) {
      if (args.time === null || args.time === "") {
        updates.time = null;
      } else {
        const time = cleanScheduleTime(args.time);
        if (!time) return null;
        updates.time = time;
      }
    }
    if ("durationMinutes" in args) {
      updates.durationMinutes =
        args.durationMinutes === null || args.durationMinutes === ""
          ? null
          : optionalInt(args.durationMinutes, 5, 240);
    }
    if ("subject" in args) {
      updates.subject =
        args.subject === null ? null : cleanOptionalText(args.subject, 80);
    }
    if ("notes" in args) {
      updates.notes =
        args.notes === null ? null : cleanOptionalText(args.notes, 500);
    }

    return Object.keys(updates).length > 1 ? updates : null;
  },
  async execute() {
    return {
      ok: false,
      summary: "This schedule change needs the learner's approval.",
      error: "approval_required",
    };
  },
};

const cancelScheduleTask: AgentTool = {
  spec: {
    name: "cancel_schedule_task",
    label: "Remove scheduled tasks",
    description:
      "Prepare removal of one or more tasks from the learner's local Schedule. This action always waits for approval.",
    scope: "schedule",
    approval: "confirm",
    execution: "client",
    parameters: {
      type: "object",
      properties: {
        taskIds: {
          type: "array",
          minItems: 1,
          maxItems: 60,
          items: { type: "string" },
        },
      },
      required: ["taskIds"],
      additionalProperties: false,
    },
  },
  normalizeArgs(raw) {
    if (!raw || typeof raw !== "object") return null;
    const args = raw as Record<string, unknown>;
    const taskIds = cleanStringArray(args.taskIds, 60, 80);
    if (taskIds.length === 0) return null;
    return { taskIds };
  },
  async execute() {
    return {
      ok: false,
      summary: "This schedule change needs the learner's approval.",
      error: "approval_required",
    };
  },
};

const saveRoutine: AgentTool = {
  spec: {
    name: "save_routine",
    label: "Schedule an agent routine",
    description:
      "Create a recurring study routine that the agent runs automatically. This action always waits for the learner's approval.",
    scope: "routines",
    approval: "confirm",
    execution: "server",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", minLength: 2, maxLength: 80 },
        prompt: {
          type: "string",
          minLength: 10,
          maxLength: 2000,
          description: "What the routine should do each time it runs.",
        },
        frequency: { type: "string", enum: ["daily", "weekly"] },
        time: {
          type: "string",
          description: "Local run time in HH:MM 24-hour format.",
        },
        days: {
          type: "array",
          maxItems: 7,
          items: { type: "integer", minimum: 0, maximum: 6 },
          description: "Weekdays for weekly routines. Sunday is 0.",
        },
        timezone: {
          type: "string",
          description: "IANA timezone, for example Africa/Lagos.",
        },
        toolScopes: {
          type: "array",
          maxItems: 6,
          items: {
            type: "string",
            enum: [
              "materials",
              "progress",
              "papers",
              "memory",
              "schedule",
              "routines",
            ],
          },
        },
      },
      required: ["title", "prompt", "frequency", "time"],
      additionalProperties: false,
    },
  },
  normalizeArgs(raw) {
    const input = sanitizeRoutineInput(raw);
    if (
      !input?.title ||
      !input.prompt ||
      !input.frequency ||
      !input.time
    ) {
      return null;
    }
    return input as Record<string, unknown>;
  },
  async execute(ctx, args) {
    const input = sanitizeRoutineInput(args);
    if (!input?.title || !input.prompt || !input.frequency || !input.time) {
      return {
        ok: false,
        summary: "The routine details were incomplete.",
        error: "invalid_arguments",
      };
    }
    const timezone = input.timezone ?? "Africa/Lagos";
    const nextRunAt = nextRoutineRunAt({
      frequency: input.frequency,
      time: input.time,
      days: input.days,
      timeZone: timezone,
    });
    const [row] = await ctx.db
      .insert(agentRoutines)
      .values({
        userId: ctx.userId,
        title: input.title,
        prompt: input.prompt,
        scheduleCron: routineCron({
          frequency: input.frequency,
          time: input.time,
          days: input.days,
        }),
        timezone,
        toolScopes: input.toolScopes ?? [],
        enabled: true,
        nextRunAt,
      })
      .returning({ id: agentRoutines.id, nextRunAt: agentRoutines.nextRunAt });
    return {
      ok: true,
      summary: `${input.title} is scheduled for ${nextRunAt.toISOString()}.`,
      data: { routineId: row?.id ?? null, nextRunAt: row?.nextRunAt ?? null },
    };
  },
};

const rememberFact: AgentTool = {
  spec: {
    name: "remember_fact",
    label: "Save a learner fact",
    description:
      "Save a durable fact, preference, or goal the learner explicitly wants remembered across conversations.",
    scope: "memory",
    approval: "auto",
    parameters: {
      type: "object",
      properties: {
        kind: {
          type: "string",
          enum: ["fact", "preference", "goal"],
        },
        content: {
          type: "string",
          minLength: 3,
          maxLength: 400,
          description: "A short, self-contained statement about the learner.",
        },
      },
      required: ["kind", "content"],
      additionalProperties: false,
    },
  },
  normalizeArgs(raw) {
    if (!raw || typeof raw !== "object") return null;
    const args = raw as Record<string, unknown>;
    const content = cleanText(args.content, 400);
    if (content.length < 3) return null;
    const kind = cleanText(args.kind, 40).toLowerCase();
    return {
      kind: REMEMBER_KINDS.has(kind) ? kind : "fact",
      content,
    };
  },
  async execute(ctx, args) {
    const kind = cleanText(args.kind, 40);
    const content = cleanText(args.content, 400);
    if (!content) {
      return {
        ok: false,
        summary: "There was no fact to remember.",
        error: "invalid_arguments",
      };
    }

    const [existing] = await ctx.db
      .select({ id: agentMemories.id })
      .from(agentMemories)
      .where(
        and(eq(agentMemories.userId, ctx.userId), eq(agentMemories.content, content)),
      )
      .limit(1);

    if (existing) {
      await ctx.db
        .update(agentMemories)
        .set({ kind, updatedAt: new Date() })
        .where(eq(agentMemories.id, existing.id));
      return {
        ok: true,
        summary: "I already remembered that.",
        data: { memoryId: existing.id },
      };
    }

    const [row] = await ctx.db
      .insert(agentMemories)
      .values({
        userId: ctx.userId,
        kind,
        content,
        sourceConversationId: ctx.conversationId ?? null,
      })
      .returning({ id: agentMemories.id });

    return {
      ok: true,
      summary: "I saved that to your learner memory.",
      data: { memoryId: row?.id ?? null },
    };
  },
};

const searchMaterials: AgentTool = {
  spec: {
    name: "search_materials",
    label: "Search materials",
    description:
      "Search the learner's uploaded study materials and notes for passages relevant to a question.",
    scope: "materials",
    approval: "auto",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "A short topic or question to search for.",
          maxLength: 300,
        },
        materialIds: {
          type: "array",
          items: { type: "string" },
          maxItems: 10,
          description: "Optional material ids to search within.",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 8,
          description: "Maximum number of passages to return.",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  normalizeArgs(raw) {
    if (!raw || typeof raw !== "object") return null;
    const args = raw as Record<string, unknown>;
    const query = cleanText(args.query, 300);
    if (query.length < 2) return null;
    return {
      query,
      materialIds: cleanStringArray(args.materialIds, 10, 80),
      limit: cleanInt(args.limit, 1, 8) ?? 5,
    };
  },
  async execute(ctx, args) {
    const query = cleanText(args.query, 300);
    const materialIds = cleanStringArray(args.materialIds, 10, 80);
    const limit = cleanInt(args.limit, 1, 8) ?? 5;

    let chunks: KnowledgeChunk[] = [];
    const queryEmbedding = await ctx.embed(query).catch(() => null);
    if (queryEmbedding) {
      chunks = await ctx.searchKnowledgeChunks(
        ctx.userId,
        queryEmbedding,
        ["material"],
        materialIds.length > 0 ? materialIds : undefined,
        limit,
      );
    }

    if (chunks.length === 0) {
      const pattern = `%${query}%`;
      const rows = await ctx.db
        .select({
          id: studyMaterials.id,
          title: studyMaterials.title,
          summary: studyMaterials.summary,
          extractedContent: studyMaterials.extractedContent,
        })
        .from(studyMaterials)
        .where(
          materialIds.length > 0
            ? and(
                eq(studyMaterials.userId, ctx.userId),
                or(
                  ilike(studyMaterials.title, pattern),
                  ilike(studyMaterials.extractedContent, pattern),
                ),
                inArray(studyMaterials.id, materialIds),
              )
            : and(
                eq(studyMaterials.userId, ctx.userId),
                or(
                  ilike(studyMaterials.title, pattern),
                  ilike(studyMaterials.extractedContent, pattern),
                ),
              ),
        )
        .limit(limit);

      chunks = rows
        .map((row) => ({
          id: `search_${row.id}`,
          title: row.title,
          content: cleanText(row.summary || row.extractedContent || "", 2000),
          sourceType: "material",
          sourceId: row.id,
        }))
        .filter((chunk) => chunk.content.length > 0);
    }

    const unique = new Map<string, KnowledgeChunk>();
    for (const chunk of chunks) {
      if (!chunk.content.trim()) continue;
      unique.set(`${chunk.sourceId}:${chunk.content.slice(0, 80)}`, chunk);
    }
    const results = [...unique.values()].slice(0, limit);

    if (results.length === 0) {
      return {
        ok: true,
        summary: "No matching passages were found in the learner's materials.",
        data: { materials: [] },
      };
    }

    return {
      ok: true,
      summary: `Found ${results.length} relevant passage${
        results.length === 1 ? "" : "s"
      } in the learner's materials.`,
      data: {
        materials: results.map((chunk) => ({
          materialId: chunk.sourceId,
          title: chunk.title,
          snippet: cleanText(chunk.content, 500),
        })),
      },
      citations: dedupeCitations(results.map((chunk) => citation(chunk.title, chunk.content))),
    };
  },
};

const getProgress: AgentTool = {
  spec: {
    name: "get_progress",
    label: "Check progress",
    description:
      "Check the learner's XP, streak, course progress, recent quiz scores, and recent practice attempts.",
    scope: "progress",
    approval: "auto",
    parameters: {
      type: "object",
      properties: {
        courseId: {
          type: "string",
          description: "Optional course id to focus on.",
          maxLength: 80,
        },
      },
      additionalProperties: false,
    },
  },
  normalizeArgs(raw) {
    if (!raw || typeof raw !== "object") return {};
    const args = raw as Record<string, unknown>;
    return { courseId: cleanOptionalText(args.courseId, 80) };
  },
  async execute(ctx, args) {
    const courseId = cleanOptionalText(args.courseId, 80);

    const [user] = await ctx.db
      .select({
        displayName: users.displayName,
        xp: users.xp,
        coins: users.coins,
        gamingLevel: users.gamingLevel,
        rank: users.rank,
        currentStreak: users.currentStreak,
        longestStreak: users.longestStreak,
      })
      .from(users)
      .where(eq(users.id, ctx.userId))
      .limit(1);

    if (!user) {
      return {
        ok: false,
        summary: "No learner profile was found.",
        error: "profile_not_found",
      };
    }

    const enrollments = await ctx.db
      .select({
        courseId: courseEnrollments.courseId,
        courseTitle: courses.title,
        progress: courseEnrollments.progress,
        isCompleted: courseEnrollments.isCompleted,
        lastAccessedAt: courseEnrollments.lastAccessedAt,
      })
      .from(courseEnrollments)
      .innerJoin(courses, eq(courses.id, courseEnrollments.courseId))
      .where(
        courseId
          ? and(
              eq(courseEnrollments.userId, ctx.userId),
              eq(courseEnrollments.courseId, courseId),
            )
          : eq(courseEnrollments.userId, ctx.userId),
      )
      .orderBy(desc(courseEnrollments.lastAccessedAt))
      .limit(8);

    const recentQuizzes = await ctx.db
      .select({
        materialId: quizAttempts.materialId,
        correct: quizAttempts.correct,
        total: quizAttempts.total,
        scorePct: quizAttempts.scorePct,
        createdAt: quizAttempts.createdAt,
      })
      .from(quizAttempts)
      .where(eq(quizAttempts.userId, ctx.userId))
      .orderBy(desc(quizAttempts.createdAt))
      .limit(5);

    const recentPractice = await ctx.db
      .select({
        topic: agentPracticeAttempts.topic,
        examBoard: agentPracticeAttempts.examBoard,
        examYear: agentPracticeAttempts.examYear,
        correct: agentPracticeAttempts.correct,
        total: agentPracticeAttempts.total,
        scorePct: agentPracticeAttempts.scorePct,
        createdAt: agentPracticeAttempts.createdAt,
      })
      .from(agentPracticeAttempts)
      .where(eq(agentPracticeAttempts.userId, ctx.userId))
      .orderBy(desc(agentPracticeAttempts.createdAt))
      .limit(5);

    const activeCourses = enrollments.filter((item) => !item.isCompleted);
    const summaryParts = [
      `${user.displayName || "Learner"} is level ${user.gamingLevel} (${user.rank}) with ${user.xp} XP and a ${user.currentStreak}-day streak.`,
    ];
    if (activeCourses.length > 0) {
      summaryParts.push(
        `Active courses: ${activeCourses
          .slice(0, 3)
          .map((item) => `${item.courseTitle} (${Math.round(item.progress)}%)`)
          .join(", ")}.`,
      );
    }
    if (recentQuizzes.length > 0) {
      summaryParts.push(
        `Recent quiz scores: ${recentQuizzes.map((item) => `${item.scorePct}%`).join(", ")}.`,
      );
    }
    if (recentPractice.length > 0) {
      summaryParts.push(
        `Recent practice scores: ${recentPractice
          .map((item) => `${item.scorePct}%`)
          .join(", ")}.`,
      );
    }

    return {
      ok: true,
      summary: summaryParts.join(" "),
      data: {
        profile: user,
        courses: enrollments,
        recentQuizScores: recentQuizzes,
        recentPracticeScores: recentPractice,
      },
    };
  },
};

const listPapers: AgentTool = {
  spec: {
    name: "list_papers",
    label: "List past papers",
    description:
      "List saved past papers for the learner, optionally filtered by exam board, year, or subject.",
    scope: "papers",
    approval: "auto",
    parameters: {
      type: "object",
      properties: {
        board: {
          type: "string",
          description: "Exam board or curriculum name.",
          maxLength: 60,
        },
        year: { type: "integer", minimum: 1950, maximum: 2100 },
        subject: { type: "string", maxLength: 120 },
        limit: { type: "integer", minimum: 1, maximum: 20 },
      },
      additionalProperties: false,
    },
  },
  normalizeArgs(raw) {
    if (!raw || typeof raw !== "object") return {};
    const args = raw as Record<string, unknown>;
    return {
      board: cleanOptionalText(args.board, 60),
      year: cleanInt(args.year, 1950, 2100),
      subject: cleanOptionalText(args.subject, 120),
      limit: cleanInt(args.limit, 1, 20) ?? 10,
    };
  },
  async execute(ctx, args) {
    const board = cleanOptionalText(args.board, 60);
    const year = cleanInt(args.year, 1950, 2100);
    const subject = cleanOptionalText(args.subject, 120);
    const limit = cleanInt(args.limit, 1, 20) ?? 10;

    const filters = [
      eq(studyMaterials.userId, ctx.userId),
      eq(studyMaterials.isPastPaper, true),
    ];
    if (board) filters.push(eq(studyMaterials.examBoard, board));
    if (year) filters.push(eq(studyMaterials.examYear, year));
    if (subject) filters.push(ilike(studyMaterials.title, `%${subject}%`));

    const rows = await ctx.db
      .select({
        id: studyMaterials.id,
        title: studyMaterials.title,
        examBoard: studyMaterials.examBoard,
        examYear: studyMaterials.examYear,
        paperCode: studyMaterials.paperCode,
        paperType: studyMaterials.paperType,
        durationMinutes: studyMaterials.durationMinutes,
        createdAt: studyMaterials.createdAt,
      })
      .from(studyMaterials)
      .where(and(...filters))
      .orderBy(desc(studyMaterials.examYear), desc(studyMaterials.createdAt))
      .limit(limit);

    if (rows.length === 0) {
      return {
        ok: true,
        summary:
          "No saved past papers matched that request. The learner may not have added past papers yet.",
        data: { papers: [] },
      };
    }

    return {
      ok: true,
      summary: `Found ${rows.length} saved past paper${
        rows.length === 1 ? "" : "s"
      }.`,
      data: {
        papers: rows.map((row) => ({
          materialId: row.id,
          title: row.title,
          board: row.examBoard,
          year: row.examYear,
          paperCode: row.paperCode,
          paperType: row.paperType,
          durationMinutes: row.durationMinutes,
        })),
      },
    };
  },
};

function findAgentToolActionBySlug(slug: string): AgentToolkitAction | null {
  for (const toolkit of AGENT_TOOLKITS) {
    const action = toolkit.actions.find((item) => item.slug === slug);
    if (action) {
      return { ...action, toolkit: toolkit.id };
    }
  }
  return null;
}

const listConnectedActions: AgentTool = {
  spec: {
    name: "list_connected_actions",
    label: "List connected actions",
    description: "List study-related tools available through connected accounts.",
    scope: "memory",
    approval: "auto",
    parameters: {
      type: "object",
      properties: {
        toolkit: { type: "string", maxLength: 80 },
        action: { type: "string", maxLength: 120 },
      },
      additionalProperties: false,
    },
  },
  normalizeArgs(raw) {
    if (!raw || typeof raw !== "object") return {};
    const args = raw as Record<string, unknown>;
    return {
      toolkit:
        typeof args.toolkit === "string" && args.toolkit.trim()
          ? args.toolkit.trim()
          : undefined,
      action:
        typeof args.action === "string" && args.action.trim()
          ? args.action.trim()
          : undefined,
    };
  },
  async execute(_ctx, args) {
    const toolkit = typeof args.toolkit === "string" ? args.toolkit : undefined;
    const action = typeof args.action === "string" ? args.action : undefined;
    const tools = await listTools({
      toolkitSlugs: toolkit ? [toolkit] : undefined,
      search: action,
    });
    const actions = tools.slice(0, 20).map((tool) => ({
      slug: tool.slug,
      description: tool.description ?? "",
      toolkit:
        typeof tool.toolkit === "string"
          ? tool.toolkit
          : tool.toolkit?.slug ?? "",
    }));
    return {
      ok: true,
      summary: `Found ${actions.length} connected study actions.`,
      data: { actions },
    };
  },
};

const runConnectedAction: AgentTool = {
  spec: {
    name: "run_connected_action",
    label: "Run connected action",
    description: "Run an allowlisted connected action for a study task.",
    scope: "memory",
    approval: "confirm",
    parameters: {
      type: "object",
      properties: {
        toolSlug: { type: "string", maxLength: 160 },
        connectedAccountId: { type: "string", maxLength: 128 },
        toolkit: { type: "string", maxLength: 80 },
        userId: { type: "string", maxLength: 128 },
        version: { type: "string", maxLength: 40 },
        arguments: { type: "object", additionalProperties: true },
        text: { type: "string", maxLength: 2000 },
      },
      required: ["toolSlug"],
      additionalProperties: false,
    },
  },
  normalizeArgs(raw) {
    if (!raw || typeof raw !== "object") return null;
    const args = raw as Record<string, unknown>;
    const toolSlug = typeof args.toolSlug === "string" ? args.toolSlug.trim() : "";
    if (!toolSlug) return null;
    return {
      toolSlug,
      connectedAccountId:
        typeof args.connectedAccountId === "string"
          ? args.connectedAccountId
          : undefined,
      toolkit: typeof args.toolkit === "string" ? args.toolkit : undefined,
      userId: typeof args.userId === "string" ? args.userId : undefined,
      version: typeof args.version === "string" ? args.version : undefined,
      arguments:
        typeof args.arguments === "object" &&
        args.arguments !== null &&
        !Array.isArray(args.arguments)
          ? (args.arguments as Record<string, unknown>)
          : undefined,
      text: typeof args.text === "string" ? args.text : undefined,
    };
  },
  async execute(ctx, args) {
    const toolSlug = typeof args.toolSlug === "string" ? args.toolSlug : "";
    const tool = toolSlug ? findAgentToolActionBySlug(toolSlug) : null;
    if (!tool) {
      return {
        ok: false,
        summary: "The requested action is not allowlisted.",
        error: "tool_not_allowlisted",
      };
    }
    if (!isAgentToolAllowed(tool.toolkit, tool.action)) {
      return {
        ok: false,
        summary: "The requested action is not allowlisted.",
        error: "tool_not_allowlisted",
      };
    }

    const connectedAccountId = typeof args.connectedAccountId === "string" ? args.connectedAccountId : undefined;
    const userId = typeof args.userId === "string" ? args.userId : undefined;
    const version = typeof args.version === "string" ? args.version : undefined;
    const actionArguments = typeof args.arguments === "object" && args.arguments !== null && !Array.isArray(args.arguments) ? (args.arguments as Record<string, unknown>) : undefined;
    const text = typeof args.text === "string" ? args.text : undefined;

    const result = await executeTool({
      toolSlug: tool.slug,
      connectedAccountId,
      userId: userId ?? ctx.userId,
      version,
      arguments: actionArguments,
      text,
    });

    return {
      ok: result.successful,
      summary: result.successful
        ? "The connected action completed."
        : result.error ?? "The connected action failed.",
      data: result,
      error: result.successful
        ? undefined
        : result.error ?? "tool_execution_failed",
    };
  },
};

export const AGENT_TOOLS: AgentTool[] = [
  searchMaterials,
  getProgress,
  listPapers,
  rememberFact,
  savePlan,
  saveRoutine,
  updateScheduleTask,
  cancelScheduleTask,
  listConnectedActions,
  runConnectedAction,
];

export function getAgentTool(name: AgentToolName): AgentTool | null {
  return AGENT_TOOLS.find((tool) => tool.spec.name === name) ?? null;
}

export function getAgentToolSpecs(enabled: boolean): AgentToolSpec[] {
  return enabled ? AGENT_TOOLS.map((tool) => tool.spec) : [];
}
