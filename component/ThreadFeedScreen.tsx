import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NAV, THREADS } from "../constants/layout";
import { safeFont } from "../constants/themes";
import { useAuth } from "../contexts/AuthContext";
import { useFullscreen } from "../hooks/useFullscreen";
import { useResponsive } from "../hooks/useResponsive";
import { useThemeColors } from "../hooks/useTheme";
import { eventBus } from "../lib/eventBus";
import { getFloatingTabBarInset } from "../lib/responsive";
import { getExploreHubLayout } from "../lib/statsLayout";
import { threadLessonHref } from "../lib/threads/format";
import { getThreadFeedChrome } from "../lib/threads/layout";
import { useThreadLearningStore } from "../store/threadLearningStore";
import { useThreadStore } from "../store/threadStore";
import type { FocusSubtopic } from "../types/learning";
import type { ThreadPost } from "../types/thread";
import ChapterThreadModal from "./ChapterThreadModal";
import CommentsModal from "./CommentsModal";
import DiscoveryRail from "./DiscoveryRail";
import CourseFeedPane from "./explore/CourseFeedPane";
import ExploreTabs, { type ExploreTab } from "./explore/ExploreTabs";
import ResourceFeedPane from "./explore/ResourceFeedPane";
import ExploreReels from "./ExploreReels";
import MascotAnimation from "./MascotAnimation";
import MascotStage from "./mascot/MascotStage";
import ProfileCardModal from "./ProfileCardModal";
import ResourceUploadSheet from "./ResourceUploadSheet";
import StatsLeftRail from "./stats/StatsLeftRail";
import StatsRightRail from "./stats/StatsRightRail";
import SubtopicThreadCard from "./SubtopicThreadCard";
import ThreadQuizModal from "./ThreadQuizModal";
import VisualLessonModal from "./VisualLessonModal";

