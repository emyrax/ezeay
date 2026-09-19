import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI, { APIError } from "openai";
import {
  AI_PROVIDER_LABELS,
  type AiProvider,
} from "../../lib/providers/modelRegistry";
import {
  setTextGenerator,
  type ProviderGenerateTextArgs,
} from "../../lib/providers/generateText";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const ANTHROPIC_MAX_TOKENS = 8192;

export class AiConfigError extends Error {
  readonly statusCode = 503;
  readonly code = "PROVIDER_NOT_CONFIGURED";
  readonly provider: AiProvider;

  constructor(provider: AiProvider) {
    super(
      `No API key for ${AI_PROVIDER_LABELS[provider]}. Add ${provider.toUpperCase()}_API_KEY on the server, or add your own key in Settings → AI Model.`,
    );
    this.name = "AiConfigError";
    this.provider = provider;
  }
}

export class AiProviderError extends Error {
  readonly statusCode: number;
  readonly provider: AiProvider;

  constructor(provider: AiProvider, message: string, statusCode: number, cause?: unknown) {
    super(message);
    this.name = "AiProviderError";
    this.provider = provider;
    this.statusCode = statusCode;
    if (cause !== undefined) this.cause = cause;
  }
}

function openrouterError(provider: AiProvider, err: APIError): AiProviderError {
  const status = err.status ?? 502;
  const raw = typeof err.message === "string" ? err.message.toLowerCase() : "";

  if (status === 401 || status === 403) {
    return new AiProviderError(
      provider,
      "OpenRouter rejected your API key. Add a valid key in Settings → AI Model.",
      401,
      err,
    );
  }
  if (status === 429) {
    return new AiProviderError(
      provider,
      "OpenRouter free-tier rate limit reached. Free models have per-day limits — wait a bit, or pick a different model.",
      429,
      err,
    );
  }
  if (status === 402) {
    return new AiProviderError(
      provider,
      "OpenRouter says this model needs credit. Top up at openrouter.ai, or pick a free model.",
      402,
      err,
    );
  }
  if (status === 404 || raw.includes("model not found")) {
    return new AiProviderError(
      provider,
      "This OpenRouter model is unavailable right now. Try another model.",
      404,
      err,
    );
  }
  if (raw.includes("no auth credentials") || raw.includes("invalid api key")) {
    return new AiProviderError(
      provider,
      "OpenRouter rejected your API key. Add a valid key in Settings → AI Model.",
      401,
      err,
    );
  }
  return new AiProviderError(provider, `OpenRouter request failed: ${err.message}`, status, err);
}

interface ResolvedKey {
  key: string;
  source: "server" | "client";
}

function resolveKey(
  envKey: string | undefined,
  requestKey?: string,
): ResolvedKey | null {
  if (envKey) return { key: envKey, source: "server" };
  if (requestKey && requestKey.trim()) {
    return { key: requestKey.trim(), source: "client" };
  }
  return null;
}

function requireKey(
  provider: AiProvider,
  envKey: string | undefined,
  requestKey?: string,
): ResolvedKey {
  const resolved = resolveKey(envKey, requestKey);
  if (!resolved) throw new AiConfigError(provider);
  return resolved;
}

const ENV_CACHE_KEY = "env";

function cacheKey(from: ResolvedKey): string {
  return from.source === "server" ? ENV_CACHE_KEY : `client:${from.key}`;
}

const geminiClients = new Map<string, GoogleGenAI>();
const openaiClients = new Map<string, OpenAI>();
const openrouterClients = new Map<string, OpenAI>();
const anthropicClients = new Map<string, Anthropic>();

export function getGemini(requestKey?: string): GoogleGenAI {
  const resolved = requireKey("gemini", GEMINI_API_KEY, requestKey);
  const key = cacheKey(resolved);
  let client = geminiClients.get(key);
  if (!client) {
    client = new GoogleGenAI({ apiKey: resolved.key });
    geminiClients.set(key, client);
  }
  return client;
}

function getOpenai(requestKey?: string): OpenAI {
  const resolved = requireKey("openai", OPENAI_API_KEY, requestKey);
  const key = cacheKey(resolved);
  let client = openaiClients.get(key);
  if (!client) {
    client = new OpenAI({ apiKey: resolved.key });
    openaiClients.set(key, client);
  }
  return client;
}

function getOpenrouter(requestKey?: string): OpenAI {
  const resolved = requireKey("openrouter", OPENROUTER_API_KEY, requestKey);
  const key = cacheKey(resolved);
  let client = openrouterClients.get(key);
  if (!client) {
    client = new OpenAI({
      apiKey: resolved.key,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "https://yuinx.app",
        "X-Title": "Yuinx",
      },
    });
    openrouterClients.set(key, client);
  }
  return client;
}

