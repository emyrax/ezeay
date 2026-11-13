import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";
import {
  AI_MODELS,
  sortModels,
  type AiModelOption,
  type AiProvider,
} from "../lib/providers/modelRegistry";
import { AI_PROVIDERS, useAiKeysStore } from "../store/aiKeysStore";
import { useModelRatingStore } from "../store/modelRatingStore";
import { useOfflineStore, type OfflineStatus } from "../store/offlineStore";

export type ProviderStatus = "ready" | "needs-key" | "unknown";

export interface ModelGroup {
  provider: AiProvider;
  models: AiModelOption[];
}

const PROVIDER_ORDER: AiProvider[] = [
  "offline",
  "gemini",
  "openai",
  "anthropic",
  "openrouter",
];

export function modelStatusLabel(
  provider: AiProvider | undefined,
  status: ProviderStatus,
  offlineStatus: OfflineStatus,
): string {
  if (provider === "offline") {
    if (offlineStatus === "ready" || offlineStatus === "downloaded")
      return "Installed";
    if (offlineStatus === "downloading") return "Downloading...";
    return "Not installed";
  }
  if (status === "ready") return "Ready";
  if (status === "unknown") return "Checking...";
  return "Add key";
}

export function useAiModelCatalog() {
  const { getToken } = useAuth();
  const { loadKeys } = useAiKeysStore();
  const keys = useAiKeysStore((s) => s.keys);
  const offlineStatus = useOfflineStore((s) => s.status);
  const userRatings = useModelRatingStore((s) => s.ratings);

  const [serverKeys, setServerKeys] = useState<
    Partial<Record<AiProvider, boolean>>
  >({});
  const [serverKeysError, setServerKeysError] = useState(false);

  useEffect(() => {
    loadKeys();
    let active = true;
    getToken()
      .then((token) => {
        if (!token) return;
        return api.ai
          .providers(token)
          .then((res) => {
            if (!active) return;
            const status: Partial<Record<AiProvider, boolean>> = {};
            for (const provider of AI_PROVIDERS) {
              status[provider] =
                res.providers[provider]?.serverKeyConfigured ?? false;
            }
            setServerKeys(status);
            setServerKeysError(false);
          })
          .catch((err: unknown) => {
            if (!active) return;
            console.warn("[AI Models] Failed to fetch provider status:", err);
            setServerKeysError(true);
          });
      })
      .catch(() => {
        if (active) setServerKeysError(true);
      });
    return () => {
      active = false;
    };
  }, [getToken, loadKeys]);

  const providerStatus = useCallback(
    (provider: AiProvider): ProviderStatus => {
      if (provider === "offline") {
        if (offlineStatus === "ready" || offlineStatus === "downloaded")
          return "ready";
        if (offlineStatus === "downloading") return "unknown";
        return "needs-key";
      }
      if (keys[provider]) return "ready";
      if (serverKeysError) return "unknown";
      return serverKeys[provider] ? "ready" : "needs-key";
    },
    [keys, serverKeys, serverKeysError, offlineStatus],
  );

  const modelGroups = useMemo(() => {
    const providers =
      Platform.OS === "web"
        ? PROVIDER_ORDER.filter((provider) => provider !== "offline")
        : PROVIDER_ORDER;
    return providers
      .map((provider) => ({
        provider,
        models: sortModels(
          AI_MODELS.filter((model) => model.provider === provider),
          userRatings,
        ),
      }))
      .filter((group) => group.models.length > 0);
  }, [userRatings]);

  return {
    keys,
    serverKeys,
    serverKeysError,
    offlineStatus,
    providerStatus,
    userRatings,
    modelGroups,
  };
}
