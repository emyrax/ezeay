import React, { createContext, useContext, useEffect, useMemo, useCallback, useState, useRef } from 'react';
import { useUser, useAuth as useClerkAuth } from '@clerk/expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../lib/api';
import type { ApiUserProfile } from '../lib/api';
import { getAvatarUrl } from '../lib/dicebear';
import { answersToProfileUpdates } from '../lib/onboarding/merge';
import { buildSignupProfile } from '../lib/onboarding/signup';
import {
  clearLegacyPendingGoals,
  clearPendingOnboarding,
  readLegacyPendingGoals,
  readPendingOnboarding,
} from '../lib/pendingOnboarding';
import type { UserProfile, MappedUser } from '../types/user';
import { useUserStore } from '../store/userStore';
import { useModelRatingStore } from '../store/modelRatingStore';
import { useOnboardingStore } from '../store/onboardingStore';
import { resetUserData } from '../lib/resetAppState';

export function toProfile(apiProfile: ApiUserProfile): UserProfile {
  return {
    uid: apiProfile.uid,
    displayName: apiProfile.displayName,
    email: apiProfile.email,
    photoURL: apiProfile.photoURL,
    level: apiProfile.level,
    majorCourse: apiProfile.majorCourse,
    birthday: apiProfile.birthday,
    educationLevel: apiProfile.educationLevel,
    country: apiProfile.country,
    region: apiProfile.region,
    schoolType: apiProfile.schoolType,
    school: apiProfile.school,
    grade: apiProfile.grade,
    degree: apiProfile.degree,
    subjects: apiProfile.subjects ?? [],
    professionalInfoEnabled: apiProfile.professionalInfoEnabled ?? true,
    status: apiProfile.status,
    xp: apiProfile.xp,
    coins: apiProfile.coins,
    gamingLevel: apiProfile.gamingLevel,
    rank: apiProfile.rank,
    nextLevelXp: apiProfile.nextLevelXp,
    courses: apiProfile.courses ?? [],
    earnedTrophies: apiProfile.earnedTrophies ?? [],
    learningGoals: apiProfile.learningGoals ?? [] as string[],
    onBoarded: apiProfile.onBoarded ?? false,
    modelRatings: apiProfile.modelRatings ?? {},
    isPro: apiProfile.isPro ?? false,
    headline: apiProfile.headline ?? undefined,
    bio: apiProfile.bio ?? undefined,
    location: apiProfile.location ?? undefined,
    locationLat: apiProfile.locationLat ?? undefined,
    locationLng: apiProfile.locationLng ?? undefined,
    university: apiProfile.university ?? undefined,
    website: apiProfile.website ?? undefined,
    linkedInUrl: apiProfile.linkedInUrl ?? undefined,
    department: apiProfile.department ?? undefined,
    collarType: apiProfile.collarType ?? undefined,
    availability: apiProfile.availability ?? undefined,
    industry: apiProfile.industry ?? undefined,
    jobTitle: apiProfile.jobTitle ?? undefined,
    company: apiProfile.company ?? undefined,
    yearsOfTradeExperience: apiProfile.yearsOfTradeExperience ?? undefined,
    interests: apiProfile.interests ?? [],
    skills: apiProfile.skills ?? [],
    languages: apiProfile.languages ?? [],
    tradeSkills: apiProfile.tradeSkills ?? [],
    education: apiProfile.education ?? [],
    workExperience: apiProfile.workExperience ?? [],
    certifications: apiProfile.certifications ?? [],
    createdAt: new Date(apiProfile.createdAt),
    updatedAt: apiProfile.updatedAt ? new Date(apiProfile.updatedAt) : undefined,
    deletedAt: apiProfile.deletedAt ? new Date(apiProfile.deletedAt) : undefined,
  };
}

