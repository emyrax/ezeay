import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import CoachFloatingTabBar from "../../../component/coach/CoachFloatingTabBar";
import CoachHeader from "../../../component/coach/CoachHeader";
import CoachMascot from "../../../component/coach/CoachMascot";
import CoachScreen from "../../../component/coach/CoachScreen";
import HealthOverviewBoard from "../../../component/coach/HealthOverviewBoard";
import { coachColors, coachFont } from "../../../constants/coachTheme";
import { DAILY_ACTIVITY_GOAL } from "../../../data/stats";
import { useAuth } from "../../../contexts/AuthContext";
import { getDailyEnergyScore } from "../../../lib/stats/activity";
import { getLevelProgress } from "../../../services/LevelService";
import { useStatsStore } from "../../../store/statsStore";
import { useUserStore } from "../../../store/userStore";

export default function CoachHomeScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const profile = useUserStore((state) => state.profile);
  const days = useStatsStore((state) => state.days);
  const statsLoaded = useStatsStore((state) => state.loaded);
  const loadDays = useStatsStore((state) => state.loadDays);
  const firstName = profile?.displayName?.trim().split(/\s+/)[0] || "there";
  const energyScore = getDailyEnergyScore(days, DAILY_ACTIVITY_GOAL);
  const xpProgress = getLevelProgress(
    profile?.xp ?? 0,
    profile?.gamingLevel ?? 1,
  ).xpPercent;

  useEffect(() => {
    if (!statsLoaded && profile?.uid) loadDays(profile.uid, getToken);
  }, [statsLoaded, loadDays, profile?.uid, getToken]);

  const openAgent = () => router.push("/coach/idle" as never);

  return (
    <CoachScreen>
      <CoachHeader
        variant="home"
        avatarUrl={profile?.photoURL}
        onMenu={() => router.push("/profile" as never)}
        onBell={() => Alert.alert("Notifications", "You are all caught up.")}
        onAvatar={() => router.push("/profile" as never)}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.pill}>
            <MaterialCommunityIcons
              name="creation"
              size={14}
              color={coachColors.accent}
            />
            <Text style={styles.pillText}>AI Agent</Text>
          </View>

          <Text style={styles.title}>
            Hi {firstName}, AI Guides Your Health
          </Text>

          <Pressable
            onPress={openAgent}
            style={styles.mascotWrap}
            accessibilityRole="button"
            accessibilityLabel="Talk to your AI coach"
          >
            <CoachMascot size={88} />
          </Pressable>
        </View>

        <HealthOverviewBoard
          score={energyScore}
          progress={xpProgress}
          onOpen={openAgent}
        />

      </ScrollView>

      <CoachFloatingTabBar active="home" />
    </CoachScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 116,
    gap: 18,
  },
  hero: {
    alignItems: "center",
    paddingTop: 8,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
  },
  pillText: {
    fontFamily: coachFont.semibold,
    fontSize: 12,
    color: coachColors.text,
  },
  title: {
    marginTop: 14,
    maxWidth: 320,
    textAlign: "center",
    fontFamily: coachFont.bold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
    color: coachColors.text,
  },
  mascotWrap: {
    marginTop: 16,
    marginBottom: 2,
  },
});
