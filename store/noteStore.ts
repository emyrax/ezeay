import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../lib/api";
import type { AudioClip, Note, NoteImage, NoteTag, NoteQuizQuestion, RepeatType } from "../types/note";

const STORAGE_KEY = "@yuinx_notes_v1";

function generateId(): string {
  return `note_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

interface NoteStore {
  notes: Note[];
  tags: NoteTag[];
  loaded: boolean;
  loading: boolean;
  loadNotes: () => Promise<void>;
  createNote: (partial?: Partial<Note>) => string;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  addTag: (name: string, color: string) => NoteTag;
  updateTag: (id: string, updates: Partial<NoteTag>) => void;
  deleteTag: (id: string) => void;
  togglePin: (id: string) => void;
  indexNote: (
    noteId: string,
    title: string,
    content: string,
    getToken: () => Promise<string | null>,
  ) => Promise<void>;
  unindexNote: (
    noteId: string,
    getToken: () => Promise<string | null>,
  ) => Promise<void>;
  sortedNotes: () => Note[];
}

function persistAll(notes: Note[], tags: NoteTag[]): void {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ notes, tags })).catch((err) =>
    console.error("[NoteStore] persist failed:", err),
  );
}

function normalizeRepeatType(raw: unknown): RepeatType {
  const value = raw as RepeatType;
  return value === "none" || value === "daily" || value === "weekly" || value === "monthly"
    ? value
    : "none";
}

function normalizeNote(raw: Record<string, unknown>): Note {
  return {
    id: raw.id as string,
    title: (raw.title as string) ?? "",
    content: (raw.content as string) ?? "",
    tags: (raw.tags as string[]) ?? [],
    pinned: (raw.pinned as boolean) ?? false,
    reminderAt: (raw.reminderAt ?? raw.reminderDate ?? null) as number | null,
    notificationId: (raw.notificationId as string) ?? null,
    repeatType: normalizeRepeatType(raw.repeatType),
    images: ((raw.images as Array<Record<string, unknown>>) ?? []).map((c) => ({
      id: c.id as string,
      uri: c.uri as string,
      createdAt: (c.createdAt as number) ?? Date.now(),
    })),
    audioClips: ((raw.audioClips as Array<Record<string, unknown>>) ?? []).map((c) => ({
      id: c.id as string,
      uri: c.uri as string,
      duration: (c.duration as number) ?? 0,
      createdAt: (c.createdAt as number) ?? Date.now(),
      waveform: (c.waveform as number[]) ?? [],
    })),
    summary: (raw.summary as string) ?? null,
    quiz: (raw.quiz as NoteQuizQuestion[] | undefined) ?? null,
    createdAt: (raw.createdAt as number) ?? Date.now(),
    updatedAt: (raw.updatedAt as number) ?? Date.now(),
  };
}

export const useNoteStore = create<NoteStore>((set, get) => ({
  notes: [],
  tags: [
    { id: "tag_lecture", name: "Lecture", color: "#3B82F6" },
    { id: "tag_idea", name: "Idea", color: "#8B5CF6" },
    { id: "tag_todo", name: "To-Do", color: "#10B981" },
    { id: "tag_summary", name: "Summary", color: "#F59E0B" },
    { id: "tag_question", name: "Question", color: "#EF4444" },
    { id: "tag_reference", name: "Reference", color: "#06B4D6" },
    { id: "tag_reading", name: "Reading", color: "#EC4899" },
    { id: "tag_project", name: "Project", color: "#14B8A6" },
  ],
  loaded: false,
  loading: false,

  loadNotes: async () => {
    set({ loading: true });
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { notes: Note[]; tags: NoteTag[] };
        const notes = (parsed.notes || []).map((n: Note) => normalizeNote(n as unknown as Record<string, unknown>));
        set({ notes, tags: parsed.tags || get().tags, loaded: true, loading: false });
      } else {
        set({ loaded: true, loading: false });
      }
    } catch (err) {
      console.error("[NoteStore] loadNotes failed:", err);
      set({ loaded: true, loading: false });
    }
  },

  createNote: (partial) => {
    const now = Date.now();
    const id = generateId();
    const note: Note = {
      id,
      title: "",
      content: "",
      tags: [],
      pinned: false,
      reminderAt: null,
      notificationId: null,
      repeatType: "none",
      images: [],
      audioClips: [],
      summary: null,
      quiz: null,
      createdAt: now,
      updatedAt: now,
      ...partial,
    };
    set((state) => {
      const notes = [note, ...state.notes];
      persistAll(notes, state.tags);
      return { notes };
    });
    return id;
  },

  updateNote: (id, updates) => {
    set((state) => {
      const notes = state.notes.map((n) =>
        n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n,
      );
      persistAll(notes, state.tags);
      return { notes };
    });
  },

  deleteNote: (id) => {
    set((state) => {
      const notes = state.notes.filter((n) => n.id !== id);
      persistAll(notes, state.tags);
      return { notes };
    });
  },

  addTag: (name, color) => {
    const id = `tag_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const tag: NoteTag = { id, name, color };
    set((state) => {
      const tags = [...state.tags, tag];
      persistAll(state.notes, tags);
      return { tags };
    });
    return tag;
  },

  updateTag: (id, updates) => {
    set((state) => {
      const tags = state.tags.map((t) => (t.id === id ? { ...t, ...updates } : t));
      persistAll(state.notes, tags);
      return { tags };
    });
  },

  deleteTag: (id) => {
    set((state) => {
      const tags = state.tags.filter((t) => t.id !== id);
      const notes = state.notes.map((n) => ({
        ...n,
        tags: n.tags.filter((t) => t !== id),
      }));
      persistAll(notes, tags);
      return { tags, notes };
    });
  },

  togglePin: (id) => {
    set((state) => {
      const notes = state.notes.map((n) =>
        n.id === id ? { ...n, pinned: !n.pinned, updatedAt: Date.now() } : n,
      );
      persistAll(notes, state.tags);
      return { notes };
    });
  },

  sortedNotes: () => {
    const { notes } = get();
    return [...notes].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    });
  },

  indexNote: async (noteId, title, content, getToken) => {
    const token = await getToken();
    if (!token) return;
    try {
      await api.notes.index({ noteId, title, content }, token);
    } catch (err) {
      console.error("[NoteStore] indexNote failed:", err);
    }
  },

  unindexNote: async (noteId, getToken) => {
    const token = await getToken();
    if (!token) return;
    try {
      await api.notes.unindex(noteId, token);
    } catch (err) {
      console.error("[NoteStore] unindexNote failed:", err);
    }
  },
}));