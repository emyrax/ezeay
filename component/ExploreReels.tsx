import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type LayoutChangeEvent,
  type ViewToken,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { useThemeColors } from "../hooks/useTheme";
import { api } from "../lib/api";
import { useCourseStore } from "../store/courseStore";
import type { Chapter } from "../types/chapter";
import type { CommunityFeedPost } from "../types/community";
import type { Course } from "../types/course";
import CommunityAvatar from "./CommunityAvatar";

const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner: "#4CAF50",
  Intermediate: "#FF9800",
  Advanced: "#F44336",
};

function formatSharedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diff = Date.now() - date.getTime();
  if (diff < 60 * 60 * 1000) return "Just now";
  if (diff < 24 * 60 * 60 * 1000)
    return `${Math.floor(diff / (60 * 60 * 1000))}h ago`;
  return `${Math.floor(diff / (24 * 60 * 60 * 1000))}d ago`;
}

function parseChapters(raw: unknown): Chapter[] {
  if (Array.isArray(raw)) return raw as Chapter[];
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Chapter[];
    } catch {
      return [];
    }
  }
  return [];
}

interface ReelItem {
  key: string;
  post: CommunityFeedPost;
  chapterOrder: number;
  chapterTitle: string;
  subtopicOrder: number;
  subtopicTitle: string;
}

function flattenFeed(posts: CommunityFeedPost[]): ReelItem[] {
  const items: ReelItem[] = [];
  for (const post of posts) {
    (post.chapterIndex ?? []).forEach((chapter, ci) => {
      (chapter.subtopics ?? []).forEach((sub, si) => {
        items.push({
          key: `${post.id}_${ci}_${si}`,
          post,
          chapterOrder: ci,
          chapterTitle: chapter.title || `Chapter ${ci + 1}`,
          subtopicOrder: si,
          subtopicTitle: sub.title || `Subtopic ${si + 1}`,
        });
      });
    });
  }
  return items;
}

function courseToPost(course: Course): CommunityFeedPost {
  const chapters = parseChapters(course.chapters);
  return {
    id: course.id,
    title: course.title,
    description: course.description ?? "",
    category: course.category,
    difficulty: course.difficulty,
    totalChapters: course.totalChapters,
    rewardXp: course.rewardXp,
    icon: course.icon ?? "book-open-variant",
    creatorId: course.creatorId,
    creatorName: course.creatorName ?? "Me",
    creatorAvatar: course.creatorAvatar,
    thumbnailUrl: course.thumbnailUrl,
    sharedAt: course.sharedAt ?? course.createdAt ?? new Date().toISOString(),
    chapterIndex: chapters.map((ch, ci) => ({
      title: ch.title ?? "",
      order: ci,
      subtopics: (ch.subtopics ?? []).map((sub, si) => ({
        title: sub.title ?? "",
        order: si,
      })),
    })),
  };
}

