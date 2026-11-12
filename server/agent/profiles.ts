import type { Express, Response } from "express";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import { and, count, desc, eq } from "drizzle-orm";
import * as schema from "../../db/schema";
import { agentProfiles } from "../../db/schema";
import type { AgentProfile, AgentProfileInput } from "../../types/agent";
import type { TutorPersona } from "../../types/tutor";
import { isUuid, normalizePersona } from "../tutor/sanitize";
import { asRecord, cleanText } from "./sanitize";

export type AgentProfileDb = NeonHttpDatabase<typeof schema>;

export const AGENT_AVATARS = [
  "school-outline",
  "atom",
  "flask-outline",
  "calculator-variant",
  "book-open-variant",
  "earth",
  "robot-outline",
  "brain",
  "language-python",
  "music-note",
  "palette-outline",
  "dna",
] as const;

const AVATAR_SET = new Set<string>(AGENT_AVATARS);
const MAX_PROFILES = 20;

type ProfileRow = typeof agentProfiles.$inferSelect;

export interface AgentProfileRouteDeps {
  db: AgentProfileDb;
  verifyClerkToken: (authHeader: string | undefined) => Promise<{ sub: string }>;
  sendRouteError: (res: Response, err: unknown, label?: string) => void;
}

function toProfile(row: ProfileRow): AgentProfile {
  return {
    id: row.id,
    name: row.name,
    avatar: row.avatar,
    instructions: row.instructions,
    persona: normalizePersona(row.persona),
    isDefault: row.isDefault,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function normalizeAgentAvatar(value: unknown): string {
  const avatar = cleanText(value, 60);
  return AVATAR_SET.has(avatar) ? avatar : AGENT_AVATARS[0];
}

export function sanitizeAgentProfileInput(
  value: unknown,
  partial = false,
): Partial<AgentProfileInput> | null {
  const raw = asRecord(value);
  if (!raw) return null;

  const result: Partial<AgentProfileInput> = {};

  if (!partial || "name" in raw) {
    const name = cleanText(raw.name, 40);
    if (name.length < 2) return null;
    result.name = name;
  }

  if (!partial || "instructions" in raw) {
    const instructions = cleanText(raw.instructions, 1500);
    if (!partial && instructions.length < 8) return null;
    result.instructions = instructions;
  }

  if ("avatar" in raw) {
    result.avatar = normalizeAgentAvatar(raw.avatar);
  }

  if ("persona" in raw) {
    const persona = cleanText(raw.persona, 40) as TutorPersona;
    result.persona = normalizePersona(persona);
  }

  return result;
}

async function requireProfile(
  deps: AgentProfileRouteDeps,
  userId: string,
  id: string,
): Promise<ProfileRow | null> {
  const [row] = await deps.db
    .select()
    .from(agentProfiles)
    .where(and(eq(agentProfiles.id, id), eq(agentProfiles.userId, userId)))
    .limit(1);
  return row ?? null;
}

export function registerAgentProfileRoutes(
  app: Express,
  deps: AgentProfileRouteDeps,
): void {
  app.get("/api/agent/profiles", async (req, res) => {
    try {
      const claims = await deps.verifyClerkToken(req.headers.authorization);
      const rows = await deps.db
        .select()
        .from(agentProfiles)
        .where(eq(agentProfiles.userId, claims.sub))
        .orderBy(desc(agentProfiles.isDefault), desc(agentProfiles.updatedAt))
        .limit(MAX_PROFILES);
      res.json({ profiles: rows.map(toProfile) });
    } catch (err) {
      deps.sendRouteError(res, err, "[Server] GET /api/agent/profiles failed");
    }
  });

  app.post("/api/agent/profiles", async (req, res) => {
    try {
      const claims = await deps.verifyClerkToken(req.headers.authorization);
      const input = sanitizeAgentProfileInput(req.body);
      if (!input?.name || input.instructions === undefined) {
        res.status(422).json({
          error: "Give your agent a name and at least 8 characters of instructions.",
        });
        return;
      }

      const [row] = await deps.db
        .select({ total: count() })
        .from(agentProfiles)
        .where(eq(agentProfiles.userId, claims.sub));
      if (Number(row?.total ?? 0) >= MAX_PROFILES) {
        res.status(429).json({
          error: `You can create up to ${MAX_PROFILES} agents. Delete one first.`,
        });
        return;
      }

      const [created] = await deps.db
        .insert(agentProfiles)
        .values({
          userId: claims.sub,
          name: input.name,
          avatar: input.avatar ?? AGENT_AVATARS[0],
          instructions: input.instructions,
          persona: input.persona ?? "custom",
          isDefault: Number(row?.total ?? 0) === 0,
        })
        .returning();

      if (!created) {
        res.status(500).json({ error: "Could not create that agent." });
        return;
      }
      res.status(201).json({ profile: toProfile(created) });
    } catch (err) {
      deps.sendRouteError(res, err, "[Server] POST /api/agent/profiles failed");
    }
  });

  app.put("/api/agent/profiles/:id", async (req, res) => {
    try {
      const claims = await deps.verifyClerkToken(req.headers.authorization);
      const id = req.params.id;
      if (!isUuid(id)) {
        res.status(400).json({ error: "Invalid agent id" });
        return;
      }

      const input = sanitizeAgentProfileInput(req.body, true);
      if (!input || Object.keys(input).length === 0) {
        res.status(422).json({ error: "There are no valid changes to save." });
        return;
      }

      const [updated] = await deps.db
        .update(agentProfiles)
        .set({ ...input, updatedAt: new Date() })
        .where(
          and(eq(agentProfiles.id, id), eq(agentProfiles.userId, claims.sub)),
        )
        .returning();

      if (!updated) {
        res.status(404).json({ error: "Agent not found" });
        return;
      }
      res.json({ profile: toProfile(updated) });
    } catch (err) {
      deps.sendRouteError(res, err, "[Server] PUT /api/agent/profiles/:id failed");
    }
  });

  app.post("/api/agent/profiles/:id/default", async (req, res) => {
    try {
      const claims = await deps.verifyClerkToken(req.headers.authorization);
      const id = req.params.id;
      if (!isUuid(id)) {
        res.status(400).json({ error: "Invalid agent id" });
        return;
      }

      const profile = await requireProfile(deps, claims.sub, id);
      if (!profile) {
        res.status(404).json({ error: "Agent not found" });
        return;
      }

      await deps.db
        .update(agentProfiles)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(agentProfiles.userId, claims.sub));

      const [updated] = await deps.db
        .update(agentProfiles)
        .set({ isDefault: true, updatedAt: new Date() })
        .where(eq(agentProfiles.id, id))
        .returning();

      if (!updated) {
        res.status(500).json({ error: "Could not set the default agent." });
        return;
      }
      res.json({ profile: toProfile(updated) });
    } catch (err) {
      deps.sendRouteError(
        res,
        err,
        "[Server] POST /api/agent/profiles/:id/default failed",
      );
    }
  });

  app.delete("/api/agent/profiles/:id", async (req, res) => {
    try {
      const claims = await deps.verifyClerkToken(req.headers.authorization);
      const id = req.params.id;
      if (!isUuid(id)) {
        res.status(400).json({ error: "Invalid agent id" });
        return;
      }

      const [deleted] = await deps.db
        .delete(agentProfiles)
        .where(
          and(eq(agentProfiles.id, id), eq(agentProfiles.userId, claims.sub)),
        )
        .returning();

      if (!deleted) {
        res.status(404).json({ error: "Agent not found" });
        return;
      }

      if (deleted.isDefault) {
        const [next] = await deps.db
          .select({ id: agentProfiles.id })
          .from(agentProfiles)
          .where(eq(agentProfiles.userId, claims.sub))
          .orderBy(desc(agentProfiles.updatedAt))
          .limit(1);
        if (next) {
          await deps.db
            .update(agentProfiles)
            .set({ isDefault: true, updatedAt: new Date() })
            .where(eq(agentProfiles.id, next.id));
        }
      }

      res.json({ deleted: true });
    } catch (err) {
      deps.sendRouteError(
        res,
        err,
        "[Server] DELETE /api/agent/profiles/:id failed",
      );
    }
  });
}
