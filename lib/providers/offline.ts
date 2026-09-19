import type {
  DownloadableModel,
  JSONSchema,
  LLMMessage,
  ModelError,
} from "expo-ai-kit";
import { getModelOption } from "./modelRegistry";

type ExpoAiKit = typeof import("expo-ai-kit");

let kitRef: ExpoAiKit | null | undefined;

async function loadKit(): Promise<ExpoAiKit | null> {
  if (kitRef !== undefined) return kitRef;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    kitRef = require("expo-ai-kit");
  } catch {
    kitRef = null;
  }
  return kitRef ?? null;
}

function modelErrorClass(): typeof ModelError | undefined {
  return kitRef?.ModelError;
}

class KitUnavailableError extends Error {
  constructor() {
    super(
      "On-device AI isn't available in this build. Rebuild the development build with the expo-ai-kit plugin.",
    );
    this.name = "KitUnavailableError";
  }
}

async function requireKit(): Promise<ExpoAiKit> {
  const kit = await loadKit();
  if (!kit) throw new KitUnavailableError();
  return kit;
}

export function isOfflineRef(ref?: string | null): boolean {
  return Boolean(ref && getModelOption(ref)?.provider === "offline");
}

export function offlineModelId(ref?: string | null): string | null {
  const model = ref ? getModelOption(ref) : undefined;
  return model && model.provider === "offline" ? model.id : null;
}

export function modelErrorMessage(err: unknown): string {
  const ModelErrorClass = modelErrorClass();
  if (err instanceof Error && err.name === "KitUnavailableError") {
    return err.message;
  }
  if (ModelErrorClass && err instanceof ModelErrorClass) {
    switch (err.code) {
      case "LLM_NOT_ENABLED":
        return "Offline AI isn't enabled in this build. Rebuild the development build with the expo-ai-kit plugin.";
      case "MODEL_NOT_DOWNLOADED":
        return "The offline model isn't downloaded yet. Open Settings → Offline AI to download it.";
      case "MODEL_NOT_FOUND":
        return "The offline model wasn't found. Re-download it in Settings → Offline AI.";
      case "MODEL_LOAD_FAILED":
        return "The offline model failed to load. Try downloading it again in Settings → Offline AI.";
      case "DOWNLOAD_CANCELLED":
        return "Download cancelled.";
      case "DOWNLOAD_STORAGE_FULL":
        return "Not enough storage for the model download.";
      case "DOWNLOAD_FAILED":
      case "DOWNLOAD_CORRUPT":
        return "The model download failed. Check your connection and try again.";
      case "INFERENCE_BUSY":
        return "Another request is still running on this device. Try again in a moment.";
      case "INFERENCE_CANCELLED":
        return "Generation cancelled.";
      case "INFERENCE_FAILED":
        return "The on-device model didn't produce a useful result. Try again.";
      case "INFERENCE_OOM":
        return "Not enough memory to run the model on this device. Try a smaller model.";
      case "DEVICE_NOT_SUPPORTED":
        return "On-device AI isn't supported on this device.";
      default:
        return err.message || "On-device AI failed.";
    }
  }
  return err instanceof Error ? err.message : "On-device AI failed.";
}

export function formatModelSize(bytes: number): string {
  return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
}

export async function offlineSupported(): Promise<boolean> {
  const kit = await loadKit();
  if (!kit) return false;
  try {
    return await kit.isAvailable();
  } catch {
    return false;
  }
}

export async function getOfflineCatalog(): Promise<DownloadableModel[]> {
  const kit = await loadKit();
  if (!kit) return [];
  try {
    return await kit.getDownloadableModels();
  } catch {
    return [];
  }
}

export async function getRecommendedOfflineModel(): Promise<DownloadableModel | null> {
  const kit = await loadKit();
  if (!kit) return null;
  try {
    return await kit.getRecommendedModel();
  } catch {
    return null;
  }
}

const GENERATION_CONFIG = {
  generation: { temperature: 0.7, topK: 40, maxTokens: 2048 },
} as const;

export async function downloadOfflineModel(
  id: string,
  onProgress: (progress: number) => void,
): Promise<void> {
  const kit = await requireKit();
  await kit.downloadModel(id, { onProgress });
}

export async function cancelOfflineDownload(id: string): Promise<void> {
  const kit = await requireKit();
  await kit.cancelDownload(id);
}

export async function deleteOfflineModel(id: string): Promise<void> {
  const kit = await requireKit();
  await kit.deleteModel(id);
}

export async function activateOfflineModel(ref?: string | null): Promise<void> {
  const id = offlineModelId(ref);
  if (!id) throw new Error("Not an offline model.");
  const kit = await requireKit();
  await kit.setModel(id, GENERATION_CONFIG);
}

export async function deactivateOfflineModel(): Promise<void> {
  const kit = await loadKit();
  if (!kit) return;
  await kit.unloadModel();
}

let activatedModelRef: string | null = null;

export function resetActivationCache(): void {
  activatedModelRef = null;
}

export async function ensureOfflineActivated(ref?: string | null): Promise<void> {
  const nextId = offlineModelId(ref);
  if (!nextId) {
    if (activatedModelRef) {
      const kit = await loadKit();
      await (kit ? kit.unloadModel() : Promise.resolve()).catch(() => {});
      activatedModelRef = null;
    }
    return;
  }
  if (activatedModelRef === ref) return;
  const kit = await requireKit();
  await kit.setModel(nextId, GENERATION_CONFIG);
  activatedModelRef = ref ?? null;
}

interface OfflineGenerateInput {
  system?: string;
  messages?: LLMMessage[];
  signal?: AbortSignal;
}

function normalizeMessages(input: OfflineGenerateInput): LLMMessage[] {
  const messages: LLMMessage[] = [];
  if (input.system && input.system.trim()) {
    messages.push({ role: "system", content: input.system.trim() });
  }
  for (const m of input.messages ?? []) {
    if (m.role === "system" && messages.length > 0) continue;
    messages.push(m);
  }
  return messages;
}

export async function offlineGenerateText(input: OfflineGenerateInput): Promise<string> {
  const kit = await requireKit();
  const messages = normalizeMessages(input);
  const { text } = await kit.sendMessage(
    messages,
    input.signal ? { signal: input.signal } : undefined,
  );
  return text;
}

export interface OfflineStreamHandle {
  promise: Promise<string>;
  stop: () => void;
}

export function offlineStreamText(
  input: OfflineGenerateInput & { onToken: (token: string) => void },
): OfflineStreamHandle {
  let stop: (() => void) | null = null;
  const promise = (async () => {
    const kit = await requireKit();
    const messages = normalizeMessages(input);
    const handle = kit.streamMessage(messages, (event) => {
      input.onToken(event.token);
    });
    stop = () => handle.stop();
    return handle.promise.then((r) => r.text);
  })();
  return {
    promise,
    stop: () => stop?.(),
  };
}

export async function offlineGenerateObject<T = unknown>(
  schema: JSONSchema,
  input: OfflineGenerateInput,
): Promise<T> {
  const kit = await requireKit();
  const messages = normalizeMessages(input);
  const { object } = await kit.generateObject<T>(
    messages,
    schema,
    input.signal ? { signal: input.signal } : undefined,
  );
  return object;
}