import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  Share,
  StyleSheet,
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
import { useEnrollmentStore } from "../store/courseEnrollmentStore";
import { useProgressStore } from "../store/courseProgressStore";
import type { Chapter } from "../types/chapter";
import type { Course } from "../types/course";
import type { CommunityFeedPost } from "../types/community";
import CommunityAvatar from "./CommunityAvatar";

const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner: "#4CAF50",
  Intermediate: "#FF9800",
  Advanced: "#F44336",
};

const FEED_PAGE_SIZE = 5;

const FEED_SKELETON_FALLBACK = 440;

const REEL_GRADIENTS: { colors: [string, string, string] }[] = [
  { colors: ["#312E81", "#1E1B4B", "#0F0A2E"] },
  { colors: ["#065F46", "#022C22", "#001716"] },
  { colors: ["#4C1D95", "#2E1065", "#150B33"] },
  { colors: ["#7C2D12", "#431407", "#1C0A04"] },
  { colors: ["#881337", "#4C0519", "#20030A"] },
  { colors: ["#155E75", "#083344", "#041E2A"] },
];

function pickReelGradient(post: CommunityFeedPost): [string, string, string] {
  let hash = 0;
  for (let i = 0; i < post.id.length; i++) {
    hash = (hash * 31 + post.id.charCodeAt(i)) >>> 0;
  }
  return REEL_GRADIENTS[hash % REEL_GRADIENTS.length].colors;
}

function formatSharedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diff = Date.now() - date.getTime();
  if (diff < 60 * 60 * 1000) return "Just now";
  if (diff < 24 * 60 * 60 * 1000)
    return `${Math.floor(diff / (60 * 60 * 1000))}h ago`;
  return `${Math.floor(diff / (24 * 60 * 60 * 1000))}d ago`;
}

function formatCount(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(value);
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
  isPrivate: boolean;
  subtopicOrder: number;
  subtopicTitle: string;
}

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<ReelItem>);

function flattenFeed(posts: CommunityFeedPost[]): ReelItem[] {
  const items: ReelItem[] = [];
  for (const post of posts) {
    (post.chapterIndex ?? []).forEach((chapter, ci) => {
      (chapter.subtopics ?? []).forEach((sub, si) => {
        items.push({
          key: `${post.id}_${ci}_${si}`,
          post,
          chapterOrder: chapter.order,
          chapterTitle: chapter.title,
          isPrivate: !!chapter.isPrivate,
          subtopicOrder: sub.order,
          subtopicTitle: sub.title,
        });
      });
    });
  }
  return items;
}

