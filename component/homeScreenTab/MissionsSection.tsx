import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { trophyData } from "../../data/trophies";
import { useThemeColors } from "../../hooks/useTheme";
import { eventBus } from "../../lib/eventBus";
import { useBountyStore } from "../../store/bountyStore";
import { useCheckInStore } from "../../store/checkInStore";
import { useCourseStore } from "../../store/courseStore";
import {
  getCycleLabel,
  MISSION_ORDER,
  useMissionStore,
  type MissionKey,
} from "../../store/missionStore";
import { useSpinStore } from "../../store/spinStore";
import { useUserStore } from "../../store/userStore";
import { useUserTrophyStore } from "../../store/userTrophyStore";
import MissionRewardOverlay from "./MissionRewardOverlay";

const ICON_MAP: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  rocket: "rocket-launch",
  book: "book-open-variant",
  trophy: "trophy-outline",
  star: "star",
  map: "map",
  crown: "crown",
  fire: "fire",
  lightning: "lightning-bolt",
  target: "target",
  shield: "shield",
  layers: "layers",
  gem: "diamond",
};

function computeTrophyProgress(
  trophy: (typeof trophyData)[0],
  xp: number,
  gamingLevel: number,
  completedCourses: number,
  streak: number,
): { current: number; target: number; percent: number } {
  let current = 0;
  const target = trophy.conditionValue;
  switch (trophy.conditionType) {
    case "courses_completed":
      current = completedCourses;
      break;
    case "xp_total":
      current = xp;
      break;
    case "gaming_level":
      current = gamingLevel;
      break;
    case "streak_days":
      current = streak;
      break;
    case "bounties_claimed":
    case "modules_completed":
    default:
      current = 0;
  }
  return {
    current: Math.min(current, target),
    target,
    percent: Math.min(100, Math.round((current / target) * 100)),
  };
}

