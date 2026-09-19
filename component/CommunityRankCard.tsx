import { View, Text, StyleSheet, Image } from "react-native";
import { useThemeColors } from "../hooks/useTheme";
import { bodyFont } from "../constants/themes";
import { getAvatarUrl } from "../lib/dicebear";
import type { CommunityOverview } from "../types/community";
import type { UserProfile } from "../types/user";

export default function CommunityRankCard({
  overview,
  profile,
}: {
  overview: CommunityOverview;
  profile: UserProfile;
}) {
  const theme = useThemeColors();
  const { me } = overview;

  const goal = Math.max(profile.nextLevelXp, 1);
  const pct = Math.min((profile.xp / goal) * 100, 100);
  const missing = Math.max(profile.nextLevelXp - profile.xp, 0);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.overline, { color: theme.textMuted }]}>YOUR GLOBAL RANK</Text>
        <View style={[styles.avatarWrap, { borderColor: theme.primary }]}>
          <Image
            source={{ uri: profile.photoURL || getAvatarUrl(profile.uid) }}
            style={styles.avatar}
          />
        </View>
      </View>

      <View style={[styles.rankChip, { backgroundColor: theme.primary + "18" }]}>
        <Text style={[styles.rankNumber, { color: theme.primary, fontFamily: bodyFont }]}>
          #{me.rank}
        </Text>
      </View>
      <Text style={[styles.rankSub, { color: theme.textSecondary }]}>
        of {me.learnerCount.toLocaleString()} learners
      </Text>

      <View style={[styles.separator, { backgroundColor: theme.borderLight }]} />

      <Text style={[styles.name, { color: theme.text, fontFamily: bodyFont }]} numberOfLines={1}>
        {profile.displayName ?? "Scholar"}
      </Text>
      <Text style={[styles.levelLine, { color: theme.textSecondary }]}>
        Level {profile.gamingLevel} · {profile.rank}
      </Text>

      <View style={styles.barOuter}>
        <View style={[styles.barInner, { width: `${pct}%`, backgroundColor: theme.primary }]} />
      </View>
      <View style={styles.barLabels}>
        <Text style={[styles.barLabel, { color: theme.textMuted }]}>
          {profile.xp.toLocaleString()} / {profile.nextLevelXp.toLocaleString()} XP
        </Text>
        <Text style={[styles.barLabel, { color: theme.primary }]}>
          {missing > 0 ? `${missing.toLocaleString()} XP to next level` : "Max level"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  overline: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2.5,
    justifyContent: "center",
    alignItems: "center",
  },
  avatar: {
    width: 37,
    height: 37,
    borderRadius: 18.5,
  },
  rankChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 6,
  },
  rankNumber: {
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 38,
  },
  rankSub: {
    fontSize: 14,
    fontWeight: "500",
  },
  separator: {
    height: 1,
    marginVertical: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
  },
  levelLine: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },
  barOuter: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
    marginTop: 10,
  },
  barInner: {
    height: 8,
    borderRadius: 4,
  },
  barLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 6,
  },
  barLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
});