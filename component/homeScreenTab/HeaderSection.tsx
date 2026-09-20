import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { images } from "../../constants/images";
import { fontFamily } from "../../constants/themes";
import { useAuth } from "../../contexts/AuthContext";
import { getNextLevel } from "../../data/levels";
import { useThemeColors } from "../../hooks/useTheme";
import { getLevelProgress } from "../../services/LevelService";
import { useNavLock } from "../../lib/guard";
import { useCheckInStore } from "../../store/checkInStore";
import { useEnrollmentStore } from "../../store/courseEnrollmentStore";
import { useCourseStore } from "../../store/courseStore";
import { getMaxVisibleApps, getVisibleApps, useQuickAppStore } from "../../store/quickAppStore";
import { useStatsStore } from "../../store/statsStore";
import { useUserStore } from "../../store/userStore";
import { DAILY_ACTIVITY_GOAL } from "../../data/stats";
import AppManagerSheet from "../AppManagerSheet";
import CheckInDialog from "../CheckInDialog";

const RING_SIZE = 72;
const RING_STROKE = 6;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export default function HeaderSection() {
  const profile = useUserStore((s) => s.profile);
  const theme = useThemeColors();
  const router = useRouter();
  const { navigate } = useNavLock();
  const { getToken } = useAuth();
  const { width } = useWindowDimensions();
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

  const todayKey = new Date().toISOString().slice(0, 10);
  const todayActivity = days.find((d) => d.date === todayKey)?.count ?? 0;
  const activityProgress = Math.min(todayActivity / DAILY_ACTIVITY_GOAL, 1);

  return (
    <LinearGradient
      colors={[theme.gradientStart, theme.gradientMid, theme.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <View style={styles.glassOverlay} />
      <View
        style={[styles.gradientAccent, { backgroundColor: theme.primary }]}
      />

      <View style={styles.headerRow}>
        <View style={styles.brandRow}>
          <LinearGradient
            colors={[theme.gradientStart + "40", theme.gradientEnd + "40"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoWrap}
          >
            <Image
              source={images.brandYuinxTrans}
              style={styles.brandLogo}
              resizeMode="contain"
            />
          </LinearGradient>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn}>
            <MaterialCommunityIcons
              name="bell-outline"
              size={22}
              color="#FFFFFF"
            />
            <View style={styles.badgeDot} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <MaterialCommunityIcons
              name="calendar-clock"
              size={22}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.searchBar, { borderColor: theme.primary + "35" }]}>
        <MaterialCommunityIcons
          name="magnify"
          size={20}
          color={theme.textMuted}
        />
        <Text style={[styles.searchText, { color: theme.textMuted }]}>
          Find your next quest
        </Text>
        <MaterialCommunityIcons
          name="barcode-scan"
          size={20}
          color={theme.textSecondary}
        />
      </View>

      <View style={styles.progressRow}>
        <View style={styles.ringWrap}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke="rgba(0,0,0,0.25)"
              strokeWidth={RING_STROKE}
              fill="none"
            />
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke={theme.tabInactive}
              strokeWidth={RING_STROKE}
              fill="none"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={RING_CIRCUMFERENCE * (1 - activityProgress)}
              strokeLinecap="round"
              rotation="-90"
              origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
            />
          </Svg>
          <View style={styles.ringCenter}>
            <Text style={styles.ringPercentText}>
              {Math.round(activityProgress * 100)}%
            </Text>
            <Text style={styles.ringCaption}>today</Text>
          </View>
        </View>

        <View style={styles.xpInfo}>
          <Text style={styles.xpValue}>{xp.toLocaleString()} XP</Text>
          <Text style={styles.xpNext}>
            {levelProgress.xpForNext > 0
              ? `${levelProgress.xpProgress.toLocaleString()} / ${levelProgress.xpForNext.toLocaleString()}`
              : "Max level"}
          </Text>
          <View style={styles.statRow}>
            <View
              style={[
                styles.chip,
                { backgroundColor: "rgba(255,255,255,0.12)" },
              ]}
            >
              <MaterialCommunityIcons name="star" size={12} color="#4CE1B6" />
              <Text style={styles.chipText}>
                Lv.{profile?.gamingLevel ?? 1}
              </Text>
            </View>
            {profile?.rank ? (
              <View
                style={[
                  styles.chip,
                  { backgroundColor: "rgba(255,255,255,0.12)" },
                ]}
              >
                <MaterialCommunityIcons
                  name="medal"
                  size={12}
                  color="#FFD700"
                />
                <Text style={styles.chipText}>{profile.rank}</Text>
              </View>
            ) : null}
            <View
              style={[
                styles.chip,
                { backgroundColor: "rgba(255,255,255,0.12)" },
              ]}
            >
              <MaterialCommunityIcons name="gold" size={12} color="#FFD700" />
              <Text style={styles.chipText}>
                {profile?.coins?.toLocaleString() ?? "0"}
              </Text>
            </View>
          </View>
          {levelProgress.xpForNext > 0 && (
            <View
              style={[
                styles.milestoneChip,
                { backgroundColor: "rgba(255,255,255,0.08)" },
              ]}
            >
              <MaterialCommunityIcons
                name="flag-variant"
                size={12}
                color="#FFD700"
              />
              <Text style={styles.milestoneText}>
                Next:{" "}
                {getNextLevel(profile?.gamingLevel ?? 1)?.rankName ?? "Max"} —{" "}
                {levelProgress.xpForNext - levelProgress.xpProgress} XP away
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.checkInTrigger}
          onPress={() => setShowCheckIn(true)}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={[theme.gradientStart + "80", theme.gradientEnd + "80"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.checkInIconBg}
          >
            <MaterialCommunityIcons
              name={
                lastCheckInDate === new Date().toISOString().slice(0, 10)
                  ? "calendar-check"
                  : "calendar-star"
              }
              size={20}
              color="#FFFFFF"
            />
          </LinearGradient>
          {currentStreak > 1 && (
            <View
              style={[
                styles.checkInStreakBadge,
                { backgroundColor: theme.primary },
              ]}
            >
              <Text style={styles.checkInStreakText}>{currentStreak}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

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
              colors={[theme.gradientStart, theme.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.continueIconGradient}
            >
              <MaterialCommunityIcons name="play" size={16} color="#FFFFFF" />
            </LinearGradient>
          </View>
          <View style={styles.continueTextWrap}>
            <Text style={styles.continueLabel}>Continue</Text>
            <Text style={styles.continueTitle} numberOfLines={1}>
              {continueCourse.course.title}
            </Text>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color="rgba(255,255,255,0.6)"
          />
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
              colors={[theme.gradientStart, theme.gradientEnd]}
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
            <Text style={styles.continueLabel}>Get Started</Text>
            <Text style={styles.continueTitle} numberOfLines={1}>
              Explore quests to start your journey
            </Text>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color="rgba(255,255,255,0.6)"
          />
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
              colors={[theme.gradientStart, theme.gradientEnd]}
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
  gradient: {
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    position: "relative",
    marginHorizontal: -16,
    overflow: "hidden",
  },
  glassOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.12)",
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  gradientAccent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    opacity: 0.2,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoWrap: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 4,
    overflow: "hidden",
  },
  brandLogo: {
    width: 170,
    height: 28,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 18,
    padding: 8,
    marginRight: 8,
    position: "relative",
  },
  badgeDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF3B30",
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.2)",
  },
  searchBar: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.93)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 14,
    borderWidth: 1,
  },
  searchText: {
    fontSize: 15,
    marginLeft: 10,
    flex: 1,
    fontFamily,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 14,
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  ringCenter: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  ringPercentText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    fontFamily,
  },
  ringCaption: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 8,
    fontWeight: "600",
    fontFamily,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: -1,
  },
  xpInfo: {
    flex: 1,
  },
  xpValue: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    fontFamily,
  },
  xpNext: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontFamily,
    marginTop: 1,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 6,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  chipText: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 11,
    fontWeight: "600",
    fontFamily,
  },
  milestoneChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 8,
    gap: 5,
  },
  milestoneText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 10,
    fontWeight: "600",
    fontFamily,
  },
  continueRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
    gap: 10,
    overflow: "hidden",
  },
  continueAccentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  continueIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  continueIconGradient: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  continueTextWrap: {
    flex: 1,
  },
  continueLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 10,
    fontWeight: "600",
    fontFamily,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  continueTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    fontFamily,
  },
  checkInTrigger: {
    marginRight: 10,
    position: "relative",
  },
  checkInIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  checkInStreakBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  checkInStreakText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  actionItem: {
    alignItems: "center",
    width: 68,
  },
  actionIconWrapper: {
    borderRadius: 22,
    width: 56,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
    overflow: "hidden",
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
    color: "#FFFFFF",
    fontSize: 11,
    textAlign: "center",
    fontWeight: "600",
    fontFamily,
  },
});
