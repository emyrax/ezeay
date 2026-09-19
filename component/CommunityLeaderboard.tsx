import { View, Text, StyleSheet, Image } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useThemeColors } from "../hooks/useTheme";
import { bodyFont } from "../constants/themes";
import { getAvatarUrl } from "../lib/dicebear";
import type { CommunityLeader } from "../types/community";

const PODIUM = [
  { color: "#FBBF24", icon: "trophy" },
  { color: "#C0C7D1", icon: "medal" },
  { color: "#D29A6A", icon: "medal" },
] as const;

export default function CommunityLeaderboard({
  leaderboard,
  myUid,
}: {
  leaderboard: CommunityLeader[];
  myUid: string;
}) {
  const theme = useThemeColors();

  if (leaderboard.length === 0) {
    return (
      <View style={styles.empty}>
        <MaterialCommunityIcons name="podium" size={28} color={theme.textMuted} />
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>No learners yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      <Text style={[styles.title, { color: theme.text, fontFamily: bodyFont }]}>Top Learners</Text>
      {leaderboard.map((leader, i) => {
        const isMe = leader.uid === myUid;
        const podium = i < 3 ? PODIUM[i] : undefined;
        const avatar = leader.photoURL || getAvatarUrl(leader.uid);
        return (
          <View
            key={leader.uid}
            style={[
              styles.row,
              isMe && { backgroundColor: theme.primary + "12", borderRadius: 14 },
            ]}
          >
            <View style={styles.rankSlot}>
              {podium ? (
                <View style={[styles.podiumBadge, { backgroundColor: podium.color }]}>
                  <MaterialCommunityIcons name={podium.icon} size={14} color="#FFFFFF" />
                </View>
              ) : (
                <Text style={[styles.rankNumber, { color: theme.textMuted, fontFamily: bodyFont }]}>
                  {i + 1}
                </Text>
              )}
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
                Level {leader.gamingLevel} · {leader.rank}
              </Text>
            </View>

            <View style={styles.xpWrap}>
              <Text style={[styles.xp, { color: theme.text, fontFamily: bodyFont }]}>
                {leader.xp.toLocaleString()}
              </Text>
              <Text style={[styles.xpLabel, { color: theme.textMuted }]}>XP</Text>
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
  rankSlot: {
    width: 30,
    alignItems: "center",
  },
  podiumBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  rankNumber: {
    fontSize: 15,
    fontWeight: "700",
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
  xpWrap: {
    alignItems: "flex-end",
  },
  xp: {
    fontSize: 15,
    fontWeight: "800",
  },
  xpLabel: {
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