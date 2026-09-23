import AsyncStorage from "@react-native-async-storage/async-storage";
import { useBountyStore } from "../store/bountyStore";
import { useCheckInStore } from "../store/checkInStore";
import { useCourseStore } from "../store/courseStore";
import { useEnrollmentStore } from "../store/courseEnrollmentStore";
import { useMissionStore } from "../store/missionStore";
import { useProgressStore } from "../store/courseProgressStore";
import { useNoteStore } from "../store/noteStore";
import { useSpinStore } from "../store/spinStore";
import { useStatsStore } from "../store/statsStore";
import { useStudyStore } from "../store/studyStore";
import { useUserTrophyStore } from "../store/userTrophyStore";

export const USER_DATA_KEYS = [
  "@yuinx_checkin_v1",
  "@yuinx_spin_v1",
  "@yuinx_spin_session",
  "@yuinx_enrollments_v1",
  "@yuinx_bounties_v1",
  "@yuinx_courses_v1",
  "@yuinx_course_progress_v1",
  "@yuinx_missions_v1",
  "@yuinx_notes_v1",
  "@yuinx_stats_v1",
  "@yuinx_study_v1",
  "@yuinx_user_trophies_v1",
] as const;

function resetUserDataStores(): void {
  useCheckInStore.getState().reset();
  useSpinStore.getState().reset();
  useEnrollmentStore.getState().reset();
  useBountyStore.getState().reset();
  useCourseStore.getState().reset();
  useProgressStore.getState().reset();
  useMissionStore.getState().reset();
  useNoteStore.getState().reset();
  useStatsStore.getState().reset();
  useStudyStore.getState().reset();
  useUserTrophyStore.getState().reset();
}

/**
 * Clears per-user in-memory state and persisted caches so the next
 * account can't see the previous user's data.
 */
export async function resetUserData(): Promise<void> {
  resetUserDataStores();
  await AsyncStorage.multiRemove([...USER_DATA_KEYS]);
}