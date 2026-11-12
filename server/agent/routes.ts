import type { Express, Request, Response } from "express";
import { and, count, desc, eq, gte, inArray, isNull } from "drizzle-orm";
import {
  agentProfiles,
  agentToolRuns,
  tutorConversations,
  tutorMessages,
  tutorPreferences,
} from "../../db/schema";
import type {
  AgentChatResponse,
  AgentPendingAction,
  AgentScheduleContext,
  AgentStep,
  AgentToolName,
} from "../../types/agent";
import type { TutorMessage, TutorMessageAttachment } from "../../types/tutor";
import type { GenerateTextArgs } from "../../lib/providers/generateText";
import { buildAgentSystemPrompt } from "./prompts";
import { runAgent } from "./run";
import { loadAgentMemories, loadTaggedMemoryFiles } from "./memory";
import { registerAgentApprovalRoutes } from "./approvals";
import { registerAgentHistoryRoutes } from "./history";
import { registerAgentIntegrationRoutes } from "./integrations";
import { registerAgentMemoryRoutes } from "./memoryRoutes";
import { registerAgentProfileRoutes } from "./profiles";
import { registerAgentRoutineRoutes } from "./routines";
import { cleanInt, cleanText } from "./sanitize";
import {
  deriveTitle,
  isUuid,
  normalizeMode,
  normalizePersona,
  sanitizeExamType,
  sanitizeHistory,
  sanitizeMaterialIds,
  sanitizeMemoryIds,
  sanitizeMessage,
  sanitizeNoteTexts,
} from "../tutor/sanitize";
import { collectContexts } from "../tutor/context";
import {
  AGENT_TOOLS,
  type AgentTool,
  type AgentToolContext,
  type AgentToolDb,
} from "./tools";
import type { KnowledgeChunk } from "../rag";

const DEFAULT_DAILY_LIMIT = 30;
const DEFAULT_DAILY_TOOL_LIMIT = 20;

type ConversationRow = typeof tutorConversations.$inferSelect;
type MessageRow = typeof tutorMessages.$inferSelect;

export interface AgentRouteDeps {
  db: AgentToolDb;
  verifyClerkToken: (authHeader: string | undefined) => Promise<{ sub: string }>;
  aiRequestOptions: (req: Request) => { modelRef: string; apiKey?: string };
  sendRouteError: (res: Response, err: unknown, label?: string) => void;
  generateJsonContent: <T>(
    modelRef: string,
    prompt: string,
    apiKey?: string,
  ) => Promise<T>;
  generateText: (args: GenerateTextArgs) => Promise<string>;
  embed: (text: string) => Promise<number[]>;
  searchKnowledgeChunks: (
    userId: string,
    queryEmbedding: number[],
    sourceTypes: string[],
    sourceIds?: string[],
    limit?: number,
  ) => Promise<KnowledgeChunk[]>;
}

function toMessage(row: MessageRow): TutorMessage {
  return {
    id: row.id,
    conversationId: row.conversationId,
    role: row.role === "user" ? "user" : "assistant",
    kind: row.kind === "quiz" || row.kind === "plan" ? row.kind : "chat",
    content: row.content,
    citations: Array.isArray(row.citations) ? row.citations : [],
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    model: row.model,
    createdAt: row.createdAt.toISOString(),
  };
}

function toAttachment(row: {
  id: string;
  kind: string;
  content: string;
  fileName: string | null;
  mimeType: string | null;
  fileUrl: string | null;
  sizeBytes: number | null;
}): TutorMessageAttachment {
  return {
    id: row.id,
    label: row.fileName || row.content.slice(0, 80) || row.kind,
    fileName: row.fileName ?? undefined,
    mimeType: row.mimeType ?? undefined,
    url: row.fileUrl ?? undefined,
    sizeBytes: row.sizeBytes ?? undefined,
  };
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : fallback;
}