function ReelCard({
  item,
  disabled,
  onOpenChapter,
  onLike,
  onShare,
  onToggleEnroll,
  enrolled,
  completed,
}: {
  item: ReelItem;
  disabled?: boolean;
  onOpenChapter: (item: ReelItem) => void;
  onLike: (item: ReelItem) => void;
  onShare: (item: ReelItem) => void;
  onToggleEnroll: (item: ReelItem, enrolled: boolean) => void;
  enrolled: boolean;
  completed: boolean;
}) {
  const theme = useThemeColors();
  const course = useCourseStore((s) => s.getCourseById(item.post.id));
  const liked = item.post.likedByMe;

  const chapters = useMemo(
    () => parseChapters(course?.chapters),
    [course?.chapters],
  );
  const chapter = chapters[item.chapterOrder];
  const subtopic = chapter?.subtopics?.[item.subtopicOrder];
  const content = subtopic?.content;

  const difficultyColor = DIFFICULTY_COLORS[item.post.difficulty] || "#888";
  const gradientColors = pickReelGradient(item.post);
  const subtopicCount = (item.post.chapterIndex ?? []).reduce(
    (sum, ch) => sum + ch.subtopics.length,
    0,
  );

  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;
  const railHeartScale = useRef(new Animated.Value(1)).current;
  const countPop = useRef(new Animated.Value(1)).current;
  const shareScale = useRef(new Animated.Value(1)).current;
  const bookmarkScale = useRef(new Animated.Value(1)).current;
  const ringPulse = useRef(new Animated.Value(0)).current;
  const [bursts, setBursts] = useState<
    { id: number; x: number; anim: Animated.Value }[]
  >([]);
  const burstSeq = useRef(0);
  const lastTap = useRef<number | null>(null);
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
    };
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(ringPulse, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(ringPulse, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      ringPulse.setValue(0);
    };
  }, [ringPulse]);

  const buzz = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
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

  const bumpRailHeart = useCallback(() => {
    railHeartScale.setValue(1);
    Animated.sequence([
      Animated.spring(railHeartScale, {
        toValue: 1.35,
        friction: 4,
        useNativeDriver: true,
      }),
      Animated.spring(railHeartScale, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();
  }, [railHeartScale]);

  const bumpCount = useCallback(() => {
    countPop.setValue(1);
    Animated.sequence([
      Animated.spring(countPop, {
        toValue: 1.45,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.spring(countPop, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();
  }, [countPop]);

  const spawnBurst = useCallback(() => {
    const idBase = burstSeq.current++;
    const particles = Array.from({ length: 5 }, (_, i) => ({
      id: idBase * 10 + i,
      x: (i - 2) * 9,
      anim: new Animated.Value(0),
    }));
    setBursts((prev) => [...prev, ...particles]);
    particles.forEach((p, i) => {
      Animated.sequence([
        Animated.delay(i * 45),
        Animated.timing(p.anim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setBursts((prev) => prev.filter((b) => b.id !== p.id));
      });
    });
  }, []);

  const like = useCallback(() => {
    if (item.post.isMine) return;
    animateHeart();
    bumpRailHeart();
    bumpCount();
    spawnBurst();
    buzz();
    onLike(item);
  }, [animateHeart, bumpRailHeart, bumpCount, spawnBurst, buzz, item, onLike]);

  const bumpShare = useCallback(() => {
    shareScale.setValue(1);
    Animated.sequence([
      Animated.spring(shareScale, {
        toValue: 1.3,
        friction: 4,
        useNativeDriver: true,
      }),
      Animated.spring(shareScale, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();
  }, [shareScale]);

  const bumpBookmark = useCallback(() => {
    bookmarkScale.setValue(1);
    Animated.sequence([
      Animated.spring(bookmarkScale, {
        toValue: 1.3,
        friction: 4,
        useNativeDriver: true,
      }),
      Animated.spring(bookmarkScale, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();
  }, [bookmarkScale]);

  const handleShare = useCallback(() => {
    bumpShare();
    buzz();
    onShare(item);
  }, [bumpShare, buzz, item, onShare]);

  const toggleEnroll = useCallback(() => {
    bumpBookmark();
    buzz();
    onToggleEnroll(item, enrolled);
  }, [bumpBookmark, buzz, item, onToggleEnroll, enrolled]);

  const handlePress = useCallback(() => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    if (disabled) return;
    if (lastTap.current && now - lastTap.current < DOUBLE_PRESS_DELAY) {
      // double tap -> like
      if (singleTapTimer.current) {
        clearTimeout(singleTapTimer.current);
        singleTapTimer.current = null;
      }
      like();
      lastTap.current = null;
      return;
    }
    lastTap.current = now;
    // schedule single tap action
    singleTapTimer.current = setTimeout(() => {
      onOpenChapter(item);
      singleTapTimer.current = null;
      lastTap.current = null;
    }, DOUBLE_PRESS_DELAY);
  }, [disabled, like, item, onOpenChapter]);

  return (
    <View style={{ flex: 1 }}>
      <Pressable
        onPress={handlePress}
        style={{ flex: 1 }}
        android_ripple={{ color: theme.surfaceAlt }}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.reel}
        >
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.4)"]}
            start={{ x: 0, y: 0.55 }}
            end={{ x: 0, y: 1 }}
            pointerEvents="none"
            style={styles.scrim}
          />
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
            <View style={styles.topRightGroup}>
              <Text
                style={[styles.chapterTag, { color: theme.textMuted }]}
                numberOfLines={1}
              >
                {item.chapterTitle}
              </Text>
            </View>
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
                  style={[
                    styles.contentLoadingText,
                    { color: theme.textMuted },
                  ]}
                >
                  Loading lesson…
                </Text>
              </View>
            )}
          </View>

          <View style={styles.reelBottomRow}>
            <View style={{ flex: 1, gap: 6 }}>
              {completed && (
                <View style={styles.completedRow}>
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={14}
                    color={theme.primary}
                  />
                  <Text
                    style={[styles.completedText, { color: theme.primary }]}
                  >
                    Completed
                  </Text>
                </View>
              )}
              <Text style={[styles.metaText, { color: theme.textMuted }]}>
                {subtopicCount} topics · {item.post.category.replace("-", " ")}
              </Text>
              <View style={styles.hintWrap} pointerEvents="none">
                <Text
                  style={[
                    styles.hintText,
                    { color: theme.textMuted, opacity: 0.8 },
                  ]}
                >
                  Tap to explore · Double-tap to like
                </Text>
              </View>
            </View>
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

      {bursts.length > 0 && (
        <View pointerEvents="none" style={styles.burstLayer}>
          {bursts.map((b) => (
            <Animated.View
              key={b.id}
              style={[
                styles.burstHeart,
                {
                  transform: [
                    { translateX: b.x },
                    {
                      translateY: b.anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -64],
                      }),
                    },
                    {
                      scale: b.anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.4, 1],
                      }),
                    },
                  ],
                  opacity: b.anim.interpolate({
                    inputRange: [0, 0.3, 1],
                    outputRange: [0, 1, 0],
                  }),
                },
              ]}
            >
              <MaterialCommunityIcons
                name="heart"
                size={18}
                color={theme.primary}
              />
            </Animated.View>
          ))}
        </View>
      )}

      <View style={styles.rail} pointerEvents="box-none">
        <BlurView intensity={72} tint="dark" style={styles.railPill}>
          <View style={styles.railAvatarWrap}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.railPulseRing,
                {
                  borderColor: theme.primary,
                  transform: [
                    {
                      scale: ringPulse.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.28],
                      }),
                    },
                  ],
                  opacity: ringPulse.interpolate({
                    inputRange: [0, 0.75, 1],
                    outputRange: [0.7, 0.25, 0],
                  }),
                },
              ]}
            />
            <View
              style={[styles.railAvatarRing, { borderColor: theme.primary }]}
            >
              <CommunityAvatar
                uid={item.post.creatorId}
                photoURL={item.post.creatorAvatar}
                size={34}
              />
            </View>
          </View>
        </BlurView>

        <BlurView intensity={72} tint="dark" style={styles.railPill}>
          <Pressable
            onPress={like}
            accessibilityRole="button"
            accessibilityLabel={liked ? "Unlike this course" : "Like this course"}
          >
            <Animated.View
              style={{ transform: [{ scale: railHeartScale }] }}
            >
              <MaterialCommunityIcons
                name={liked ? "heart" : "heart-outline"}
                size={26}
                color={liked ? theme.primary : "#FFFFFF"}
              />
            </Animated.View>
          </Pressable>
          <Animated.Text
            style={[
              styles.railCount,
              { color: "#FFFFFF", transform: [{ scale: countPop }] },
            ]}
          >
            {item.post.likeCount}
          </Animated.Text>
        </BlurView>

        <BlurView intensity={72} tint="dark" style={styles.railPill}>
          <Pressable
            onPress={handleShare}
            accessibilityRole="button"
            accessibilityLabel="Share this course"
          >
            <Animated.View style={{ transform: [{ scale: shareScale }] }}>
              <MaterialCommunityIcons
                name="share-variant-outline"
                size={24}
                color="#FFFFFF"
              />
            </Animated.View>
          </Pressable>
          <Text style={[styles.railCount, { color: "#FFFFFF" }]}>Share</Text>
        </BlurView>

        <BlurView intensity={72} tint="dark" style={styles.railPill}>
          <Pressable
            onPress={toggleEnroll}
            accessibilityRole="button"
            accessibilityLabel={enrolled ? "Remove from Enrolled" : "Add to Enrolled"}
          >
            <Animated.View style={{ transform: [{ scale: bookmarkScale }] }}>
              <MaterialCommunityIcons
                name={enrolled ? "bookmark" : "bookmark-outline"}
                size={24}
                color={enrolled ? theme.primary : "#FFFFFF"}
              />
            </Animated.View>
          </Pressable>
          <Text
            style={[styles.railCount, { color: enrolled ? theme.primary : "#FFFFFF" }]}
          >
            {enrolled ? "Enrolled" : "Save"}
          </Text>
        </BlurView>

        <BlurView intensity={72} tint="dark" style={styles.railPill}>
          <MaterialCommunityIcons
            name="eye-outline"
            size={24}
            color="#FFFFFF"
          />
          <Text style={[styles.railCount, { color: "#FFFFFF" }]}>
            {formatCount(item.post.viewCount)}
          </Text>
        </BlurView>
      </View>
    </View>
  );
}

