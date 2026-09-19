import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useThemeColors } from "../hooks/useTheme";

interface Props {
  view: "weekly" | "monthly";
}

function useMockStats(view: "weekly" | "monthly") {
  return useMemo(() => {
    if (view === "weekly") {
      return { totalActivities: 12, streak: 4, completionRate: 75, avgXp: 45 };
    }
    return { totalActivities: 48, streak: 7, completionRate: 68, avgXp: 52 };
  }, [view]);
}

export default function StatsReviewSection({ view }: Props) {
  const theme = useThemeColors();
  const data = useMockStats(view);

  const items = [
    { label: "Total Activities", value: data.totalActivities.toString(), icon: "checkbox-marked-circle-outline" as const, color: "#38BDF8" },
    { label: "Streak", value: `${data.streak} days`, icon: "fire" as const, color: "#F97316" },
    { label: "Completion", value: `${data.completionRate}%`, icon: "percent" as const, color: "#22C55E" },
    { label: "Avg XP", value: data.avgXp.toFixed(0), icon: "lightning-bolt" as const, color: "#EAB308" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.text }]}>
        {view === "weekly" ? "Week" : "Month"} Review
      </Text>
      <View style={styles.grid}>
        {items.map((item, i) => (
          <View
            key={i}
            style={[styles.card, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
          >
            <View style={[styles.iconWrap, { backgroundColor: item.color + "20" }]}>
              <MaterialCommunityIcons name={item.icon} size={20} color={item.color} />
            </View>
            <Text style={[styles.value, { color: theme.text }]}>{item.value}</Text>
            <Text style={[styles.label, { color: theme.textMuted }]}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  card: {
    width: "48%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  value: {
    fontSize: 18,
    fontWeight: "700",
  },
  label: {
    fontSize: 11,
    fontWeight: "500",
  },
});