export default function ThreadFeedScreen({
  variant = "default",
}: {
  variant?: "default" | "explore";
}) {
  const { getToken } = useAuth();
  const colors = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isTabletUp, threadsLayout } = useResponsive();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const chrome = getThreadFeedChrome(windowWidth, windowHeight);
  const exploreHubLayout = getExploreHubLayout(windowWidth);
  const isExplore = variant === "explore";
  const tabBarInset = isTabletUp
    ? NAV.desktopContentInset
    : getFloatingTabBarInset(insets.bottom);
  const contentInset = isExplore ? chrome.gutter : 16;
  const listBottomInset = isTabletUp ? 32 : tabBarInset + chrome.listBottomGap;
  const reelsBottomInset = isTabletUp ? 32 : tabBarInset;

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
  const [activeTab, setActiveTab] = useState<ExploreTab>("threads");
  const [resourceRefreshKey, setResourceRefreshKey] = useState(0);
  const [reelsRefreshKey, setReelsRefreshKey] = useState(0);
  const [reelsRefreshing, setReelsRefreshing] = useState(false);

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

  const handleTabChange = useCallback((tab: ExploreTab) => {
    setActiveTab(tab);
    setCollapsed(false);
  }, []);

  const handleReelsRefresh = useCallback(() => {
    setReelsRefreshing(true);
    setReelsRefreshKey((value) => value + 1);
  }, []);

  const showAnalytics = isExplore && exploreHubLayout.showAnalytics;
  const showThreadsLeftRail = !isExplore && threadsLayout.showLeftRail;
  const showThreadsRightRail = !isExplore && threadsLayout.showRightRail;
  const isRowLayout = showAnalytics || showThreadsRightRail;
  const bordered = !isExplore && threadsLayout.mode !== "mobile";
  const layoutGap = isExplore ? exploreHubLayout.gap : threadsLayout.gap;
  const analyticsWidth = exploreHubLayout.analyticsWidth;
  const feedMaxWidth = isExplore
    ? exploreHubLayout.feedMaxWidth
    : threadsLayout.feedMaxWidth;
  const horizontalPadding = isExplore
    ? windowWidth >= 768
      ? 24
      : 0
    : bordered
      ? 24
      : 0;
  const bottomPadding = listBottomInset;
  const minimizedBottom = isTabletUp ? 24 : tabBarInset + 72;
  const minimizedRight = isTabletUp ? 24 : 16;

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: colors.bg, paddingTop: insets.top },
      ]}
    >
      {showAnalytics || showThreadsLeftRail ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View style={[styles.ambientGlow, styles.ambientGlowOne]} />
          <View style={[styles.ambientGlow, styles.ambientGlowTwo]} />
        </View>
      ) : null}

      <View
        style={[
          styles.workspace,
          isRowLayout && styles.workspaceRow,
          showAnalytics && styles.workspaceTwoColumn,
          showThreadsLeftRail && styles.workspaceUltraWide,
          isExplore && styles.workspaceExplore,
          {
            gap: layoutGap,
            paddingHorizontal: horizontalPadding,
          },
        ]}
      >
        {showThreadsLeftRail ? (
          <DiscoveryRail
            width={threadsLayout.leftRailWidth}
            posts={posts}
            onPressUser={handlePressProfile}
          />
        ) : null}

        <View
          style={[
            styles.feedColumn,
            !isRowLayout && styles.feedColumnStacked,
            bordered && styles.feedColumnBordered,
            showAnalytics && styles.feedColumnTwoColumn,
            {
              maxWidth: feedMaxWidth,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.header,
              {
                borderBottomColor: colors.border,
                paddingHorizontal: contentInset,
                gap: chrome.headerGap,
                paddingTop: collapsed ? chrome.headerPadTopCollapsed : chrome.headerPadTop,
                paddingBottom: collapsed
                  ? chrome.headerPadBottomCollapsed
                  : chrome.headerPadBottom,
              },
            ]}
          >
            <View style={styles.headerText}>
              <Text
                style={[
                  styles.title,
                  {
                    color: colors.text,
                    fontSize: collapsed ? chrome.titleCollapsed : chrome.titleSize,
                  },
                ]}
              >
                {isExplore ? "Explore" : "Uinx"}
              </Text>
              {!collapsed && chrome.showSubtitle ? (
                <Text
                  style={[
                    styles.subtitle,
                    { color: colors.textSecondary, fontSize: chrome.subtitleSize },
                  ]}
                  numberOfLines={1}
                >
                  {isExplore
                    ? "Uinx, resources, and reels from the camp"
                    : "Learn from every chapter, one part at a time"}
                </Text>
              ) : null}
            </View>
            <Pressable
              onPress={() => setUploadVisible(true)}
              style={[
                styles.composeBtn,
                {
                  backgroundColor: colors.primary,
                  width: chrome.composeSize,
                  height: chrome.composeSize,
                  borderRadius: chrome.composeSize / 2,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Share a resource"
            >
              <Ionicons name="add" size={chrome.composeIcon} color="#FFFFFF" />
            </Pressable>
          </View>

          {isExplore ? (
            <ExploreTabs
              active={activeTab}
              onChange={handleTabChange}
              inset={contentInset}
              height={windowHeight}
            />
          ) : null}

          {!collapsed && (!isExplore || activeTab === "threads") ? (
            <View
              style={[
                styles.filterRow,
                {
                  paddingHorizontal: contentInset,
                  paddingTop: chrome.listTop,
                  paddingBottom: chrome.chipPad,
                },
              ]}
            >
              <FilterChip
                label="Discover"
                active={!includeMine}
                onPress={() => handleFilter(false)}
                colors={colors}
                height={chrome.chipHeight}
                fontSize={chrome.chipFont}
                paddingHorizontal={chrome.chipPad}
              />
              <FilterChip
                label="Everyone"
                active={includeMine}
                onPress={() => handleFilter(true)}
                colors={colors}
                height={chrome.chipHeight}
                fontSize={chrome.chipFont}
                paddingHorizontal={chrome.chipPad}
              />
            </View>
          ) : null}

          {isExplore && activeTab === "resources" ? (
            <ResourceFeedPane
              refreshKey={resourceRefreshKey}
              bottomInset={bottomPadding}
              horizontalInset={contentInset}
              onScroll={handleScroll}
            />
          ) : isExplore && activeTab === "reels" ? (
            <View style={styles.pane}>
              <ExploreReels
                embedded
                horizontalInset={contentInset}
                bottomInset={reelsBottomInset}
                refreshKey={reelsRefreshKey}
                refreshing={reelsRefreshing}
                onRefresh={handleReelsRefresh}
                onRefreshDone={() => setReelsRefreshing(false)}
              />
            </View>
          ) : isExplore && activeTab === "other" ? (
            <CourseFeedPane
              refreshKey={resourceRefreshKey}
              bottomInset={bottomPadding}
              horizontalInset={contentInset}
              onScroll={handleScroll}
            />
          ) : (
            <FlatList
              data={posts}
              keyExtractor={(item) => item.id}
              style={styles.feedList}
              renderItem={({ item }) => (
                <SubtopicThreadCard
                  post={item}
                  onPressSubtopic={handlePressSubtopic}
                  onPressChapterThread={setChapterId}
                  onPressProfile={handlePressProfile}
                  onPressComments={(post) => setCommentsPostId(post.id)}
                  onPressLesson={openLesson}
                  onPressQuiz={setQuizPost}
                  horizontalInset={contentInset}
                />
              )}
              contentContainerStyle={[
                styles.listContent,
                { paddingTop: chrome.listTop, paddingBottom: bottomPadding },
                posts.length === 0 && !loading && styles.listContentEmpty,
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
                  <ThreadFeedLoading colors={colors} chrome={chrome} />
                ) : loaded ? (
                  <View style={[styles.empty, { paddingHorizontal: chrome.emptyPadH }]}>
                    <MascotAnimation
                      action={error ? "mascot_disappointed" : "mascot_posing"}
                      height={chrome.mascotHeight}
                      framed={false}
                    />
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>
                      {error ? "Uinx couldn't load" : "No posts yet"}
                    </Text>
                    <Text
                      style={[
                        styles.emptyText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {error ??
                        "Share a resource or publish a course to start a conversation."}
                    </Text>
                    <Pressable
                      onPress={() => refresh(getToken, includeMine)}
                      style={[styles.retryBtn, { borderColor: colors.primary }]}
                    >
                      <Text
                        style={[styles.retryText, { color: colors.primary }]}
                      >
                        Try again
                      </Text>
                    </Pressable>
                  </View>
                ) : null
              }
            />
          )}
        </View>

        {showAnalytics ? (
          <StatsLeftRail
            width={analyticsWidth}
            posts={posts}
            onPressUser={handlePressProfile}
            onPressProfile={() => router.push("/(tabs)/profile" as never)}
            onExploreCamp={() => router.push("/(tabs)" as never)}
            bottomInset={tabBarInset}
          />
        ) : showThreadsRightRail ? (
          <StatsRightRail
            width={threadsLayout.railWidth}
            posts={posts}
            onOpenFocus={handleOpenFocus}
            onOpenComments={(postId) => setCommentsPostId(postId)}
          />
        ) : null}
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
        onSuccess={() => {
          void refresh(getToken, includeMine);
          setResourceRefreshKey((value) => value + 1);
          setReelsRefreshKey((value) => value + 1);
        }}
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

function ThreadFeedLoading({
  colors,
  chrome,
}: {
  colors: ReturnType<typeof useThemeColors>;
  chrome: ReturnType<typeof getThreadFeedChrome>;
}) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const opacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 0.9],
  });

  return (
    <View style={[styles.loadingWrap, { paddingHorizontal: chrome.gutter }]}>
      <MascotStage
        action="mascot_loading"
        width={Math.round(chrome.mascotHeight * 0.76)}
        variant="inline"
        stageColor="#113154"
        fadeColor={colors.bg}
        glow={false}
      />
      <Text style={[styles.loadingTitle, { color: colors.text }]}>
        Loading threads...
      </Text>
      <Text style={[styles.loadingSubtitle, { color: colors.textSecondary }]}>
        Finding the next chapter worth your attention.
      </Text>

      <Animated.View style={[styles.skeletonList, { opacity }]}>
        {[0, 1, 2].map((index) => (
          <View
            key={index}
            style={[
              styles.skeletonCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                padding: chrome.skeletonPadding,
              },
            ]}
          >
            <View style={styles.skeletonHeader}>
              <View
                style={[
                  styles.skeletonAvatar,
                  { backgroundColor: colors.surfaceAlt },
                ]}
              />
              <View style={styles.skeletonHeaderText}>
                <View
                  style={[
                    styles.skeletonLine,
                    styles.skeletonName,
                    { backgroundColor: colors.surfaceAlt },
                  ]}
                />
                <View
                  style={[
                    styles.skeletonLine,
                    styles.skeletonMeta,
                    { backgroundColor: colors.surfaceAlt },
                  ]}
                />
              </View>
            </View>
            <View
              style={[
                styles.skeletonLine,
                styles.skeletonTitle,
                { backgroundColor: colors.surfaceAlt },
              ]}
            />
            <View
              style={[
                styles.skeletonLine,
                styles.skeletonBody,
                { backgroundColor: colors.surfaceAlt },
              ]}
            />
            <View
              style={[
                styles.skeletonLine,
                styles.skeletonBodyShort,
                { backgroundColor: colors.surfaceAlt },
              ]}
            />
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
  colors,
  height,
  fontSize,
  paddingHorizontal,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useThemeColors>;
  height: number;
  fontSize: number;
  paddingHorizontal: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          minHeight: height,
          paddingHorizontal,
          borderRadius: height / 2,
          backgroundColor: active ? colors.primary + "1F" : colors.surfaceAlt,
          borderColor: active ? colors.primary : colors.border,
        },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text
        style={[
          styles.chipText,
          { color: active ? colors.primary : colors.textSecondary, fontSize },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  ambientGlow: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.55,
  },
  ambientGlowOne: {
    width: 560,
    height: 560,
    top: -220,
    right: -120,
    backgroundColor: "rgba(45, 141, 252, 0.07)",
  },
  ambientGlowTwo: {
    width: 520,
    height: 520,
    bottom: -220,
    left: -140,
    backgroundColor: "rgba(124, 108, 255, 0.05)",
  },
  workspace: {
    flex: 1,
    width: "100%",
    minHeight: 0,
    alignItems: "center",
  },
  workspaceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  workspaceTwoColumn: {
    alignItems: "stretch",
  },
  workspaceUltraWide: {
    maxWidth: THREADS.ultraWideMaxWidth,
    alignSelf: "center",
  },
  workspaceExplore: {
    maxWidth: 1720,
    alignSelf: "center",
  },
  feedColumn: {
    flex: 1,
    height: "100%",
    minWidth: 0,
    minHeight: 0,
  },
  feedColumnStacked: {
    width: "100%",
  },
  feedList: {
    flex: 1,
    width: "100%",
    minHeight: 0,
  },
  feedColumnBordered: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  feedColumnTwoColumn: {
    borderRightWidth: 1,
  },
  pane: {
    flex: 1,
    minHeight: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerText: { flex: 1, minWidth: 0 },
  title: {
    fontFamily: safeFont,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: safeFont,
    marginTop: 2,
  },
  composeBtn: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: {
    fontFamily: safeFont,
    fontWeight: "700",
  },
  listContent: {},
  listContentEmpty: { flexGrow: 1, justifyContent: "center" },
  footer: { paddingVertical: 18, alignItems: "center" },
  empty: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  loadingWrap: {
    width: "100%",
    alignItems: "center",
    paddingTop: 18,
    paddingBottom: 24,
  },
  loadingTitle: {
    fontFamily: safeFont,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 10,
  },
  loadingSubtitle: {
    fontFamily: safeFont,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 3,
    marginBottom: 16,
  },
  skeletonList: {
    width: "100%",
    gap: 12,
  },
  skeletonCard: {
    borderWidth: 1,
    borderRadius: 18,
    gap: 10,
  },
  skeletonHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  skeletonAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  skeletonHeaderText: {
    flex: 1,
    gap: 6,
  },
  skeletonLine: {
    height: 8,
    borderRadius: 4,
  },
  skeletonName: {
    width: "42%",
  },
  skeletonMeta: {
    width: "30%",
    height: 6,
  },
  skeletonTitle: {
    width: "82%",
    height: 12,
    marginTop: 2,
  },
  skeletonBody: {
    width: "100%",
  },
  skeletonBodyShort: {
    width: "64%",
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
});
