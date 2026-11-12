import type { Express, Response } from "express";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import { and, eq } from "drizzle-orm";
import * as schema from "../../db/schema";
import { agentIntegrations } from "../../db/schema";
import {
  AGENT_TOOLKITS,
  getAgentToolkitActions,
} from "../../data/agentToolkitCatalog";
import type { AgentIntegrationToolkit } from "../../types/agent";
import {
  composioToolkitSlug,
  createAuthLink,
  deleteConnectedAccount,
  ensureAuthConfig,
  isComposioConfigured,
  listConnectedAccounts,
  type ComposioConnectedAccount,
} from "../integrations/composio";

export type AgentIntegrationDb = NeonHttpDatabase<typeof schema>;

export interface AgentIntegrationRouteDeps {
  db: AgentIntegrationDb;
  verifyClerkToken: (authHeader: string | undefined) => Promise<{ sub: string }>;
  sendRouteError: (res: Response, err: unknown, label?: string) => void;
}

type IntegrationRow = typeof agentIntegrations.$inferSelect;

const ACTIVE_STATUSES = new Set(["ACTIVE", "CONNECTED", "ENABLED", "SUCCESS"]);
const ERROR_STATUSES = new Set(["FAILED", "ERROR", "EXPIRED", "REVOKED"]);

function normalizeStatus(account?: ComposioConnectedAccount): string {
  if (!account) return "disconnected";
  const status = (account.status ?? "").toUpperCase();
  if (ACTIVE_STATUSES.has(status)) return "connected";
  if (ERROR_STATUSES.has(status)) return "error";
  return "pending";
}

function findToolkit(id: string) {
  return AGENT_TOOLKITS.find((toolkit) => toolkit.id === id) ?? null;
}

function toToolkit(id: string, row?: IntegrationRow): AgentIntegrationToolkit {
  const toolkit = findToolkit(id);
  const actions = getAgentToolkitActions(id).map((action) => ({
    action: action.action,
    slug: action.slug,
    description: action.description,
    scope: action.scope,
    approval: action.approval,
    read: action.read,
    write: action.write,
  }));
  return {
    id,
    name: toolkit?.name ?? id,
    description: toolkit?.description ?? "",
    actions,
    status:
      (row?.status as AgentIntegrationToolkit["status"] | undefined) ??
      "disconnected",
    connectedAccountId: row?.connectedAccountId ?? null,
    updatedAt: row?.updatedAt.toISOString() ?? null,
  };
}

async function upsertIntegration(
  deps: AgentIntegrationRouteDeps,
  userId: string,
  toolkit: string,
  values: {
    connectedAccountId?: string | null;
    status: string;
    metadata?: Record<string, unknown>;
  },
): Promise<IntegrationRow> {
  const [row] = await deps.db
    .insert(agentIntegrations)
    .values({
      userId,
      toolkit,
      connectedAccountId: values.connectedAccountId ?? null,
      status: values.status,
      metadata: values.metadata ?? {},
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [agentIntegrations.userId, agentIntegrations.toolkit],
      set: {
        connectedAccountId: values.connectedAccountId ?? null,
        status: values.status,
        ...(values.metadata ? { metadata: values.metadata } : {}),
        updatedAt: new Date(),
      },
    })
    .returning();
  if (!row) throw new Error("Could not save the integration.");
  return row;
}

async function loadIntegrationRows(
  deps: AgentIntegrationRouteDeps,
  userId: string,
): Promise<IntegrationRow[]> {
  return deps.db
    .select()
    .from(agentIntegrations)
    .where(eq(agentIntegrations.userId, userId));
}

function preferredAccount(
  accounts: ComposioConnectedAccount[],
): ComposioConnectedAccount | null {
  return (
    accounts.find((account) => normalizeStatus(account) === "connected") ??
    accounts[0] ??
    null
  );
}