function buildLocalProfile(clerkId: string, user: NonNullable<ReturnType<typeof useUser>['user']>): UserProfile {
  return {
    uid: clerkId,
    displayName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || "Scholar",
    email: user.primaryEmailAddress?.emailAddress || "",
    photoURL: getAvatarUrl(clerkId),
    status: "active",
    xp: 0,
    coins: 0,
    gamingLevel: 1,
    rank: "Spark",
    nextLevelXp: 100,
    courses: [],
    earnedTrophies: [],
    onBoarded: true,
    isPro: false,
    createdAt: new Date(),
  };
}

export interface AuthContextType {
  user: MappedUser | null;
  profile: UserProfile | null;
  loading: boolean;
  loadedOnce: boolean;
  accountError: boolean;
  signOut: () => Promise<void>;
  getToken: () => Promise<string | null>;
  refreshProfile: () => Promise<void>;
  retryAccountLoad: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  saveProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut: clerkSignOut, getToken } = useClerkAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [accountError, setAccountError] = useState(false);
  const setStoreProfile = useUserStore((s) => s.setProfile);
  const fetchingRef = useRef(false);
  const [accountLoadTick, setAccountLoadTick] = useState(0);

  const clearStoredOnboarding = useCallback(async () => {
    try {
      await clearPendingOnboarding();
      await clearLegacyPendingGoals();
      useOnboardingStore.getState().reset();
    } catch (err) {
      console.warn("[AuthContext] pending onboarding cleanup failed:", err);
    }
  }, []);

  const applyPendingOnboardingIfAny = useCallback(
    async (current: UserProfile) => {
      const pending = await readPendingOnboarding();
      const legacyGoals = pending ? null : await readLegacyPendingGoals();
      const hasLegacyGoals = Boolean(legacyGoals && legacyGoals.length > 0);

      if (!pending && !hasLegacyGoals) return;

      if (current.onBoarded) {
        await clearStoredOnboarding();
        return;
      }

      const updates: Partial<UserProfile> = pending
        ? answersToProfileUpdates(pending.answers)
        : {
            learningGoals: legacyGoals ?? [],
            onBoarded: true,
          };

      try {
        const token = await getToken();
        if (!token) return;

        await api.users.update(
          current.uid,
          updates as Record<string, unknown>,
          token,
        );
      } catch (err) {
        // Keep the pending answers; the onboarding screen can retry the save.
        console.warn("[AuthContext] pending onboarding save failed:", err);
        return;
      }

      const updated: UserProfile = { ...current, ...updates, onBoarded: true };
      setProfile(updated);
      setStoreProfile(updated);
      try {
        await AsyncStorage.setItem("userProfile", JSON.stringify(updated));
      } catch (err) {
        console.warn("[AuthContext] profile cache write failed:", err);
      }
      await clearStoredOnboarding();
    },
    [clearStoredOnboarding, getToken, setStoreProfile],
  );

  useEffect(() => {
    if (!isLoaded) {
      setLoading(true);
      return;
    }

    if (!isSignedIn || !user) {
      setProfile(null);
      setStoreProfile(null);
      setLoading(false);
      setAccountError(false);
      return;
    }

    if (fetchingRef.current) return;
    fetchingRef.current = true;

    const clerkId = user.id;

    (async () => {
      try {
        const cached = await AsyncStorage.getItem("userProfile");

        if (cached) {
          try {
            const parsed = JSON.parse(cached) as UserProfile;
            setProfile(parsed);
            setStoreProfile(parsed);
            setLoadedOnce(true);
            setLoading(false);
          } catch {
            // corrupted cache — fall through to local profile
          }
        }

        const token = await getToken();
        if (!token) {
          if (!cached) {
            setAccountError(true);
          }
          return;
        }

        try {
          const apiProfile = await api.users.get(clerkId, token);
          const userProfile = toProfile(apiProfile);

          const currentProfile = useUserStore.getState().profile;
          const isChanged = currentProfile && (
            currentProfile.xp !== userProfile.xp ||
            currentProfile.coins !== userProfile.coins ||
            currentProfile.courses.length !== userProfile.courses.length ||
            currentProfile.displayName !== userProfile.displayName ||
            currentProfile.headline !== userProfile.headline ||
            currentProfile.bio !== userProfile.bio ||
            currentProfile.photoURL !== userProfile.photoURL ||
            currentProfile.location !== userProfile.location ||
            currentProfile.locationLat !== userProfile.locationLat ||
            currentProfile.locationLng !== userProfile.locationLng ||
            currentProfile.university !== userProfile.university ||
            currentProfile.department !== userProfile.department ||
            currentProfile.birthday !== userProfile.birthday ||
            currentProfile.educationLevel !== userProfile.educationLevel ||
            currentProfile.country !== userProfile.country ||
            currentProfile.region !== userProfile.region ||
            currentProfile.schoolType !== userProfile.schoolType ||
            currentProfile.school !== userProfile.school ||
            currentProfile.grade !== userProfile.grade ||
            currentProfile.degree !== userProfile.degree ||
            JSON.stringify(currentProfile.subjects ?? []) !== JSON.stringify(userProfile.subjects ?? []) ||
            currentProfile.professionalInfoEnabled !== userProfile.professionalInfoEnabled ||
            currentProfile.jobTitle !== userProfile.jobTitle ||
            currentProfile.company !== userProfile.company ||
            currentProfile.industry !== userProfile.industry ||
            currentProfile.website !== userProfile.website ||
            currentProfile.linkedInUrl !== userProfile.linkedInUrl ||
            currentProfile.collarType !== userProfile.collarType ||
            currentProfile.availability !== userProfile.availability ||
            JSON.stringify(currentProfile.skills) !== JSON.stringify(userProfile.skills) ||
            JSON.stringify(currentProfile.education) !== JSON.stringify(userProfile.education) ||
            JSON.stringify(currentProfile.workExperience) !== JSON.stringify(userProfile.workExperience) ||
            JSON.stringify(currentProfile.certifications) !== JSON.stringify(userProfile.certifications) ||
            JSON.stringify(currentProfile.languages) !== JSON.stringify(userProfile.languages) ||
            JSON.stringify(currentProfile.interests) !== JSON.stringify(userProfile.interests) ||
            JSON.stringify(currentProfile.tradeSkills) !== JSON.stringify(userProfile.tradeSkills) ||
            JSON.stringify(currentProfile.modelRatings ?? {}) !== JSON.stringify(userProfile.modelRatings ?? {})
          );

          if (isChanged || !cached) {
            setProfile(userProfile);
            setStoreProfile(userProfile);
            try {
              await AsyncStorage.setItem("userProfile", JSON.stringify(userProfile));
            } catch (err) {
              console.warn("[AuthContext] profile cache write failed:", err);
            }
          }
          await applyPendingOnboardingIfAny(userProfile);
          setAccountError(false);
        } catch (err: any) {
          if (err.message?.includes("Not found") || err.status === 404) {
            try {
              const pending = await readPendingOnboarding();
              const legacyGoals = pending ? null : await readLegacyPendingGoals();
              const createData = buildSignupProfile(
                {
                  displayName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || "Scholar",
                  email: user.primaryEmailAddress?.emailAddress || "",
                  photoURL: getAvatarUrl(clerkId),
                },
                pending,
                legacyGoals,
              );

              const apiProfile = await api.users.create(clerkId, createData, token);

              const userProfile = toProfile(apiProfile);
              setProfile(userProfile);
              setStoreProfile(userProfile);
              try {
                await AsyncStorage.setItem("userProfile", JSON.stringify(userProfile));
              } catch (err) {
                console.warn("[AuthContext] profile cache write failed:", err);
              }
              if (pending || (legacyGoals && legacyGoals.length > 0)) {
                await clearStoredOnboarding();
              }
              setAccountError(false);
            } catch {
              // server unreachable for create — only hard-error if no cache
              if (!cached) {
                setAccountError(true);
              } else {
                // use local profile as fallback (already set from cache above)
                setAccountError(false);
              }
            }
          } else {
            // Server error / connection failure / offline
            // If we already loaded from cache above, let the user proceed
            if (!cached) {
              setAccountError(true);
            } else {
              // Cache is valid — user can work offline, don't block them
              setAccountError(false);
            }
          }
        }
      } finally {
        setLoadedOnce(true);
        setLoading(false);
        fetchingRef.current = false;
      }
    })();
  }, [isLoaded, isSignedIn, user, setStoreProfile, getToken, accountLoadTick, applyPendingOnboardingIfAny, clearStoredOnboarding]);

  useEffect(() => {
    useModelRatingStore.getState().setRatings(profile?.modelRatings ?? {});
  }, [profile?.modelRatings]);

  const signOut = useCallback(async () => {
    setAccountError(false);
    await clerkSignOut();
    useUserStore.getState().clearProfile();
    useModelRatingStore.getState().clearRatings();
    await resetUserData();
    await AsyncStorage.multiRemove(["userProfile", "currentUser"]);
  }, [clerkSignOut]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const token = await getToken();
    if (!token) return;
    try {
      const apiProfile = await api.users.get(user.id, token);
      const userProfile = toProfile(apiProfile);
      setProfile(userProfile);
      setStoreProfile(userProfile);
      await AsyncStorage.setItem("userProfile", JSON.stringify(userProfile));
      setAccountError(false);
    } catch (err: any) {
      console.error("[AuthContext] refreshProfile failed:", err);
    }
  }, [user, getToken, setStoreProfile]);

  const retryAccountLoad = useCallback(() => {
    setAccountError(false);
    setLoading(true);
    fetchingRef.current = false;
    setAccountLoadTick((t) => t + 1);
  }, []);

  const updateProfile = useCallback(
    (updates: Partial<UserProfile>) => {
      const current = useUserStore.getState().profile;
      const next: UserProfile = current
        ? { ...current, ...updates }
        : (updates as UserProfile);
      setProfile(next);
      setStoreProfile(next);
      AsyncStorage.setItem("userProfile", JSON.stringify(next)).catch(() => {});

      if (current) {
        getToken()
          .then((token) => {
            if (!token) return;
            return api.users.update(current.uid, updates as Record<string, unknown>, token);
          })
          .catch((err) => {
            console.warn("[AuthContext] updateProfile server save failed:", err);
          });
      }
    },
    [setStoreProfile, getToken],
  );

  const saveProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      const current = useUserStore.getState().profile;
      if (!current) throw new Error("You need to be signed in to save your profile.");
      const token = await getToken();
      if (!token) throw new Error("Your session expired. Please sign in again.");

      await api.users.update(
        current.uid,
        updates as Record<string, unknown>,
        token,
      );

      const next: UserProfile = { ...current, ...updates };
      setProfile(next);
      setStoreProfile(next);
      await AsyncStorage.setItem("userProfile", JSON.stringify(next));
    },
    [getToken, setStoreProfile],
  );

  const mappedUser = useMemo<MappedUser | null>(() => {
    if (!user) return null;
    return {
      uid: user.id,
      email: user.primaryEmailAddress?.emailAddress || null,
      displayName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || "Scholar",
      photoURL: user.imageUrl || null,
      originalUser: user,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.fullName, user?.firstName, user?.lastName, user?.primaryEmailAddress?.emailAddress, user?.imageUrl]);

  const contextValue = useMemo<AuthContextType>(() => ({
    user: mappedUser,
    profile,
    loading: !isLoaded || loading,
    loadedOnce,
    accountError,
    signOut,
    getToken,
    refreshProfile,
    retryAccountLoad,
    updateProfile,
    saveProfile,
  }), [mappedUser, profile, isLoaded, loading, loadedOnce, accountError, signOut, getToken, refreshProfile, retryAccountLoad, updateProfile, saveProfile]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
