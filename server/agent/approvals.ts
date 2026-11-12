import type { Express, Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import { agentToolRuns } from "../../db/schema";
import type {
  AgentActionResolution,
  AgentPendingAction,
  AgentToolName,
} from "../../types/agent";
import type { KnowledgeChunk } from "../rag";
import { isUuid } from "../tutor/sanitize";
import { cleanText } from "./sanitize";
import { getAgentTool, type AgentToolContext, type AgentToolDb } from "./tools";
import { toolLabel } from "./prompts";

export interface AgentApprovalDeps {
  db: AgentToolDb;
  verifyClerkToken: (authHeader: string | undefined) => Promise<{ sub: string }>;
  sendRouteError: (res: Response, err: unknown, label?: string) => void;
  embed: (text: string) => Promise<number[]>;
  searchKnowledgeChunks: (
    userId: string,
    queryEmbedding: number[],
    sourceTypes: string[],
    sourceIds?: string[],
    limit?: number,
  ) => Promise<KnowledgeChunk[]>;
}

type ToolRunRow = typeof agentToolRuns.$inferSelect;

function resultRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function toPendingAction(row: ToolRunRow): AgentPendingAction {
  const tool = row.tool as AgentToolName;
  const spec = getAgentTool(tool);
  const stored = resultRecord(row.result);
  const summary = cleanText(stored?.summary, 300);
  return {
    id: row.id,
    tool,
    label: spec?.spec.label ?? toolLabel(tool),
    summary: summary || "Review this action before it is applied.",
    args: row.args,
    execution: spec?.spec.execution ?? "server",
    createdAt: row.createdAt.toISOString(),
  };
}

function toResolution(
  row: ToolRunRow,
  status: AgentActionResolution["status"],
  summary?: string,
  error?: string,
): AgentActionResolution {
  return {
    id: row.id,
    tool: row.tool as AgentToolName,
    status,
    summary,
    error,
  };
}

export function registerAgentApprovalRoutes(
  app: Express,
  deps: AgentApprovalDeps,
): void {
  app.get("/api/agent/actions", async (req, res) => {
    try {
      const claims = await deps.verifyClerkToken(req.headers.authorization);
      const rows = await deps.db
        .select()
        .from(agentToolRuns)
        .where(
          and(
            eq(agentToolRuns.userId, claims.sub),
            eq(agentToolRuns.status, "pending"),
            eq(agentToolRuns.approval, "confirm"),
          ),
        )
        .orderBy(desc(agentToolRuns.createdAt))
        .limit(20);

      res.json({ actions: rows.map(toPendingAction) });
    } catch (err) {
      deps.sendRouteError(res, err, "[Server] GET /api/agent/actions failed");
    }
  });

  app.post("/api/agent/actions/:id/approve", async (req, res) => {
    try {
      const claims = await deps.verifyClerkToken(req.headers.authorization);
      const id = req.params.id;
      if (!isUuid(id)) {
        res.status(400).json({ error: "Invalid action id" });
        return;
      }

      const [row] = await deps.db
        .select()
        .from(agentToolRuns)
        .where(
          and(eq(agentToolRuns.id, id), eq(agentToolRuns.userId, claims.sub)),
        )
        .limit(1);

      if (!row) {
        res.status(404).json({ error: "Action not found" });
        return;
      }
      if (row.status !== "pending" || row.approval !== "confirm") {
        res.status(409).json({ error: "This action is no longer pending" });
        return;
      }

      const spec = getAgentTool(row.tool as AgentToolName);
      if (!spec) {
        res.status(422).json({ error: "This action is no longer available" });
        return;
      }

      if (spec.spec.execution === "client") {
        const result = resultRecord(req.body?.result);
        const ok = result?.ok === true;
        const summary =
          cleanText(result?.summary, 300) ||
          (ok
            ? "The change was applied on this device."
            : "The change could not be applied on this device.");
        const error = ok
          ? null
          : cleanText(result?.error, 500) || "client_action_failed";

        const [updated] = await deps.db
          .update(agentToolRuns)
          .set({
            status: ok ? "success" : "error",
            result: { ok, summary },
            error,
          })
          .where(eq(agentToolRuns.id, row.id))
          .returning();

        if (!updated) {
          res.status(500).json({ error: "Could not update the action" });
          return;
        }

        res.json({
          action: toResolution(updated, ok ? "success" : "error", summary, error ?? undefined),
        });
        return;
      }

      const args = spec.normalizeArgs(row.args);
      if (!args) {
        res.status(422).json({ error: "This action has invalid arguments" });
        return;
      }

      const context: AgentToolContext = {
        userId: claims.sub,
        conversationId: row.conversationId ?? undefined,
        db: deps.db,
        embed: deps.embed,
        searchKnowledgeChunks: deps.searchKnowledgeChunks,
      };

      try {
        const output = await spec.execute(context, args, row.id);
        const [updated] = await deps.db
          .update(agentToolRuns)
          .set({
            status: output.ok ? "success" : "error",
            result: {
              ok: output.ok,
              summary: output.summary,
              data: output.data ?? null,
            },
            error: output.error ?? null,
          })
          .where(eq(agentToolRuns.id, row.id))
          .returning();

        if (!updated) {
          res.status(500).json({ error: "Could not update the action" });
          return;
        }
        res.json({
          action: toResolution(
            updated,
            output.ok ? "success" : "error",
            output.summary,
            output.error,
          ),
        });
      } catch (err) {
        await deps.db
          .update(agentToolRuns)
          .set({
            status: "error",
            error: (err instanceof Error ? err.message : String(err)).slice(0, 1000),
          })
          .where(eq(agentToolRuns.id, row.id));
        throw err;
      }
    } catch (err) {
      deps.sendRouteError(
        res,
        err,
        "[Server] POST /api/agent/actions/:id/approve failed",
      );
    }
  });

  app.post("/api/agent/actions/:id/reject", async (req, res) => {
    try {
      const claims = await deps.verifyClerkToken(req.headers.authorization);
      const id = req.params.id;
      if (!isUuid(id)) {
        res.status(400).json({ error: "Invalid action id" });
        return;
      }

      const [updated] = await deps.db
        .update(agentToolRuns)
        .set({
          status: "rejected",
          result: { ok: false, summary: "The learner dismissed this action." },
        })
        .where(
          and(
            eq(agentToolRuns.id, id),
            eq(agentToolRuns.userId, claims.sub),
            eq(agentToolRuns.status, "pending"),
            eq(agentToolRuns.approval, "confirm"),
          ),
        )
        .returning();

      if (!updated) {
        res.status(404).json({ error: "Pending action not found" });
        return;
      }

      res.json({
        action: toResolution(updated, "rejected", "The action was dismissed."),
      });
    } catch (err) {
      deps.sendRouteError(
        res,
        err,
        "[Server] POST /api/agent/actions/:id/reject failed",
      );
    }
  });
}
