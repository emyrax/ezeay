import {
  AI_MODEL_DEFAULT,
  isModelAllowed,
  parseModelRef,
  type AiProvider,
} from "./modelRegistry";

export interface GenerateTextArgs {
  modelRef?: string;
  prompt: string;
  system?: string;
  json: boolean;
  apiKey?: string;
}

export interface ProviderGenerateTextArgs {
  provider: AiProvider;
  id: string;
  prompt: string;
  system?: string;
  json: boolean;
  apiKey?: string;
}

export type ProviderTextGeneration = (
  args: ProviderGenerateTextArgs,
) => Promise<string>;

let generator: ProviderTextGeneration | null = null;

export function setTextGenerator(fn: ProviderTextGeneration): void {
  generator = fn;
}

export function resolveModelRef(ref: string | undefined | null): string {
  if (ref && isModelAllowed(ref)) return ref;
  return AI_MODEL_DEFAULT;
}

export async function generateText(args: GenerateTextArgs): Promise<string> {
  if (!generator) {
    throw new Error("AI text engine not initialized");
  }
  const ref = resolveModelRef(args.modelRef);
  const parsed = parseModelRef(ref);
  if (!parsed) {
    throw new Error(`Unknown AI model: ${ref}`);
  }
  return generator({
    provider: parsed.provider,
    id: parsed.id,
    prompt: args.prompt,
    system: args.system,
    json: args.json,
    apiKey: args.apiKey,
  });
}