function getAnthropic(requestKey?: string): Anthropic {
  const resolved = requireKey("anthropic", ANTHROPIC_API_KEY, requestKey);
  const key = cacheKey(resolved);
  let client = anthropicClients.get(key);
  if (!client) {
    client = new Anthropic({ apiKey: resolved.key });
    anthropicClients.set(key, client);
  }
  return client;
}

function jsonSystemPrompt(system?: string): string | undefined {
  const base = system ? `${system}\n\n` : "";
  return `${base}Reply with ONLY valid JSON. Do NOT include markdown code fences.`.trim();
}

async function geminiText(args: ProviderGenerateTextArgs): Promise<string> {
  const fullPrompt = args.system ? `${args.system}\n\n${args.prompt}` : args.prompt;
  const response = await getGemini(args.apiKey).models.generateContent({
    model: args.id,
    contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
    config: args.json ? { responseMimeType: "application/json" } : undefined,
  });
  const text = response.text;
  if (!text) {
    throw new Error(`Empty response from ${args.id}`);
  }
  return text.trim();
}

async function openaiText(args: ProviderGenerateTextArgs): Promise<string> {
  const system = args.json ? jsonSystemPrompt(args.system) : args.system;
  const completion = await getOpenai(args.apiKey).chat.completions.create({
    model: args.id,
    messages: [
      ...(system ? [{ role: "system" as const, content: system }] : []),
      { role: "user" as const, content: args.prompt },
    ],
    ...(args.json ? { response_format: { type: "json_object" as const } } : {}),
  });
  const text = completion.choices?.[0]?.message?.content ?? "";
  if (!text.trim()) {
    throw new Error(`Empty response from ${args.id}`);
  }
  return text.trim();
}

async function openrouterText(args: ProviderGenerateTextArgs): Promise<string> {
  try {
    const system = args.json ? jsonSystemPrompt(args.system) : args.system;
    const completion = await getOpenrouter(args.apiKey).chat.completions.create({
      model: args.id,
      messages: [
        ...(system ? [{ role: "system" as const, content: system }] : []),
        { role: "user" as const, content: args.prompt },
      ],
    });
    const text = completion.choices?.[0]?.message?.content ?? "";
    if (!text.trim()) {
      throw new Error(`Empty response from ${args.id}`);
    }
    return text.trim();
  } catch (err) {
    if (err instanceof APIError) {
      throw openrouterError("openrouter", err);
    }
    throw err;
  }
}

async function anthropicText(args: ProviderGenerateTextArgs): Promise<string> {
  const system = args.json ? jsonSystemPrompt(args.system) : args.system;
  const response = await getAnthropic(args.apiKey).messages.create({
    model: args.id,
    max_tokens: ANTHROPIC_MAX_TOKENS,
    ...(system ? { system } : {}),
    messages: [{ role: "user", content: args.prompt }],
  });
  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");
  if (!text.trim()) {
    throw new Error(`Empty response from ${args.id}`);
  }
  return text.trim();
}

async function dispatch(args: ProviderGenerateTextArgs): Promise<string> {
  switch (args.provider) {
    case "gemini":
      return geminiText(args);
    case "openai":
      return openaiText(args);
    case "openrouter":
      return openrouterText(args);
    case "anthropic":
      return anthropicText(args);
    default:
      throw new Error(`On-device provider "${args.provider}" cannot run on the server`);
  }
}

setTextGenerator(dispatch);

export function providerKeyStatus(): Record<
  AiProvider,
  { serverKeyConfigured: boolean }
> {
  return {
    gemini: { serverKeyConfigured: Boolean(GEMINI_API_KEY) },
    openai: { serverKeyConfigured: Boolean(OPENAI_API_KEY) },
    anthropic: { serverKeyConfigured: Boolean(ANTHROPIC_API_KEY) },
    openrouter: { serverKeyConfigured: Boolean(OPENROUTER_API_KEY) },
    offline: { serverKeyConfigured: true },
  };
}

export function initAiEngine(): void {
  if (!GEMINI_API_KEY) {
    console.warn("[Server] GEMINI_API_KEY missing — add it or use your own key in the app");
  }
  if (!OPENAI_API_KEY) {
    console.warn("[Server] OPENAI_API_KEY missing — OpenAI requires a key in .env or from the app");
  }
  if (!ANTHROPIC_API_KEY) {
    console.warn("[Server] ANTHROPIC_API_KEY missing — Anthropic requires a key in .env or from the app");
  }
  if (!OPENROUTER_API_KEY) {
    console.warn("[Server] OPENROUTER_API_KEY missing — OpenRouter requires a key in .env or from the app");
  }
}