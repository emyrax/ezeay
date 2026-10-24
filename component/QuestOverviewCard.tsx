import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../hooks/useTheme";
import ProgressBar from "./ProgressBar";

interface Props {
  total: number;
  inProgress: number;
  completed: number;
  gems: number;
}

interface StatProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  tint: string;
}

function Stat({ icon, label, value, tint }: StatProps) {
  const theme = useThemeColors();

  return (
    <View style={styles.stat}>
      <View style={[styles.statIcon, { backgroundColor: tint + "18" }]}>
        <Ionicons name={icon} size={16} color={tint} />
      </View>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

export default function QuestOverviewCard({ total, inProgress, completed, gems }: Props) {
  const theme = useThemeColors();
  const completion = total > 0 ? completed / total : 0;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: theme.accent + "18" }]}>
          <Ionicons name="sparkles" size={18} color={theme.accent} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.kicker, { color: theme.textMuted }]}>QUEST LOG</Text>
          <Text style={[styles.title, { color: theme.text }]}>Your learning at a glance</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <Stat icon="albums-outline" label="Quests" value={total} tint={theme.accent} />
        <Stat icon="play-circle-outline" label="In progress" value={inProgress} tint={theme.info} />
      </View>
      <View style={styles.statsRow}>
        <Stat icon="checkmark-done-outline" label="Completed" value={completed} tint={theme.success} />
        <Stat icon="diamond-outline" label="Gems" value={gems} tint="#F59E0B" />
      </View>

      <View style={styles.completionBlock}>
        <View style={styles.completionRow}>
          <Text style={[styles.completionLabel, { color: theme.textSecondary }]}>
            Completion
          </Text>
          <Text style={[styles.completionValue, { color: theme.primary }]}>
            {Math.round(completion * 100)}%
          </Text>
        </View>
        <ProgressBar
          progress={completion}
          trackColor={theme.surfaceAlt}
          filledColors={[theme.accent, theme.primary]}
          height={6}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  kicker: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  stat: {
    flex: 1,
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 1,
  },
  completionBlock: {
    marginTop: 8,
    gap: 8,
  },
  completionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  completionLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  completionValue: {
    fontSize: 12,
    fontWeight: "800",
  },
});
