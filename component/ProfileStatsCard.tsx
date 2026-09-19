import { View, Text, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../hooks/useTheme";

interface ProfileStatsCardProps {
  avatarUri?: string;
  name: string;
  level: number;
  xpProgress: number;
  xpGoal: number;
}

export default function ProfileStatsCard({
  avatarUri,
  name,
  level,
  xpProgress,
  xpGoal,
}: ProfileStatsCardProps) {
  const theme = useThemeColors();
  const pct = Math.min((xpProgress / xpGoal) * 100, 100);

  return (
    <View style={[styles.card, { backgroundColor: theme.surface }]}>
      {/* Row: avatar + name + level */}
      <View style={styles.row}>
        <View style={[styles.avatarWrap, { borderColor: theme.primary }]}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
          ) : (
            <Ionicons name="person" size={28} color={theme.primary} />
          )}
        </View>
        <View style={styles.infoCol}>
          <Text style={[styles.username, { color: theme.text }]}>{name}</Text>
          <Text style={[styles.levelText, { color: theme.textSecondary }]}>
            Level {level}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: theme.success }]}>
          <Text style={[styles.badgeText, { color: theme.surface }]}>VIP</Text>
        </View>
      </View>

      {/* XP bar */}
      <View style={styles.barOuter}>
        <View style={[styles.barInner, { width: `${pct}%`, backgroundColor: theme.primary }]} />
      </View>
      <View style={styles.barLabels}>
        <Text style={[styles.barLabel, { color: theme.textMuted }]}>
          {xpProgress} / {xpGoal} XP
        </Text>
        <Text style={[styles.barSubtext, { color: theme.textMuted }]}>
          {Math.round(pct)}%
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    gap: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatarWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2.5,
  },
  avatarImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  infoCol: {
    flex: 1,
  },
  username: {
    fontSize: 20,
    fontWeight: "700",
  },
  levelText: {
    fontSize: 14,
    fontWeight: "500",
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  barOuter: {
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  barInner: {
    height: 10,
    borderRadius: 5,
  },
  barLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  barLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  barSubtext: {
    fontSize: 12,
    fontWeight: "500",
  },
});
