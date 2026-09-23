import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../hooks/useTheme";
import QuizRewardOverlay from "./QuizRewardOverlay";
import type { ChapterPerformance } from "../store/courseProgressStore";

interface Props {
  visible: boolean;
  performance: ChapterPerformance | null;
  onContinue: () => void;
}

const TIER_COLORS: Record<string, string> = {
  perfect: "#FFD700",
  great: "#38BDF8",
  good: "#4ADE80",
  average: "#FBBF24",
  low: "#F87171",
};

export default function ChapterCompletionDialog({
  visible,
  performance,
  onContinue,
}: Props) {
  const theme = useThemeColors();

  const accentColor = performance
    ? TIER_COLORS[performance.tier] || theme.warning
    : theme.warning;

  return (
    <QuizRewardOverlay
      visible={visible}
      accentColor={accentColor}
      title={performance?.message ?? "Complete!"}
      subtitle={performance?.subtitle ?? "Great work!"}
      score={performance?.stats.avgScore}
      total={100}
      primaryLabel="Claim Rewards & Continue"
      onPrimary={onContinue}
      onRequestClose={onContinue}
    >
      {performance && (
        <View style={styles.childrenWrap}>
          <View style={[styles.tierBadge, { backgroundColor: accentColor + "20" }]}>
            <Ionicons name="star" size={13} color={accentColor} />
            <Text style={[styles.tierText, { color: accentColor }]}>
              {performance.tier.toUpperCase()}
            </Text>
          </View>

          <View style={[styles.statsRow, { backgroundColor: theme.surfaceAlt }]}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {performance.stats.avgScore}%
              </Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>Avg Score</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {performance.stats.perfectCount}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>Perfect</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {performance.stats.totalRetries}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>Retries</Text>
            </View>
          </View>

          {performance.xp > 0 ? (
            <View style={[styles.xpBadge, { backgroundColor: accentColor + "20" }]}>
              <Ionicons name="sparkles" size={18} color={accentColor} />
              <Text style={[styles.xpText, { color: accentColor }]}>+{performance.xp} XP</Text>
            </View>
          ) : (
            <Text style={[styles.noXpNote, { color: theme.textMuted }]}>Keep practicing!</Text>
          )}
        </View>
      )}
    </QuizRewardOverlay>
  );
}

const styles = StyleSheet.create({
  childrenWrap: {
    width: "100%",
    alignItems: "center",
    marginTop: 8,
    gap: 16,
  },
  tierBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
  },
  tierText: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 14,
    width: "100%",
  },
  stat: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    marginVertical: 4,
  },
  xpBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  xpText: {
    fontSize: 16,
    fontWeight: "800",
  },
  noXpNote: {
    fontSize: 13,
    fontWeight: "600",
  },
});