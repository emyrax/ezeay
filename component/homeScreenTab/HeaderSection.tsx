import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import HealthOverviewBoard from "../coach/HealthOverviewBoard";
import { NOTES_HREF } from "../../constants/navigation";
import { fontFamily } from "../../constants/themes";
import { useAuth } from "../../contexts/AuthContext";
import { DAILY_ACTIVITY_GOAL } from "../../data/stats";
import { useFeatureFlags } from "../../hooks/useFeatureFlags";
import { useResponsive } from "../../hooks/useResponsive";
import { useThemeColors } from "../../hooks/useTheme";
import { images } from "../../constants/images";
import { useNavLock } from "../../lib/guard";
import { getDailyEnergyScore } from "../../lib/stats/activity";
import { getLevelProgress } from "../../services/LevelService";
import { useCheckInStore } from "../../store/checkInStore";
import { useEnrollmentStore } from "../../store/courseEnrollmentStore";
import { useCourseStore } from "../../store/courseStore";
import {
    getMaxVisibleApps,
    getVisibleApps,
    useQuickAppStore,
} from "../../store/quickAppStore";
import { useStatsStore } from "../../store/statsStore";
import { useUserStore } from "../../store/userStore";
import AppManagerSheet from "../AppManagerSheet";
import CheckInDialog from "../CheckInDialog";

