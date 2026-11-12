import type { Express, Response } from "express";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import { and, count, desc, eq, lte } from "drizzle-orm";
import * as schema from "../../db/schema";
import { agentRoutineRuns, agentRoutines } from "../../db/schema";
import type {
  AgentRoutine,
  AgentRoutineFrequency,
  AgentRoutineInput,
  AgentRoutineRun,
} from "../../types/agent";
import type { GenerateTextArgs } from "../../lib/providers/generateText";
import { AI_MODEL_DEFAULT } from "../../lib/providers/modelRegistry";
import { loadAgentMemories } from "./memory";
import { asRecord, cleanText } from "./sanitize";

export type AgentRoutineDb = NeonHttpDatabase<typeof schema>;

export interface AgentRoutineRouteDeps {
  db: AgentRoutineDb;
  verifyClerkToken: (authHeader: string | undefined) => Promise<{ sub: string }>;
  sendRouteError: (res: Response, err: unknown, label?: string) => void;
  generateText: (args: GenerateTextArgs) => Promise<string>;
}

type RoutineRow = typeof agentRoutines.$inferSelect;
type RoutineRunRow = typeof agentRoutineRuns.$inferSelect;

const MAX_ROUTINES = 20;
const DEFAULT_TIMEZONE = "Africa/Lagos";
const ALLOWED_SCOPES = new Set([
  "materials",
  "progress",
  "papers",
  "memory",
  "schedule",
  "routines",
]);
const runningRoutines = new Set<string>();

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function isValidRoutineTime(time: string): boolean {
  return TIME_PATTERN.test(time);
}

export function routineCron(input: {
  frequency: AgentRoutineFrequency;
  time: string;
  days?: number[];
}): string {
  const [, hour, minute] = input.time.match(/(\d{2}):(\d{2})/) ?? [];
  const h = Number(hour ?? 7);
  const m = Number(minute ?? 0);
  if (input.frequency === "weekly") {
    const days = (input.days ?? [1]).filter((day) => day >= 0 && day <= 6);
    return `${m} ${h} * * ${days.join(",")}`;
  }
  return `${m} ${h} * * *`;
}

export function scheduleFromCron(cron: string): {
  frequency: AgentRoutineFrequency;
  time: string;
  days: number[];
} {
  const parts = cron.trim().split(/\s+/);
  const minute = Number(parts[0] ?? 0);
  const hour = Number(parts[1] ?? 7);
  const daysPart = parts[4] ?? "*";
  const days =
    daysPart === "*"
      ? []
      : daysPart
          .split(",")
          .map((day) => Number(day))
          .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
  return {
    frequency: days.length > 0 ? "weekly" : "daily",
    time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    days,
  };
}

function zoneParts(
  date: Date,
  timeZone: string,
): { year: number; month: number; day: number; hour: number; minute: number } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const actual = zoneParts(new Date(guess), timeZone);
  const actualUtc = Date.UTC(
    actual.year,
    actual.month - 1,
    actual.day,
    actual.hour,
    actual.minute,
  );
  return new Date(guess - (actualUtc - guess));
}

export function nextRoutineRunAt(input: {
  frequency: AgentRoutineFrequency;
  time: string;
  days?: number[];
  timeZone?: string;
  from?: Date;
}): Date {
  const from = input.from ?? new Date();
  const timeZone = input.timeZone ?? DEFAULT_TIMEZONE;
  const match = input.time.match(TIME_PATTERN);
  const hour = Number(match?.[1] ?? 7);
  const minute = Number(match?.[2] ?? 0);
  const today = zoneParts(from, timeZone);
  const allowedDays =
    input.frequency === "weekly"
      ? new Set((input.days ?? [1]).filter((day) => day >= 0 && day <= 6))
      : null;

  for (let offset = 0; offset < 15; offset += 1) {
    const date = new Date(
      Date.UTC(today.year, today.month - 1, today.day + offset),
    );
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    const weekday = date.getUTCDay();
    if (allowedDays && !allowedDays.has(weekday)) continue;

    const candidate = zonedTimeToUtc(year, month, day, hour, minute, timeZone);
    if (candidate.getTime() > from.getTime()) return candidate;
  }

  return zonedTimeToUtc(today.year, today.month, today.day + 1, hour, minute, timeZone);
}

function sanitizeDays(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const days = value
    .map((day) => Number(day))
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
  return [...new Set(days)].sort((a, b) => a - b);
}

function sanitizeScopes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .map((scope) => cleanText(scope, 24))
        .filter((scope) => ALLOWED_SCOPES.has(scope)),
    ),
  ];
}

