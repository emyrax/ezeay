import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../lib/api";
import { generateFallbackBounties } from "../data/bountyTemplates";
import { eventBus } from "../lib/eventBus";
import { useUserStore } from "./userStore";
import { useStatsStore } from "./statsStore";
import type { Bounty, BountyStatus } from "../types/bounty";
import type { Course } from "../types/course";

export interface HiddenGem {
  id: string;
  title: string;
  description: string;
  rewardXP: number;
  rewardCoins: number;
  condition: string;
  status: BountyStatus;
}

const HIDDEN_GEMS: HiddenGem[] = [
  {
    id: "gem_first_course",
    title: "First Quest Complete",
    description: "Complete your first course",
    rewardXP: 5,
    rewardCoins: 3,
    condition: "complete_first_course",
    status: "active",
  },
  {
    id: "gem_three_courses",
    title: "Curious Mind",
    description: "Create 3 courses",
    rewardXP: 8,
    rewardCoins: 5,
    condition: "create_three_courses",
    status: "active",
  },
  {
    id: "gem_five_subtopics",
    title: "Knowledge Seeker",
    description: "Complete 5 subtopics across any courses",
    rewardXP: 3,
    rewardCoins: 2,
    condition: "complete_five_subtopics",
    status: "active",
  },
];

const BOUNTY_STORAGE_KEY = "@yuinx_bounties_v1";

interface StoredBountyData {
  bounties: Bounty[];
  hiddenGems: HiddenGem[];
  generatedAt: number;
  courseSnapshot: Course[];
}

interface BountyStore {
  bounties: Bounty[];
  hiddenGems: HiddenGem[];
  generatedAt: number | null;
  courseSnapshot: Course[] | null;
  loaded: boolean;
  loading: boolean;
  error: string | null;

  loadBounties: (
    userId: string,
    getToken: () => Promise<string | null>,
    courses: Course[],
  ) => Promise<void>;
  checkAutoComplete: (courses: Course[], totalCompletedSubtopics?: number) => void;
  claimBounty: (
    bountyId: string,
    getToken: () => Promise<string | null>,
  ) => Promise<{ success: boolean; error?: string }>;
  autoClaimCompleted: (
    getToken: () => Promise<string | null>,
  ) => Promise<{ title: string; xp: number; coins: number }[]>;
  forceRegenerate: (
    userId: string,
    getToken: () => Promise<string | null>,
    courses: Course[],
  ) => Promise<void>;
  clearBounties: () => void;
}

function getDateSeed(): string {
  const sixHours = 6 * 60 * 60 * 1000;
  const epoch = Math.floor(Date.now() / sixHours);
  return `seed_${epoch}`;
}

function persistBountyData(data: StoredBountyData): void {
  AsyncStorage.setItem(BOUNTY_STORAGE_KEY, JSON.stringify(data)).catch((err) =>
    console.error("[BountyStore] Failed to persist:", err),
  );
}

type CourseForBounties = {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  totalChapters: number;
  progress: number;
  completedModules: number;
};

function toCourseForBounties(course: Course): CourseForBounties {
  return {
    id: course.id,
    title: course.title,
    category: course.category,
    difficulty: course.difficulty,
    totalChapters: course.totalChapters,
    progress: course.progress ?? 0,
    completedModules: course.completedModules ?? 0,
  };
}