export function registerAgentIntegrationRoutes(
  app: Express,
  deps: AgentIntegrationRouteDeps,
): void {
  app.get("/api/agent/integrations", async (req, res) => {
    try {
      const claims = await deps.verifyClerkToken(req.headers.authorization);
      const rows = await loadIntegrationRows(deps, claims.sub);
      const byToolkit = new Map(rows.map((row) => [row.toolkit, row]));
      const configured = isComposioConfigured();

      if (configured) {
        try {
          const accounts = await listConnectedAccounts({ userId: claims.sub });
          for (const account of accounts) {
            const toolkit = composioToolkitSlug(account.toolkit);
            if (!toolkit || !findToolkit(toolkit)) continue;
            const existing = byToolkit.get(toolkit);
            if (
              existing?.connectedAccountId === account.id &&
              existing.status === normalizeStatus(account)
            ) {
              continue;
            }
            const row = await upsertIntegration(deps, claims.sub, toolkit, {
              connectedAccountId: account.id,
              status: normalizeStatus(account),
            });
            byToolkit.set(toolkit, row);
          }
        } catch (err) {
          console.warn(
            "[Server] Could not refresh Composio connections",
            err instanceof Error ? err.message : err,
          );
        }
      }

      res.json({
        configured,
        toolkits: AGENT_TOOLKITS.map((toolkit) =>
          toToolkit(toolkit.id, byToolkit.get(toolkit.id)),
        ),
      });
    } catch (err) {
      deps.sendRouteError(res, err, "[Server] GET /api/agent/integrations failed");
    }
  });

  app.post("/api/agent/integrations/:toolkit/connect", async (req, res) => {
    try {
      const claims = await deps.verifyClerkToken(req.headers.authorization);
      const toolkit = findToolkit(req.params.toolkit);
      if (!toolkit) {
        res.status(404).json({ error: "That integration is not available." });
        return;
      }
      if (!isComposioConfigured()) {
        res.status(503).json({
          error: "Connections are not configured on this server yet.",
        });
        return;
      }

      const authConfig = await ensureAuthConfig(toolkit.id, toolkit.name);
      const link = await createAuthLink({
        authConfigId: authConfig.id,
        userId: claims.sub,
        callbackUrl: process.env.AGENT_OAUTH_REDIRECT_URL,
      });
      await upsertIntegration(deps, claims.sub, toolkit.id, {
        connectedAccountId: link.connected_account_id,
        status: "pending",
        metadata: { authConfigId: authConfig.id },
      });

      res.status(201).json({
        toolkit: toToolkit(toolkit.id),
        redirectUrl: link.redirect_url,
        connectedAccountId: link.connected_account_id,
        expiresAt: link.expires_at,
      });
    } catch (err) {
      console.error("[Server] POST /api/agent/integrations/:toolkit/connect failed", err);
      res.status(502).json({
        error: "Could not start that connection. Try again in a moment.",
      });
    }
  });

  app.post("/api/agent/integrations/:toolkit/sync", async (req, res) => {
    try {
      const claims = await deps.verifyClerkToken(req.headers.authorization);
      const toolkit = findToolkit(req.params.toolkit);
      if (!toolkit) {
        res.status(404).json({ error: "That integration is not available." });
        return;
      }
      if (!isComposioConfigured()) {
        res.status(503).json({
          error: "Connections are not configured on this server yet.",
        });
        return;
      }

      const accounts = await listConnectedAccounts({
        userId: claims.sub,
        toolkitSlugs: [toolkit.id],
      });
      const account = preferredAccount(accounts);
      const row = await upsertIntegration(deps, claims.sub, toolkit.id, {
        connectedAccountId: account?.id ?? null,
        status: normalizeStatus(account ?? undefined),
      });
      res.json({ toolkit: toToolkit(toolkit.id, row) });
    } catch (err) {
      console.error("[Server] POST /api/agent/integrations/:toolkit/sync failed", err);
      res.status(502).json({
        error: "Could not check that connection. Try again in a moment.",
      });
    }
  });

  app.delete("/api/agent/integrations/:toolkit", async (req, res) => {
    try {
      const claims = await deps.verifyClerkToken(req.headers.authorization);
      const toolkit = findToolkit(req.params.toolkit);
      if (!toolkit) {
        res.status(404).json({ error: "That integration is not available." });
        return;
      }

      const [row] = await deps.db
        .select()
        .from(agentIntegrations)
        .where(
          and(
            eq(agentIntegrations.userId, claims.sub),
            eq(agentIntegrations.toolkit, toolkit.id),
          ),
        )
        .limit(1);

      if (row?.connectedAccountId && isComposioConfigured()) {
        try {
          await deleteConnectedAccount(row.connectedAccountId);
        } catch (err) {
          console.warn(
            "[Server] Could not revoke Composio account",
            err instanceof Error ? err.message : err,
          );
        }
      }

      await deps.db
        .delete(agentIntegrations)
        .where(
          and(
            eq(agentIntegrations.userId, claims.sub),
            eq(agentIntegrations.toolkit, toolkit.id),
          ),
        );
      res.json({ toolkit: toToolkit(toolkit.id) });
    } catch (err) {
      deps.sendRouteError(
        res,
        err,
        "[Server] DELETE /api/agent/integrations/:toolkit failed",
      );
    }
  });
}