export default function HeaderSection() {
  const profile = useUserStore((s) => s.profile);
  const theme = useThemeColors();
  const { isWebWide, showSidebar } = useResponsive();
  const router = useRouter();
  const { navigate } = useNavLock();
  const { getToken } = useAuth();
  const { width } = useWindowDimensions();
  const { tutor: tutorEnabled } = useFeatureFlags();
  const wideHeader = isWebWide || showSidebar;
  const compact = width < 390;
  const [showAppManager, setShowAppManager] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const lastCheckInDate = useCheckInStore((s) => s.lastCheckInDate);
  const currentStreak = useCheckInStore((s) => s.currentStreak);

  const days = useStatsStore((s) => s.days);
  const statsLoaded = useStatsStore((s) => s.loaded);
  const loadDays = useStatsStore((s) => s.loadDays);

  useEffect(() => {
    if (!statsLoaded && profile?.uid) loadDays(profile.uid, getToken);
  }, [statsLoaded, loadDays, profile?.uid, getToken]);

  const visibleIds = useQuickAppStore((s) => s.visibleIds);
  const visibleApps = useMemo(() => getVisibleApps(visibleIds), [visibleIds]);
  const maxVisibleApps = getMaxVisibleApps(width);

  const enrollments = useEnrollmentStore((s) => s.enrollments);
  const courses = useCourseStore((s) => s.courses);

  const xp = profile?.xp ?? 0;
  const level = profile?.gamingLevel ?? 1;
  const levelProgress = useMemo(() => getLevelProgress(xp, level), [xp, level]);

  const continueCourse = useMemo(() => {
    const inProgress = [...enrollments]
      .filter((e) => !e.isCompleted)
      .sort(
        (a, b) =>
          new Date(b.lastAccessedAt).getTime() -
          new Date(a.lastAccessedAt).getTime(),
      );
    if (inProgress.length === 0) return null;
    const enrollment = inProgress[0];
    const course = courses.find((c) => c.id === enrollment.courseId);
    return course ? { course, enrollment } : null;
  }, [enrollments, courses]);

  const dailyEnergyScore = getDailyEnergyScore(days, DAILY_ACTIVITY_GOAL);

  return (
    <LinearGradient
      colors={["#09152C", "#122A50", "#1B3D6C"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.shell, wideHeader && styles.shellWide]}
    >
      <View style={styles.shellGlow} pointerEvents="none" />
      <View
        style={[styles.shellAccent, { backgroundColor: theme.primary }]}
      />

      <View style={styles.headerRow}>
        <View style={styles.brandRow}>
          <LinearGradient
            colors={["rgba(255,255,255,0.14)", "rgba(255,255,255,0.04)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoWrap}
          >
            <Image
              source={images.whtbrandYuinxTrans}
              style={styles.brandLogo}
              resizeMode="contain"
            />
          </LinearGradient>
        </View>
        <View style={styles.headerActions}>
          {tutorEnabled ? (
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => navigate(() => router.push(NOTES_HREF as any))}
              accessibilityRole="button"
              accessibilityLabel="Open Notes"
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="notebook-multiple"
                size={20}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.iconBtn}>
            <MaterialCommunityIcons
              name="bell-outline"
              size={20}
              color="#FFFFFF"
            />
            <View style={styles.badgeDot} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigate(() => router.push("/(schedule)" as any))}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="calendar-clock"
              size={20}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      </View>

      <HealthOverviewBoard
        score={dailyEnergyScore}
        progress={levelProgress.xpPercent}
        onCheckIn={() => setShowCheckIn(true)}
        checkedInToday={
          lastCheckInDate === new Date().toISOString().slice(0, 10)
        }
        streak={currentStreak}
        checkInAccentColor={theme.primary}
        compact={compact}
        style={styles.healthBoard}
      />

      {continueCourse ? (
        <TouchableOpacity
          style={styles.continueRow}
          onPress={() =>
            navigate(() =>
              router.push(
                `/(course)/${continueCourse.course.id}/chapters` as any,
              ),
            )
          }
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={["rgba(255,255,255,0.05)", "rgba(255,255,255,0.15)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              styles.continueAccentBar,
              { backgroundColor: theme.primary },
            ]}
          />
          <View style={styles.continueIconWrap}>
            <LinearGradient
              colors={["#8B7EF8", "#5B9BD5"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.continueIconGradient}
            >
              <MaterialCommunityIcons name="play" size={16} color="#FFFFFF" />
            </LinearGradient>
          </View>
          <View style={styles.continueTextWrap}>
            <Text style={styles.continueLabel}>Continue course</Text>
            <Text style={styles.continueTitle} numberOfLines={1}>
              {continueCourse.course.title}
            </Text>
          </View>
          <View style={styles.continueArrow}>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color="#FFFFFF"
            />
          </View>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.continueRow}
          onPress={() => router.push("/(tabs)/quests" as any)}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={["rgba(255,255,255,0.05)", "rgba(255,255,255,0.15)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              styles.continueAccentBar,
              { backgroundColor: theme.primary },
            ]}
          />
          <View style={styles.continueIconWrap}>
            <LinearGradient
              colors={["#8B7EF8", "#5B9BD5"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.continueIconGradient}
            >
              <MaterialCommunityIcons
                name="compass"
                size={16}
                color="#FFFFFF"
              />
            </LinearGradient>
          </View>
          <View style={styles.continueTextWrap}>
            <Text style={styles.continueLabel}>Get started</Text>
            <Text style={styles.continueTitle} numberOfLines={1}>
              Explore quests to start your journey
            </Text>
          </View>
          <View style={styles.continueArrow}>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color="#FFFFFF"
            />
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.quickActions}>
        {visibleApps.slice(0, maxVisibleApps).map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.actionItem}
            onPress={
              item.route ? () => router.push(item.route as any) : undefined
            }
          >
            <LinearGradient
              colors={["#8B7EF8", "#5B9BD5"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionIconWrapper}
            >
              {item.icon === "infinity" ? (
                <Image
                  source={images.yuinxLogoTrans}
                  style={styles.actionImageIcon}
                />
              ) : (
                <MaterialCommunityIcons
                  name={item.icon as any}
                  size={24}
                  color="#FFFFFF"
                />
              )}
            </LinearGradient>
            <Text style={styles.actionLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => setShowAppManager(true)}
        >
          <LinearGradient
            colors={[theme.gradientStart + "60", theme.gradientEnd + "60"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.actionIconWrapper, styles.moreIcon]}
          >
            <MaterialCommunityIcons name="plus" size={24} color="#FFFFFF" />
          </LinearGradient>
          <Text style={styles.actionLabel}>More</Text>
        </TouchableOpacity>
      </View>

      <AppManagerSheet
        visible={showAppManager}
        onClose={() => setShowAppManager(false)}
      />
      <CheckInDialog
        visible={showCheckIn}
        onClose={() => setShowCheckIn(false)}
        getToken={getToken}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 18,
    position: "relative",
    marginHorizontal: -16,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.28,
    shadowRadius: 32,
    elevation: 10,
  },
  shellWide: {
    marginHorizontal: 0,
    borderRadius: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  shellGlow: {
    position: "absolute",
    top: -120,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(45,141,252,0.22)",
  },
  shellAccent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    opacity: 0.5,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoWrap: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 5,
    overflow: "hidden",
  },
  brandLogo: {
    width: 140,
    height: 23,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  badgeDot: {
    position: "absolute",
    top: 7,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#FF3B30",
    borderWidth: 1.5,
    borderColor: "rgba(9,21,44,0.8)",
  },
  healthBoard: {
    marginBottom: 10,
  },
  continueRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    padding: 12,
    marginBottom: 16,
    gap: 11,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  continueAccentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  continueIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  continueIconGradient: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  continueTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  continueLabel: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 9,
    fontWeight: "700",
    fontFamily,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  continueTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    fontFamily,
  },
  continueArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    gap: 4,
  },
  actionItem: {
    alignItems: "center",
    width: 66,
    gap: 6,
  },
  actionIconWrapper: {
    borderRadius: 20,
    width: 54,
    height: 54,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 5,
  },
  moreIcon: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.35)",
  },
  actionImageIcon: {
    width: 32,
    height: 32,
    borderRadius: 6,
    resizeMode: "contain",
  },
  actionLabel: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 10,
    textAlign: "center",
    fontWeight: "700",
    fontFamily,
    letterSpacing: 0.1,
  },
});