export const useBountyStore = create<BountyStore>((set, get) => ({
  bounties: [],
  hiddenGems: HIDDEN_GEMS.map((g) => ({ ...g })),
  generatedAt: null,
  courseSnapshot: null,
  loaded: false,
  loading: false,
  error: null,

  loadBounties: async (userId, getToken, courses) => {
    const state = get();
    if (state.loading) return;

    set({ loading: true, error: null });

    try {
      const storedRaw = await AsyncStorage.getItem(BOUNTY_STORAGE_KEY);
      let stored: StoredBountyData | null = null;

      if (storedRaw) {
        try {
          stored = JSON.parse(storedRaw) as StoredBountyData;
        } catch {
          stored = null;
        }
      }

      const now = Date.now();
      const sixHours = 6 * 60 * 60 * 1000;
      const dateSeed = getDateSeed();

      const needsRegen = !stored || (now - stored.generatedAt >= sixHours);

      if (needsRegen) {
        const token = await getToken();
        let bounties: Bounty[] = [];
        let usedFallback = false;

        if (token) {
          try {
            const result = await api.bounties.generate(
              {
                courses: courses.map((c) => ({
                  id: c.id,
                  title: c.title,
                  category: c.category,
                  difficulty: c.difficulty,
                  progress: c.progress,
                  totalChapters: c.totalChapters,
                  completedModules: c.completedModules,
                })),
                userId,
                dateSeed,
              },
              token,
            );

            bounties = result.bounties.map((b: Record<string, unknown>) => ({
              id: b.id as string,
              title: b.title as string,
              description: b.description as string,
              difficulty: b.difficulty as Bounty["difficulty"],
              rewardXP: Math.max(1, Math.min(9, b.rewardXP as number)),
              rewardCoins: Math.max(1, Math.min(5, b.rewardCoins as number)),
              completionCondition: (b.completionCondition as string) ?? "",
              courseId: (b.courseId as string) ?? null,
              courseTitle: (b.courseTitle as string) ?? null,
              status: "active" as BountyStatus,
              progress: 0,
              generatedAt: now,
              expiresAt: now + sixHours,
            }));

            if (bounties.length !== 3) {
              bounties = [];
            }
          } catch (err) {
            console.error("[BountyStore] API generate failed:", err);
          }
        }

        if (bounties.length === 0) {
          bounties = generateFallbackBounties(courses.map(toCourseForBounties), dateSeed);
          usedFallback = true;
        }

        const data: StoredBountyData = {
          bounties,
          hiddenGems: get().hiddenGems,
          generatedAt: now,
          courseSnapshot: courses.map((c) => ({ ...c })),
        };

        persistBountyData(data);

        set({
          bounties,
          hiddenGems: get().hiddenGems,
          generatedAt: now,
          courseSnapshot: data.courseSnapshot,
          loaded: true,
          loading: false,
          error: usedFallback ? "Using offline fallback bounties" : null,
        });
      } else if (stored) {
        const updatedBounties = stored.bounties.map((b) => {
          if (b.status === "claimed" || b.status === "completed") return b;
          return now >= b.expiresAt
            ? { ...b, status: "expired" as BountyStatus }
            : { ...b, status: "active" as BountyStatus };
        });

        set({
          bounties: updatedBounties,
          hiddenGems: stored.hiddenGems ?? HIDDEN_GEMS.map((g) => ({ ...g })),
          generatedAt: stored.generatedAt,
          courseSnapshot: stored.courseSnapshot ?? [],
          loaded: true,
          loading: false,
        });

        get().checkAutoComplete(courses);
      }
    } catch (err) {
      console.error("[BountyStore] loadBounties failed:", err);
      set({
        loading: false,
        loaded: true,
        error: "Failed to load bounties. Pull down to retry.",
      });
    }
  },

  checkAutoComplete: (currentCourses, totalCompletedSubtopics = 0) => {
    const { bounties, courseSnapshot, hiddenGems } = get();

    const updatedBounties = bounties.map((bounty) => {
      if (bounty.status !== "active" && bounty.status !== "expired") return bounty;

      if (bounty.courseId) {
        const current = currentCourses.find((c) => c.id === bounty.courseId);
        const snapshot = courseSnapshot?.find((c) => c.id === bounty.courseId);

        if (current && snapshot) {
          const modulesCompleted = (current.completedModules ?? 0) - (snapshot.completedModules ?? 0);
          const progressIncreased = (current.progress ?? 0) > (snapshot.progress ?? 0);

          if (modulesCompleted > 0 || progressIncreased) {
            return {
              ...bounty,
              status: "completed" as BountyStatus,
              progress: Math.min(100, current.progress ?? 0),
            };
          }
        }
      } else {
        const condition = bounty.completionCondition;

        if (condition === "create_first_course" && currentCourses.length > 0) {
          return { ...bounty, status: "completed" as BountyStatus, progress: 100 };
        }

        if (condition === "open_app") {
          return { ...bounty, status: "completed" as BountyStatus, progress: 100 };
        }
      }

      return bounty;
    });

    let updatedGems = hiddenGems;
    if (currentCourses.length > 0) {
      updatedGems = hiddenGems.map((gem) => {
        if (gem.status !== "active") return gem;

        if (gem.condition === "complete_first_course") {
          const hasCompletedCourse = currentCourses.some(
            (c) => c.totalChapters > 0 && (c.completedModules ?? 0) >= c.totalChapters,
          );
          if (hasCompletedCourse) {
            return { ...gem, status: "completed" as BountyStatus };
          }
        }

        if (gem.condition === "create_three_courses") {
          if (currentCourses.length >= 3) {
            return { ...gem, status: "completed" as BountyStatus };
          }
        }

        if (gem.condition === "complete_five_subtopics") {
          if (totalCompletedSubtopics >= 5) {
            return { ...gem, status: "completed" as BountyStatus };
          }
        }

        return gem;
      });
    }

    const bountiesChanged = updatedBounties.some((b, i) => b.status !== bounties[i].status);
    const gemsChanged = updatedGems.some((g, i) => g.status !== hiddenGems[i].status);

    if (bountiesChanged || gemsChanged) {
      set({ bounties: updatedBounties, hiddenGems: updatedGems });

      const { generatedAt, courseSnapshot: snap } = get();
      if (generatedAt && snap) {
        persistBountyData({
          bounties: updatedBounties,
          hiddenGems: updatedGems,
          generatedAt,
          courseSnapshot: snap,
        });
      }
    }
  },

  claimBounty: async (bountyId, getToken) => {
    const { bounties } = get();
    const bounty = bounties.find((b) => b.id === bountyId);

    if (!bounty) return { success: false, error: "Bounty not found" };
    if (bounty.status !== "completed") return { success: false, error: "Bounty not completed" };

    const optimistic = bounties.map((b) =>
      b.id === bountyId ? { ...b, status: "claimed" as BountyStatus } : b,
    );
    set({ bounties: optimistic });

    try {
      const token = await getToken();
      if (!token) {
        set({ bounties });
        return { success: false, error: "Not authenticated" };
      }

      await useUserStore.getState().addRewards(bounty.rewardXP, bounty.rewardCoins, token);

      const uid = useUserStore.getState().profile?.uid;
      if (uid) {
        useStatsStore.getState().recordActivity(uid, getToken, 1);
        api.bounties
          .claim(
            {
              userId: uid,
              bounty: {
                id: bounty.id,
                title: bounty.title,
                rewardXP: bounty.rewardXP,
                rewardCoins: bounty.rewardCoins,
              },
            },
            token,
          )
          .catch((err) =>
            console.warn("[BountyStore] claim sync failed:", err),
          );
      }

      const { generatedAt, courseSnapshot: snap, hiddenGems } = get();
      if (generatedAt && snap) {
        persistBountyData({
          bounties: optimistic,
          hiddenGems,
          generatedAt,
          courseSnapshot: snap,
        });
      }

      return { success: true };
    } catch (err) {
      console.error("[BountyStore] claimBounty failed:", err);
      set({ bounties });
      return { success: false, error: "Failed to claim rewards. Check your connection." };
    }
  },

  autoClaimCompleted: async (getToken) => {
    const { bounties, hiddenGems } = get();
    const claimed: { title: string; xp: number; coins: number }[] = [];

    const completedBounties = bounties.filter((b) => b.status === "completed");
    const completedGems = hiddenGems.filter((g) => g.status === "completed");

    if (completedBounties.length === 0 && completedGems.length === 0) return claimed;

    let xpDelta = 0;
    let coinsDelta = 0;

    const updatedBounties = bounties.map((b) => {
      if (b.status !== "completed") return b;
      xpDelta += b.rewardXP;
      coinsDelta += b.rewardCoins;
      claimed.push({ title: b.title, xp: b.rewardXP, coins: b.rewardCoins });
      return { ...b, status: "claimed" as BountyStatus };
    });

    const updatedGems = hiddenGems.map((g) => {
      if (g.status !== "completed") return g;
      xpDelta += g.rewardXP;
      coinsDelta += g.rewardCoins;
      claimed.push({ title: g.title, xp: g.rewardXP, coins: g.rewardCoins });
      return { ...g, status: "claimed" as BountyStatus };
    });

    set({ bounties: updatedBounties, hiddenGems: updatedGems });

    try {
      const token = await getToken();
      if (token && (xpDelta > 0 || coinsDelta > 0)) {
        await useUserStore.getState().addRewards(xpDelta, coinsDelta, token);
      }

      const uid = useUserStore.getState().profile?.uid;
      if (uid && token) {
        for (const c of completedBounties) {
          api.bounties
            .claim(
              {
                userId: uid,
                bounty: {
                  id: c.id,
                  title: c.title,
                  rewardXP: c.rewardXP,
                  rewardCoins: c.rewardCoins,
                },
              },
              token,
            )
            .catch((err) =>
              console.warn("[BountyStore] auto-claim sync failed:", err),
            );
        }
        useStatsStore.getState().recordActivity(uid, getToken, Math.min(completedBounties.length, 1));
      }

      const { generatedAt, courseSnapshot: snap } = get();
      if (generatedAt && snap) {
        persistBountyData({
          bounties: updatedBounties,
          hiddenGems: updatedGems,
          generatedAt,
          courseSnapshot: snap,
        });
      }

      claimed.forEach((c) => eventBus.emit("bounty:claimed", c));

      return claimed;
    } catch (err) {
      console.error("[BountyStore] autoClaimCompleted failed:", err);
      set({ bounties, hiddenGems });
      return [];
    }
  },

  forceRegenerate: async (userId, getToken, courses) => {
    set({ loading: true, error: null });

    const now = Date.now();
    const sixHours = 6 * 60 * 60 * 1000;
    const dateSeed = getDateSeed();

    let bounties: Bounty[] = [];

    try {
      const token = await getToken();

      if (token) {
        const result = await api.bounties.generate(
          {
            courses: courses.map((c) => ({
              id: c.id,
              title: c.title,
              category: c.category,
              difficulty: c.difficulty,
              progress: c.progress,
              totalChapters: c.totalChapters,
              completedModules: c.completedModules,
            })),
            userId,
            dateSeed,
          },
          token,
        );

        bounties = result.bounties.map((b: Record<string, unknown>) => ({
          id: b.id as string,
          title: b.title as string,
          description: b.description as string,
          difficulty: b.difficulty as Bounty["difficulty"],
          rewardXP: Math.max(1, Math.min(9, b.rewardXP as number)),
          rewardCoins: Math.max(1, Math.min(5, b.rewardCoins as number)),
          completionCondition: (b.completionCondition as string) ?? "",
          courseId: (b.courseId as string) ?? null,
          courseTitle: (b.courseTitle as string) ?? null,
          status: "active" as BountyStatus,
          progress: 0,
          generatedAt: now,
          expiresAt: now + sixHours,
        }));
      }
    } catch (err) {
      console.error("[BountyStore] forceRegenerate fetch failed:", err);
    }

    if (bounties.length === 0) {
      bounties = generateFallbackBounties(courses.map(toCourseForBounties), dateSeed);
    }

    const data: StoredBountyData = {
      bounties,
      hiddenGems: get().hiddenGems,
      generatedAt: now,
      courseSnapshot: courses.map((c) => ({ ...c })),
    };

    persistBountyData(data);

    set({
      bounties,
      hiddenGems: get().hiddenGems,
      generatedAt: now,
      courseSnapshot: data.courseSnapshot,
      loading: false,
      error: null,
    });
  },

  clearBounties: () => {
    AsyncStorage.removeItem(BOUNTY_STORAGE_KEY).catch(() => {});
    set({
      bounties: [],
      hiddenGems: HIDDEN_GEMS.map((g) => ({ ...g })),
      generatedAt: null,
      courseSnapshot: null,
      loaded: false,
      error: null,
    });
  },
}));