function toolLimit(): number {
  return positiveInt(process.env.AGENT_DAILY_TOOL_LIMIT, DEFAULT_DAILY_TOOL_LIMIT);
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function isCalendarDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function sanitizeScheduleContext(value: unknown): AgentScheduleContext[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const tasks: AgentScheduleContext[] = [];

  for (const item of value.slice(0, 60)) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const raw = item as Record<string, unknown>;
    const id = cleanText(raw.id, 80);
    const date = cleanText(raw.date, 10);
    const title = cleanText(raw.title, 200);
    if (!id || !isCalendarDate(date) || title.length < 2 || seen.has(id)) {
      continue;
    }
    const time = TIME_PATTERN.test(cleanText(raw.time, 5))
      ? cleanText(raw.time, 5)
      : null;
    const durationMinutes = cleanInt(raw.durationMinutes, 5, 240);
    const subject = cleanText(raw.subject, 80);
    seen.add(id);
    tasks.push({
      id,
      date,
      title,
      time: time ?? undefined,
      durationMinutes: durationMinutes ?? undefined,
      subject: subject || undefined,
    });
  }

  return tasks.sort((a, b) =>
    `${a.date}T${a.time ?? "24:00"}`.localeCompare(
      `${b.date}T${b.time ?? "24:00"}`,
    ),
  );
}

function pendingActionSummary(
  tool: AgentToolName,
  args: Record<string, unknown>,
): string {
  if (tool === "save_plan" && Array.isArray(args.tasks)) {
    const count = args.tasks.length;
    return `${count} study session${count === 1 ? "" : "s"} ready to add to your Schedule.`;
  }
  if (tool === "update_schedule_task") {
    const title = cleanText(args.title, 200);
    return title
      ? `Change "${title}" in your Schedule.`
      : "Change a task in your Schedule.";
  }
  if (tool === "cancel_schedule_task" && Array.isArray(args.taskIds)) {
    const count = args.taskIds.length;
    return `Remove ${count} task${count === 1 ? "" : "s"} from your Schedule.`;
  }
  return "Review this schedule change.";
}

async function loadPreferences(deps: AgentRouteDeps, userId: string) {
  const [row] = await deps.db
    .select()
    .from(tutorPreferences)
    .where(eq(tutorPreferences.userId, userId))
    .limit(1);

  return {
    persona: normalizePersona(row?.persona),
    instructions: row?.instructions ?? "",
    examType: row?.examType ?? "",
    dailyMessageLimit: row?.dailyMessageLimit ?? DEFAULT_DAILY_LIMIT,
    dailyToolLimit: row?.dailyToolLimit ?? DEFAULT_DAILY_TOOL_LIMIT,
  };
}