function FeedSkeleton({ height }: { height: number }) {
  const theme = useThemeColors();
  const shimmer = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 0.85,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0.35,
          duration: 650,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  return (
    <Animated.View style={{ flex: 1, opacity: shimmer }}>
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
    </Animated.View>
  );
}

export function ReelsOpeningOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <View style={styles.openingOverlay} pointerEvents="auto">
      <BlurView intensity={80} tint="dark" style={styles.openingBlur}>
        <FeedSkeleton height={FEED_SKELETON_FALLBACK} />
        <View style={styles.openingLabelWrap}>
          <MaterialCommunityIcons
            name="book-open-variant"
            size={16}
            color="#FFFFFF"
          />
          <Text style={styles.openingLabel}>Opening lesson…</Text>
        </View>
      </BlurView>
    </View>
  );
}

export default function ExploreReels({
  refreshKey = 0,
  refreshing,
  onRefresh,
  onOpeningChange,
  onRefreshDone,
}: {
  refreshKey?: number;
  refreshing: boolean;
  onRefresh: () => void;
  onOpeningChange?: (opening: boolean) => void;
  onRefreshDone?: () => void;
}) {
  const theme = useThemeColors();
  const router = useRouter();
  const { getToken, profile } = useAuth();

  const [posts, setPosts] = useState<CommunityFeedPost[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [reelHeight, setReelHeight] = useState(0);

  const flatListRef = useRef<FlatList<ReelItem>>(null);
  const fetchingIds = useRef<Set<string>>(new Set());
  const likingIds = useRef<Set<string>>(new Set());
  const viewedIds = useRef<Set<string>>(new Set());
  const loadingMoreRef = useRef(false);
  const loadingFeedRef = useRef(false);
  const postsRef = useRef<CommunityFeedPost[]>([]);
  postsRef.current = posts;
  const openingRef = useRef(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const loadFeed = useCallback(
    async (force = false) => {
      if (loadingFeedRef.current && !force) return;
      const hasPosts = postsRef.current.length > 0;
      if (!force && hasPosts) return;

      loadingFeedRef.current = true;
      if (!hasPosts) setFeedLoading(true);
      const token = await getToken();
      if (!token) {
        setFeedLoading(false);
        loadingFeedRef.current = false;
        onRefreshDone?.();
        return;
      }
      try {
        const feed = await api.community.feed(token, FEED_PAGE_SIZE, false, 0);
        setPosts(feed.posts);
        setHasMore(!!feed.hasMore);
        setError(null);
      } catch (err) {
        console.error("[ExploreReels] feed fetch failed:", err);
        setError("Couldn't load the camp. Pull to refresh.");
      } finally {
        setFeedLoading(false);
        loadingFeedRef.current = false;
        onRefreshDone?.();
      }
    },
    [getToken, onRefreshDone],
  );

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const token = await getToken();
    try {
      if (!token) return;
      const feed = await api.community.feed(
        token,
        FEED_PAGE_SIZE,
        false,
        postsRef.current.length,
      );
      const fresh = feed.posts.filter(
        (p) => !postsRef.current.some((existing) => existing.id === p.id),
      );
      if (fresh.length === 0) {
        setHasMore(false);
      } else {
        setPosts((prev) => [...prev, ...fresh]);
        setHasMore(!!feed.hasMore);
      }
    } catch (err) {
      console.error("[ExploreReels] feed pagination failed:", err);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [getToken, hasMore]);

  useEffect(() => {
    if (refreshKey > 0) loadFeed(true);
    else loadFeed();
  }, [loadFeed, refreshKey]);

  useEffect(() => {
    onOpeningChange?.(openingId !== null);
  }, [openingId, onOpeningChange]);

  const ensureCourse = useCallback(
    async (post: CommunityFeedPost): Promise<Course | null> => {
      const cached = useCourseStore.getState().getCourseById(post.id);
      if (cached && parseChapters(cached.chapters).length > 0) return cached;

      if (fetchingIds.current.has(post.id)) {
        return useCourseStore.getState().getCourseById(post.id) ?? null;
      }

      fetchingIds.current.add(post.id);
      try {
        const token = await getToken();
        if (!token) return null;
        const course = await api.courses.getById(post.id, token);
        await useCourseStore.getState().upsertCourse(course);
        return course;
      } catch (err) {
        console.error("[ExploreReels] course fetch failed:", err);
        return null;
      } finally {
        fetchingIds.current.delete(post.id);
      }
    },
    [getToken],
  );

  const trackView = useCallback(
    async (courseId: string) => {
      if (viewedIds.current.has(courseId)) return;
      viewedIds.current.add(courseId);
      const token = await getToken();
      if (!token) return;
      try {
        const res = await api.community.trackView(courseId, token);
        setPosts((prev) =>
          prev.map((p) =>
            p.id === courseId ? { ...p, viewCount: res.viewCount } : p,
          ),
        );
      } catch (err) {
        console.error("[ExploreReels] view tracking failed:", err);
      }
    },
    [getToken],
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken<ReelItem>[] }) => {
      const first = viewableItems[0];
      if (first?.item) trackView(first.item.post.id);
      for (const v of viewableItems.slice(0, 3)) {
        ensureCourse(v.item.post);
      }
    },
  ).current;

  const openChapter = useCallback(
    async (item: ReelItem) => {
      if (openingRef.current) return;
      openingRef.current = true;
      setOpeningId(item.key);
      try {
        const course = await ensureCourse(item.post);
        if (!course) {
          throw new Error("Course details aren't available.");
        }
        trackView(item.post.id);
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
        openingRef.current = false;
      }
    },
    [ensureCourse, router, trackView],
  );

  const toggleLike = useCallback(
    async (item: ReelItem) => {
      const id = item.post.id;
      if (likingIds.current.has(id)) return;
      const token = await getToken();
      if (!token) return;

      const prevLiked = item.post.likedByMe;
      const prevCount = item.post.likeCount;
      likingIds.current.add(id);

      // optimistic flip, then reconcile with the server response
      setPosts((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                likedByMe: !prevLiked,
                likeCount: Math.max(0, p.likeCount + (prevLiked ? -1 : 1)),
              }
            : p,
        ),
      );

      try {
        const res = await api.community.feedLike(id, token);
        setPosts((prev) =>
          prev.map((p) =>
            p.id === id ? { ...p, likedByMe: res.liked, likeCount: res.likeCount } : p,
          ),
        );
      } catch (err) {
        console.error("[ExploreReels] like failed:", err);
        setPosts((prev) =>
          prev.map((p) =>
            p.id === id ? { ...p, likedByMe: prevLiked, likeCount: prevCount } : p,
          ),
        );
      } finally {
        likingIds.current.delete(id);
      }
    },
    [getToken],
  );

  const enrollments = useEnrollmentStore((s) => s.enrollments);
  const passedQuizzes = useProgressStore((s) => s.passedQuizzes);

  const completedKeys = useMemo(
    () => new Set(Object.keys(passedQuizzes ?? {})),
    [passedQuizzes],
  );

  const enrolledIds = useMemo(
    () => new Set(enrollments.map((e) => e.courseId)),
    [enrollments],
  );

  const toggleEnroll = useCallback(
    async (item: ReelItem, currentlyEnrolled: boolean) => {
      if (!profile) return;
      const token = await getToken();
      if (!token) {
        Alert.alert("Not signed in", "Please sign in to save courses.");
        return;
      }
      if (currentlyEnrolled) {
        const enrollment = enrollments.find(
          (e) => e.courseId === item.post.id,
        );
        if (!enrollment) return;
        const res = await useEnrollmentStore
          .getState()
          .unenroll(enrollment.id, getToken);
        if (!res.success) {
          Alert.alert("Couldn't remove course", res.error ?? "Please try again.");
        }
        return;
      }
      const res = await useEnrollmentStore
        .getState()
        .enroll(profile.uid, item.post.id, getToken);
      if (!res.success) {
        Alert.alert("Couldn't save course", res.error ?? "Please try again.");
      }
    },
    [profile, enrollments, getToken],
  );

  const shareReel = useCallback(async (item: ReelItem) => {
    if (Platform.OS === "web") {
      Alert.alert(
        "Share",
        `/(course)/${item.post.id}/chapter/${item.chapterOrder}?subtopic=${item.subtopicOrder}`,
      );
      return;
    }
    try {
      const message = `${item.post.title} — ${item.subtopicTitle}`;
      await Share.share({
        message: `${message}\n\nhttps://yuinx.app/(course)/${item.post.id}/chapter/${item.chapterOrder}?subtopic=${item.subtopicOrder}`,
      });
    } catch (err) {
      console.error("[ExploreReels] share failed:", err);
    }
  }, []);

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

  const items = useMemo(
    () => flattenFeed(posts),
    [posts],
  );

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
            Doom-scroll lessons from your camp and fellow learners
          </Text>
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
        {feedLoading && items.length === 0 ? (
          <View style={[styles.stack, { height: reelHeight > 0 ? reelHeight : FEED_SKELETON_FALLBACK }]}>
            <FeedSkeleton height={reelHeight > 0 ? reelHeight : FEED_SKELETON_FALLBACK} />
          </View>
        ) : reelHeight > 0 ? (
          <AnimatedFlatList
            ref={flatListRef}
            data={filtered}
            keyExtractor={(item) => item.key}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            snapToInterval={reelHeight}
            snapToAlignment="start"
            decelerationRate="fast"
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: true },
            )}
            scrollEventThrottle={16}
            getItemLayout={(_, index) => ({
              length: reelHeight,
              offset: reelHeight * index,
              index,
            })}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
            onEndReached={loadMore}
            onEndReachedThreshold={0.6}
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
                disabled={openingId !== null}
                onOpenChapter={openChapter}
                onLike={toggleLike}
                onShare={shareReel}
                onToggleEnroll={toggleEnroll}
                enrolled={enrolledIds.has(item.post.id)}
                completed={completedKeys.has(
                  `${item.post.id}_${item.chapterOrder}_${item.subtopicOrder}`,
                )}
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
                      The camp is quiet
                    </Text>
                    <Text
                      style={[styles.emptyText, { color: theme.textMuted }]}
                    >
                      Campmates&apos; courses will scroll in here.
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
                      No courses match “{query}”
                    </Text>
                  </>
                )}
              </View>
            }
          />
        ) : null}

        {!feedLoading && reelHeight > 0 && loadingMore && (
          <View style={styles.loadingMoreBadge}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text
              style={[styles.loadingMoreText, { color: theme.textSecondary }]}
            >
              Loading more…
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
  openingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  openingBlur: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  openingLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(18,26,38,0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  openingLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  stack: {
    gap: 12,
  },
  loadingMoreBadge: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 6,
  },
  loadingMoreText: {
    fontSize: 12,
    fontWeight: "600",
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
  scrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
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
    fontSize: 12,
    fontWeight: "600",
    textAlign: "right",
  },
  topRightGroup: {
    flex: 1,
    alignItems: "flex-end",
    gap: 4,
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
  completedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  completedText: {
    fontSize: 11,
    fontWeight: "800",
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
  rail: {
    position: "absolute",
    right: 28,
    bottom: 24,
    gap: 12,
    alignItems: "center",
  },
  railPill: {
    minWidth: 52,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    overflow: "hidden",
  },
  railCount: {
    fontSize: 11,
    fontWeight: "800",
    opacity: 0.9,
  },
  railAvatarRing: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  railAvatarWrap: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  railPulseRing: {
    position: "absolute",
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
  },
  burstLayer: {
    position: "absolute",
    right: 52,
    bottom: 96,
  },
  burstHeart: {
    position: "absolute",
    right: 0,
    bottom: 0,
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
