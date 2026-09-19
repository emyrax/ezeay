export type AiProvider = "gemini" | "openai" | "anthropic" | "openrouter" | "offline";
export type AiTier = "free" | "paid";

export interface AiModelOption {
  ref: string;
  id: string;
  provider: AiProvider;
  label: string;
  tier: AiTier;
  note?: string;
  rating?: number;
}

export const AI_MODEL_DEFAULT = "gemini::gemini-2.5-flash";

export const AI_PROVIDER_LABELS: Record<AiProvider, string> = {
  gemini: "Google Gemini",
  openai: "OpenAI",
  anthropic: "Anthropic",
  openrouter: "OpenRouter",
  offline: "On-device",
};

export function modelRef(provider: AiProvider, id: string): string {
  return `${provider}::${id}`;
}

const RAW_MODELS: Omit<AiModelOption, "ref">[] = [
  // --- Google Gemini ---
  { provider: "gemini", id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", tier: "free", note: "Default — best speed/quality balance", rating: 5 },
  { provider: "gemini", id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite", tier: "free", note: "Fastest & cheapest Gemini", rating: 4 },
  { provider: "gemini", id: "gemini-3-flash-preview", label: "Gemini 3 Flash (preview)", tier: "free", note: "Newest Flash, free tier", rating: 4 },
  { provider: "gemini", id: "gemini-3.5-flash", label: "Gemini 3.5 Flash", tier: "free", note: "Latest Flash generation", rating: 5 },
  { provider: "gemini", id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite", tier: "free", note: "Lightweight, free tier", rating: 4 },
  { provider: "gemini", id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", tier: "paid", note: "Best quality (paid)", rating: 5 },
  { provider: "gemini", id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro (preview)", tier: "paid", note: "Highest quality (paid)", rating: 5 },

  // --- OpenAI ---
  { provider: "openai", id: "gpt-5-nano", label: "GPT-5 nano", tier: "free", note: "Small, fast, free tier", rating: 4 },
  { provider: "openai", id: "gpt-5-mini", label: "GPT-5 mini", tier: "free", note: "Free tier, solid quality", rating: 5 },
  { provider: "openai", id: "gpt-4o-mini", label: "GPT-4o mini", tier: "free", note: "Free tier classic", rating: 4 },
  { provider: "openai", id: "gpt-5", label: "GPT-5", tier: "paid", note: "Full GPT-5 (paid)", rating: 5 },
  { provider: "openai", id: "gpt-4.1", label: "GPT-4.1", tier: "paid", note: "Latest 4.1 generation (paid)", rating: 5 },

  // --- Anthropic ---
  { provider: "anthropic", id: "claude-haiku-4", label: "Claude Haiku 4", tier: "paid", note: "Cheapest Claude (paid)", rating: 4 },
  { provider: "anthropic", id: "claude-sonnet-4", label: "Claude Sonnet 4", tier: "paid", note: "Balanced (paid)", rating: 5 },
  { provider: "anthropic", id: "claude-opus-4", label: "Claude Opus 4", tier: "paid", note: "Most capable (paid)", rating: 5 },
  { provider: "anthropic", id: "claude-3-5-haiku-latest", label: "Claude 3.5 Haiku", tier: "paid", note: "Fast legacy (paid)", rating: 4 },
  { provider: "anthropic", id: "claude-3-5-sonnet-latest", label: "Claude 3.5 Sonnet", tier: "paid", note: "Reliable legacy (paid)", rating: 5 },

  // --- OpenRouter (one key, many models) ---
  { provider: "openrouter", id: "google/gemma-4-26b-a4b-it:free", label: "Gemma 4 26B A4B (free)", tier: "free", note: "Google open model via OpenRouter", rating: 4 },
  { provider: "openrouter", id: "google/gemma-4-31b-it:free", label: "Gemma 4 31B (free)", tier: "free", note: "Larger open Gemma", rating: 4 },
  { provider: "openrouter", id: "z-ai/glm-5.2:free", label: "GLM 5.2 (free)", tier: "free", note: "Zhipu reasoning model, free", rating: 5 },
  { provider: "openrouter", id: "nvidia/nemotron-3-super-120b-a12b:free", label: "Nemotron 3 120B (free)", tier: "free", note: "NVIDIA open model, free", rating: 4 },
  { provider: "openrouter", id: "nvidia/nemotron-3-ultra-550b-a55b:free", label: "Nemotron 3 Ultra 550B (free)", tier: "free", note: "NVIDIA flagship open model, free", rating: 5 },
  { provider: "openrouter", id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", label: "Nemotron 3 Nano Omni (free)", tier: "free", note: "Reasoning-focused NVIDIA model, free", rating: 4 },
  { provider: "openrouter", id: "nvidia/nemotron-3.5-lightning:free", label: "Nemotron 3.5 Lightning (free)", tier: "free", note: "Fast NVIDIA model, free", rating: 4 },
  { provider: "openrouter", id: "nvidia/nemotron-3.5-content-safety:free", label: "Nemotron 3.5 Safety (free)", tier: "free", note: "Safety classifier — not a general chat model", rating: 1 },
  { provider: "openrouter", id: "poolside/laguna-s-2.1:free", label: "Laguna S 2.1 (free)", tier: "free", note: "Poolside open model, free", rating: 4 },
  { provider: "openrouter", id: "poolside/laguna-xs-2.1:free", label: "Laguna XS 2.1 (free)", tier: "free", note: "Smaller Poolside model, free", rating: 3 },
  { provider: "openrouter", id: "thinkingmachines/inkling:free", label: "Inkling (free)", tier: "free", note: "Thinking Machines open model, free", rating: 5 },
  { provider: "openrouter", id: "thinkingmachines/inkling-small:free", label: "Inkling Small (free)", tier: "free", note: "Faster Thinking Machines model, free", rating: 3 },
  { provider: "openrouter", id: "nex-agi/nex-n2.5-mini:free", label: "Nex N2.5 Mini (free)", tier: "free", note: "Lightweight Nex model, free", rating: 3 },
  { provider: "openrouter", id: "nex-agi/nex-n2.5-pro:free", label: "Nex N2.5 Pro (free)", tier: "free", note: "Full-size Nex model, free", rating: 4 },
  { provider: "openrouter", id: "cohere/north-mini-code:free", label: "North Mini Code (free)", tier: "free", note: "Cohere code-focused model, free", rating: 3 },
  { provider: "openrouter", id: "dots-studio/dots-3-note-preview:free", label: "Dots 3 Note (free)", tier: "free", note: "Experimental preview, free", rating: 2 },
  { provider: "openrouter", id: "liquid/lfm-2.5-2.6b:free", label: "LFM 2.5 2.6B (free)", tier: "free", note: "Tiny Liquid model, free", rating: 2 },
  { provider: "openrouter", id: "inclusionai/ling-3.0-flash-fin:free", label: "Ling 3.0 Flash Finance (free)", tier: "free", note: "Finance-domain model, free", rating: 3 },
  { provider: "openrouter", id: "inclusionai/ling-3.0-flash-sante:free", label: "Ling 3.0 Flash Health (free)", tier: "free", note: "Health-domain model, free", rating: 3 },
  { provider: "openrouter", id: "inclusionai/ling-3.0-flash-vl:free", label: "Ling 3.0 Flash Vision (free)", tier: "free", note: "Vision model, free", rating: 2 },
  { provider: "openrouter", id: "anthropic/claude-sonnet-4.5", label: "Claude Sonnet 4.5", tier: "paid", note: "Via OpenRouter (paid)", rating: 5 },
  { provider: "openrouter", id: "openai/gpt-5.4", label: "GPT-5.4", tier: "paid", note: "Via OpenRouter (paid)", rating: 5 },
  { provider: "openrouter", id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B", tier: "paid", note: "Higher rate limits (paid)", rating: 4 },
  { provider: "openrouter", id: "deepseek/deepseek-chat-v3-0324", label: "DeepSeek V3 (0324)", tier: "paid", note: "Cheap paid DeepSeek", rating: 4 },

  // --- On-device (expo-ai-kit, Gemma via LiteRT-LM, dev-build only) ---
  { provider: "offline", id: "gemma-e2b", label: "Gemma E2B", tier: "free", note: "On-device · 2.3B · ~2.6 GB download · works offline", rating: 4 },
  { provider: "offline", id: "gemma-e4b", label: "Gemma E4B", tier: "free", note: "On-device · 4.5B · ~3.7 GB download · stronger", rating: 5 },
];

export const AI_MODELS: AiModelOption[] = RAW_MODELS.map((m) => ({
  ...m,
  ref: modelRef(m.provider, m.id),
}));

export function parseModelRef(
  ref: string,
): { provider: AiProvider; id: string } | null {
  const sep = ref.indexOf("::");
  if (sep === -1) return null;
  const provider = ref.slice(0, sep) as AiProvider;
  const id = ref.slice(sep + 2);
  if (!id) return null;
  if (!["gemini", "openai", "anthropic", "openrouter", "offline"].includes(provider)) {
    return null;
  }
  return { provider, id };
}

export function isModelAllowed(ref: string): boolean {
  return AI_MODELS.some((m) => m.ref === ref);
}

export function getModelOption(ref: string): AiModelOption | undefined {
  return AI_MODELS.find((m) => m.ref === ref);
}

export function effectiveRating(
  model: AiModelOption,
  userRatings: Record<string, number>,
): number | undefined {
  return userRatings[model.ref] ?? model.rating;
}

export function sortModels(
  models: AiModelOption[],
  userRatings: Record<string, number>,
): AiModelOption[] {
  return [...models].sort((a, b) => {
    const byRating =
      (effectiveRating(b, userRatings) ?? 0) - (effectiveRating(a, userRatings) ?? 0);
    if (byRating !== 0) return byRating;
    if (a.tier !== b.tier) return a.tier === "free" ? -1 : 1;
    return a.label.localeCompare(b.label);
  });
}