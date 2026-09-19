import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, ScrollView, View, RefreshControl } from "react-native";
import { useFocusEffect } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../lib/api";
import { useBountyStore } from "../../store/bountyStore";
import { useCourseStore } from "../../store/courseStore";
import { useEnrollmentStore } from "../../store/courseEnrollmentStore";
import { useProgressStore } from "../../store/courseProgressStore";
import { useUserTrophyStore } from "../../store/userTrophyStore";
import { useUserStore } from "../../store/userStore";
import { useCommunityStore } from "../../store/communityStore";
import { useThemeColors } from "../../hooks/useTheme";
import HeaderSection from "../../component/homeScreenTab/HeaderSection";
import ContributionGraph from "../../component/ContributionGraph";
import MissionsSection from "../../component/homeScreenTab/MissionsSection";
import RivalRadar from "../../component/homeScreenTab/RivalRadar";
import ScreenContainer from "../../component/ScreenContainer";
import AnimatedCard from "../../component/AnimatedCard";
import ErrorBoundary from "../../component/ErrorBoundary";
import { useSpinStore } from "../../store/spinStore";
import { useCheckInStore } from "../../store/checkInStore";
import { useStatsStore } from "../../store/statsStore";

export default function CampScreen() {
  const { getToken } = useAuth();
  const profile = useUserStore((s) => s.profile);
  const theme = useThemeColors();
  const [refreshing, setRefreshing] = useState(false);
  const loadBounties = useBountyStore((s) => s.loadBounties);
  const loaded = useBountyStore((s) => s.loaded);
  const checkAutoComplete = useBountyStore((s) => s.checkAutoComplete);
  const autoClaimCompleted = useBountyStore((s) => s.autoClaimCompleted);
  const fetchCourses = useCourseStore((s) => s.fetchCourses);
  const fetchEnrollments = useEnrollmentStore((s) => s.fetchEnrollments);
  const fetchUserTrophies = useUserTrophyStore((s) => s.fetchTrophies);

  useEffect(() => {
    if (profile) {
      useProgressStore.getState().loadProgress();
      fetchCourses(profile.uid, getToken);
      fetchEnrollments(profile.uid, getToken);
      fetchUserTrophies(profile.uid, getToken);
      if (!loaded) {
        loadBounties(profile.uid, getToken, profile.courses);
      }
      useCheckInStore.getState().load(profile.uid, getToken);
      useCommunityStore.getState().fetch(getToken);
    }
  }, [profile, loaded, getToken, loadBounties, fetchCourses, fetchEnrollments, fetchUserTrophies]);

  const prevLevelRef = useRef(profile?.gamingLevel);

  useEffect(() => {
    const currentLevel = profile?.gamingLevel;
    const prevLevel = prevLevelRef.current;
    if (prevLevel !== undefined && currentLevel !== undefined && currentLevel > prevLevel) {
      useSpinStore.getState().maybeTrigger("level_up", { force: true });
    }
    prevLevelRef.current = currentLevel;
  }, [profile?.gamingLevel]);

  useFocusEffect(
    useCallback(() => {
      if (!profile) return;

      const courses = useCourseStore.getState().courses;
      if (courses.length === 0) return;

      checkAutoComplete(courses);

      autoClaimCompleted(getToken);

      useSpinStore.getState().maybeTrigger("dashboard_load", { defaultChance: 0.1 });

      useCheckInStore.getState().load(profile.uid, getToken);

      const today = new Date().toISOString().slice(0, 10);
      const stats = useStatsStore.getState();
      const hasSessionToday = stats.days.some((d) => d.date === today);
      if (!hasSessionToday) {
        stats.recordActivity(profile.uid, getToken, 1);
      }

      useCommunityStore.getState().fetch(getToken);
    }, [profile, getToken, checkAutoComplete, autoClaimCompleted]),
  );

  const onRefresh = useCallback(async () => {
    if (!profile) return;
    setRefreshing(true);
    try {
      const token = await getToken();
      await Promise.all([
        useProgressStore.getState().loadProgress(),
        fetchCourses(profile.uid, getToken),
        fetchEnrollments(profile.uid, getToken),
        fetchUserTrophies(profile.uid, getToken),
        loadBounties(profile.uid, getToken, profile.courses),
        useCommunityStore.getState().fetch(getToken, true),
        token ? api.users.get(profile.uid, token).then(async (apiProfile) => {
          const { toProfile } = await import("../../contexts/AuthContext");
          useUserStore.getState().setProfile(toProfile(apiProfile));
        }) : Promise.resolve(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [profile, getToken, fetchCourses, fetchEnrollments, fetchUserTrophies, loadBounties]);

  return (
    <ErrorBoundary>
      <ScreenContainer>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
          }
        >
          <AnimatedCard index={0}>
            <HeaderSection />
          </AnimatedCard>
          <AnimatedCard index={1}>
            <ContributionGraph />
          </AnimatedCard>
          <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />
          <AnimatedCard index={2}>
            <MissionsSection />
          </AnimatedCard>
          <AnimatedCard index={3}>
            <RivalRadar />
          </AnimatedCard>
          <View style={{ height: 20 }} />
        </ScrollView>
      </ScreenContainer>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 24,
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
    marginVertical: 4,
  },
});
