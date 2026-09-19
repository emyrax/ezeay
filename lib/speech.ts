import type {
  ExpoSpeechRecognitionNativeEventMap,
  ExpoSpeechRecognitionOptions,
} from "expo-speech-recognition";

type SpeechModule = NonNullable<
  typeof import("expo-speech-recognition")["ExpoSpeechRecognitionModule"]
>;

let speechModule: SpeechModule | null | undefined;

function getModule(): SpeechModule | null {
  if (speechModule !== undefined) return speechModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("expo-speech-recognition") as typeof import("expo-speech-recognition");
    speechModule = mod.ExpoSpeechRecognitionModule ?? null;
  } catch {
    speechModule = null;
  }
  return speechModule;
}

export function speechRecognitionAvailable(): boolean {
  const mod = getModule();
  if (!mod) return false;
  try {
    return mod.isRecognitionAvailable();
  } catch {
    return false;
  }
}

export function speechSupportsRecording(): boolean {
  const mod = getModule();
  if (!mod) return false;
  try {
    return mod.supportsRecording();
  } catch {
    return false;
  }
}

export async function speechRequestPermissions(): Promise<boolean> {
  const mod = getModule();
  if (!mod) return false;
  try {
    const res = await mod.requestPermissionsAsync();
    return res.granted;
  } catch {
    return false;
  }
}

export function speechStart(options: ExpoSpeechRecognitionOptions): void {
  const mod = getModule();
  if (!mod) throw new Error("Speech recognition unavailable — rebuild the app with expo-speech-recognition.");
  mod.start(options);
}

export function speechStop(): void {
  const mod = getModule();
  if (!mod) return;
  try {
    mod.stop();
  } catch {
    // stop may fail if already ended
  }
}

export function speechAbort(): void {
  const mod = getModule();
  if (!mod) return;
  try {
    mod.abort();
  } catch {
    // ignore
  }
}

export function subscribeSpeechEvent<K extends keyof ExpoSpeechRecognitionNativeEventMap>(
  event: K,
  handler: (event: ExpoSpeechRecognitionNativeEventMap[K]) => void,
): () => void {
  const mod = getModule();
  if (!mod) return () => {};
  try {
    const sub = mod.addListener(event, handler as never);
    return () => {
      try {
        sub.remove();
      } catch {
        // ignore
      }
    };
  } catch {
    return () => {};
  }
}

/** Map volume dB (approx -2 → 10) to 0–1. */
export function normalizeVolumeLevel(value: number): number {
  const clamped = Math.max(-2, Math.min(10, value));
  return Math.max(0, Math.min(1, (clamped + 2) / 12));
}
