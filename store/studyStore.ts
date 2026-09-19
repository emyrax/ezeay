import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../lib/api";
import type { StudyMaterial, StudyBite, StudyQuiz, QuizResult } from "../types/study";

const STUDY_STORAGE_KEY = "@yuinx_study_v1";

interface StudyStore {
  materials: StudyMaterial[];
  loaded: boolean;
  loading: boolean;
  processing: boolean;
  error: string | null;
  fetchMaterials: (userId: string, getToken: () => Promise<string | null>) => Promise<void>;
  getMaterialById: (id: string) => StudyMaterial | undefined;
  processMaterial: (
    data: { fileUrl?: string; fileType: string; sourceType: string; title?: string; content?: string },
    getToken: () => Promise<string | null>,
  ) => Promise<StudyMaterial | null>;
  updateMaterial: (
    id: string,
    data: Partial<StudyMaterial>,
    token: string,
  ) => Promise<void>;
  deleteMaterial: (
    id: string,
    token: string,
  ) => Promise<void>;
  clearError: () => void;
}

export const useStudyStore = create<StudyStore>((set, get) => ({
  materials: [],
  loaded: false,
  loading: false,
  processing: false,
  error: null,

  fetchMaterials: async (userId, getToken) => {
    const state = get();
    if (state.loading) return;

    set({ loading: true, error: null });

    try {
      const stored = await AsyncStorage.getItem(STUDY_STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as StudyMaterial[];
          set({ materials: parsed, loaded: true, loading: false });
        } catch {
          /* corrupted cache */
        }
      }

      const token = await getToken();
      if (token) {
        try {
          const result = await api.study.getAll(userId, token);
          const normalized = result.map(normalizeMaterial);
          await AsyncStorage.setItem(STUDY_STORAGE_KEY, JSON.stringify(normalized));
          set({ materials: normalized, loaded: true, loading: false, error: null });
          return;
        } catch (err) {
          console.error("[StudyStore] API fetch failed:", err);
        }
      }

      if (!get().loaded) {
        set({ loaded: true, loading: false, materials: [] });
      }
    } catch (err) {
      console.error("[StudyStore] fetchMaterials failed:", err);
      set({ loading: false, loaded: true, error: "Failed to load study materials." });
    }
  },

  getMaterialById: (id) => {
    return get().materials.find((m) => m.id === id);
  },

  processMaterial: async (data, getToken) => {
    set({ processing: true, error: null });

    const placeholder: StudyMaterial = {
      id: `processing_${Date.now()}`,
      title: data.title || "Processing...",
      type: data.fileType as StudyMaterial["type"],
      sourceType: data.sourceType as StudyMaterial["sourceType"],
      fileUri: data.fileUrl || "",
      extractedContent: "",
      bites: [],
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    set((state) => ({
      materials: [placeholder, ...state.materials],
    }));

    const token = await getToken();
    if (!token) {
      set((state) => ({
        materials: state.materials.filter((m) => m.id !== placeholder.id),
        processing: false,
        error: "Not authenticated",
      }));
      return null;
    }

    try {
      const result = await api.study.process(data, token);
      const normalized = normalizeMaterial(result);

      set((state) => ({
        materials: state.materials.map((m) => (m.id === placeholder.id ? normalized : m)),
        processing: false,
      }));

      const updated = get().materials.map((m) =>
        m.id === placeholder.id ? normalized : m,
      );
      await AsyncStorage.setItem(STUDY_STORAGE_KEY, JSON.stringify(updated));

      return normalized;
    } catch (err: any) {
      console.error("[StudyStore] processMaterial failed:", err);
      set((state) => ({
        materials: state.materials.filter((m) => m.id !== placeholder.id),
        processing: false,
        error: err.message || "Failed to process material",
      }));
      return null;
    }
  },

  updateMaterial: async (id, data, token) => {
    try {
      await api.study.update(id, data, token);

      set((state) => ({
        materials: state.materials.map((m) =>
          m.id === id ? { ...m, ...data, updatedAt: Date.now() } : m,
        ),
      }));

      await AsyncStorage.setItem(STUDY_STORAGE_KEY, JSON.stringify(get().materials));
    } catch (err: any) {
      console.error("[StudyStore] updateMaterial failed:", err);
      set({ error: err.message || "Failed to update material" });
    }
  },

  deleteMaterial: async (id, token) => {
    try {
      await api.study.delete(id, token);

      set((state) => ({
        materials: state.materials.filter((m) => m.id !== id),
      }));

      await AsyncStorage.setItem(STUDY_STORAGE_KEY, JSON.stringify(get().materials));
    } catch (err: any) {
      console.error("[StudyStore] deleteMaterial failed:", err);
      set({ error: err.message || "Failed to delete material" });
    }
  },

  clearError: () => set({ error: null }),
}));

function normalizeMaterial(raw: any): StudyMaterial {
  return {
    id: raw.id,
    title: raw.title || "Untitled",
    type: raw.type || "txt",
    sourceType: raw.sourceType || "file",
    fileUri: raw.fileUri,
    thumbnailUrl: raw.thumbnailUrl,
    extractedContent:
      typeof raw.extractedContent === "string"
        ? raw.extractedContent
        : JSON.stringify(raw.extractedContent),
    summary: raw.summary || "",
    bites: parseBites(raw.bites),
    timetable: raw.timetable ? parseTimetable(raw.timetable) : undefined,
    tags: typeof raw.tags === "string" ? JSON.parse(raw.tags) : raw.tags || [],
    createdAt: typeof raw.createdAt === "string" ? new Date(raw.createdAt).getTime() : raw.createdAt,
    updatedAt: raw.updatedAt
      ? typeof raw.updatedAt === "string"
        ? new Date(raw.updatedAt).getTime()
        : raw.updatedAt
      : Date.now(),
  };
}

function parseBites(bites: any): StudyBite[] {
  if (!bites) return [];
  if (Array.isArray(bites)) return bites;
  if (typeof bites === "string") {
    try {
      return JSON.parse(bites);
    } catch {
      return [];
    }
  }
  return [];
}

function parseTimetable(timetable: any): { slots: { id: string; day: string; startTime: string; endTime: string; subject: string; location: string }[] } {
  if (typeof timetable === "string") {
    try {
      return JSON.parse(timetable);
    } catch {
      return { slots: [] };
    }
  }
  return timetable || { slots: [] };
}
