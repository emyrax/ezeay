import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { NAV } from "../constants/layout";
import { safeFont } from "../constants/themes";
import { useAuth } from "../contexts/AuthContext";
import { useTabBarInset } from "../hooks/useResponsive";
import { useThemeColors } from "../hooks/useTheme";
import { threadLessonHref } from "../lib/threads/format";
import { useThreadStore } from "../store/threadStore";
import type { ThreadPost } from "../types/thread";
import ChapterThreadModal from "./ChapterThreadModal";
import CommentsModal from "./CommentsModal";
import ProfileCardModal from "./ProfileCardModal";
import ResourceUploadSheet from "./ResourceUploadSheet";
import SubtopicThreadCard from "./SubtopicThreadCard";

export default function ThreadFeedScreen() {
  const { getToken } = useAuth();
  const colors = useThemeColors();
  const router = useRouter();
  const tabBarInset = useTabBarInset(NAV.tabBarHeight + NAV.tabBarBottomInset + 16);

  const posts = useThreadStore((s) => s.posts);
  const loading = useThreadStore((s) => s.loading);
  const loadingMore = useThreadStore((s) => s.loadingMore);
  const refreshing = useThreadStore((s) => s.refreshing);
  const loaded = useThreadStore((s) => s.loaded);
  const error = useThreadStore((s) => s.error);
  const includeMine = useThreadStore((s) => s.includeMine);
  const fetchFeed = useThreadStore((s) => s.fetchFeed);
  const loadMore = useThreadStore((s) => s.loadMore);
  const refresh = useThreadStore((s) => s.refresh);

  const [chapterId, setChapterId] = useState<string | null>(null);
  const [profileTarget, setProfileTarget] = useState<{ userId: string; postId: string } | null>(
    null,
  );
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [uploadVisible, setUploadVisible] = useState(false);

  useEffect(() => {
    fetchFeed(getToken);
  }, [fetchFeed, getToken]);

  const handlePressSubtopic = useCallback(
    (post: ThreadPost) => {
      router.push(threadLessonHref(post) as never);
    },
    [router],
  );

  const handlePressProfile = useCallback((post: ThreadPost) => {
    setProfileTarget({ userId: post.author.id, postId: post.id });
  }, []);

  const handleFilter = useCallback(
    (nextIncludeMine: boolean) => {
      if (nextIncludeMine === includeMine) return;
      refresh(getToken, nextIncludeMine);
    },
    [getToken, includeMine, refresh],
  );

  const webMaxWidth = Platform.OS === "web" ? 680 : undefined;

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={[styles.container, { maxWidth: webMaxWidth }]}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]}>Threads</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Learn from every chapter, one part at a time
            </Text>
          </View>
          <Pressable
            onPress={() => setUploadVisible(true)}
            style={[styles.composeBtn, { backgroundColor: colors.primary }]}
            accessibilityRole="button"
            accessibilityLabel="Share a resource"
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.filterRow}>
          <FilterChip
            label="Discover"
            active={!includeMine}
            onPress={() => handleFilter(false)}
            colors={colors}
          />
          <FilterChip
            label="Everyone"
            active={includeMine}
            onPress={() => handleFilter(true)}
            colors={colors}
          />
        </View>

        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SubtopicThreadCard
              post={item}
              onPressSubtopic={handlePressSubtopic}
              onPressChapterThread={setChapterId}
              onPressProfile={handlePressProfile}
              onPressComments={(post) => setCommentsPostId(post.id)}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: tabBarInset + 88 },
            posts.length === 0 && styles.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => refresh(getToken)}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          onEndReached={() => loadMore(getToken)}
          onEndReachedThreshold={0.6}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footer}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            loading ? (
              <View style={styles.empty}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Loading threads…
                </Text>
              </View>
            ) : loaded ? (
              <View style={styles.empty}>
                <Ionicons name="chatbubbles-outline" size={40} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {error ? "Threads couldn't load" : "No threads yet"}
                </Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {error ?? "Share a resource or publish a course to start a conversation."}
                </Text>
                <Pressable
                  onPress={() => refresh(getToken, includeMine)}
                  style={[styles.retryBtn, { borderColor: colors.primary }]}
                >
                  <Text style={[styles.retryText, { color: colors.primary }]}>Try again</Text>
                </Pressable>
              </View>
            ) : null
          }
        />

        <Pressable
          onPress={() => setUploadVisible(true)}
          style={[
            styles.fab,
            { backgroundColor: colors.primary, bottom: tabBarInset + 12 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Share a resource"
        >
          <Ionicons name="cloud-upload-outline" size={22} color="#FFFFFF" />
        </Pressable>
      </View>

      <ChapterThreadModal
        visible={chapterId !== null}
        chapterId={chapterId}
        onClose={() => setChapterId(null)}
        onPressSubtopic={(post) => {
          setChapterId(null);
          handlePressSubtopic(post);
        }}
        onPressProfile={(post) => {
          setChapterId(null);
          handlePressProfile(post);
        }}
        onPressComments={(post) => {
          setChapterId(null);
          setCommentsPostId(post.id);
        }}
      />

      <ProfileCardModal
        visible={profileTarget !== null}
        userId={profileTarget?.userId ?? null}
        postId={profileTarget?.postId}
        onClose={() => setProfileTarget(null)}
      />

      <CommentsModal
        visible={commentsPostId !== null}
        postId={commentsPostId}
        onClose={() => setCommentsPostId(null)}
      />

      <ResourceUploadSheet
        visible={uploadVisible}
        onClose={() => setUploadVisible(false)}
        onSuccess={() => refresh(getToken, includeMine)}
      />
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
  colors,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? colors.primary + "1F" : colors.surfaceAlt,
          borderColor: active ? colors.primary : colors.border,
        },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text
        style={[styles.chipText, { color: active ? colors.primary : colors.textSecondary }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center" },
  container: { flex: 1, width: "100%" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerText: { flex: 1 },
  title: {
    fontFamily: safeFont,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: safeFont,
    fontSize: 13,
    marginTop: 2,
  },
  composeBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  chip: {
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: {
    fontFamily: safeFont,
    fontSize: 12,
    fontWeight: "700",
  },
  listContent: { paddingTop: 4 },
  listContentEmpty: { flexGrow: 1, justifyContent: "center" },
  footer: { paddingVertical: 18, alignItems: "center" },
  empty: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: safeFont,
    fontSize: 17,
    fontWeight: "800",
    marginTop: 4,
  },
  emptyText: {
    fontFamily: safeFont,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 10,
    minHeight: 40,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  retryText: {
    fontFamily: safeFont,
    fontSize: 13,
    fontWeight: "700",
  },
  fab: {
    position: "absolute",
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
});
