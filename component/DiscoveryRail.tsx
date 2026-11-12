import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { safeFont } from "../constants/themes";
import { useThemeColors } from "../hooks/useTheme";
import { getCurrentStreak, getWeekActivity } from "../lib/stats/activity";
import { useStatsStore } from "../store/statsStore";
import { useUserStore } from "../store/userStore";
import type { ThreadPost, ThreadUser } from "../types/thread";
import CommunityAvatar from "./CommunityAvatar";

interface DiscoveryRailProps {
  width: number;
  posts: ThreadPost[];
  onPressUser: (post: ThreadPost) => void;
  variant?: "default" | "stats";
  compact?: boolean;
  onExploreCamp?: () => void;
}

export default function DiscoveryRail({
  width,
  posts,
  onPressUser,
  variant = "default",
  compact = false,
  onExploreCamp,
}: DiscoveryRailProps) {
  const colors = useThemeColors();
  const profile = useUserStore((state) => state.profile);
  const days = useStatsStore((state) => state.days);
  const streak = useMemo(() => getCurrentStreak(days), [days]);

  const trending = useMemo(() => {
    const counts = new Map<string, { title: string; count: number }>();
    for (const post of posts) {
      if (!post.courseTitle) continue;
      const current = counts.get(post.courseId);
      if (current) {
        current.count += 1;
      } else {
        counts.set(post.courseId, { title: post.courseTitle, count: 1 });
      }
    }
    return [...counts.values()]
      .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title))
      .slice(0, 5);
  }, [posts]);

  const learners = useMemo(() => {
    const byUser = new Map<
      string,
      { user: ThreadUser; post: ThreadPost; count: number }
    >();

    for (const post of posts) {
      if (!post.author?.id || post.author.id === profile?.uid) continue;
      if (post.author.isFollowing) continue;
      const current = byUser.get(post.author.id);
      if (current) {
        current.count += 1;
      } else {
        byUser.set(post.author.id, { user: post.author, post, count: 1 });
      }
    }

    return [...byUser.values()]
      .sort(
        (a, b) =>
          b.user.iqScore - a.user.iqScore ||
          b.user.followersCount - a.user.followersCount ||
          b.count - a.count,
      )
      .slice(0, 4);
  }, [posts, profile?.uid]);

  const levelProgress =
    profile && profile.nextLevelXp > 0
      ? Math.min(100, Math.round((profile.xp / profile.nextLevelXp) * 100))
      : 0;

  const week = useMemo(() => getWeekActivity(days), [days]);
  const weekMax = Math.max(1, ...week.map((day) => day.count));

  return (
    <View style={[styles.rail, { width }]}>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.eyebrow, { color: colors.primary }]}>YOUR CAMP</Text>
        <View style={styles.campRow}>
          <CommunityAvatar
            uid={profile?.uid ?? "yuinx"}
            photoURL={profile?.photoURL}
            size={44}
          />
          <View style={styles.campCopy}>
            <Text style={[styles.campName, { color: colors.text }]} numberOfLines={1}>
              {profile?.displayName ?? "Your camp"}
            </Text>
            <Text style={[styles.campMeta, { color: colors.textMuted }]}>
              Level {profile?.gamingLevel ?? 1} · {profile?.rank ?? "Learner"}
            </Text>
          </View>
        </View>

        <View style={styles.progressHeader}>
          <Text style={[styles.progressLabel, { color: colors.textMuted }]}>
            Next level
          </Text>
          <Text style={[styles.progressValue, { color: colors.textSecondary }]}>
            {profile?.xp ?? 0} / {profile?.nextLevelXp ?? 0} XP
          </Text>
        </View>
        <View style={[styles.track, { backgroundColor: colors.surfaceAlt }]}>
          <View
            style={[
              styles.fill,
              {
                width: `${levelProgress}%` as `${number}%`,
                backgroundColor: colors.primary,
              },
            ]}
          />
        </View>

        <View style={styles.metrics}>
          <Metric icon="fire" value={String(streak)} label="streak" color={colors.warning} />
          <Metric
            icon="diamond-stone"
            value={String(profile?.coins ?? 0)}
            label="coins"
            color={colors.success}
          />
          <Metric
            icon="trophy-outline"
            value={String(profile?.earnedTrophies?.length ?? 0)}
            label="trophies"
            color={colors.info}
          />
        </View>

        {variant === "stats" ? (
          <View style={styles.weekBlock}>
            <View style={styles.weekHeader}>
              <Text style={[styles.weekLabel, { color: colors.textMuted }]}>
                This week
              </Text>
              <Text style={[styles.weekTotal, { color: colors.textSecondary }]}>
                {week.reduce((sum, day) => sum + day.count, 0)} actions
              </Text>
            </View>
            <View style={styles.weekRow}>
              {week.map((day) => (
                <View key={day.key} style={styles.weekDay}>
                  <View
                    style={[
                      styles.weekBarTrack,
                      { backgroundColor: colors.surfaceAlt },
                    ]}
                  >
                    <View
                      style={[
                        styles.weekBarFill,
                        {
                          height: `${Math.max(8, (day.count / weekMax) * 100)}%`,
                          backgroundColor:
                            day.count > 0 ? colors.primary : colors.border,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.weekDayLabel, { color: colors.textMuted }]}>
                    {day.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {onExploreCamp ? (
          <Pressable
            onPress={onExploreCamp}
            style={[styles.campCta, { backgroundColor: colors.primary + "18" }]}
            accessibilityRole="button"
            accessibilityLabel="Explore your camp"
          >
            <MaterialCommunityIcons
              name="compass-outline"
              size={16}
              color={colors.primary}
            />
            <Text style={[styles.campCtaText, { color: colors.primary }]}>
              Explore Camp
            </Text>
          </Pressable>
        ) : null}
      </View>

      {!compact ? (
        <>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.eyebrow, { color: colors.info }]}>
              TRENDING SUBJECTS
            </Text>
        {trending.length > 0 ? (
          <View style={styles.chipWrap}>
            {trending.map((subject) => (
              <View
                key={subject.title}
                style={[styles.subjectChip, { backgroundColor: colors.surfaceAlt }]}
              >
                <MaterialCommunityIcons
                  name="book-open-variant"
                  size={13}
                  color={colors.primary}
                />
                <Text
                  style={[styles.subjectText, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {subject.title}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Trends appear as learners share chapters.
          </Text>
        )}
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.eyebrow, { color: colors.primary }]}>LEARNERS TO FOLLOW</Text>
        {learners.length > 0 ? (
          <View style={styles.learnerList}>
            {learners.map(({ user, post }) => (
              <Pressable
                key={user.id}
                onPress={() => onPressUser(post)}
                style={styles.learnerRow}
                accessibilityRole="button"
                accessibilityLabel={`Open ${user.name ?? user.handle}'s profile`}
              >
                <CommunityAvatar
                  uid={user.id}
                  photoURL={user.avatarUrl}
                  size={34}
                />
                <View style={styles.learnerCopy}>
                  <Text
                    style={[styles.learnerName, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {user.name ?? user.handle}
                  </Text>
                  <Text
                    style={[styles.learnerMeta, { color: colors.textMuted }]}
                    numberOfLines={1}
                  >
                    {user.iqScore} IQ · {user.followersCount} followers
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="arrow-top-right"
                  size={16}
                  color={colors.primary}
                />
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Follow learners once the feed has new voices.
          </Text>
        )}
      </View>
        </>
      ) : null}
    </View>
  );
}

function Metric({
  icon,
  value,
  label,
  color,
}: {
  icon: string;
  value: string;
  label: string;
  color: string;
}) {
  return (
    <View style={styles.metric}>
      <MaterialCommunityIcons name={icon as never} size={15} color={color} />
      <Text style={[styles.metricValue, { color }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.metricLabel, { color: "rgba(162,170,179,0.8)" }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    paddingTop: 16,
    paddingLeft: 8,
    gap: 14,
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  eyebrow: {
    fontFamily: safeFont,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  campRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },
  campCopy: {
    flex: 1,
    minWidth: 0,
  },
  campName: {
    fontFamily: safeFont,
    fontSize: 14,
    fontWeight: "800",
  },
  campMeta: {
    fontFamily: safeFont,
    fontSize: 11,
    marginTop: 2,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 14,
  },
  progressLabel: {
    fontFamily: safeFont,
    fontSize: 10,
  },
  progressValue: {
    fontFamily: safeFont,
    fontSize: 10,
    fontWeight: "700",
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginTop: 6,
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },
  metrics: {
    flexDirection: "row",
    gap: 6,
    marginTop: 14,
  },
  metric: {
    flex: 1,
    alignItems: "center",
    gap: 1,
  },
  metricValue: {
    fontFamily: safeFont,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 1,
  },
  metricLabel: {
    fontFamily: safeFont,
    fontSize: 9,
  },
  weekBlock: {
    marginTop: 14,
  },
  weekHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  weekLabel: {
    fontFamily: safeFont,
    fontSize: 10,
  },
  weekTotal: {
    fontFamily: safeFont,
    fontSize: 10,
    fontWeight: "700",
  },
  weekRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    marginTop: 8,
  },
  weekDay: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  weekBarTrack: {
    width: "100%",
    height: 36,
    borderRadius: 5,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  weekBarFill: {
    width: "100%",
    borderRadius: 5,
  },
  weekDayLabel: {
    fontFamily: safeFont,
    fontSize: 8,
    textTransform: "uppercase",
  },
  campCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 14,
  },
  campCtaText: {
    fontFamily: safeFont,
    fontSize: 12,
    fontWeight: "800",
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  subjectChip: {
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  subjectText: {
    flexShrink: 1,
    maxWidth: 180,
    fontFamily: safeFont,
    fontSize: 11,
    fontWeight: "600",
  },
  emptyText: {
    fontFamily: safeFont,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  learnerList: {
    marginTop: 8,
    gap: 4,
  },
  learnerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    minHeight: 44,
  },
  learnerCopy: {
    flex: 1,
    minWidth: 0,
  },
  learnerName: {
    fontFamily: safeFont,
    fontSize: 13,
    fontWeight: "700",
  },
  learnerMeta: {
    fontFamily: safeFont,
    fontSize: 10,
    marginTop: 1,
  },
});
