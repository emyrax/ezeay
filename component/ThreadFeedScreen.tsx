import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { NAV } from "../constants/layout";
import { safeFont } from "../constants/themes";
import { useAuth } from "../contexts/AuthContext";
import { useFullscreen } from "../hooks/useFullscreen";
import { useResponsive, useTabBarInset } from "../hooks/useResponsive";
import { useThemeColors } from "../hooks/useTheme";
import { eventBus } from "../lib/eventBus";
import { threadLessonHref } from "../lib/threads/format";
import { useThreadLearningStore } from "../store/threadLearningStore";
import { useThreadStore } from "../store/threadStore";
import type { FocusSubtopic } from "../types/learning";
import type { ThreadPost } from "../types/thread";
import ChapterThreadModal from "./ChapterThreadModal";
import CommentsModal from "./CommentsModal";
import FocusRail from "./FocusRail";
import MascotAnimation from "./MascotAnimation";
import ProfileCardModal from "./ProfileCardModal";
import ResourceUploadSheet from "./ResourceUploadSheet";
import SubtopicThreadCard from "./SubtopicThreadCard";
import ThreadQuizModal from "./ThreadQuizModal";
import VisualLessonModal from "./VisualLessonModal";

export default function ThreadFeedScreen() {
  const { getToken } = useAuth();
  const colors = useThemeColors();
  const router = useRouter();
  const { isTabletUp, threadsLayout } = useResponsive();
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
  const hydrate = useThreadLearningStore((s) => s.hydrate);
  const toggleFocus = useThreadLearningStore((s) => s.toggleFocus);

  const [chapterId, setChapterId] = useState<string | null>(null);
  const [profileTarget, setProfileTarget] = useState<{ userId: string; postId: string } | null>(
    null,
  );
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [uploadVisible, setUploadVisible] = useState(false);
  const [lessonPost, setLessonPost] = useState<ThreadPost | null>(null);
  const [lessonMinimized, setLessonMinimized] = useState(false);
  const [quizPost, setQuizPost] = useState<ThreadPost | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const { enter: enterFullscreen, exit: exitFullscreen } = useFullscreen({
    onExit: () => setLessonMinimized(true),
  });

  const openLesson = useCallback(
    (post: ThreadPost) => {
      setLessonPost(post);
      setLessonMinimized(false);
      void enterFullscreen();
    },
    [enterFullscreen],
  );

  const closeLesson = useCallback(() => {
    setLessonPost(null);
    setLessonMinimized(false);
    void exitFullscreen();
  }, [exitFullscreen]);

  useEffect(() => {
    fetchFeed(getToken);
  }, [fetchFeed, getToken]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

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

  const handleOpenFocus = useCallback(
    (item: FocusSubtopic) => {
      const post = posts.find((candidate) => candidate.id === item.postId);
      if (post) {
        openLesson(post);
        return;
      }
      router.push(
        `/course/${encodeURIComponent(item.courseId)}/lesson/${item.chapterIndex}/${item.subtopicIndex}` as never,
      );
    },
    [openLesson, posts, router],
  );

  const handleNextLesson = useCallback(() => {
    if (!lessonPost) return;
    const next = posts.find(
      (candidate) =>
        candidate.courseId === lessonPost.courseId &&
        candidate.chapterIndex === lessonPost.chapterIndex &&
        candidate.subtopicIndex === lessonPost.subtopicIndex + 1,
    );
    if (next) {
      openLesson(next);
      return;
    }
    closeLesson();
    eventBus.emit("toast:info", { title: "No next lesson in this chapter yet." });
  }, [closeLesson, lessonPost, openLesson, posts]);

  const handleStartQuiz = useCallback(() => {
    if (!lessonPost) return;
    setQuizPost(lessonPost);
    closeLesson();
  }, [closeLesson, lessonPost]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextCollapsed = event.nativeEvent.contentOffset.y > 36;
    setCollapsed((current) => (current === nextCollapsed ? current : nextCollapsed));
  }, []);

  const showRail = threadsLayout.showRightRail;
  const bordered = threadsLayout.mode !== "mobile";
  const bottomPadding = isTabletUp ? 32 : tabBarInset + 88;
  const minimizedBottom = isTabletUp ? 24 : tabBarInset + 84;
  const minimizedRight = isTabletUp ? 24 : 16;

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View
        style={[
          styles.workspace,
          showRail && styles.workspaceRow,
          {
            gap: threadsLayout.gap,
            paddingHorizontal: bordered ? 24 : 0,
          },
        ]}
      >
        <View
          style={[
            styles.feedColumn,
            bordered && styles.feedColumnBordered,
            {
              maxWidth: threadsLayout.feedMaxWidth,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.header,
              collapsed && styles.headerCollapsed,
              { borderBottomColor: colors.border },
            ]}
          >
            <View style={styles.headerText}>
              <Text
                style={[
                  styles.title,
                  collapsed && styles.titleCollapsed,
                  { color: colors.text },
                ]}
              >
                Threads
              </Text>
              {!collapsed ? (
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  Learn from every chapter, one part at a time
                </Text>
              ) : null}
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

          {!collapsed ? (
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
          ) : null}

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
                onPressFocus={(post) => toggleFocus(post)}
                onPressLesson={openLesson}
                onPressQuiz={setQuizPost}
              />
            )}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: bottomPadding },
              posts.length === 0 && styles.listContentEmpty,
            ]}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={32}
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
                  <MascotAnimation action="mascot_loading" height={110} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    Loading threads...
                  </Text>
                </View>
              ) : loaded ? (
                <View style={styles.empty}>
                  <MascotAnimation
                    action={error ? "mascot_disappointed" : "mascot_posing"}
                    height={124}
                  />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>
                    {error ? "Threads couldn't load" : "No threads yet"}
                  </Text>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    {error ??
                      "Share a resource or publish a course to start a conversation."}
                  </Text>
                  <Pressable
                    onPress={() => refresh(getToken, includeMine)}
                    style={[styles.retryBtn, { borderColor: colors.primary }]}
                  >
                    <Text style={[styles.retryText, { color: colors.primary }]}>
                      Try again
                    </Text>
                  </Pressable>
                </View>
              ) : null
            }
          />
        </View>

        {showRail ? (
          <FocusRail width={threadsLayout.railWidth} onOpenFocus={handleOpenFocus} />
        ) : null}
      </View>

      {!isTabletUp ? (
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
      ) : null}

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

      <VisualLessonModal
        post={lessonPost}
        minimized={lessonMinimized}
        minimizedBottom={minimizedBottom}
        minimizedRight={minimizedRight}
        onMinimize={() => {
          setLessonMinimized(true);
          void exitFullscreen();
        }}
        onRestore={() => {
          setLessonMinimized(false);
          void enterFullscreen();
        }}
        onClose={closeLesson}
        onStartQuiz={handleStartQuiz}
        onNextLesson={handleNextLesson}
      />

      <ThreadQuizModal
        visible={quizPost !== null}
        post={quizPost}
        onClose={() => setQuizPost(null)}
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
  root: { flex: 1 },
  workspace: {
    flex: 1,
    width: "100%",
    alignItems: "center",
  },
  workspaceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
  },
  feedColumn: {
    flex: 1,
    width: "100%",
    height: "100%",
    minWidth: 0,
  },
  feedColumnBordered: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerCollapsed: {
    paddingTop: 10,
    paddingBottom: 8,
  },
  headerText: { flex: 1, minWidth: 0 },
  title: {
    fontFamily: safeFont,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  titleCollapsed: {
    fontSize: 20,
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
    paddingTop: 10,
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
  listContent: { paddingTop: 12 },
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