export function sanitizeRoutineInput(
  value: unknown,
  partial = false,
): Partial<AgentRoutineInput> | null {
  const raw = asRecord(value);
  if (!raw) return null;
  const result: Partial<AgentRoutineInput> = {};

  if (!partial || "title" in raw) {
    const title = cleanText(raw.title, 80);
    if (title.length < 2) return null;
    result.title = title;
  }

  if (!partial || "prompt" in raw) {
    const prompt = cleanText(raw.prompt, 2000);
    if (prompt.length < 10) return null;
    result.prompt = prompt;
  }

  if (!partial || "frequency" in raw) {
    const frequency = cleanText(raw.frequency, 12);
    if (frequency !== "daily" && frequency !== "weekly") return null;
    result.frequency = frequency;
  }

  if (!partial || "time" in raw) {
    const time = cleanText(raw.time, 5);
    if (!isValidRoutineTime(time)) return null;
    result.time = time;
  }

  if (!partial || "days" in raw) {
    result.days = sanitizeDays(raw.days);
    if (result.frequency === "weekly" && result.days.length === 0) {
      result.days = [1];
    }
  }

  if ("timezone" in raw) {
    const timezone = cleanText(raw.timezone, 60);
    if (!isValidTimeZone(timezone)) return null;
    result.timezone = timezone;
  }

  if ("toolScopes" in raw) {
    result.toolScopes = sanitizeScopes(raw.toolScopes) as AgentRoutineInput["toolScopes"];
  }

  return result;
}

