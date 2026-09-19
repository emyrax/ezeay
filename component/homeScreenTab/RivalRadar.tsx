import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { useRouter, type Href } from "expo-router";
import { useCommunityStore } from "../../store/communityStore";
import { useUserStore } from "../../store/userStore";
import { useThemeColors } from "../../hooks/useTheme";
import CommunityAvatar from "../CommunityAvatar";

export default function RivalRadar() {
  const theme = useThemeColors();
  const router = useRouter();
  const overview = useCommunityStore((s) => s.overview);
  const profile = useUserStore((s) => s.profile);

  const rivalInfo = useMemo(() => {
    if (!overview || overview.leaderboard.length === 0) return null;

    const rank = overview.me.rank;
    const isLeader = rank === 1;
    const idxAbove = rank - 2;
    const rival =
      idxAbove >= 0 && idxAbove < overview.leaderboard.length
        ? overview.leaderboard[idxAbove]
        : overview.leaderboard[0];

    const myXp = profile?.xp ?? 0;
    const xpGap = isLeader ? 0 : Math.max(0, (rival?.xp ?? 0) - myXp);
    const streakChampion = overview.topStreaks[0];

    return { rank, isLeader, rival, xpGap, streakChampion };
  }, [overview, profile?.xp]);

  if (!overview || !rivalInfo) return null;

  const { rank, isLeader, rival, xpGap, streakChampion } = rivalInfo;

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>RIVAL RADAR</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
            Your camp standing
          </Text>
        </View>
        <View style={[styles.rankChip, { backgroundColor: theme.primary + "15" }]}>
          <Text style={[styles.rankChipText, { color: theme.primary }]}>#{rank}</Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.surfaceAlt }]}>
        {isLeader ? (
          <View style={styles.leaderWrap}>
            <MaterialCommunityIcons name="crown" size={32} color="#FFD700" />
            <Text style={[styles.leaderText, { color: theme.text }]}>
              You're the camp leader!
            </Text>
            <Text style={[styles.leaderSub, { color: theme.textMuted }]}>
              Watch for challengers below you.
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.rivalRow}
            activeOpacity={0.7}
            onPress={() => router.push("/(tabs)/stats" as Href)}
          >
            <CommunityAvatar uid={rival.uid} photoURL={rival.photoURL} size={48} />
            <View style={styles.rivalInfo}>
              <Text style={[styles.vsLabel, { color: theme.textMuted }]}>
                YOUR RIVAL · #{rank - 1}
              </Text>
              <Text style={[styles.rivalName, { color: theme.text }]} numberOfLines={1}>
                {rival.displayName ?? "Scholar"}
              </Text>
              <Text style={[styles.rivalMeta, { color: theme.textMuted }]}>
                Level {rival.gamingLevel} · {rival.rank}
              </Text>
            </View>
            <View style={styles.gapBlock}>
              <Text style={[styles.gapValue, { color: theme.danger }]}>
                {xpGap.toLocaleString()}
              </Text>
              <Text style={[styles.gapLabel, { color: theme.textMuted }]}>XP to catch</Text>
            </View>
          </TouchableOpacity>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="account-group" size={16} color={theme.primary} />
            <Text style={[styles.statValue, { color: theme.text }]}>
              {overview.totals.activeToday}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Active today</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="fire" size={16} color={theme.warning} />
            <Text style={[styles.statValue, { color: theme.text }]}>
              {streakChampion ? `${streakChampion.currentStreak}d` : "—"}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Top streak</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="trophy" size={16} color="#FFD700" />
            <Text style={[styles.statValue, { color: theme.text }]}>
              {overview.me.learnerCount}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Learners</Text>
          </View>
        </View>
      </View>
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
    marginBottom: 10,
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
  rankChip: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 4,
  },
  rankChipText: {
    fontSize: 13,
    fontWeight: "800",
  },
  card: {
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  leaderWrap: {
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
  },
  leaderText: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 2,
  },
  leaderSub: {
    fontSize: 12,
    fontWeight: "500",
  },
  rivalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rivalInfo: {
    flex: 1,
  },
  vsLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  rivalName: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 1,
  },
  rivalMeta: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 1,
  },
  gapBlock: {
    alignItems: "flex-end",
  },
  gapValue: {
    fontSize: 16,
    fontWeight: "800",
  },
  gapLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(128,128,128,0.25)",
  },
  statItem: {
    alignItems: "center",
    gap: 2,
    flex: 1,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: "rgba(128,128,128,0.25)",
  },
});