export default function MissionsSection() {
  const theme = useThemeColors();
  const router = useRouter();
  const { profile, getToken } = useAuth();
  const missionStore = useMissionStore();
  const checkInStore = useCheckInStore();
  const spinStore = useSpinStore();
  const bounties = useBountyStore((s) => s.bounties);
  const courseStoreCourses = useCourseStore((s) => s.courses);
  const gameProfile = useUserStore((s) => s.profile);
  const trophies = useUserTrophyStore((s) => s.trophies);
  const [checkingIn, setCheckingIn] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    useMissionStore.getState().load();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        useMissionStore.getState().beginCycleIfNeeded();
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const unsub = eventBus.on("bounty:claimed", (item: { xp?: number; coins?: number }) => {
      useMissionStore
        .getState()
        .markCompleted({
          key: "bounty",
          title: "Plan your day",
          icon: "calendar-edit",
          description: "Bounty reward claimed.",
          xp: item.xp ?? 0,
          coins: item.coins ?? 0,
        })
        .catch(() => {});
    });
    return unsub;
  }, []);

  const ownCourses = useMemo(
    () => courseStoreCourses.filter((c) => c.creatorId === profile?.uid),
    [courseStoreCourses, profile],
  );
  const sharedCourse = useMemo(() => ownCourses.find((c) => c.isPublic), [ownCourses]);

  const prevSharedIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const currentId = sharedCourse?.id;
    const prevId = prevSharedIdRef.current;
    prevSharedIdRef.current = currentId;
    if (currentId && prevId !== currentId) {
      useMissionStore
        .getState()
        .markCompleted(
          {
            key: "share",
            title: "Share a course",
            icon: "earth",
            description: "Your course is visible in the Camp.",
            xp: 15,
            coins: 10,
          },
          { grant: true, getToken },
        )
        .catch(() => {});
    }
  }, [sharedCourse, getToken]);

  const handleCheckIn = useCallback(async () => {
    if (!profile || checkingIn || !checkInStore.canCheckIn()) return;
    setCheckingIn(true);
    try {
      const result = await checkInStore.checkIn(profile.uid, getToken);
      if (result.success) {
        await useMissionStore
          .getState()
          .markCompleted({
            key: "checkin",
            title: "Daily check-in",
            icon: "fire",
            description: "Your streak is growing.",
            xp: result.xpReward,
            coins: result.coinReward,
          });
      }
    } finally {
      setCheckingIn(false);
    }
  }, [profile, checkingIn, checkInStore, getToken]);

  const handleShare = useCallback(() => {
    const target = ownCourses[0];
    if (target) {
      router.push(`/(course)/${target.id}/chapters` as Href);
    } else {
      router.push("/(tabs)/quests" as Href);
    }
  }, [ownCourses, router]);

  const doneMap: Record<MissionKey, boolean> = useMemo(() => {
    const checkedInToday = !checkInStore.canCheckIn();
    const claimable = bounties.some(
      (b) => b.status === "completed" || b.status === "claimed",
    );
    const shared = !!sharedCourse;
    return {
      checkin: missionStore.isDone("checkin") || checkedInToday,
      bounty: missionStore.isDone("bounty") || claimable,
      spin: missionStore.isDone("spin") || spinStore.lastSpinDate === today,
      share: missionStore.isDone("share") || shared,
    };
  }, [missionStore, checkInStore, bounties, sharedCourse, spinStore, today]);

  const doneCount = MISSION_ORDER.filter((k) => doneMap[k]).length;
  const percent = Math.round((doneCount / MISSION_ORDER.length) * 100);

  useEffect(() => {
    if (doneCount >= MISSION_ORDER.length && !missionStore.cycleBonusClaimed) {
      useMissionStore.getState().maybeClaimCycleBonus(getToken, doneCount).catch(() => {});
    }
  }, [doneCount, missionStore.cycleBonusClaimed, getToken]);

  const missions: {
    key: MissionKey;
    title: string;
    subtitle: string;
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    done: boolean;
    onPress: () => void;
  }[] = [
    {
      key: "checkin",
      title: "Check in",
      subtitle: doneMap.checkin
        ? `${checkInStore.currentStreak || 0}-day streak`
        : "Start the day with XP",
      icon: "fire",
      done: doneMap.checkin,
      onPress: handleCheckIn,
    },
    {
      key: "bounty",
      title: "Plan your day",
      subtitle: doneMap.bounty
        ? "Reward ready to claim"
        : "Complete challenges to earn XP",
      icon: "calendar-edit",
      done: doneMap.bounty,
      onPress: () => router.push("/(schedule)" as Href),
    },
    {
      key: "spin",
      title: "Take a spin",
      subtitle: doneMap.spin
        ? "Wheel spun for today"
        : `${spinStore.spinsRemaining} spins left`,
      icon: "rotate-right",
      done: doneMap.spin,
      onPress: () => spinStore.openWheel(),
    },
    {
      key: "share",
      title: "Share a course",
      subtitle: doneMap.share ? "Visible in the Camp" : "Teach the camp something",
      icon: "earth",
      done: doneMap.share,
      onPress: handleShare,
    },
  ];

  const nextMissionKey = useMemo(
    () => MISSION_ORDER.find((k) => !doneMap[k]),
    [doneMap],
  );

  const overlayVisible = !!missionStore.pendingReward && !spinStore.wheelVisible;

  const handleKeepGoing = useCallback(() => {
    useMissionStore.getState().dismissReward();
  }, []);

  const handleNextMission = useCallback(() => {
    const key = nextMissionKey;
    handleKeepGoing();
    if (key === "spin") {
      spinStore.openWheel();
    } else if (key === "bounty") {
      router.push("/(schedule)" as Href);
    } else if (key === "share") {
      handleShare();
    } else if (key === "checkin") {
      handleCheckIn();
    }
  }, [nextMissionKey, handleKeepGoing, spinStore, router, handleShare, handleCheckIn]);

  const cycleLabel = getCycleLabel(missionStore.cycleKey);
  const resetLabel = missionStore.cycleKey?.endsWith(":AM")
    ? "resets 6 PM"
    : missionStore.cycleKey
      ? "resets 6 AM"
      : "";

  const completedCourses = useMemo(
    () => ownCourses.filter((c) => c.progress && c.progress >= 100).length,
    [ownCourses],
  );
  const earnedIds = useMemo(
    () => new Set(trophies.map((t) => t.trophyId)),
    [trophies],
  );

  const xp = gameProfile?.xp ?? 0;
  const gamingLevel = gameProfile?.gamingLevel ?? 1;
  const streak = checkInStore.currentStreak ?? 0;

  const nextTrophy = useMemo(() => {
    return trophyData
      .filter((t) => !earnedIds.has(t.id))
      .map((t) => ({
        trophy: t,
        progress: computeTrophyProgress(
          t,
          xp,
          gamingLevel,
          completedCourses,
          streak,
        ),
      }))
      .filter((t) => t.progress.percent > 0 && t.progress.percent < 100)
      .sort((a, b) => b.progress.percent - a.progress.percent)[0];
  }, [earnedIds, xp, gamingLevel, completedCourses, streak]);

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            TODAY’S MISSIONS
          </Text>
          <Text
            style={[styles.sectionSubtitle, { color: theme.textSecondary }]}
          >
            Tiny quests, daily momentum
          </Text>
          {cycleLabel && resetLabel && (
            <Text style={[styles.cycleLabel, { color: theme.textMuted }]}>
              {cycleLabel} set · {resetLabel}
            </Text>
          )}
        </View>
        <View
          style={[
            styles.progressChip,
            { backgroundColor: theme.primary + "15" },
          ]}
        >
          <Text style={[styles.progressChipText, { color: theme.primary }]}>
            {doneCount}/{MISSION_ORDER.length}
          </Text>
        </View>
      </View>

      <View style={[styles.progressBg, { backgroundColor: theme.border }]}>
        <View
          style={[
            styles.progressFill,
            { width: `${percent}%`, backgroundColor: theme.primary },
          ]}
        />
      </View>

      <View style={styles.missionList}>
        {missions.map((mission) => (
          <TouchableOpacity
            key={mission.key}
            style={[styles.missionRow, { backgroundColor: theme.surfaceAlt }]}
            activeOpacity={0.7}
            onPress={mission.onPress}
          >
            <View
              style={[
                styles.missionIconWrap,
                {
                  backgroundColor: mission.done
                    ? theme.success + "25"
                    : theme.primary + "15",
                },
              ]}
            >
              <MaterialCommunityIcons
                name={mission.icon}
                size={20}
                color={mission.done ? theme.success : theme.primary}
              />
            </View>
            <View style={styles.missionBody}>
              <Text
                style={[
                  styles.missionTitle,
                  { color: mission.done ? theme.textSecondary : theme.text },
                ]}
              >
                {mission.title}
              </Text>
              <Text
                style={[styles.missionSubtitle, { color: theme.textMuted }]}
              >
                {mission.subtitle}
              </Text>
            </View>
            <View
              style={[
                styles.missionCta,
                {
                  backgroundColor: mission.done
                    ? theme.success + "20"
                    : theme.primary + "15",
                },
              ]}
            >
              {mission.done ? (
                <MaterialCommunityIcons
                  name="check"
                  size={16}
                  color={theme.success}
                />
              ) : (
                <Text style={[styles.missionCtaText, { color: theme.primary }]}>
                  GO
                </Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {nextTrophy && (
        <TouchableOpacity
          style={[styles.nextCard, { backgroundColor: theme.surfaceAlt }]}
          activeOpacity={0.7}
          onPress={() => router.push("/(tabs)/profile" as Href)}
        >
          <View style={styles.nextHeader}>
            <MaterialCommunityIcons
              name={ICON_MAP[nextTrophy.trophy.icon] || "trophy-outline"}
              size={22}
              color="#FFD700"
            />
            <View style={styles.nextBody}>
              <Text style={[styles.nextLabel, { color: theme.textMuted }]}>
                NEXT TROPHY
              </Text>
              <Text style={[styles.nextName, { color: theme.text }]}>
                {nextTrophy.trophy.name}
              </Text>
            </View>
            <Text style={[styles.nextPercent, { color: theme.primary }]}>
              {nextTrophy.progress.percent}%
            </Text>
          </View>
          <View style={[styles.nextBarBg, { backgroundColor: theme.border }]}>
            <View
              style={[
                styles.nextBarFill,
                {
                  width: `${nextTrophy.progress.percent}%`,
                  backgroundColor: theme.primary,
                },
              ]}
            />
          </View>
          <Text style={[styles.nextDetail, { color: theme.textMuted }]}>
            {nextTrophy.trophy.description}
          </Text>
        </TouchableOpacity>
      )}

      <MissionRewardOverlay
        visible={overlayVisible}
        reward={missionStore.pendingReward}
        doneCount={doneCount}
        total={MISSION_ORDER.length}
        cycleBonusClaimed={missionStore.cycleBonusClaimed}
        cycleBonusXp={missionStore.cycleBonusXp}
        onKeepGoing={handleKeepGoing}
        onNextMission={handleNextMission}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  cycleLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  progressChip: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 4,
  },
  progressChipText: {
    fontSize: 12,
    fontWeight: "800",
  },
  progressBg: {
    height: 4,
    borderRadius: 2,
    marginBottom: 10,
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  missionList: {
    gap: 8,
  },
  missionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    padding: 10,
  },
  missionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  missionBody: {
    flex: 1,
  },
  missionTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  missionSubtitle: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 1,
  },
  missionCta: {
    minWidth: 34,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  missionCtaText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  nextCard: {
    borderRadius: 12,
    padding: 12,
    gap: 6,
    marginTop: 10,
  },
  nextHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  nextBody: {
    flex: 1,
  },
  nextLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  nextName: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 1,
  },
  nextPercent: {
    fontSize: 13,
    fontWeight: "800",
  },
  nextBarBg: {
    height: 4,
    borderRadius: 2,
  },
  nextBarFill: {
    height: 4,
    borderRadius: 2,
  },
  nextDetail: {
    fontSize: 11,
    fontWeight: "500",
  },
});