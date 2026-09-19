import { create } from "zustand";
import { api } from "../lib/api";
import type { Flashcard } from "../types/flashcard";
import { useModelStore } from "../store/modelStore";
import {
  ensureOfflineActivated,
  isOfflineRef,
  modelErrorMessage,
  offlineGenerateObject,
} from "../lib/providers/offline";
import { shapeToSchema } from "../lib/offline/jsonSchema";
import { buildStudyFlashcardsPrompt, resolveMaterialContent } from "../lib/offline/studyPrompts";

const LOCAL_ID_PREFIX = "local_";

export function isLocalFlashcard(id?: string | null): boolean {
  return typeof id === "string" && id.startsWith(LOCAL_ID_PREFIX);
}

function makeLocalFlashcard(
  materialId: string,
  title: string,
  front: string,
  back: string,
  index: number,
): Flashcard {
  const now = new Date();
  const due = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
  return {
    id: `${LOCAL_ID_PREFIX}${Date.now()}_${index}`,
    sourceType: "material",
    sourceId: materialId,
    sourceTitle: title,
    front,
    back,
    intervalDays: 0,
    ease: 2.5,
    repetitions: 0,
    lapses: 0,
    dueAt: due,
    createdAt: now.toISOString(),
  };
}

async function generateOfflineFlashcards(
  materialId: string,
  getToken: () => Promise<string | null>,
): Promise<Flashcard[]> {
  const selected = useModelStore.getState().selectedModel;
  await ensureOfflineActivated(selected);
  const { title, content } = await resolveMaterialContent(materialId, getToken);
  const prompt = buildStudyFlashcardsPrompt({ title, content });
  const data = await offlineGenerateObject<{ flashcards: { front: string; back: string }[] }>(
    shapeToSchema(prompt.jsonShape),
    { system: prompt.system },
  );
  const cards = Array.isArray(data?.flashcards)
    ? data.flashcards
        .map((f, i) => ({
          front: typeof f?.front === "string" ? f.front.trim() : "",
          back: typeof f?.back === "string" ? f.back.trim() : "",
          index: i,
        }))
        .filter((f) => f.front && f.back)
        .map((f, i) => makeLocalFlashcard(materialId, title, f.front, f.back, f.index))
    : [];
  return cards.slice(0, 8);
}

interface FlashcardStore {
  cards: Flashcard[];
  loaded: boolean;
  loading: boolean;
  error: string | null;
  fetchCards: (
    dueOnly: boolean,
    getToken: () => Promise<string | null>,
  ) => Promise<void>;
  generateForMaterial: (
    materialId: string,
    getToken: () => Promise<string | null>,
  ) => Promise<{ cardCount: number } | null>;
  applyReview: (result: {
    id: string;
    intervalDays: number;
    ease: number;
    repetitions: number;
    lapses: number;
    dueAt: string;
  }) => void;
  clearError: () => void;
}

export const useFlashcardStore = create<FlashcardStore>((set, get) => ({
  cards: [],
  loaded: false,
  loading: false,
  error: null,

  fetchCards: async (dueOnly, getToken) => {
    const token = await getToken();
    if (!token || get().loading) return;
    set({ loading: true, error: null });
    try {
      const cards = await api.flashcards.getAll(token, dueOnly);
      set({ cards, loaded: true, loading: false });
    } catch (err: any) {
      console.error("[FlashcardStore] fetchCards failed:", err);
      set({ loading: false, error: err.message || "Failed to load flashcards" });
    }
  },

  generateForMaterial: async (materialId, getToken) => {
    if (isOfflineRef(useModelStore.getState().selectedModel)) {
      set({ loading: true, error: null });
      try {
        const created = await generateOfflineFlashcards(materialId, getToken);
        if (created.length === 0) {
          set({
            loading: false,
            error: "No flashcards generated. Try again in a moment.",
          });
          return null;
        }
        const cards = [...created, ...get().cards].slice(0, 200);
        set({ cards, loaded: true, loading: false, error: null });
        return { cardCount: created.length };
      } catch (err: any) {
        console.error("[FlashcardStore] offline generate failed:", err);
        set({ loading: false, error: modelErrorMessage(err) });
        return null;
      }
    }

    const token = await getToken();
    if (!token) return null;
    set({ loading: true, error: null });
    try {
      const res = await api.study.generateFlashcards(materialId, token);
      const created = Array.isArray(res?.flashcards) ? res.flashcards : [];
      const cards = [...created, ...get().cards];
      set({ cards, loading: false });
      return { cardCount: created.length };
    } catch (err: any) {
      console.error("[FlashcardStore] generateForMaterial failed:", err);
      set({ loading: false, error: err.message || "Failed to generate flashcards" });
      return null;
    }
  },

  applyReview: (result) => {
    set((state) => ({
      cards: state.cards.map((c) =>
        c.id === result.id
          ? {
              ...c,
              intervalDays: result.intervalDays,
              ease: result.ease,
              repetitions: result.repetitions,
              lapses: result.lapses,
              dueAt: result.dueAt,
            }
          : c,
      ),
    }));
  },

  clearError: () => set({ error: null }),
}));