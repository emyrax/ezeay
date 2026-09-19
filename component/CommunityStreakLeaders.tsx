import { View, Text, StyleSheet, Image } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useThemeColors } from "../hooks/useTheme";
import { bodyFont } from "../constants/themes";
import { getAvatarUrl } from "../lib/dicebear";
import type { CommunityLeader } from "../types/community";

export default function CommunityStreakLeaders({
  leaders,
  myUid,
}: {
  leaders: CommunityLeader[];
  myUid: string;
}) {
  const theme = useThemeColors();

  if (leaders.length === 0) {
    return (
      <View style={styles.empty}>
        <MaterialCommunityIcons name="fire" size={28} color={theme.textMuted} />
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>No streaks yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      <Text style={[styles.title, { color: theme.text, fontFamily: bodyFont }]}>Top Streaks</Text>
      {leaders.map((leader, i) => {
        const isMe = leader.uid === myUid;
        const avatar = leader.photoURL || getAvatarUrl(leader.uid);
        return (
          <View key={leader.uid} style={styles.row}>
            <View style={[styles.flameWrap, { backgroundColor: theme.warning + "22" }]}>
              <MaterialCommunityIcons name="fire" size={20} color={theme.warning} />
            </View>

            <Image source={{ uri: avatar }} style={styles.avatar} />

            <View style={styles.info}>
              <Text
                style={[styles.name, { color: isMe ? theme.primary : theme.text }]}
                numberOfLines={1}
              >
                {leader.displayName ?? "Scholar"}
                {isMe ? "  (You)" : ""}
              </Text>
              <Text style={[styles.sub, { color: theme.textMuted }]}>
                #{i + 1} · Level {leader.gamingLevel}
              </Text>
            </View>

            <View style={styles.countWrap}>
              <Text style={[styles.count, { color: theme.warning, fontFamily: bodyFont }]}>
                {leader.currentStreak}
              </Text>
              <Text style={[styles.countLabel, { color: theme.textMuted }]}>day streak</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  flameWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
  },
  sub: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 1,
  },
  countWrap: {
    alignItems: "flex-end",
  },
  count: {
    fontSize: 16,
    fontWeight: "800",
  },
  countLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  empty: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "600",
  },
});