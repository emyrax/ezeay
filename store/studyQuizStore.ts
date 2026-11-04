import { create } from "zustand";
import { api, friendlyError } from "../lib/api";
import type { StudyQuiz } from "../types/study";
import { useModelStore } from "../store/modelStore";
import {
  ensureOfflineActivated,
  isOfflineRef,
  modelErrorMessage,
  offlineGenerateObject,
} from "../lib/providers/offline";
import { shapeToSchema } from "../lib/offline/jsonSchema";
import { normalizeQuizQuestions } from "../lib/quiz/normalize";
import { buildStudyQuizPrompt, resolveMaterialContent } from "../lib/offline/studyPrompts";

interface StudyQuizStore {
  questions: StudyQuiz[] | null;
  materialId: string | null;
  loading: boolean;
  error: string | null;
  generate: (
    materialId: string,
    getToken: () => Promise<string | null>,
  ) => Promise<void>;
  clear: () => void;
}

async function generateOfflineQuiz(
  materialId: string,
  getToken: () => Promise<string | null>,
): Promise<StudyQuiz[]> {
  const selected = useModelStore.getState().selectedModel;
  await ensureOfflineActivated(selected);
  const { title, content } = await resolveMaterialContent(materialId, getToken);
  const prompt = buildStudyQuizPrompt({ title, content });
  const data = await offlineGenerateObject<{ questions: StudyQuiz[] }>(
    shapeToSchema(prompt.jsonShape),
    { system: prompt.system },
  );
  return normalizeQuizQuestions(data, {
    maxQuestions: 5,
    idPrefix: `offline_q_${materialId}_`,
  }).map(({ id, question, options, correctAnswer }) => ({
    id,
    question,
    options,
    correctAnswer,
  }));
}

export const useStudyQuizStore = create<StudyQuizStore>((set) => ({
  questions: null,
  materialId: null,
  loading: false,
  error: null,

  generate: async (materialId, getToken) => {
    if (isOfflineRef(useModelStore.getState().selectedModel)) {
      set({ loading: true, error: null });
      try {
        const questions = await generateOfflineQuiz(materialId, getToken);
        if (questions.length === 0) {
          set({
            loading: false,
            error: "No questions generated. Try again in a moment.",
          });
          return;
        }
        set({ questions, materialId, loading: false, error: null });
      } catch (err: any) {
        console.error("[StudyQuizStore] offline generate failed:", err);
        set({
          loading: false,
          error: modelErrorMessage(err) || "Quiz generation failed",
        });
      }
      return;
    }

    set({ loading: true, error: null });
    try {
      const token = await getToken();
      if (!token) {
        set({ loading: false, error: "Not authenticated" });
        return;
      }
      const res = await api.study.generateQuiz(materialId, token);
      const questions = Array.isArray(res?.questions) ? res.questions : [];
      if (questions.length === 0) {
        set({
          loading: false,
          error: "No questions generated. Try again in a moment.",
        });
        return;
      }
      set({ questions, materialId, loading: false, error: null });
    } catch (err) {
      console.error("[StudyQuizStore] generate failed:", err);
      set({ loading: false, error: friendlyError(err, "Quiz generation failed") });
    }
  },

  clear: () => set({ questions: null, materialId: null, loading: false, error: null }),
}));