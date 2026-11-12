import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { safeFont } from "../../constants/themes";
import { useAuth } from "../../contexts/AuthContext";
import { useThemeColors } from "../../hooks/useTheme";
import { api } from "../../lib/api";
import { eventBus } from "../../lib/eventBus";
import {
  getCurrentStreak,
  getRecommendedLearners,
  getWeekActivity,
} from "../../lib/stats/activity";
import { useStatsStore } from "../../store/statsStore";
import { useUserStore } from "../../store/userStore";
import type { ThreadPost } from "../../types/thread";
import CommunityAvatar from "../CommunityAvatar";

interface StatsLeftRailProps {
  width: number;
  posts: ThreadPost[];
  onPressUser: (post: ThreadPost) => void;
  onPressProfile: () => void;
  onExploreCamp: () => void;
}

export default function StatsLeftRail({
  width,
  posts,
  onPressUser,
  onPressProfile,
  onExploreCamp,
}: StatsLeftRailProps) {
  const colors = useThemeColors();
  const { getToken } = useAuth();
  const profile = useUserStore((state) => state.profile);
  const days = useStatsStore((state) => state.days);
  const [followState, setFollowState] = useState<Record<string, boolean>>({});
  const [pendingFollow, setPendingFollow] = useState<string | null>(null);

  const streak = useMemo(() => getCurrentStreak(days), [days]);
  const week = useMemo(() => getWeekActivity(days), [days]);
  const weekMax = Math.max(1, ...week.map((day) => day.count));
  const weekTotal = week.reduce((sum, day) => sum + day.count, 0);
  const activeDays = week.filter((day) => day.count > 0).length;
  const bestDay = week.reduce(
    (best, day) => (day.count > best.count ? day : best),
    week[0],
  );
  const learners = useMemo(
    () => getRecommendedLearners(posts, profile?.uid, 3),
    [posts, profile?.uid],
  );

  const levelProgress =
    profile && profile.nextLevelXp > 0
      ? Math.min(100, Math.round((profile.xp / profile.nextLevelXp) * 100))
      : 0;
  const xpRemaining = Math.max(0, (profile?.nextLevelXp ?? 0) - (profile?.xp ?? 0));

  const toggleFollow = async (userId: string, isFollowing: boolean) => {
    if (pendingFollow) return;
    setPendingFollow(userId);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not signed in");
      const result = isFollowing
        ? await api.community.unfollowUser(userId, token)
        : await api.community.followUser(userId, token);
      setFollowState((current) => ({
        ...current,
        [userId]: result.following,
      }));
    } catch {
      eventBus.emit("toast:error", {
        title: "Couldn't update follow",
        message: "Please try again.",
      });
    } finally {
      setPendingFollow(null);
    }
  };

  return (
    <ScrollView
      style={[styles.root, { width }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      accessibilityLabel="Stats profile and recommendations"
    >
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.eyebrow, { color: colors.primary }]}>
          YOUR PROFILE
        </Text>
        <Pressable
          onPress={onPressProfile}
          style={styles.profileRow}
          accessibilityRole="button"
          accessibilityLabel="Open your profile"
        >
          <CommunityAvatar
            uid={profile?.uid ?? "yuinx"}
            photoURL={profile?.photoURL}
            size={46}
          />
          <View style={styles.profileCopy}>
            <Text
              style={[styles.profileName, { color: colors.text }]}
              numberOfLines={1}
            >
              {profile?.displayName || "Learner"}
            </Text>
            <Text
              style={[styles.profileMeta, { color: colors.textMuted }]}
              numberOfLines={1}
            >
              Level {profile?.gamingLevel ?? 1} · {profile?.rank ?? "Explorer"}
            </Text>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={18}
            color={colors.textMuted}
          />
        </Pressable>

        <View style={styles.xpHeader}>
          <Text style={[styles.xpLabel, { color: colors.textSecondary }]}>
            Level progress
          </Text>
          <Text style={[styles.xpValue, { color: colors.text }]}>
            {profile?.xp ?? 0} / {profile?.nextLevelXp ?? 0} XP
          </Text>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: colors.surfaceAlt }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${levelProgress}%`,
                backgroundColor: colors.primary,
              },
            ]}
          />
        </View>
        <Text style={[styles.xpHint, { color: colors.textMuted }]}>
          {xpRemaining > 0
            ? `${xpRemaining} XP to your next level`
            : "Level up ready — keep going"}
        </Text>

        <View style={styles.metrics}>
          <Metric
            icon="fire"
            value={String(streak)}
            label="streak"
            color={colors.warning}
          />
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
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.eyebrow, { color: colors.info }]}>
            PROGRESS
          </Text>
          <Text style={[styles.cardMeta, { color: colors.textMuted }]}>
            {weekTotal} actions
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
              <Text style={[styles.weekLabel, { color: colors.textMuted }]}>
                {day.label}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.progressStats}>
          <ProgressStat
            label="Active days"
            value={`${activeDays}/7`}
            color={colors.success}
          />
          <ProgressStat
            label="Best day"
            value={
              bestDay && bestDay.count > 0
                ? `${bestDay.count} on ${bestDay.label}`
                : "—"
            }
            color={colors.primary}
          />
          <ProgressStat
            label="Current run"
            value={`${streak} day${streak === 1 ? "" : "s"}`}
            color={colors.warning}
          />
        </View>
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.eyebrow, { color: colors.primary }]}>
          RECOMMENDED
        </Text>

        <View
          style={[
            styles.campCard,
            { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
          ]}
        >
          <View style={styles.campHeader}>
            <View
              style={[
                styles.campIcon,
                { backgroundColor: colors.primary + "18" },
              ]}
            >
              <MaterialCommunityIcons
                name="account-group-outline"
                size={18}
                color={colors.primary}
              />
            </View>
            <View style={styles.campCopy}>
              <Text style={[styles.campTitle, { color: colors.text }]}>
                Join a learning camp
              </Text>
              <Text style={[styles.campMeta, { color: colors.textMuted }]}>
                Meet learners chasing the same subjects.
              </Text>
            </View>
          </View>
          <Pressable
            onPress={onExploreCamp}
            style={[styles.joinBtn, { backgroundColor: colors.primary }]}
            accessibilityRole="button"
            accessibilityLabel="Explore camps"
          >
            <Text style={styles.joinBtnText}>Explore camps</Text>
          </Pressable>
        </View>

        <Text style={[styles.subheading, { color: colors.textSecondary }]}>
          Learners to follow
        </Text>
        {learners.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textMuted }]}>
            Recommendations appear as the community grows.
          </Text>
        ) : (
          <View style={styles.learnerList}>
            {learners.map(({ user, post }) => {
              const following = followState[user.id] ?? user.isFollowing;
              const pending = pendingFollow === user.id;
              return (
                <View key={user.id} style={styles.learnerRow}>
                  <Pressable
                    onPress={() => onPressUser(post)}
                    style={styles.learnerIdentity}
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
                        {user.followersCount} followers
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable
                    onPress={() => toggleFollow(user.id, following)}
                    disabled={pending}
                    style={[
                      styles.followBtn,
                      {
                        backgroundColor: following
                          ? "transparent"
                          : colors.primary + "18",
                        borderColor: following ? colors.border : colors.primary,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={
                      following
                        ? `Unfollow ${user.name ?? user.handle}`
                        : `Follow ${user.name ?? user.handle}`
                    }
                  >
                    {pending ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Text
                        style={[
                          styles.followText,
                          {
                            color: following ? colors.textMuted : colors.primary,
                          },
                        ]}
                      >
                        {following ? "Following" : "Follow"}
                      </Text>
                    )}
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
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

function ProgressStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.progressStat}>
      <Text style={[styles.progressStatValue, { color }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.progressStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    height: "100%",
  },
  content: {
    paddingBottom: 48,
    gap: 12,
  },
  card: {
    marginRight: 8,
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
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardMeta: {
    fontFamily: safeFont,
    fontSize: 10,
    fontWeight: "600",
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 11,
  },
  profileCopy: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    fontFamily: safeFont,
    fontSize: 15,
    fontWeight: "800",
  },
  profileMeta: {
    fontFamily: safeFont,
    fontSize: 10,
    marginTop: 2,
  },
  xpHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 13,
  },
  xpLabel: {
    fontFamily: safeFont,
    fontSize: 10,
  },
  xpValue: {
    fontFamily: safeFont,
    fontSize: 10,
    fontWeight: "700",
  },
  progressTrack: {
    height: 7,
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 7,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  xpHint: {
    fontFamily: safeFont,
    fontSize: 9,
    marginTop: 5,
  },
  metrics: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
  },
  metric: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  metricValue: {
    fontFamily: safeFont,
    fontSize: 12,
    fontWeight: "800",
  },
  metricLabel: {
    fontFamily: safeFont,
    fontSize: 9,
  },
  weekRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    marginTop: 10,
  },
  weekDay: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  weekBarTrack: {
    width: "100%",
    height: 48,
    borderRadius: 5,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  weekBarFill: {
    width: "100%",
    borderRadius: 5,
  },
  weekLabel: {
    fontFamily: safeFont,
    fontSize: 8,
    textTransform: "uppercase",
  },
  progressStats: {
    marginTop: 12,
    gap: 7,
  },
  progressStat: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  progressStatValue: {
    fontFamily: safeFont,
    fontSize: 11,
    fontWeight: "800",
  },
  progressStatLabel: {
    fontFamily: safeFont,
    fontSize: 10,
    color: "rgba(162,170,179,0.8)",
  },
  campCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 11,
    marginTop: 11,
  },
  campHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  campIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  campCopy: {
    flex: 1,
    minWidth: 0,
  },
  campTitle: {
    fontFamily: safeFont,
    fontSize: 12,
    fontWeight: "800",
  },
  campMeta: {
    fontFamily: safeFont,
    fontSize: 9,
    lineHeight: 13,
    marginTop: 2,
  },
  joinBtn: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 34,
    borderRadius: 10,
    marginTop: 10,
  },
  joinBtnText: {
    color: "#FFFFFF",
    fontFamily: safeFont,
    fontSize: 11,
    fontWeight: "800",
  },
  subheading: {
    fontFamily: safeFont,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 15,
    marginBottom: 7,
  },
  learnerList: {
    gap: 4,
  },
  learnerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 44,
  },
  learnerIdentity: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  learnerCopy: {
    flex: 1,
    minWidth: 0,
  },
  learnerName: {
    fontFamily: safeFont,
    fontSize: 12,
    fontWeight: "700",
  },
  learnerMeta: {
    fontFamily: safeFont,
    fontSize: 9,
    marginTop: 1,
  },
  followBtn: {
    minWidth: 56,
    minHeight: 28,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  followText: {
    fontFamily: safeFont,
    fontSize: 9,
    fontWeight: "800",
  },
  empty: {
    fontFamily: safeFont,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
});
