import type { Express, Response } from "express";
import { isUuid } from "../tutor/sanitize";
import {
  createAgentMemory,
  deleteAgentMemory,
  listAgentMemories,
  updateAgentMemory,
  type AgentMemoryDb,
} from "./memory";

export interface AgentMemoryRouteDeps {
  db: AgentMemoryDb;
  verifyClerkToken: (authHeader: string | undefined) => Promise<{ sub: string }>;
  sendRouteError: (res: Response, err: unknown, label?: string) => void;
}

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function registerAgentMemoryRoutes(
  app: Express,
  deps: AgentMemoryRouteDeps,
): void {
  app.get("/api/agent/memories", async (req, res) => {
    try {
      const claims = await deps.verifyClerkToken(req.headers.authorization);
      const memories = await listAgentMemories(deps.db, claims.sub);
      res.json({ memories });
    } catch (err) {
      deps.sendRouteError(res, err, "[Server] GET /api/agent/memories failed");
    }
  });

  app.post("/api/agent/memories", async (req, res) => {
    try {
      const claims = await deps.verifyClerkToken(req.headers.authorization);
      if (!hasText(req.body?.content)) {
        res.status(400).json({ error: "Memory text is required." });
        return;
      }

      const memory = await createAgentMemory(deps.db, claims.sub, {
        kind: req.body?.kind,
        content: req.body?.content,
      });
      res.status(201).json({ memory });
    } catch (err) {
      deps.sendRouteError(res, err, "[Server] POST /api/agent/memories failed");
    }
  });

  app.put("/api/agent/memories/:id", async (req, res) => {
    try {
      const claims = await deps.verifyClerkToken(req.headers.authorization);
      const id = req.params.id;
      if (!isUuid(id)) {
        res.status(400).json({ error: "Invalid memory id" });
        return;
      }
      if (req.body?.content !== undefined && !hasText(req.body.content)) {
        res.status(400).json({ error: "Memory text is required." });
        return;
      }
      if (req.body?.kind === undefined && req.body?.content === undefined) {
        res.status(400).json({ error: "Nothing to update." });
        return;
      }

      const memory = await updateAgentMemory(deps.db, claims.sub, id, {
        kind: req.body?.kind,
        content: req.body?.content,
      });
      if (!memory) {
        res.status(404).json({ error: "Memory not found" });
        return;
      }
      res.json({ memory });
    } catch (err) {
      deps.sendRouteError(
        res,
        err,
        "[Server] PUT /api/agent/memories/:id failed",
      );
    }
  });

  app.delete("/api/agent/memories/:id", async (req, res) => {
    try {
      const claims = await deps.verifyClerkToken(req.headers.authorization);
      const id = req.params.id;
      if (!isUuid(id)) {
        res.status(400).json({ error: "Invalid memory id" });
        return;
      }

      const deleted = await deleteAgentMemory(deps.db, claims.sub, id);
      if (!deleted) {
        res.status(404).json({ error: "Memory not found" });
        return;
      }

      res.json({ deleted: true });
    } catch (err) {
      deps.sendRouteError(
        res,
        err,
        "[Server] DELETE /api/agent/memories/:id failed",
      );
    }
  });
}
