import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { safeFont } from "../constants/themes";
import { useAuth } from "../contexts/AuthContext";
import { useThemeColors } from "../hooks/useTheme";
import { api, friendlyError } from "../lib/api";
import { eventBus } from "../lib/eventBus";
import { formatCount } from "../lib/threads/format";
import { useThreadStore } from "../store/threadStore";
import type { ThreadUser } from "../types/thread";
import CommunityAvatar from "./CommunityAvatar";

interface ProfileCardModalProps {
  visible: boolean;
  userId: string | null;
  postId?: string;
  onClose: () => void;
}

export default function ProfileCardModal({
  visible,
  userId,
  postId,
  onClose,
}: ProfileCardModalProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { getToken, profile: myProfile } = useAuth();
  const syncAuthorState = useThreadStore((s) => s.syncAuthorState);
  const isWeb = Platform.OS === "web";

  const [user, setUser] = useState<ThreadUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<"follow" | "challenge" | null>(null);

  useEffect(() => {
    if (!visible || !userId) return;
    let cancelled = false;
    setLoading(true);
    setUser(null);

    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error("Not signed in");
        const result = await api.community.threadProfile(userId, token);
        if (!cancelled) setUser(result.user);
      } catch (err) {
        if (!cancelled) {
          eventBus.emit("toast:error", {
            title: friendlyError(err, "Couldn't load this profile"),
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, userId, getToken]);

  const handleFollow = useCallback(async () => {
    if (!user || !userId || busy) return;
    const desired = !user.isFollowing;
    const previous = user;
    const optimisticCount = Math.max(
      0,
      user.followersCount + (desired ? 1 : -1),
    );
    setUser({ ...user, isFollowing: desired, followersCount: optimisticCount });
    setBusy("follow");

    try {
      const token = await getToken();
      if (!token) throw new Error("Not signed in");
      const result = desired
        ? await api.community.followUser(userId, token)
        : await api.community.unfollowUser(userId, token);
      setUser((current) =>
        current
          ? {
              ...current,
              isFollowing: result.following,
              followersCount: result.followersCount,
            }
          : current,
      );
      syncAuthorState(userId, {
        isFollowing: result.following,
        followersCount: result.followersCount,
      });
    } catch (err) {
      setUser(previous);
      eventBus.emit("toast:error", {
        title: friendlyError(err, "Couldn't update follow"),
      });
    } finally {
      setBusy(null);
    }
  }, [busy, getToken, syncAuthorState, user, userId]);

  const handleChallenge = useCallback(async () => {
    if (!user || !userId || busy) return;
    if (user.isChallenged) {
      eventBus.emit("toast:info", { title: "Challenge already sent" });
      return;
    }

    const previous = user;
    setUser({ ...user, isChallenged: true });
    setBusy("challenge");

    try {
      const token = await getToken();
      if (!token) throw new Error("Not signed in");
      await api.community.challengeUser(userId, token, postId);
      syncAuthorState(userId, { isChallenged: true });
      eventBus.emit("toast:success", {
        title: "Challenge sent",
        message: `${user.name ?? "This learner"} was challenged.`,
      });
    } catch (err) {
      setUser(previous);
      eventBus.emit("toast:error", {
        title: friendlyError(err, "Couldn't send challenge"),
      });
    } finally {
      setBusy(null);
    }
  }, [busy, getToken, postId, syncAuthorState, user, userId]);

  const isMe = !!user && !!myProfile?.uid && user.id === myProfile.uid;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={isWeb ? "overFullScreen" : "pageSheet"}
      transparent={isWeb}
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, isWeb && styles.webOverlay]}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.bg,
              maxWidth: isWeb ? 560 : undefined,
              paddingBottom: isWeb ? 0 : insets.bottom,
            },
          ]}
        >
          <View style={[styles.topBar, { paddingTop: isWeb ? 12 : insets.top }]}>
            <Text style={[styles.topTitle, { color: colors.text }]}>Profile</Text>
            <Pressable
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.surfaceAlt }]}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close profile"
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>

          {loading || !user ? (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
              <LinearGradient
                colors={[colors.primary + "33", colors.surfaceAlt, colors.bg]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cover}
              />

              <View style={styles.identity}>
                <View style={[styles.avatarRing, { backgroundColor: colors.bg }]}>
                  <CommunityAvatar uid={user.id} photoURL={user.avatarUrl} size={78} />
                </View>
                <View style={styles.identityText}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                      {user.name ?? "Scholar"}
                    </Text>
                    <View style={[styles.iqBadge, { backgroundColor: colors.primary + "1A" }]}>
                      <Text style={[styles.iqText, { color: colors.primary }]}>
                        IQ {user.iqScore}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.handle, { color: colors.textMuted }]}>
                    @{user.handle}
                  </Text>
                </View>
              </View>

              {user.bio ? (
                <Text style={[styles.bio, { color: colors.textSecondary }]}>{user.bio}</Text>
              ) : (
                <Text style={[styles.bio, { color: colors.textMuted }]}>
                  Curious learner on Yuinx.
                </Text>
              )}

              <View style={[styles.stats, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Stat label="Followers" value={formatCount(user.followersCount)} colors={colors} />
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <Stat label="Following" value={formatCount(user.followingCount)} colors={colors} />
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <Stat label="Learner IQ" value={String(user.iqScore)} colors={colors} />
              </View>

              {!isMe ? (
                <View style={styles.actions}>
                  <Pressable
                    onPress={handleFollow}
                    disabled={busy !== null}
                    style={[
                      styles.primaryBtn,
                      {
                        backgroundColor: user.isFollowing ? colors.surfaceAlt : colors.primary,
                        borderColor: user.isFollowing ? colors.border : colors.primary,
                        opacity: busy ? 0.7 : 1,
                      },
                    ]}
                    accessibilityRole="button"
                  >
                    {busy === "follow" ? (
                      <ActivityIndicator
                        size="small"
                        color={user.isFollowing ? colors.text : "#FFFFFF"}
                      />
                    ) : (
                      <Ionicons
                        name={user.isFollowing ? "checkmark" : "person-add-outline"}
                        size={18}
                        color={user.isFollowing ? colors.text : "#FFFFFF"}
                      />
                    )}
                    <Text
                      style={[
                        styles.primaryBtnText,
                        { color: user.isFollowing ? colors.text : "#FFFFFF" },
                      ]}
                    >
                      {user.isFollowing ? "Following" : "Follow"}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleChallenge}
                    disabled={busy !== null || user.isChallenged}
                    style={[
                      styles.secondaryBtn,
                      {
                        backgroundColor: colors.surface,
                        borderColor: user.isChallenged ? colors.success : colors.border,
                        opacity: busy ? 0.7 : 1,
                      },
                    ]}
                    accessibilityRole="button"
                  >
                    <MaterialCommunityIcons
                      name={user.isChallenged ? "check-circle" : "sword-cross"}
                      size={18}
                      color={user.isChallenged ? colors.success : colors.text}
                    />
                    <Text style={[styles.secondaryBtnText, { color: colors.text }]}>
                      {user.isChallenged ? "Challenged" : "Challenge"}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <View style={[styles.selfNote, { backgroundColor: colors.surfaceAlt }]}>
                  <Ionicons name="person-circle-outline" size={18} color={colors.textMuted} />
                  <Text style={[styles.selfNoteText, { color: colors.textSecondary }]}>
                    This is you. Your threads are visible in the feed.
                  </Text>
                </View>
              )}

              <Text style={[styles.note, { color: colors.textMuted }]}>
                Follow to see new parts from this learner. Challenges are friendly and public.
              </Text>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function Stat({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  webOverlay: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 24,
  },
  sheet: {
    flex: 1,
    width: "100%",
    borderRadius: Platform.OS === "web" ? 22 : 0,
    overflow: "hidden",
    maxHeight: Platform.OS === "web" ? "88%" : undefined,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  topTitle: {
    fontFamily: safeFont,
    fontSize: 16,
    fontWeight: "800",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { paddingBottom: 28 },
  cover: { height: 110, marginHorizontal: 16, borderRadius: 16, marginTop: 4 },
  identity: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    marginTop: -36,
    paddingHorizontal: 24,
  },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  identityText: { flex: 1, paddingBottom: 6 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: {
    fontFamily: safeFont,
    fontSize: 20,
    fontWeight: "800",
    maxWidth: "72%",
  },
  iqBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  iqText: { fontFamily: safeFont, fontSize: 11, fontWeight: "800" },
  handle: { fontFamily: safeFont, fontSize: 12, marginTop: 2 },
  bio: {
    fontFamily: safeFont,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontFamily: safeFont, fontSize: 17, fontWeight: "800" },
  statLabel: { fontFamily: safeFont, fontSize: 11, marginTop: 2 },
  statDivider: { width: StyleSheet.hairlineWidth, height: 28 },
  actions: { flexDirection: "row", gap: 10, paddingHorizontal: 20, marginTop: 18 },
  primaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
  },
  primaryBtnText: { fontFamily: safeFont, fontSize: 14, fontWeight: "700" },
  secondaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
  },
  secondaryBtnText: { fontFamily: safeFont, fontSize: 14, fontWeight: "700" },
  selfNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 18,
    padding: 12,
    borderRadius: 12,
  },
  selfNoteText: { fontFamily: safeFont, fontSize: 12, flex: 1 },
  note: {
    fontFamily: safeFont,
    fontSize: 11,
    lineHeight: 16,
    paddingHorizontal: 20,
    marginTop: 16,
    textAlign: "center",
  },
});
