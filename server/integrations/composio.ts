const COMPOSIO_BASE_URL =
  process.env.COMPOSIO_BASE_URL ?? "https://backend.composio.dev/api/v3.1";
const COMPOSIO_API_KEY = process.env.COMPOSIO_API_KEY ?? "";

export interface ComposioTool {
  slug: string;
  name?: string;
  description?: string;
  input_parameters?: Record<string, unknown>;
  toolkit?: { slug?: string } | string;
}

export interface ComposioToolExecutionResult {
  data: unknown;
  error: string | null;
  successful: boolean;
  logId: string;
}

export interface ComposioConnectedAccount {
  id: string;
  toolkit?: string | { slug?: string };
  status?: string;
}

export interface ComposioAuthConfig {
  id: string;
  name?: string;
  auth_scheme?: string;
  is_composio_managed?: boolean;
  toolkit?: string | { slug?: string };
}

export interface ComposioAuthLink {
  link_token: string;
  redirect_url: string;
  expires_at: string;
  connected_account_id: string;
}

export function isComposioConfigured(): boolean {
  return COMPOSIO_API_KEY.trim().length > 0;
}

export function composioToolkitSlug(
  toolkit: ComposioConnectedAccount["toolkit"],
): string | null {
  if (typeof toolkit === "string") return toolkit;
  return toolkit?.slug ?? null;
}

async function composioFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${COMPOSIO_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      "Content-Type": "application/json",
      "x-api-key": COMPOSIO_API_KEY,
    },
    cache: "no-store",
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Composio API error (${response.status}): ${JSON.stringify(body)}`);
  }

  return body as T;
}

export async function listTools(query?: {
  toolkitSlugs?: string[];
  search?: string;
  limit?: number;
}): Promise<ComposioTool[]> {
  const params = new URLSearchParams();
  if (query?.toolkitSlugs?.length) {
    for (const toolkit of query.toolkitSlugs) {
      params.append("toolkit_slugs", toolkit);
    }
  }
  if (query?.search) params.set("search", query.search);
  if (query?.limit) params.set("limit", String(query.limit));

  const qs = params.toString();
  const path = `/tools${qs ? `?${qs}` : ""}`;
  const body = await composioFetch<ComposioTool[] | { items?: ComposioTool[] }>(path);
  if (Array.isArray(body)) return body;
  return body.items ?? [];
}

export async function getTool(toolSlug: string): Promise<ComposioTool> {
  return composioFetch<ComposioTool>(`/tools/${encodeURIComponent(toolSlug)}`);
}

export interface ComposioToolExecutionInput {
  toolSlug: string;
  connectedAccountId?: string;
  userId?: string;
  version?: string;
  arguments?: Record<string, unknown>;
  text?: string;
}

export async function executeTool(
  input: ComposioToolExecutionInput,
): Promise<ComposioToolExecutionResult> {
  const body: Record<string, unknown> = {
    version: input.version ?? "latest",
  };
  if (input.connectedAccountId) body.connected_account_id = input.connectedAccountId;
  if (input.userId) body.user_id = input.userId;
  if (input.arguments) body.arguments = input.arguments;
  if (input.text) body.text = input.text;

  return composioFetch<ComposioToolExecutionResult>(
    `/tools/execute/${encodeURIComponent(input.toolSlug)}`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}

export async function listConnectedAccounts(input?: {
  userId?: string;
  toolkitSlugs?: string[];
}): Promise<ComposioConnectedAccount[]> {
  const params = new URLSearchParams();
  if (input?.userId) params.set("user_ids", input.userId);
  if (input?.toolkitSlugs?.length) {
    for (const toolkit of input.toolkitSlugs) {
      params.append("toolkit_slugs", toolkit);
    }
  }

  const qs = params.toString();
  const body = await composioFetch<{ items?: ComposioConnectedAccount[] }>(
    `/connected_accounts${qs ? `?${qs}` : ""}`,
  );
  return body.items ?? [];
}

export async function deleteConnectedAccount(id: string): Promise<void> {
  await composioFetch<unknown>(`/connected_accounts/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function listAuthConfigs(
  toolkitSlug: string,
): Promise<ComposioAuthConfig[]> {
  const params = new URLSearchParams({ toolkit_slug: toolkitSlug });
  const body = await composioFetch<{ items?: ComposioAuthConfig[] }>(
    `/auth_configs?${params.toString()}`,
  );
  return body.items ?? [];
}

export async function ensureAuthConfig(
  toolkitSlug: string,
  name: string,
): Promise<ComposioAuthConfig> {
  const existing = await listAuthConfigs(toolkitSlug);
  const managed =
    existing.find((config) => config.is_composio_managed) ?? existing[0];
  if (managed) return managed;

  return composioFetch<ComposioAuthConfig>("/auth_configs", {
    method: "POST",
    body: JSON.stringify({
      toolkit: { slug: toolkitSlug },
      auth_config: { type: "use_composio_managed_auth", name },
    }),
  });
}

export async function createAuthLink(input: {
  authConfigId: string;
  userId: string;
  callbackUrl?: string;
}): Promise<ComposioAuthLink> {
  return composioFetch<ComposioAuthLink>("/connected_accounts/link", {
    method: "POST",
    body: JSON.stringify({
      auth_config_id: input.authConfigId,
      user_id: input.userId,
      ...(input.callbackUrl ? { callback_url: input.callbackUrl } : {}),
    }),
  });
}
