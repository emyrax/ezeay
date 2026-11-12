import type { Express, Response } from "express";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import { desc, eq } from "drizzle-orm";
import * as schema from "../../db/schema";
import { agentRoutineRuns, agentRoutines, agentToolRuns } from "../../db/schema";
import type { AgentExecutionRecord, AgentToolName } from "../../types/agent";
import { toolLabel } from "./prompts";

export type AgentHistoryDb = NeonHttpDatabase<typeof schema>;

export interface AgentHistoryRouteDeps {
  db: AgentHistoryDb;
  verifyClerkToken: (authHeader: string | undefined) => Promise<{ sub: string }>;
  sendRouteError: (res: Response, err: unknown, label?: string) => void;
}

function summaryFromResult(result: unknown): string | null {
  if (!result || typeof result !== "object") return null;
  const summary = (result as Record<string, unknown>).summary;
  return typeof summary === "string" ? summary.slice(0, 400) : null;
}

function toolTitle(tool: string): string {
  try {
    return toolLabel(tool as AgentToolName);
  } catch {
    return tool;
  }
}

export function registerAgentHistoryRoutes(
  app: Express,
  deps: AgentHistoryRouteDeps,
): void {
  app.get("/api/agent/history", async (req, res) => {
    try {
      const claims = await deps.verifyClerkToken(req.headers.authorization);
      const kind = req.query.kind === "routine" ? "routine" : req.query.kind === "tool" ? "tool" : null;
      const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);

      const records: AgentExecutionRecord[] = [];

      if (kind !== "routine") {
        const tools = await deps.db
          .select({
            id: agentToolRuns.id,
            tool: agentToolRuns.tool,
            status: agentToolRuns.status,
            result: agentToolRuns.result,
            error: agentToolRuns.error,
            createdAt: agentToolRuns.createdAt,
          })
          .from(agentToolRuns)
          .where(eq(agentToolRuns.userId, claims.sub))
          .orderBy(desc(agentToolRuns.createdAt))
          .limit(limit);
        records.push(
          ...tools.map((row) => ({
            id: row.id,
            kind: "tool" as const,
            title: toolTitle(row.tool),
            status: row.status,
            summary: summaryFromResult(row.result),
            error: row.error,
            createdAt: row.createdAt.toISOString(),
          })),
        );
      }

      if (kind !== "tool") {
        const routines = await deps.db
          .select({
            id: agentRoutineRuns.id,
            status: agentRoutineRuns.status,
            output: agentRoutineRuns.output,
            error: agentRoutineRuns.error,
            startedAt: agentRoutineRuns.startedAt,
            createdAt: agentRoutineRuns.createdAt,
            title: agentRoutines.title,
          })
          .from(agentRoutineRuns)
          .innerJoin(agentRoutines, eq(agentRoutines.id, agentRoutineRuns.routineId))
          .where(eq(agentRoutineRuns.userId, claims.sub))
          .orderBy(desc(agentRoutineRuns.createdAt))
          .limit(limit);
        records.push(
          ...routines.map((row) => ({
            id: row.id,
            kind: "routine" as const,
            title: row.title,
            status: row.status,
            summary: row.output?.slice(0, 400) ?? null,
            error: row.error,
            createdAt: (row.startedAt ?? row.createdAt).toISOString(),
          })),
        );
      }

      records.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      res.json({ executions: records.slice(0, limit) });
    } catch (err) {
      deps.sendRouteError(res, err, "[Server] GET /api/agent/history failed");
    }
  });
}
