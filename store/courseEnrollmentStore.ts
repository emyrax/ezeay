import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../lib/api";
import { useBountyStore } from "./bountyStore";
import { useCourseStore } from "./courseStore";
import { useProgressStore } from "./courseProgressStore";
import { useUserStore } from "./userStore";
import { useUserTrophyStore } from "./userTrophyStore";
import type { CourseEnrollment } from "../types/courseEnrollment";

const ENROLLMENT_STORAGE_KEY = "@yuinx_enrollments_v1";

const completionLocks = new Set<string>();

interface EnrollmentStore {
  enrollments: CourseEnrollment[];
  loaded: boolean;
  loading: boolean;
  error: string | null;
  fetchEnrollments: (
    userId: string,
    getToken: () => Promise<string | null>,
  ) => Promise<void>;
  enroll: (
    userId: string,
    courseId: string,
    getToken: () => Promise<string | null>,
  ) => Promise<{ success: boolean; error?: string }>;
  updateProgress: (
    enrollmentId: string,
    chapter: number,
    progress: number,
    progressDetails: string,
    getToken: () => Promise<string | null>,
  ) => Promise<{ success: boolean; error?: string }>;
  complete: (
    enrollmentId: string,
    getToken: () => Promise<string | null>,
  ) => Promise<{ success: boolean; error?: string }>;
  unenroll: (
    enrollmentId: string,
    getToken: () => Promise<string | null>,
  ) => Promise<{ success: boolean; error?: string }>;
  getEnrollmentForCourse: (courseId: string) => CourseEnrollment | undefined;
}

export const useEnrollmentStore = create<EnrollmentStore>((set, get) => ({
  enrollments: [],
  loaded: false,
  loading: false,
  error: null,

  fetchEnrollments: async (userId, getToken) => {
    const state = get();
    if (state.loading) return;

    set({ loading: true, error: null });

    try {
      const stored = await AsyncStorage.getItem(ENROLLMENT_STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as CourseEnrollment[];
          set({ enrollments: parsed, loaded: true, loading: false });
        } catch {
          // corrupted
        }
      }

      const token = await getToken();
      if (token) {
        try {
          const result = await api.enrollments.getAll(userId, token);
          await AsyncStorage.setItem(ENROLLMENT_STORAGE_KEY, JSON.stringify(result));
          set({ enrollments: result, loaded: true, loading: false, error: null });
          for (const enrollment of result) {
            if (enrollment.progressDetails) {
              useProgressStore.getState().loadProgressFromDetails(enrollment.courseId, enrollment.progressDetails);
            }
          }
          return;
        } catch (err) {
          console.error("[EnrollmentStore] API fetch failed:", err);
        }
      }

      if (!get().loaded) {
        set({ loaded: true, loading: false, enrollments: [] });
      }
    } catch (err) {
      console.error("[EnrollmentStore] fetchEnrollments failed:", err);
      set({ loading: false, loaded: true, error: "Failed to load enrollments." });
    }
  },

  enroll: async (userId, courseId, getToken) => {
    const existing = get().enrollments.find(
      (e) => e.courseId === courseId && e.userId === userId,
    );
    if (existing) return { success: true };

    const token = await getToken();
    if (!token) return { success: false, error: "Not authenticated" };

    try {
      const enrollment = await api.enrollments.create(
        { userId, courseId },
        token,
      );

      set((state) => {
        const alreadyPresent = state.enrollments.some(
          (e) => e.id === enrollment.id || (e.courseId === courseId && e.userId === userId),
        );
        if (alreadyPresent) return state;
        return { enrollments: [...state.enrollments, enrollment] };
      });

      const updated = get().enrollments;
      await AsyncStorage.setItem(ENROLLMENT_STORAGE_KEY, JSON.stringify(updated));

      return { success: true };
    } catch (err) {
      console.error("[EnrollmentStore] enroll failed:", err);
      return { success: false, error: "Failed to enroll." };
    }
  },

  updateProgress: async (enrollmentId, chapter, progress, progressDetails, getToken) => {
    const token = await getToken();
    if (!token) return { success: false, error: "Not authenticated" };

    try {
      await api.enrollments.update(
        enrollmentId,
        { currentChapter: chapter, progress, progressDetails },
        token,
      );

      set((state) => ({
        enrollments: state.enrollments.map((e) =>
          e.id === enrollmentId
            ? { ...e, currentChapter: chapter, progress, progressDetails, lastAccessedAt: new Date().toISOString() }
            : e,
        ),
      }));

      await AsyncStorage.setItem(ENROLLMENT_STORAGE_KEY, JSON.stringify(get().enrollments));

      return { success: true };
    } catch (err) {
      console.error("[EnrollmentStore] updateProgress failed:", err);
      return { success: false, error: "Failed to update progress." };
    }
  },

  complete: async (enrollmentId, getToken) => {
    if (completionLocks.has(enrollmentId)) {
      return { success: true };
    }
    const token = await getToken();
    if (!token) return { success: false, error: "Not authenticated" };

    const enrollment = get().enrollments.find((e) => e.id === enrollmentId);
    if (!enrollment) return { success: false, error: "Enrollment not found" };
    if (enrollment.isCompleted) return { success: true };

    completionLocks.add(enrollmentId);
    try {
      await api.enrollments.update(
        enrollmentId,
        { isCompleted: true, progress: 1 },
        token,
      );

      set((state) => ({
        enrollments: state.enrollments.map((e) =>
          e.id === enrollmentId
            ? { ...e, isCompleted: true, progress: 1, lastAccessedAt: new Date().toISOString() }
            : e,
        ),
      }));

      await AsyncStorage.setItem(ENROLLMENT_STORAGE_KEY, JSON.stringify(get().enrollments));

      const course = useCourseStore.getState().getCourseById(enrollment.courseId);
      const profile = useUserStore.getState().profile;
      if (course && course.rewardXp > 0 && profile) {
        await useUserStore.getState().addRewards(
          course.rewardXp,
          Math.floor(course.rewardXp / 2),
          token,
        );

        const courseStore = useCourseStore.getState();
        const courses = courseStore.courses.map((c) =>
          c.id === course.id ? { ...c, completedModules: c.totalChapters, progress: 100 } : c,
        );
        courseStore.fetchCourses(profile.uid, getToken);

        const bountyStore = useBountyStore.getState();
        bountyStore.checkAutoComplete(courses);
        await bountyStore.autoClaimCompleted(getToken);

        useUserTrophyStore.getState().check(profile.uid, getToken);
      }

      return { success: true };
    } catch (err) {
      console.error("[EnrollmentStore] complete failed:", err);
      return { success: false, error: "Failed to mark complete." };
    } finally {
      completionLocks.delete(enrollmentId);
    }
  },

  unenroll: async (enrollmentId, getToken) => {
    const token = await getToken();
    if (!token) return { success: false, error: "Not authenticated" };

    try {
      await api.enrollments.remove(enrollmentId, token);

      set((state) => ({
        enrollments: state.enrollments.filter((e) => e.id !== enrollmentId),
      }));

      await AsyncStorage.setItem(ENROLLMENT_STORAGE_KEY, JSON.stringify(get().enrollments));

      return { success: true };
    } catch (err) {
      console.error("[EnrollmentStore] unenroll failed:", err);
      return { success: false, error: "Failed to un-enroll." };
    }
  },

  getEnrollmentForCourse: (courseId) => {
    return get().enrollments.find((e) => e.courseId === courseId);
  },
}));