async function requireConversation(
  deps: AgentRouteDeps,
  userId: string,
  conversationId: string,
): Promise<ConversationRow | null> {
  const [row] = await deps.db
    .select()
    .from(tutorConversations)
    .where(
      and(
        eq(tutorConversations.id, conversationId),
        eq(tutorConversations.userId, userId),
        isNull(tutorConversations.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

async function loadAgentProfile(
  deps: AgentRouteDeps,
  userId: string,
  agentId: unknown,
) {
  if (!isUuid(agentId)) return null;
  const [row] = await deps.db
    .select({
      id: agentProfiles.id,
      name: agentProfiles.name,
      persona: agentProfiles.persona,
      instructions: agentProfiles.instructions,
    })
    .from(agentProfiles)
    .where(and(eq(agentProfiles.id, agentId), eq(agentProfiles.userId, userId)))
    .limit(1);
  return row ?? null;
}

async function countMessagesToday(
  deps: AgentRouteDeps,
  userId: string,
): Promise<number> {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const [row] = await deps.db
    .select({ total: count() })
    .from(tutorMessages)
    .where(
      and(
        eq(tutorMessages.userId, userId),
        eq(tutorMessages.role, "user"),
        gte(tutorMessages.createdAt, start),
      ),
    );
  return Number(row?.total ?? 0);
}

async function countToolRunsToday(
  deps: AgentRouteDeps,
  userId: string,
): Promise<number> {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const [row] = await deps.db
    .select({ total: count() })
    .from(agentToolRuns)
    .where(
      and(eq(agentToolRuns.userId, userId), gte(agentToolRuns.createdAt, start)),
    );
  return Number(row?.total ?? 0);
}

async function loadHistory(
  deps: AgentRouteDeps,
  userId: string,
  conversationId: string,
) {
  const rows = await deps.db
    .select()
    .from(tutorMessages)
    .where(
      and(
        eq(tutorMessages.conversationId, conversationId),
        eq(tutorMessages.userId, userId),
      ),
    )
    .orderBy(desc(tutorMessages.createdAt))
    .limit(14);
  return sanitizeHistory(
    rows
      .reverse()
      .map((row) => ({ role: row.role, content: row.content })),
  );
}

function buildToolMap(
  deps: AgentRouteDeps,
  userId: string,
  conversationId: string,
  runIds: string[],
): Map<AgentToolName, AgentTool> {
  const map = new Map<AgentToolName, AgentTool>();
  const staged = new Map<
    string,
    Awaited<ReturnType<AgentTool["execute"]>>
  >();
  for (const base of AGENT_TOOLS) {
    map.set(base.spec.name, {
      ...base,
      async execute(ctx, args, callId) {
        if (base.spec.approval === "confirm") {
          const key = `${base.spec.name}:${JSON.stringify(args)}`;
          const existing = staged.get(key);
          if (existing) return existing;

          const summary = pendingActionSummary(base.spec.name, args);
          const [run] = await deps.db
            .insert(agentToolRuns)
            .values({
              userId,
              conversationId,
              tool: base.spec.name,
              args,
              status: "pending",
              approval: "confirm",
              result: { ok: true, staged: true, summary },
            })
            .returning({
              id: agentToolRuns.id,
              createdAt: agentToolRuns.createdAt,
            });
          if (!run) throw new Error("Could not stage the schedule action.");
          runIds.push(run.id);

          const pendingAction: AgentPendingAction = {
            id: run.id,
            tool: base.spec.name,
            label: base.spec.label,
            summary,
            args,
            execution: base.spec.execution ?? "server",
            createdAt: run.createdAt.toISOString(),
          };
          const output = {
            ok: true,
            summary,
            data: { staged: true },
            pendingAction,
          };
          staged.set(key, output);
          return output;
        }

        const [run] = await deps.db
          .insert(agentToolRuns)
          .values({
            userId,
            conversationId,
            tool: base.spec.name,
            args,
            status: "running",
            approval: base.spec.approval,
          })
          .returning({ id: agentToolRuns.id });
        if (run) runIds.push(run.id);

        try {
          const output = await base.execute(ctx, args, callId);
          if (run) {
            await deps.db
              .update(agentToolRuns)
              .set({
                status: output.ok ? "success" : "error",
                result: {
                  summary: output.summary,
                  ok: output.ok,
                  data: output.data ?? null,
                },
                error: output.error ?? null,
              })
              .where(eq(agentToolRuns.id, run.id));
          }
          return output;
        } catch (err) {
          if (run) {
            await deps.db
              .update(agentToolRuns)
              .set({
                status: "error",
                error: (err instanceof Error ? err.message : String(err)).slice(0, 1000),
              })
              .where(eq(agentToolRuns.id, run.id));
          }
          throw err;
        }
      },
    });
  }
  return map;
}

export function registerAgentRoutes(app: Express, deps: AgentRouteDeps): void {
  app.post("/api/agent/chat", async (req, res) => {
    try {
      const claims = await deps.verifyClerkToken(req.headers.authorization);
      const userId = claims.sub;
      const message = sanitizeMessage(req.body?.message);
      if (!message) {
        res.status(400).json({ error: "Missing required field: message" });
        return;
      }

      const mode = normalizeMode(req.body?.mode);
      const requestedPersona = req.body?.persona
        ? normalizePersona(req.body.persona)
        : null;
      const requestedAgentId = req.body?.agentId;
      if (
        requestedAgentId !== undefined &&
        requestedAgentId !== null &&
        !isUuid(requestedAgentId)
      ) {
        res.status(400).json({ error: "Invalid agent id" });
        return;
      }
      const materialIds = sanitizeMaterialIds(req.body?.materialIds);
      const memoryIds = sanitizeMemoryIds(req.body?.memoryIds);
      const noteTexts = sanitizeNoteTexts(req.body?.noteTexts);
      const scheduleContext = sanitizeScheduleContext(req.body?.schedule);
      const conversationId = req.body?.conversationId;
      let conversation: ConversationRow | null = null;

      if (conversationId !== undefined && conversationId !== null) {
        if (!isUuid(conversationId)) {
          res.status(400).json({ error: "Invalid conversation id" });
          return;
        }
        conversation = await requireConversation(deps, userId, conversationId);
        if (!conversation) {
          res.status(404).json({ error: "Conversation not found" });
          return;
        }
      }

      const [requestedAgent, conversationAgent] = await Promise.all([
        loadAgentProfile(deps, userId, requestedAgentId),
        conversation?.agentProfileId
          ? loadAgentProfile(deps, userId, conversation.agentProfileId)
          : Promise.resolve(null),
      ]);
      if (requestedAgentId && !requestedAgent) {
        res.status(404).json({ error: "Agent not found" });
        return;
      }
      const agent = requestedAgent ?? conversationAgent;

      const preferences = await loadPreferences(deps, userId);
      const persona =
        requestedPersona ??
        (agent ? normalizePersona(agent.persona) : null) ??
        (conversation ? normalizePersona(conversation.persona) : null) ??
        preferences.persona;
      const examType =
        req.body?.examType === undefined
          ? preferences.examType
          : sanitizeExamType(req.body.examType);

      const messagesToday = await countMessagesToday(deps, userId);
      if (messagesToday >= preferences.dailyMessageLimit) {
        res.status(429).json({
          error: `You have reached today's study agent limit (${preferences.dailyMessageLimit} messages). Try again tomorrow.`,
        });
        return;
      }

      if (!conversation) {
        const [created] = await deps.db
          .insert(tutorConversations)
          .values({
            userId,
            agentProfileId: agent?.id ?? null,
            title: deriveTitle(message),
            persona,
            mode,
          })
          .returning();
        conversation = created;
      }

      if (!conversation) {
        res.status(500).json({ error: "Could not create the conversation." });
        return;
      }

      const history = await loadHistory(deps, userId, conversation.id);
      const taggedMemoryFiles = await loadTaggedMemoryFiles(
        deps.db,
        userId,
        memoryIds,
      );
      const taggedAttachments = taggedMemoryFiles.map(toAttachment);
      const taggedNoteTexts = taggedMemoryFiles.map((memory) => ({
        title: memory.fileName || memory.kind || "Tagged file",
        content: memory.extractedText || memory.content,
      }));
      const mergedNoteTexts = [...noteTexts, ...taggedNoteTexts].slice(0, 20);
      const { contexts } = await collectContexts(
        {
          db: deps.db,
          embed: deps.embed,
          searchKnowledgeChunks: deps.searchKnowledgeChunks,
        },
        userId,
        message,
        materialIds,
        mergedNoteTexts,
      );
      const memories = await loadAgentMemories(deps.db, userId);
      const system = buildAgentSystemPrompt({
        persona,
        agentName: agent?.name,
        examType,
        mode,
        instructions: agent?.instructions || preferences.instructions,
        memories,
        contexts,
        schedule: scheduleContext,
      });
      const initialCitations = contexts.slice(0, 5).map((context) => ({
        quote: context.content.slice(0, 240),
        source: context.title,
      }));

      const [userRow] = await deps.db
        .insert(tutorMessages)
        .values({
          conversationId: conversation.id,
          userId,
          role: "user",
          kind: "chat",
          content: message,
          attachments: taggedAttachments,
        })
        .returning();
      if (!userRow) {
        res.status(500).json({ error: "Could not save your message." });
        return;
      }

      await deps.db
        .update(tutorConversations)
        .set({
          updatedAt: new Date(),
          persona,
          agentProfileId: agent?.id ?? conversation.agentProfileId ?? null,
        })
        .where(eq(tutorConversations.id, conversation.id));

      const toolsEnabled = process.env.AGENT_TOOLS_ENABLED === "true";
      const usedToolRuns = toolsEnabled ? await countToolRunsToday(deps, userId) : 0;
      const remainingToolCalls = toolsEnabled
        ? Math.max(
            Math.min(preferences.dailyToolLimit, toolLimit()) - usedToolRuns,
            0,
          )
        : 0;

      const runIds: string[] = [];
      const tools =
        remainingToolCalls > 0
          ? buildToolMap(deps, userId, conversation.id, runIds)
          : new Map<AgentToolName, AgentTool>();
      const toolContext: AgentToolContext = {
        userId,
        conversationId: conversation.id,
        db: deps.db,
        embed: deps.embed,
        searchKnowledgeChunks: deps.searchKnowledgeChunks,
      };
      const ai = deps.aiRequestOptions(req);
      const stream = req.body?.stream === true;

      const execute = async (onStep?: (step: AgentStep) => void) =>
        runAgent(
          {
            modelRef: ai.modelRef,
            apiKey: ai.apiKey,
            system,
            question: message,
            history,
            tools,
            toolContext,
            initialCitations,
            maxToolCalls: Math.min(2, remainingToolCalls),
            onStep,
          },
          {
            generateJsonContent: deps.generateJsonContent,
            generateText: deps.generateText,
          },
        );

      const persistReply = async (result: Awaited<ReturnType<typeof execute>>) => {
        const [assistantRow] = await deps.db
          .insert(tutorMessages)
          .values({
            conversationId: conversation.id,
            userId,
            role: "assistant",
            kind: "chat",
            content: result.answer,
            citations: result.citations.slice(0, 6),
            model: ai.modelRef,
          })
          .returning();
        if (!assistantRow) throw new Error("Could not save the agent reply.");

        if (runIds.length > 0) {
          await deps.db
            .update(agentToolRuns)
            .set({ messageId: assistantRow.id })
            .where(inArray(agentToolRuns.id, runIds));
        }

        return {
          conversationId: conversation.id,
          agentId: agent?.id ?? conversation.agentProfileId ?? null,
          userMessageId: userRow.id,
          message: toMessage(assistantRow),
          steps: result.steps,
          pendingActions: result.pendingActions,
        } satisfies AgentChatResponse;
      };

      if (stream) {
        res.writeHead(200, {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        });
        const send = (data: unknown): boolean => {
          if (req.aborted) return false;
          try {
            return res.write(`data: ${JSON.stringify(data)}\n\n`);
          } catch {
            return false;
          }
        };

        try {
          const result = await execute((step) => {
            send({ type: "step", step });
          });
          const payload = await persistReply(result);
          send({ type: "done", ...payload });
        } catch (err) {
          console.error("[Server] POST /api/agent/chat stream failed", err);
          send({
            type: "error",
            message: "The study agent could not answer. Try again.",
          });
        }
        res.end();
        return;
      }

      const result = await execute();
      const payload = await persistReply(result);
      res.json(payload);
    } catch (err) {
      if (res.headersSent) {
        console.error("[Server] POST /api/agent/chat failed after headers", err);
        res.write(
          `data: ${JSON.stringify({
            type: "error",
            message: "The study agent could not answer. Try again.",
          })}\n\n`,
        );
        res.end();
        return;
      }
      deps.sendRouteError(res, err, "[Server] POST /api/agent/chat failed");
    }
  });

  registerAgentApprovalRoutes(app, {
    db: deps.db,
    verifyClerkToken: deps.verifyClerkToken,
    sendRouteError: deps.sendRouteError,
    embed: deps.embed,
    searchKnowledgeChunks: deps.searchKnowledgeChunks,
  });

  registerAgentMemoryRoutes(app, {
    db: deps.db,
    verifyClerkToken: deps.verifyClerkToken,
    sendRouteError: deps.sendRouteError,
  });

  registerAgentProfileRoutes(app, {
    db: deps.db,
    verifyClerkToken: deps.verifyClerkToken,
    sendRouteError: deps.sendRouteError,
  });

  registerAgentIntegrationRoutes(app, {
    db: deps.db,
    verifyClerkToken: deps.verifyClerkToken,
    sendRouteError: deps.sendRouteError,
  });

  registerAgentRoutineRoutes(app, {
    db: deps.db,
    verifyClerkToken: deps.verifyClerkToken,
    sendRouteError: deps.sendRouteError,
    generateText: deps.generateText,
  });

  registerAgentHistoryRoutes(app, {
    db: deps.db,
    verifyClerkToken: deps.verifyClerkToken,
    sendRouteError: deps.sendRouteError,
  });
}
