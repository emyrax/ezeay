import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { fontFamily } from "../../constants/themes";
import { useThemeColors } from "../../hooks/useTheme";
import { withAlpha } from "../../lib/color";
import { getLevelProgress } from "../../services/LevelService";
import type { UserProfile } from "../../types/user";
import type { ProfileIconName } from "./types";

interface Props {
  profile: UserProfile | null;
  wide?: boolean;
}

interface StatItem {
  key: string;
  label: string;
  value: string;
  color: string;
  icon: ProfileIconName;
}

export default function ProfileStatCard({ profile, wide = false }: Props) {
  const theme = useThemeColors();
  const xpAnim = useRef(new Animated.Value(0)).current;

  const levelProgress = useMemo(
    () => (profile ? getLevelProgress(profile.xp, profile.gamingLevel) : null),
    [profile],
  );

  const xpProgress = levelProgress?.xpProgress ?? 0;
  const xpForNext = levelProgress?.xpForNext ?? 100;
  const target = xpForNext > 0 ? Math.min(xpProgress / xpForNext, 1) : 1;

  useEffect(() => {
    Animated.timing(xpAnim, {
      toValue: target,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [target, xpAnim]);

  const stats: StatItem[] = [
    {
      key: "xp",
      label: "Total XP",
      value: (profile?.xp ?? 0).toLocaleString(),
      color: theme.primary,
      icon: "lightning-bolt",
    },
    {
      key: "level",
      label: "Level",
      value: String(profile?.gamingLevel ?? 1),
      color: theme.accent,
      icon: "star-four-points",
    },
    {
      key: "coins",
      label: "Coins",
      value: (profile?.coins ?? 0).toLocaleString(),
      color: theme.warning,
      icon: "circle-multiple",
    },
    {
      key: "rank",
      label: "Rank",
      value: profile?.rank || "Spark",
      color: theme.success,
      icon: "shield-star-outline",
    },
  ];

  const xpPercent = xpAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View
      style={[
        styles.card,
        wide && styles.cardWide,
        { backgroundColor: theme.surface, borderColor: theme.borderLight },
      ]}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.eyebrow, { color: theme.textMuted }]}>
            YOUR PROGRESS
          </Text>
          <Text style={[styles.title, { color: theme.text }]}>
            Learning momentum
          </Text>
        </View>
        <View
          style={[
            styles.pill,
            {
              backgroundColor: withAlpha(theme.primary, 0.14),
              borderColor: withAlpha(theme.primary, 0.3),
            },
          ]}
        >
          <MaterialCommunityIcons
            name="diamond-stone"
            size={11}
            color={theme.primary}
          />
          <Text style={[styles.pillText, { color: theme.primary }]}>
            {profile?.isPro ? "PRO" : "PREMIUM"}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        {stats.map((stat) => (
          <View key={stat.key} style={styles.statItem}>
            <View
              style={[
                styles.statIcon,
                { backgroundColor: withAlpha(stat.color, 0.14) },
              ]}
            >
              <MaterialCommunityIcons
                name={stat.icon}
                size={15}
                color={stat.color}
              />
            </View>
            <Text
              style={[styles.statValue, { color: stat.color }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {stat.value}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>
              {stat.label}
            </Text>
          </View>
        ))}
      </View>

      <View
        style={[
          styles.xpTrack,
          { backgroundColor: withAlpha(theme.textMuted, 0.16) },
        ]}
      >
        <Animated.View
          style={[
            styles.xpFill,
            {
              width: xpPercent,
              backgroundColor: theme.primary,
              shadowColor: theme.primary,
            },
          ]}
        />
      </View>
      <View style={styles.xpFooter}>
        <Text style={[styles.xpLabel, { color: theme.textMuted }]}>
          {xpForNext > 0
            ? `${xpProgress.toLocaleString()} / ${xpForNext.toLocaleString()} XP`
            : "Max level reached"}
        </Text>
        <Text style={[styles.xpLabel, { color: theme.primary }]}>
          {xpForNext > 0 ? `Level ${profile?.gamingLevel ?? 1}` : "Legend"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  cardWide: {
    padding: 22,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 18,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.1,
    fontFamily,
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    fontFamily,
    letterSpacing: -0.2,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  pillText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.7,
    fontFamily,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 18,
  },
  statItem: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    gap: 5,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "900",
    fontFamily,
    maxWidth: "100%",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    fontFamily,
  },
  xpTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  xpFill: {
    height: "100%",
    borderRadius: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 3,
  },
  xpFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  xpLabel: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily,
  },
});