function ReelCard({
  item,
  openingId,
  onOpenChapter,
}: {
  item: ReelItem;
  openingId: string | null;
  onOpenChapter: (item: ReelItem) => void;
}) {
  const theme = useThemeColors();
  const course = useCourseStore((s) => s.getCourseById(item.post.id));
  const open = openingId === item.key;

  const chapters = useMemo(
    () => parseChapters(course?.chapters),
    [course?.chapters],
  );
  const chapter = chapters[item.chapterOrder];
  const subtopic = chapter?.subtopics?.[item.subtopicOrder];
  const content = subtopic?.content;

  const difficultyColor = DIFFICULTY_COLORS[item.post.difficulty] || "#888";
  const subtopicCount = (item.post.chapterIndex ?? []).reduce(
    (sum, ch) => sum + ch.subtopics.length,
    0,
  );

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;
  const lastTap = useRef<number | null>(null);
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doubleTapCompleted = useRef(false);

  useEffect(() => {
    return () => {
      if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
    };
  }, []);

  const animateHeart = useCallback(() => {
    heartOpacity.setValue(1);
    heartScale.setValue(0.6);
    Animated.parallel([
      Animated.spring(heartScale, { toValue: 1.6, useNativeDriver: true }),
      Animated.timing(heartOpacity, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start(() => {
      heartScale.setValue(0);
      heartOpacity.setValue(0);
    });
  }, [heartOpacity, heartScale]);

  const handlePress = useCallback(() => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    if (lastTap.current && now - lastTap.current < DOUBLE_PRESS_DELAY) {
      // double tap -> like
      if (singleTapTimer.current) {
        clearTimeout(singleTapTimer.current);
        singleTapTimer.current = null;
      }
      animateHeart();
      lastTap.current = null;
      doubleTapCompleted.current = true;
      return;
    }
    lastTap.current = now;
    // schedule single tap action
    singleTapTimer.current = setTimeout(() => {
      onOpenChapter(item);
      singleTapTimer.current = null;
      lastTap.current = null;
      doubleTapCompleted.current = false;
    }, DOUBLE_PRESS_DELAY);
  }, [animateHeart, item, onOpenChapter]);

  return (
    <Pressable
      onPress={handlePress}
      style={{ flex: 1 }}
      android_ripple={{ color: theme.surfaceAlt }}
    >
      <LinearGradient
        colors={[theme.surface, theme.surfaceAlt, theme.cardBg]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.reel}
      >
        <View style={styles.reelTopRow}>
          <View
            style={[
              styles.diffChip,
              { backgroundColor: difficultyColor + "22" },
            ]}
          >
            <Text style={[styles.diffText, { color: difficultyColor }]}>
              {item.post.difficulty}
            </Text>
          </View>
          <Text
            style={[styles.chapterTag, { color: theme.textMuted }]}
            numberOfLines={1}
          >
            {item.chapterTitle}
          </Text>
        </View>

        <View style={styles.reelBody}>
          <View
            style={[styles.iconWrap, { backgroundColor: theme.surfaceAlt }]}
          >
            <MaterialCommunityIcons
              name={(item.post.icon as any) || "book-open-variant"}
              size={28}
              color={theme.primary}
            />
          </View>

          <Text
            style={[styles.postTitle, { color: theme.text }]}
            numberOfLines={2}
          >
            {item.post.title}
          </Text>

          <View style={styles.creatorRow}>
            <CommunityAvatar
              uid={item.post.creatorId}
              photoURL={item.post.creatorAvatar}
              size={20}
            />
            <Text
              style={[styles.creatorName, { color: theme.textSecondary }]}
              numberOfLines={1}
            >
              {item.post.creatorName}
            </Text>
            {Boolean(item.post.sharedAt) && (
              <>
                <Text style={{ color: theme.textMuted }}>·</Text>
                <Text style={[styles.sharedAt, { color: theme.textMuted }]}>
                  {formatSharedAt(item.post.sharedAt)}
                </Text>
              </>
            )}
          </View>

          <Text style={[styles.subtopicTitle, { color: theme.text }]}>
            {item.subtopicTitle}
          </Text>

          {content ? (
            <Text
              style={[styles.contentText, { color: theme.textSecondary }]}
              numberOfLines={7}
            >
              {content}
            </Text>
          ) : (
            <View
              style={[styles.contentLoading, { borderColor: theme.border }]}
            >
              <ActivityIndicator size="small" color={theme.primary} />
              <Text
                style={[styles.contentLoadingText, { color: theme.textMuted }]}
              >
                Loading lesson…
              </Text>
            </View>
          )}
        </View>

        <View style={styles.reelBottomRow}>
          <Text style={[styles.metaText, { color: theme.textMuted }]}>
            {subtopicCount} topics · {item.post.category.replace("-", " ")}
          </Text>
          <View style={styles.hintWrap} pointerEvents="none">
            <Text
              style={[
                styles.hintText,
                { color: theme.textMuted, opacity: 0.7 },
              ]}
            >
              Tap to open · Double-tap to like
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.ctaBtn,
              { backgroundColor: theme.primary, opacity: pressed ? 0.9 : 1 },
            ]}
            disabled={open}
            onPress={() => onOpenChapter(item)}
          >
            {open ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <View style={styles.ctaPulse}>
                <MaterialCommunityIcons
                  name="compass-outline"
                  size={15}
                  color="#FFFFFF"
                />
                <Text style={styles.ctaText}>Validate</Text>
              </View>
            )}
          </Pressable>
        </View>

        <Animated.View
          pointerEvents="none"
          style={[
            styles.heartOverlay,
            {
              transform: [{ scale: heartScale }],
              opacity: heartOpacity,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="heart"
            size={80}
            color={theme.primary}
          />
        </Animated.View>
      </LinearGradient>
    </Pressable>
  );
}

function FeedSkeleton({ height }: { height: number }) {
  const theme = useThemeColors();
  return (
    <LinearGradient
      colors={[theme.surface, theme.surfaceAlt]}
      style={[styles.reel, { height }]}
    >
      <View
        style={[
          styles.skeletonLine,
          { backgroundColor: theme.border, width: "30%", height: 14 },
        ]}
      />
      <View style={styles.reelBody}>
        <View
          style={[styles.skeletonCircle, { backgroundColor: theme.border }]}
        />
        <View
          style={[
            styles.skeletonLine,
            {
              backgroundColor: theme.border,
              width: "80%",
              height: 18,
              marginTop: 14,
            },
          ]}
        />
        <View
          style={[
            styles.skeletonLine,
            {
              backgroundColor: theme.border,
              width: "50%",
              height: 12,
              marginTop: 10,
            },
          ]}
        />
        <View
          style={[
            styles.skeletonLine,
            {
              backgroundColor: theme.border,
              width: "92%",
              height: 28,
              marginTop: 22,
            },
          ]}
        />
        <View
          style={[
            styles.skeletonLine,
            {
              backgroundColor: theme.border,
              width: "100%",
              height: 12,
              marginTop: 16,
            },
          ]}
        />
        <View
          style={[
            styles.skeletonLine,
            {
              backgroundColor: theme.border,
              width: "88%",
              height: 12,
              marginTop: 8,
            },
          ]}
        />
        <View
          style={[
            styles.skeletonLine,
            {
              backgroundColor: theme.border,
              width: "60%",
              height: 12,
              marginTop: 8,
            },
          ]}
        />
      </View>
    </LinearGradient>
  );
}

export default function ExploreReels({
  refreshKey = 0,
  refreshing,
  onRefresh,
}: {
  refreshKey?: number;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const theme = useThemeColors();
  const router = useRouter();
  const { getToken, profile } = useAuth();

  const [posts, setPosts] = useState<CommunityFeedPost[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [includeMyCourses, setIncludeMyCourses] = useState(false);
  const [query, setQuery] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reelHeight, setReelHeight] = useState(0);

  const flatListRef = useRef<FlatList<ReelItem>>(null);
  const fetchingIds = useRef<Set<string>>(new Set());

  const loadFeed = useCallback(async () => {
    setFeedLoading(true);
    const token = await getToken();
    if (!token) {
      setFeedLoading(false);
      return;
    }
    try {
      const feed = await api.community.feed(token, 20);
      setPosts(feed.posts);
      setError(null);
    } catch (err) {
      console.error("[ExploreReels] feed fetch failed:", err);
      setError("Couldn't load the camp. Pull to refresh.");
    } finally {
      setFeedLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed, refreshKey]);

  const ensureCourse = useCallback(
    async (post: CommunityFeedPost) => {
      if (fetchingIds.current.has(post.id)) return;
      const existing = useCourseStore.getState().getCourseById(post.id);
      const hasFullChapters =
        existing && parseChapters(existing.chapters).length > 0;
      if (hasFullChapters) return;

      fetchingIds.current.add(post.id);
      try {
        const token = await getToken();
        if (!token) return;
        const course = await api.courses.getById(post.id, token);
        await useCourseStore.getState().upsertCourse(course);
      } catch (err) {
        console.error("[ExploreReels] course fetch failed:", err);
      } finally {
        fetchingIds.current.delete(post.id);
      }
    },
    [getToken],
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken<ReelItem>[] }) => {
      const first = viewableItems[0];
      if (first?.item) setCurrentIndex(first.index ?? 0);
      for (const v of viewableItems.slice(0, 3)) {
        ensureCourse(v.item.post);
      }
    },
  ).current;

  const openChapter = useCallback(
    async (item: ReelItem) => {
      setOpeningId(item.key);
      try {
        const token = await getToken();
        if (!token) return;
        const course = await api.courses.getById(item.post.id, token);
        await useCourseStore.getState().upsertCourse(course);
        router.push(
          `/(course)/${item.post.id}/chapter/${item.chapterOrder}?subtopic=${item.subtopicOrder}` as Href,
        );
      } catch (err: any) {
        Alert.alert(
          "Couldn't open course",
          err?.message ?? "Please try again.",
        );
      } finally {
        setOpeningId(null);
      }
    },
    [getToken, router],
  );

  const handleShareCourse = useCallback(() => {
    const own = profile ? useCourseStore.getState().myCourses(profile.uid) : [];
    const first = own.find(
      (c) => !c.id.startsWith("generating_") && c.chapters,
    );
    if (first) {
      router.push(`/(course)/${first.id}` as Href);
    } else {
      router.push("/(tabs)/quests" as Href);
    }
  }, [profile, router]);

  const storeCourses = useCourseStore((s) => s.courses);

  const combinedPosts = useMemo(() => {
    const seen = new Set<string>();
    const out: CommunityFeedPost[] = [];
    for (const post of posts) {
      // exclude user's own courses from Explore unless toggled on
      if (!includeMyCourses && profile && post.creatorId === profile.uid)
        continue;
      if (seen.has(post.id)) continue;
      seen.add(post.id);
      out.push(post);
    }
    return out;
  }, [posts, profile]);

  const items = useMemo(() => flattenFeed(combinedPosts), [combinedPosts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const haystack = [
        item.post.title,
        item.post.creatorName ?? "",
        item.post.category,
        item.chapterTitle,
        item.subtopicTitle,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, query]);

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      if (h > 0 && h !== reelHeight) setReelHeight(h);
    },
    [reelHeight],
  );

  const scrollToTop = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    setCurrentIndex(0);
  }, []);

  useEffect(() => {
    if (refreshing) {
      const t = setTimeout(scrollToTop, 50);
      return () => clearTimeout(t);
    }
  }, [refreshing, scrollToTop]);

  const searchChanged = useCallback(
    (text: string) => {
      setQuery(text);
      if (!refreshing) scrollToTop();
    },
    [refreshing, scrollToTop],
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerTitleBlock}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            EXPLORE THE CAMP
          </Text>
          <Text
            style={[styles.sectionSubtitle, { color: theme.textSecondary }]}
          >
            Doom-scroll every lesson across your courses and the camp
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text
            style={{ color: theme.textMuted, fontSize: 12, fontWeight: "700" }}
          >
            Include my courses
          </Text>
          <Switch
            value={includeMyCourses}
            onValueChange={setIncludeMyCourses}
            thumbColor={includeMyCourses ? theme.primary : undefined}
            trackColor={{ false: "#ccc", true: theme.primary + "44" }}
          />
        </View>
      </View>

      <View style={[styles.searchBar, { backgroundColor: theme.surfaceAlt }]}>
        <MaterialCommunityIcons
          name="magnify"
          size={18}
          color={theme.textMuted}
        />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search courses, topics, creators..."
          placeholderTextColor={theme.textMuted}
          value={query}
          onChangeText={searchChanged}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => searchChanged("")}
            activeOpacity={0.6}
          >
            <MaterialCommunityIcons
              name="close-circle"
              size={18}
              color={theme.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <TouchableOpacity
          style={[styles.errorBanner, { backgroundColor: theme.danger + "12" }]}
          onPress={() => loadFeed()}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={16}
            color={theme.danger}
          />
          <Text style={[styles.errorText, { color: theme.danger }]}>
            {error}
          </Text>
          <Text style={[styles.retryText, { color: theme.danger }]}>Retry</Text>
        </TouchableOpacity>
      )}

      <View style={styles.pagerWrap} onLayout={onLayout}>
        {feedLoading && reelHeight > 0 ? (
          <View style={[styles.stack, { height: reelHeight }]}>
            <FeedSkeleton height={reelHeight} />
          </View>
        ) : !feedLoading && reelHeight > 0 ? (
          <FlatList
            ref={flatListRef}
            data={filtered}
            keyExtractor={(item) => item.key}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            snapToInterval={reelHeight}
            snapToAlignment="start"
            decelerationRate="fast"
            getItemLayout={(_, index) => ({
              length: reelHeight,
              offset: reelHeight * index,
              index,
            })}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.primary}
              />
            }
            renderItem={({ item }) => (
              <ReelCard
                item={item}
                openingId={openingId}
                onOpenChapter={openChapter}
              />
            )}
            ListEmptyComponent={
              <View style={[styles.emptyState, { height: reelHeight }]}>
                {items.length === 0 ? (
                  <>
                    <MaterialCommunityIcons
                      name="campfire"
                      size={44}
                      color={theme.textMuted}
                    />
                    <Text style={[styles.emptyTitle, { color: theme.text }]}>
                      No courses yet
                    </Text>
                    <Text
                      style={[styles.emptyText, { color: theme.textMuted }]}
                    >
                      Create your first course and its lessons will start
                      scrolling through here.
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.shareBtn,
                        { backgroundColor: theme.primary },
                      ]}
                      activeOpacity={0.8}
                      onPress={handleShareCourse}
                    >
                      <MaterialCommunityIcons
                        name="book-plus"
                        size={16}
                        color="#FFFFFF"
                      />
                      <Text style={styles.shareBtnText}>Create a course</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name="file-search-outline"
                      size={40}
                      color={theme.textMuted}
                    />
                    <Text
                      style={[styles.emptyText, { color: theme.textMuted }]}
                    >
                      No courses match "{query}"
                    </Text>
                  </>
                )}
              </View>
            }
          />
        ) : null}

        {!feedLoading && filtered.length > 0 && reelHeight > 0 && (
          <View style={styles.progressBadge}>
            <Text
              style={[styles.progressBadgeText, { color: theme.textSecondary }]}
            >
              {Math.min(currentIndex + 1, filtered.length)} / {filtered.length}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 10,
  },
  headerTitleBlock: {
    gap: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 13,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 2,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
  },
  retryText: {
    fontSize: 12,
    fontWeight: "800",
  },
  pagerWrap: {
    flex: 1,
    marginTop: 12,
  },
  stack: {
    gap: 12,
  },
  reel: {
    flex: 1,
    borderRadius: 24,
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 22,
    overflow: "hidden",
    justifyContent: "space-between",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 9,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  reelTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  diffChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
  },
  diffText: {
    fontSize: 11,
    fontWeight: "800",
  },
  chapterTag: {
    flex: 1,
    textAlign: "right",
    fontSize: 12,
    fontWeight: "600",
  },
  reelBody: {
    flex: 1,
    justifyContent: "center",
    gap: 8,
    marginVertical: 14,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 6,
  },
  postTitle: {
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },
  creatorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  creatorName: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "600",
  },
  sharedAt: {
    fontSize: 11,
    fontWeight: "500",
  },
  subtopicTitle: {
    fontSize: 26,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 0.3,
    marginTop: 10,
  },
  contentText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 8,
  },
  contentLoading: {
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
    marginTop: 8,
  },
  contentLoadingText: {
    fontSize: 12,
    fontWeight: "600",
  },
  reelBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 14,
  },
  metaText: {
    flex: 1,
    fontSize: 11,
    fontWeight: "600",
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  ctaPulse: {
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  progressBadge: {
    position: "absolute",
    right: 4,
    top: 10,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  progressBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 24,
    marginHorizontal: 16,
    borderRadius: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginTop: 4,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 18,
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 6,
  },
  shareBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  hintWrap: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  hintText: {
    fontSize: 12,
    fontWeight: "700",
  },
  heartOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
  },
  skeletonCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignSelf: "center",
  },
});
