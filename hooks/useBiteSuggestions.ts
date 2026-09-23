import { useCallback, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";
import {
  ensureOfflineActivated,
  isOfflineRef,
  modelErrorMessage,
  offlineGenerateObject,
} from "../lib/providers/offline";
import { shapeToSchema } from "../lib/offline/jsonSchema";
import { buildStudySuggestPrompt, resolveMaterialContent } from "../lib/offline/studyPrompts";
import { useModelStore } from "../store/modelStore";
import { useStatsStore } from "../store/statsStore";
import type { StudySuggestion, StudySuggestionType } from "../types/study";

const ALLOWED_TYPES = new Set<StudySuggestionType>([
  "mnemonic",
  "analogy",
  "story",
  "examTip",
  "hook",
  "connection",
]);

function normalizeSuggestions(raw: StudySuggestion[] | undefined): StudySuggestion[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s) => ({
      type: (typeof s?.type === "string" ? s.type : "hook") as StudySuggestionType,
      title: typeof s?.title === "string" ? s.title.trim().slice(0, 120) : "Quick idea",
      body: typeof s?.body === "string" ? s.body.trim() : "",
    }))
    .filter(
      (s) => ALLOWED_TYPES.has(s.type) && s.body.length > 0 && s.title.length > 0,
    )
    .slice(0, 6);
}

export function useBiteSuggestions() {
  const { profile, getToken } = useAuth();
  const [suggestions, setSuggestions] = useState<StudySuggestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (materialId: string, bite?: { title?: string; content?: string }) => {
      setLoading(true);
      setError(null);
      try {
        let result: StudySuggestion[];
        if (isOfflineRef(useModelStore.getState().selectedModel)) {
          await ensureOfflineActivated(useModelStore.getState().selectedModel);
          const resolved =
            bite && bite.content && bite.content.trim()
              ? { title: bite.title || "Study page", content: bite.content }
              : await resolveMaterialContent(materialId, getToken);
          const prompt = buildStudySuggestPrompt(resolved);
          const data = await offlineGenerateObject<{ suggestions?: StudySuggestion[] }>(
            shapeToSchema(prompt.jsonShape),
            { system: prompt.system },
          );
          result = normalizeSuggestions(
            Array.isArray(data?.suggestions) ? data.suggestions : undefined,
          );
        } else {
          const token = await getToken();
          if (!token) throw new Error("Not authenticated");
          const res = await api.study.suggest(
            materialId,
            { biteTitle: bite?.title, biteContent: bite?.content },
            token,
          );
          result = normalizeSuggestions(
            Array.isArray(res?.suggestions) ? res.suggestions : undefined,
          );
        }

        if (result.length === 0) {
          setError("No suggestions generated. Try again in a moment.");
        }
        setSuggestions(result);

        if (profile?.uid) {
          useStatsStore
            .getState()
            .recordActivity(profile.uid, getToken, 1)
            .catch(() => {});
        }
      } catch (err) {
        setError(modelErrorMessage(err) || "Could not generate suggestions. Try again.");
      } finally {
        setLoading(false);
      }
    },
    [profile, getToken],
  );

  return { suggestions, loading, error, generate };
}