import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../lib/api";
import { scheduleCourseNotification } from "../lib/notifications";
import { useBountyStore } from "./bountyStore";
import { useUserStore } from "./userStore";
import type { Course } from "../types/course";
import type { GenerateCourseInput } from "../types/courseGeneration";

const COURSE_STORAGE_KEY = "@yuinx_courses_v1";

function placeholderCourse(input: GenerateCourseInput): Course {
  return {
    id: `generating_${Date.now()}`,
    title: input.title || "Generating...",
    description: input.description,
    category: input.category,
    difficulty: input.difficulty,
    totalChapters: 0,
    rewardXp: 0,
    icon: "sparkles",
    creatorId: "",
    creatorName: input.creatorName,
    creatorAvatar: input.creatorAvatar,
    createdAt: new Date().toISOString(),
  };
}

async function persistCourses(courses: Course[]) {
  await AsyncStorage.setItem(COURSE_STORAGE_KEY, JSON.stringify(courses));
}

interface CourseStore {
  courses: Course[];
  loaded: boolean;
  loading: boolean;
  generating: boolean;
  error: string | null;
  fetchCourses: (userId: string, getToken: () => Promise<string | null>) => Promise<void>;
  getCourseById: (id: string) => Course | undefined;
  generateCourse: (
    input: GenerateCourseInput,
    getToken: () => Promise<string | null>,
  ) => void;
  generateThumbnail: (
    courseId: string,
    prompt: string,
    getToken: () => Promise<string | null>,
  ) => Promise<void>;
  togglePin: (id: string, getToken: () => Promise<string | null>) => Promise<void>;
  toggleFavorite: (id: string, getToken: () => Promise<string | null>) => Promise<void>;
  setCourseVisibility: (
    id: string,
    isPublic: boolean,
    getToken: () => Promise<string | null>,
  ) => Promise<void>;
  upsertCourse: (course: Course) => Promise<void>;
  deleteCourse: (id: string, getToken: () => Promise<string | null>) => Promise<void>;
  myCourses: (userId: string) => Course[];
  retry: () => Promise<void>;
}

let lastFetchParams: { userId: string; getToken: () => Promise<string | null> } | null = null;