function toRoutine(row: RoutineRow): AgentRoutine {
  return {
    id: row.id,
    title: row.title,
    prompt: row.prompt,
    scheduleCron: row.scheduleCron,
    timezone: row.timezone,
    toolScopes: row.toolScopes,
    enabled: row.enabled,
    nextRunAt: row.nextRunAt?.toISOString() ?? null,
    lastRunAt: row.lastRunAt?.toISOString() ?? null,
    lastResult: row.lastResult,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toRun(row: RoutineRunRow, routineTitle: string): AgentRoutineRun {
  return {
    id: row.id,
    routineId: row.routineId,
    routineTitle,
    status: row.status,
    output: row.output,
    error: row.error,
    startedAt: row.startedAt?.toISOString() ?? null,
    finishedAt: row.finishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function routineSystemPrompt(title: string, scopes: string[]): string {
  const scopeText =
    scopes.length > 0 ? scopes.join(", ") : "study planning and review";
  return [
    `You are ${title}, a scheduled Yuinx study agent.`,
    "Produce a concise, useful briefing for the learner in Markdown.",
    "You cannot change schedules or send messages in this routine. Suggest next actions instead.",
    `Focus on these areas: ${scopeText}.`,
    "Use clear, simple English. Never invent the learner's materials or progress.",
  ].join("\n");
}

async function executeRoutine(
  deps: AgentRoutineRouteDeps,
  userId: string,
  routine: RoutineRow,
  run: RoutineRunRow,
): Promise<void> {
  const memories = await loadAgentMemories(deps.db, userId, 8);
  const memoryText =
    memories.length > 0
      ? memories.map((memory) => `- [${memory.kind}] ${memory.content}`).join("\n")
      : "No saved learner facts yet.";
  const prompt = [
    `Scheduled routine: ${routine.prompt}`,
    `Local time: ${routine.timezone}`,
    `Known learner facts:\n${memoryText}`,
    "Write the briefing now. Include one concrete next step.",
  ].join("\n\n");

  try {
    const output = await deps.generateText({
      modelRef: process.env.AGENT_ROUTINE_MODEL ?? AI_MODEL_DEFAULT,
      system: routineSystemPrompt(routine.title, routine.toolScopes),
      prompt,
      json: false,
    });
    const text = cleanText(output, 8000);
    await deps.db
      .update(agentRoutineRuns)
      .set({
        status: "success",
        output: text,
        finishedAt: new Date(),
      })
      .where(eq(agentRoutineRuns.id, run.id));
    await deps.db
      .update(agentRoutines)
      .set({
        lastRunAt: new Date(),
        lastResult: text.slice(0, 2000),
        updatedAt: new Date(),
      })
      .where(eq(agentRoutines.id, routine.id));
  } catch (err) {
    const message = (err instanceof Error ? err.message : String(err)).slice(
      0,
      1000,
    );
    await deps.db
      .update(agentRoutineRuns)
      .set({ status: "error", error: message, finishedAt: new Date() })
      .where(eq(agentRoutineRuns.id, run.id));
    await deps.db
      .update(agentRoutines)
      .set({ lastRunAt: new Date(), updatedAt: new Date() })
      .where(eq(agentRoutines.id, routine.id));
  }
}

export async function runRoutineNow(
  deps: AgentRoutineRouteDeps,
  userId: string,
  routine: RoutineRow,
): Promise<AgentRoutineRun> {
  const [run] = await deps.db
    .insert(agentRoutineRuns)
    .values({
      routineId: routine.id,
      userId,
      status: "running",
      startedAt: new Date(),
    })
    .returning();
  if (!run) throw new Error("Could not start the routine run.");
  await executeRoutine(deps, userId, routine, run);
  const [finished] = await deps.db
    .select()
    .from(agentRoutineRuns)
    .where(eq(agentRoutineRuns.id, run.id))
    .limit(1);
  return toRun(finished ?? run, routine.title);
}

export async function runDueRoutines(
  deps: AgentRoutineRouteDeps,
  limit = 3,
): Promise<number> {
  const due = await deps.db
    .select()
    .from(agentRoutines)
    .where(
      and(
        eq(agentRoutines.enabled, true),
        lte(agentRoutines.nextRunAt, new Date()),
      ),
    )
    .orderBy(agentRoutines.nextRunAt)
    .limit(Math.min(Math.max(limit, 1), 10));

  let ran = 0;
  for (const routine of due) {
    if (runningRoutines.has(routine.id)) continue;
    runningRoutines.add(routine.id);
    try {
      const schedule = scheduleFromCron(routine.scheduleCron);
      const next = nextRoutineRunAt({
        frequency: schedule.frequency,
        time: schedule.time,
        days: schedule.days,
        timeZone: routine.timezone,
      });
      await deps.db
        .update(agentRoutines)
        .set({ nextRunAt: next, updatedAt: new Date() })
        .where(eq(agentRoutines.id, routine.id));
      await runRoutineNow(deps, routine.userId, routine);
      ran += 1;
    } catch (err) {
      console.error("[Server] Routine run failed", err);
    } finally {
      runningRoutines.delete(routine.id);
    }
  }
  return ran;
}

async function requireRoutine(
  deps: AgentRoutineRouteDeps,
  userId: string,
  id: string,
): Promise<RoutineRow | null> {
  const [row] = await deps.db
    .select()
    .from(agentRoutines)
    .where(and(eq(agentRoutines.id, id), eq(agentRoutines.userId, userId)))
    .limit(1);
  return row ?? null;
}

export function registerAgentRoutineRoutes(
  app: Express,
  deps: AgentRoutineRouteDeps,
): void {
  app.get("/api/agent/routines", async (req, res) => {
    try {
      const claims = await deps.verifyClerkToken(req.headers.authorization);
      const rows = await deps.db
        .select()
        .from(agentRoutines)
        .where(eq(agentRoutines.userId, claims.sub))
        .orderBy(desc(agentRoutines.updatedAt))
        .limit(MAX_ROUTINES);
      res.json({ routines: rows.map(toRoutine) });
    } catch (err) {
      deps.sendRouteError(res, err, "[Server] GET /api/agent/routines failed");
    }
  });

  app.post("/api/agent/routines", async (req, res) => {
    try {
      const claims = await deps.verifyClerkToken(req.headers.authorization);
      const input = sanitizeRoutineInput(req.body);
      if (
        !input?.title ||
        !input.prompt ||
        !input.frequency ||
        !input.time
      ) {
        res.status(422).json({
          error: "Add a title, instructions, schedule, and a time in HH:MM format.",
        });
        return;
      }

      const [row] = await deps.db
        .select({ total: count() })
        .from(agentRoutines)
        .where(eq(agentRoutines.userId, claims.sub));
      if (Number(row?.total ?? 0) >= MAX_ROUTINES) {
        res.status(429).json({
          error: `You can create up to ${MAX_ROUTINES} routines. Delete one first.`,
        });
        return;
      }

      const timezone = input.timezone ?? DEFAULT_TIMEZONE;
      const nextRunAt = nextRoutineRunAt({
        frequency: input.frequency,
        time: input.time,
        days: input.days,
        timeZone: timezone,
      });
      const [created] = await deps.db
        .insert(agentRoutines)
        .values({
          userId: claims.sub,
          title: input.title,
          prompt: input.prompt,
          scheduleCron: routineCron(input),
          timezone,
          toolScopes: input.toolScopes ?? [],
          enabled: true,
          nextRunAt,
        })
        .returning();
      if (!created) {
        res.status(500).json({ error: "Could not create that routine." });
        return;
      }
      res.status(201).json({ routine: toRoutine(created) });
    } catch (err) {
      deps.sendRouteError(res, err, "[Server] POST /api/agent/routines failed");
    }
  });

  app.put("/api/agent/routines/:id", async (req, res) => {
    try {
      const claims = await deps.verifyClerkToken(req.headers.authorization);
      const existing = await requireRoutine(deps, claims.sub, req.params.id);
      if (!existing) {
        res.status(404).json({ error: "Routine not found" });
        return;
      }
      const input = sanitizeRoutineInput(req.body, true);
      if (!input || Object.keys(input).length === 0) {
        res.status(422).json({ error: "There are no valid changes to save." });
        return;
      }

      const current = scheduleFromCron(existing.scheduleCron);
      const frequency = input.frequency ?? current.frequency;
      const scheduleTime = input.time ?? current.time;
      const days = input.days ?? current.days;
      const timezone = input.timezone ?? existing.timezone;
      const nextRunAt = nextRoutineRunAt({
        frequency,
        time: scheduleTime,
        days,
        timeZone: timezone,
      });

      const [updated] = await deps.db
        .update(agentRoutines)
        .set({
          ...(input.title ? { title: input.title } : {}),
          ...(input.prompt ? { prompt: input.prompt } : {}),
          ...(input.toolScopes ? { toolScopes: input.toolScopes } : {}),
          scheduleCron: routineCron({ frequency, time: scheduleTime, days }),
          timezone,
          nextRunAt,
          updatedAt: new Date(),
        })
        .where(eq(agentRoutines.id, existing.id))
        .returning();
      if (!updated) {
        res.status(500).json({ error: "Could not update that routine." });
        return;
      }
      res.json({ routine: toRoutine(updated) });
    } catch (err) {
      deps.sendRouteError(res, err, "[Server] PUT /api/agent/routines/:id failed");
    }
  });

  app.post("/api/agent/routines/:id/toggle", async (req, res) => {
    try {
      const claims = await deps.verifyClerkToken(req.headers.authorization);
      const existing = await requireRoutine(deps, claims.sub, req.params.id);
      if (!existing) {
        res.status(404).json({ error: "Routine not found" });
        return;
      }
      const enabled = req.body?.enabled === true;
      const schedule = scheduleFromCron(existing.scheduleCron);
      const [updated] = await deps.db
        .update(agentRoutines)
        .set({
          enabled,
          nextRunAt: enabled
            ? nextRoutineRunAt({
                frequency: schedule.frequency,
                time: schedule.time,
                days: schedule.days,
                timeZone: existing.timezone,
              })
            : null,
          updatedAt: new Date(),
        })
        .where(eq(agentRoutines.id, existing.id))
        .returning();
      if (!updated) {
        res.status(500).json({ error: "Could not update that routine." });
        return;
      }
      res.json({ routine: toRoutine(updated) });
    } catch (err) {
      deps.sendRouteError(
        res,
        err,
        "[Server] POST /api/agent/routines/:id/toggle failed",
      );
    }
  });

  app.post("/api/agent/routines/:id/run", async (req, res) => {
    try {
      const claims = await deps.verifyClerkToken(req.headers.authorization);
      const existing = await requireRoutine(deps, claims.sub, req.params.id);
      if (!existing) {
        res.status(404).json({ error: "Routine not found" });
        return;
      }
      const run = await runRoutineNow(deps, claims.sub, existing);
      res.json({ run });
    } catch (err) {
      deps.sendRouteError(
        res,
        err,
        "[Server] POST /api/agent/routines/:id/run failed",
      );
    }
  });

  app.get("/api/agent/routines/:id/runs", async (req, res) => {
    try {
      const claims = await deps.verifyClerkToken(req.headers.authorization);
      const existing = await requireRoutine(deps, claims.sub, req.params.id);
      if (!existing) {
        res.status(404).json({ error: "Routine not found" });
        return;
      }
      const rows = await deps.db
        .select()
        .from(agentRoutineRuns)
        .where(eq(agentRoutineRuns.routineId, existing.id))
        .orderBy(desc(agentRoutineRuns.createdAt))
        .limit(30);
      res.json({
        runs: rows.map((row) => toRun(row, existing.title)),
      });
    } catch (err) {
      deps.sendRouteError(
        res,
        err,
        "[Server] GET /api/agent/routines/:id/runs failed",
      );
    }
  });

  app.delete("/api/agent/routines/:id", async (req, res) => {
    try {
      const claims = await deps.verifyClerkToken(req.headers.authorization);
      const [deleted] = await deps.db
        .delete(agentRoutines)
        .where(
          and(
            eq(agentRoutines.id, req.params.id),
            eq(agentRoutines.userId, claims.sub),
          ),
        )
        .returning({ id: agentRoutines.id });
      if (!deleted) {
        res.status(404).json({ error: "Routine not found" });
        return;
      }
      res.json({ deleted: true });
    } catch (err) {
      deps.sendRouteError(
        res,
        err,
        "[Server] DELETE /api/agent/routines/:id failed",
      );
    }
  });
}
