import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { create } from "zustand";
import type { AiProvider } from "../lib/providers/modelRegistry";

const STORAGE_PREFIX = "yuinx_ai_key_";

export const AI_PROVIDERS: AiProvider[] = [
  "gemini",
  "openai",
  "anthropic",
  "openrouter",
];

function keyOf(provider: AiProvider): string {
  return STORAGE_PREFIX + provider;
}

async function storageGet(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return null;
  }
  return SecureStore.getItemAsync(key);
}

async function storageSet(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function storageDelete(key: string): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(key);
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

interface AiKeysState {
  keys: Partial<Record<AiProvider, string>>;
  loaded: boolean;
  loadKeys: () => Promise<void>;
  setKey: (provider: AiProvider, key: string) => Promise<void>;
  clearKey: (provider: AiProvider) => Promise<void>;
  hasOwnKey: (provider: AiProvider) => boolean;
}

export const useAiKeysStore = create<AiKeysState>((set, get) => ({
  keys: {},
  loaded: false,

  loadKeys: async () => {
    const keys: Partial<Record<AiProvider, string>> = {};
    for (const provider of AI_PROVIDERS) {
      try {
        const value = await storageGet(keyOf(provider));
        if (value) keys[provider] = value;
      } catch (err) {
        console.error(`[AiKeys] Failed to load key for ${provider}:`, err);
      }
    }
    set({ keys, loaded: true });
  },

  setKey: async (provider, key) => {
    const trimmed = key.trim();
    try {
      if (trimmed) {
        await storageSet(keyOf(provider), trimmed);
      } else {
        await storageDelete(keyOf(provider));
      }
    } catch (err) {
      console.error(`[AiKeys] Failed to save key for ${provider}:`, err);
      throw new Error(
        `Couldn't save the ${provider} key on this device. Please try again.`,
      );
    }
    set((state) => ({
      keys: { ...state.keys, [provider]: trimmed || undefined },
    }));
  },

  clearKey: async (provider) => {
    try {
      await storageDelete(keyOf(provider));
    } catch (err) {
      console.error(`[AiKeys] Failed to remove key for ${provider}:`, err);
    }
    set((state) => ({ keys: { ...state.keys, [provider]: undefined } }));
  },

  hasOwnKey: (provider) => Boolean(get().keys[provider]),
}));