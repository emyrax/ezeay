import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useThemeColors } from "../hooks/useTheme";
import { bodyFont } from "../constants/themes";

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

export default function CommunityStatsGrid({
  learners,
  totalXp,
  notesShared,
  activeToday,
}: {
  learners: number;
  totalXp: number;
  notesShared: number;
  activeToday: number;
}) {
  const theme = useThemeColors();

  const tiles = [
    { label: "Learners", value: learners, icon: "account-group", color: theme.primary },
    { label: "Total XP", value: totalXp, icon: "star-four-points", color: theme.accent },
    { label: "Notes Shared", value: notesShared, icon: "book-open-page-variant", color: theme.success },
    { label: "Active Today", value: activeToday, icon: "fire", color: theme.warning },
  ] as const;

  return (
    <View style={styles.grid}>
      {tiles.map((tile) => (
        <View key={tile.label} style={[styles.tile, { backgroundColor: theme.surfaceAlt }]}>
          <View style={[styles.iconWrap, { backgroundColor: tile.color }]}>
            <MaterialCommunityIcons name={tile.icon} size={18} color="#FFFFFF" />
          </View>
          <Text style={[styles.value, { color: theme.text, fontFamily: bodyFont }]}>
            {formatCompact(tile.value)}
          </Text>
          <Text style={[styles.label, { color: theme.textMuted }]}>{tile.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tile: {
    width: "48%",
    flexGrow: 1,
    borderRadius: 16,
    padding: 14,
    gap: 4,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  value: {
    fontSize: 22,
    fontWeight: "800",
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
  },
});