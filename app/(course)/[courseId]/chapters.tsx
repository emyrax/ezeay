import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  Animated, Image, RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import { useCourseStore } from "../../../store/courseStore";
import { useProgressStore } from "../../../store/courseProgressStore";
import { useThemeColors } from "../../../hooks/useTheme";
import { useAuth } from "../../../contexts/AuthContext";
import ErrorBoundary from "../../../component/ErrorBoundary";
import ChapterBottomSheet from "../../../component/ChapterBottomSheet";
import type { Chapter } from "../../../types/chapter";

const NODE_SIZE = 80;
const ROW_HEIGHT = 130;
const RING_SIZE = 52;
const RING_STROKE = 5;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner: "#4CAF50",
  Intermediate: "#FF9800",
  Advanced: "#F44336",
};

const MAX_SHOWN_SUBTOPICS = 5;

function ShimmerRow({ pattern }: { pattern: number }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const translateX = pattern === 1 ? -60 : pattern === 3 ? 60 : 0;

  return (
    <View style={[styles.row, { height: ROW_HEIGHT }]}>
      <Animated.View
        style={[styles.skeletonCircle, { opacity, transform: [{ translateX }] }]}
      />
    </View>
  );
}

export default function CourseChaptersScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const theme = useThemeColors();
  const router = useRouter();
  const { profile, getToken } = useAuth();
  const course = useCourseStore((s) => s.getCourseById(courseId ?? ""));
  const loaded = useCourseStore((s) => s.loaded);
  const loading = useCourseStore((s) => s.loading);
  const fetchCourses = useCourseStore((s) => s.fetchCourses);
  const setCourseVisibility = useCourseStore((s) => s.setCourseVisibility);
  const passedQuizzes = useProgressStore((s) => s.passedQuizzes);
  const isQuizPassed = useCallback(
    (courseId: string, ch: number, sub: number) => !!passedQuizzes[`${courseId}_${ch}_${sub}`],
    [passedQuizzes],
  );
  const scrollRef = useRef<ScrollView>(null);
  const scaleAnims = useRef<Record<number, Animated.Value>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const [selectedChapter, setSelectedChapter] = useState<{ chapter: Chapter; index: number } | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  const getScaleAnim = useCallback((index: number) => {
    if (!scaleAnims.current[index]) {
      scaleAnims.current[index] = new Animated.Value(1);
    }
    return scaleAnims.current[index];
  }, []);

  const handlePressIn = useCallback((index: number) => {
    const anim = scaleAnims.current[index];
    if (anim) {
      Animated.spring(anim, { toValue: 0.92, useNativeDriver: true, damping: 15 }).start();
    }
  }, []);

  const handlePressOut = useCallback((index: number) => {
    const anim = scaleAnims.current[index];
    if (anim) {
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, damping: 15 }).start();
    }
  }, []);

  const chapters = useMemo(() => {
    const raw = course?.chapters;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") {
      try { return JSON.parse(raw) as Chapter[]; } catch { return []; }
    }
    return [];
  }, [course?.chapters]);

  const completedCount = useMemo(() => {
    return chapters.filter((ch, ci) =>
      ch.subtopics?.every((_, si) => isQuizPassed(courseId ?? "", ci, si)),
    ).length;
  }, [chapters, courseId, isQuizPassed]);

  const firstIncompleteIndex = useMemo(() => {
    if (chapters.length === 0) return 0;
    const idx = chapters.findIndex((ch, ci) => {
      const allDone = ch.subtopics?.every((_, si) =>
        isQuizPassed(courseId ?? "", ci, si),
      );
      return !allDone;
    });
    return idx === -1 ? chapters.length - 1 : idx;
  }, [chapters, courseId, isQuizPassed]);

  useEffect(() => {
    if (scrollRef.current && firstIncompleteIndex >= 0) {
      const reversedIndex = chapters.length - 1 - firstIncompleteIndex;
      const y = reversedIndex * ROW_HEIGHT;
      const timer = setTimeout(() => {
        scrollRef.current?.scrollTo({ y: Math.max(0, y - 60), animated: true });
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [firstIncompleteIndex, chapters.length]);

  const handleChapterPress = (originalIndex: number) => {
    router.push(`/(course)/${courseId}/chapter/${originalIndex}`);
  };

  const handleLongPress = (chapter: Chapter, index: number) => {
    setSelectedChapter({ chapter, index });
  };

  const handleToggleShare = useCallback(async () => {
    if (!course || !profile || isSharing) return;
    setIsSharing(true);
    try {
      await setCourseVisibility(course.id, !course.isPublic, getToken);
    } finally {
      setIsSharing(false);
    }
  }, [course, profile, isSharing, setCourseVisibility, getToken]);

  const onRefresh = useCallback(async () => {
    if (!profile) return;
    setRefreshing(true);
    try {
      await fetchCourses(profile.uid, getToken);
    } finally {
      setRefreshing(false);
    }
  }, [profile, fetchCourses, getToken]);

  if (!courseId) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: theme.textSecondary }]}>Course not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading && !loaded) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: "Chapters",
            headerStyle: { backgroundColor: theme.bg },
            headerTintColor: theme.text,
            headerBackTitle: "Back",
          }}
        />
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={[styles.summarySkeleton, { backgroundColor: theme.border }]} />
          {Array.from({ length: 5 }).map((_, i) => (
            <ShimmerRow key={i} pattern={i % 4} />
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!course) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: theme.textSecondary }]}>Course not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (chapters.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: course.title || "Chapters",
            headerStyle: { backgroundColor: theme.bg },
            headerTintColor: theme.text,
            headerBackTitle: "Back",
          }}
        />
        <View style={styles.center}>
          <Ionicons name="book-outline" size={48} color={theme.textMuted} />
          <Text style={[styles.errorText, { color: theme.textSecondary }]}>No chapters available yet</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalCh = chapters.length;
  const progressionMap = [...chapters].reverse();
  const xpPerChapter = Math.round(course.rewardXp / totalCh);
  const progressFraction = totalCh > 0 ? completedCount / totalCh : 0;

  return (
    <ErrorBoundary>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        <LinearGradient
          colors={[theme.bg, theme.surface]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <Stack.Screen
          options={{
            headerShown: false,
          }}
        />
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={28} color={theme.text} />
        </TouchableOpacity>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
          }
        >
          {/* Feature 9: Course Summary Card */}
          <View style={[styles.summaryCard, { backgroundColor: theme.surface }]}>
            {course.thumbnailUrl ? (
              <Image source={{ uri: course.thumbnailUrl }} style={styles.summaryThumb} />
            ) : null}
            <View style={styles.summaryBody}>
              <Text style={[styles.summaryTitle, { color: theme.text }]}>{course.title}</Text>
              <TouchableOpacity activeOpacity={0.7} onPress={() => setExpanded((p) => !p)}>
                <Text
                  style={[styles.summaryDesc, { color: theme.textSecondary }]}
                  numberOfLines={expanded ? undefined : 2}
                >
                  {course.description}
                </Text>
                {course.description.length > 100 && (
                  <Text style={[styles.readMoreText, { color: theme.primary }]}>
                    {expanded ? "Show less" : "Read more"}
                  </Text>
                )}
              </TouchableOpacity>
              <View style={styles.summaryMeta}>
                <View
                  style={[
                    styles.diffBadge,
                    { backgroundColor: (DIFFICULTY_COLORS[course.difficulty] || "#888") + "20" },
                  ]}
                >
                  <Text
                    style={{
                      color: DIFFICULTY_COLORS[course.difficulty] || "#888",
                      fontSize: 11,
                      fontWeight: "700",
                    }}
                  >
                    {course.difficulty}
                  </Text>
                </View>
                <Text style={[styles.summaryMetaText, { color: theme.textMuted }]}>
                  {totalCh} chapters · {course.rewardXp} XP
                </Text>
              </View>

              {profile?.uid === course.creatorId && (
                <TouchableOpacity
                  style={[styles.shareRow, { backgroundColor: theme.surfaceAlt }]}
                  onPress={handleToggleShare}
                  disabled={isSharing}
                  activeOpacity={0.7}
                >
                  <View style={[styles.shareIconWrap, { backgroundColor: theme.primary + "18" }]}>
                    <MaterialCommunityIcons name="earth" size={18} color={theme.primary} />
                  </View>
                  <View style={styles.shareBody}>
                    <Text style={[styles.shareTitle, { color: theme.text }]}>
                      Share to the Camp
                    </Text>
                    <Text style={[styles.shareSub, { color: theme.textMuted }]}>
                      {course.isPublic
                        ? "Visible in Explore — others can learn from it"
                        : "Only you can see this course"}
                    </Text>
                  </View>
                  {isSharing ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                  ) : (
                    <View
                      style={[
                        styles.shareToggle,
                        {
                          backgroundColor: course.isPublic
                            ? theme.success
                            : theme.border,
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={course.isPublic ? "check" : "lock"}
                        size={13}
                        color={course.isPublic ? "#FFFFFF" : theme.textSecondary}
                      />
                      <Text
                        style={[
                          styles.shareToggleText,
                          { color: course.isPublic ? "#FFFFFF" : theme.textSecondary },
                        ]}
                      >
                        {course.isPublic ? "PUBLIC" : "PRIVATE"}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Feature 10: Progress Ring */}
          <View style={styles.progressHeader}>
            <View style={styles.ringContainer}>
              <Svg width={RING_SIZE} height={RING_SIZE}>
                <Circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS}
                  stroke={theme.border}
                  strokeWidth={RING_STROKE}
                  fill="none"
                />
                <Circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS}
                  stroke={theme.primary}
                  strokeWidth={RING_STROKE}
                  fill="none"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={RING_CIRCUMFERENCE * (1 - progressFraction)}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
                />
              </Svg>
              <Text style={[styles.ringPercent, { color: theme.primary }]}>
                {Math.round(progressFraction * 100)}%
              </Text>
            </View>
            <View style={styles.progressTextBlock}>
              <Text style={[styles.progressTitle, { color: theme.text }]}>Course Progress</Text>
              <Text style={[styles.progressSub, { color: theme.textSecondary }]}>
                {completedCount}/{totalCh} chapters complete
              </Text>
            </View>
          </View>

          {/* Nodes */}
          {progressionMap.map((chapter, revIndex) => {
            const originalIndex = totalCh - 1 - revIndex;
            const allDone = chapter.subtopics?.every((_, si) =>
              isQuizPassed(courseId ?? "", originalIndex, si),
            ) ?? false;
            const isCurrent = originalIndex === firstIncompleteIndex;
            const isLocked = !allDone && !isCurrent && originalIndex > firstIncompleteIndex;

            const passedCount = chapter.subtopics?.filter((_, si) =>
              isQuizPassed(courseId ?? "", originalIndex, si),
            ).length ?? 0;
            const totalSubtopics = chapter.subtopics?.length ?? 0;

            const pattern = revIndex % 4;
            let translateX = 0;
            if (pattern === 1) translateX = -60;
            if (pattern === 3) translateX = 60;

            const scaleAnim = getScaleAnim(originalIndex);

            return (
              <View key={originalIndex} style={[styles.row, { height: ROW_HEIGHT }]}>
                <Animated.View
                  style={[styles.nodeWrap, { transform: [{ translateX }, { scale: scaleAnim }] }]}
                >
                  {/* Feature 3: Crown badge */}
                  {allDone && (
                    <Ionicons name="star" size={18} color="#FFD700" style={styles.crownBadge} />
                  )}

                  <TouchableOpacity
                    style={[
                      styles.circularButton,
                      {
                        width: NODE_SIZE,
                        height: NODE_SIZE,
                        borderRadius: NODE_SIZE / 2,
                      },
                      allDone && { backgroundColor: theme.success },
                      !allDone && !isLocked && !isCurrent && { backgroundColor: theme.primary },
                      isCurrent && {
                        backgroundColor: theme.primary,
                        borderWidth: 4,
                        borderColor: "#FFFFFF",
                      },
                      isLocked && { backgroundColor: "#334155", opacity: 0.5 },
                    ]}
                    onPressIn={() => handlePressIn(originalIndex)}
                    onPressOut={() => handlePressOut(originalIndex)}
                    onPress={() => handleChapterPress(originalIndex)}
                    onLongPress={() => handleLongPress(chapter, originalIndex)}
                    delayLongPress={500}
                    disabled={isLocked}
                    activeOpacity={0.85}
                  >
                    {allDone ? (
                      <Ionicons name="checkmark" size={34} color="#FFF" />
                    ) : isLocked ? (
                      <Ionicons name="lock-closed" size={26} color={theme.textMuted} />
                    ) : (
                      <>
                        <Text style={styles.nodeText}>{originalIndex + 1}</Text>
                        {/* Feature 2: Subtopic dots */}
                        {totalSubtopics > 0 && (
                          <View style={styles.subtopicDots}>
                            {Array.from({ length: Math.min(totalSubtopics, MAX_SHOWN_SUBTOPICS) }).map((_, di) => (
                              <View
                                key={di}
                                style={[
                                  styles.subtopicDot,
                                  {
                                    backgroundColor:
                                      di < passedCount ? theme.primary : "rgba(255,255,255,0.3)",
                                  },
                                ]}
                              />
                            ))}
                          </View>
                        )}
                      </>
                    )}
                  </TouchableOpacity>

                  <Text
                    style={[
                      styles.chapterName,
                      { color: allDone ? theme.success : isLocked ? theme.textMuted : theme.text },
                    ]}
                    numberOfLines={2}
                  >
                    {chapter.title}
                  </Text>

                  {allDone ? (
                    <Text style={styles.xpLabel}>+{xpPerChapter} XP</Text>
                  ) : isCurrent ? (
                    <Text style={[styles.statusLabel, { color: theme.primary }]}>Continue</Text>
                  ) : null}
                </Animated.View>
              </View>
            );
          })}
          <View style={{ height: 40 }} />
        </ScrollView>


        {/* Feature 5: Chapter Bottom Sheet */}
        <ChapterBottomSheet
          visible={!!selectedChapter}
          chapter={selectedChapter?.chapter ?? null}
          chapterIndex={selectedChapter?.index ?? -1}
          courseId={courseId ?? ""}
          onClose={() => setSelectedChapter(null)}
          onStart={(chIdx) => {
            setSelectedChapter(null);
            router.push(`/(course)/${courseId}/chapter/${chIdx}`);
          }}
        />
      </SafeAreaView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 12 },
  errorText: { fontSize: 16, textAlign: "center" },
  scroll: {
    paddingTop: 24,
    paddingBottom: 40,
    alignItems: "center",
  },
  row: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  nodeWrap: {
    alignItems: "center",
  },
  circularButton: {
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowColor: "#000",
    elevation: 6,
  },
  nodeText: {
    color: "#FFF",
    fontSize: 22,
    fontWeight: "800",
  },
  chapterName: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    maxWidth: 140,
    lineHeight: 18,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },

  /* Shimmer skeleton */
  skeletonCircle: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },

  /* Feature 9: Summary card */
  summaryCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginHorizontal: 16,
    marginBottom: 20,
    width: "100%",
    maxWidth: 360,
  },
  summaryThumb: {
    width: "100%",
    height: 120,
    resizeMode: "cover",
  },
  summaryBody: {
    padding: 14,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 4,
  },
  summaryDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  summaryMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  diffBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  summaryMetaText: {
    fontSize: 12,
  },
  shareRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
  },
  shareIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  shareBody: {
    flex: 1,
  },
  shareTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  shareSub: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 1,
  },
  shareToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  shareToggleText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  summarySkeleton: {
    height: 160,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 20,
    width: "100%",
    maxWidth: 360,
  },

  /* Feature 10: Progress ring */
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
    paddingHorizontal: 16,
    width: "100%",
    maxWidth: 360,
  },
  ringContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  ringPercent: {
    position: "absolute",
    fontSize: 12,
    fontWeight: "800",
  },
  progressTextBlock: {
    flex: 1,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  progressSub: {
    fontSize: 13,
    marginTop: 2,
  },

  /* Feature 3: Crown badge */
  crownBadge: {
    position: "absolute",
    top: -10,
    zIndex: 10,
  },

  /* Feature 2: Subtopic dots */
  subtopicDots: {
    flexDirection: "row",
    gap: 3,
    marginTop: 3,
  },
  subtopicDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  /* Feature 4: XP label */
  xpLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFD700",
    marginTop: 2,
    textShadowColor: "rgba(255,215,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  backButton: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },

  readMoreText: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
});