export const useCourseStore = create<CourseStore>((set, get) => ({
  courses: [],
  loaded: false,
  loading: false,
  generating: false,
  error: null,

  fetchCourses: async (userId, getToken) => {
    const state = get();
    if (state.loading) return;

    lastFetchParams = { userId, getToken };
    set({ loading: true, error: null });

    try {
      const stored = await AsyncStorage.getItem(COURSE_STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as Course[];
          set({ courses: parsed, loaded: true, loading: false });
        } catch {
          // corrupted cache, continue to API
        }
      }

      const token = await getToken();
      if (token && userId) {
        try {
          const result = await api.courses.getAll(userId, token);
          await AsyncStorage.setItem(COURSE_STORAGE_KEY, JSON.stringify(result));
          set({ courses: result, loaded: true, loading: false, error: null });
          return;
        } catch (err) {
          console.error("[CourseStore] API fetch failed:", err);
        }
      }

      if (!get().loaded) {
        set({ loaded: true, loading: false, courses: [] });
      }
    } catch (err) {
      console.error("[CourseStore] fetchCourses failed:", err);
      set({ loading: false, loaded: true, error: "Failed to load courses." });
    }
  },

  getCourseById: (id) => {
    return get().courses.find((c) => c.id === id);
  },

  generateCourse: (input, getToken) => {
    const placeholder = placeholderCourse(input);

    set((state) => ({
      courses: [placeholder, ...state.courses],
      generating: true,
      error: null,
    }));

    (async () => {
      const token = await getToken();
      if (!token) {
        set((state) => ({
          courses: state.courses.filter((c) => c.id !== placeholder.id),
          generating: false,
          error: "Not authenticated",
        }));
        return;
      }

      try {
        const result = await api.courses.generate(input, token);
        const course = result.course as Course;

        set((state) => {
          const placeholderStillPresent = state.courses.some(
            (c) => c.id === placeholder.id,
          );
          return {
            courses: placeholderStillPresent
              ? state.courses.map((c) => (c.id === placeholder.id ? course : c))
              : [course, ...state.courses],
            generating: false,
            error: null,
          };
        });

        const updated = get().courses;
        await AsyncStorage.setItem(COURSE_STORAGE_KEY, JSON.stringify(updated));

        scheduleCourseNotification(course.title);

        if (course.thumbnailPrompt) {
          get().generateThumbnail(course.id, course.thumbnailPrompt, getToken);
        }

        const bountyStore = useBountyStore.getState();
        const profile = useUserStore.getState().profile;
        if (profile) {
          bountyStore.checkAutoComplete(updated);
          bountyStore.autoClaimCompleted(getToken);
        }
      } catch (err: any) {
        console.error("[CourseStore] generateCourse failed:", err);
        set((state) => ({
          courses: state.courses.filter((c) => c.id !== placeholder.id),
          generating: false,
          error: err.message ?? "Failed to generate course",
        }));
      }
    })();
  },

  generateThumbnail: async (courseId, prompt, getToken) => {
    try {
      const token = await getToken();
      if (!token) return;

      const result = await api.courses.generateThumbnail(courseId, prompt, token);

      set((state) => ({
        courses: state.courses.map((c) =>
          c.id === courseId ? { ...c, thumbnailUrl: result.thumbnailUrl } : c,
        ),
      }));

      const updated = get().courses;
      await AsyncStorage.setItem(COURSE_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error("[CourseStore] generateThumbnail failed:", err);
    }
  },

  togglePin: async (id, getToken) => {
    const current = get().courses.find((c) => c.id === id);
    const next = !current?.pinned;
    set((state) => ({
      courses: state.courses.map((c) => (c.id === id ? { ...c, pinned: next } : c)),
    }));
    await persistCourses(get().courses);

    if (id.startsWith("generating_")) return;
    const token = await getToken();
    if (!token) return;
    try {
      await api.courses.updateFlags(id, { pinned: next }, token);
    } catch (err) {
      console.error("[CourseStore] togglePin failed:", err);
      get().retry();
    }
  },

  toggleFavorite: async (id, getToken) => {
    const current = get().courses.find((c) => c.id === id);
    const next = !current?.favorite;
    set((state) => ({
      courses: state.courses.map((c) => (c.id === id ? { ...c, favorite: next } : c)),
    }));
    await persistCourses(get().courses);

    if (id.startsWith("generating_")) return;
    const token = await getToken();
    if (!token) return;
    try {
      await api.courses.updateFlags(id, { favorite: next }, token);
    } catch (err) {
      console.error("[CourseStore] toggleFavorite failed:", err);
      get().retry();
    }
  },

  setCourseVisibility: async (id, isPublic, getToken) => {
    set((state) => ({
      courses: state.courses.map((c) =>
        c.id === id
          ? {
              ...c,
              isPublic,
              sharedAt: isPublic ? new Date().toISOString() : undefined,
            }
          : c,
      ),
    }));
    await persistCourses(get().courses);

    if (id.startsWith("generating_")) return;
    const token = await getToken();
    if (!token) return;
    try {
      await api.courses.updateFlags(id, { isPublic }, token);
    } catch (err) {
      console.error("[CourseStore] setCourseVisibility failed:", err);
      get().retry();
    }
  },

  upsertCourse: async (course) => {
    set((state) => {
      const exists = state.courses.some((c) => c.id === course.id);
      return {
        courses: exists
          ? state.courses.map((c) => (c.id === course.id ? course : c))
          : [course, ...state.courses],
      };
    });
    await persistCourses(get().courses);
  },

  deleteCourse: async (id, getToken) => {
    if (!id.startsWith("generating_")) {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      await api.courses.delete(id, token);
    }
    set((state) => ({
      courses: state.courses.filter((c) => c.id !== id),
    }));
    await persistCourses(get().courses);
  },

  myCourses: (userId) => {
    return get()
      .courses.filter((c) => c.creatorId === userId || c.id.startsWith("generating_"))
      .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  },

  retry: async () => {
    if (lastFetchParams) {
      await get().fetchCourses(lastFetchParams.userId, lastFetchParams.getToken);
    }
  },
}));
