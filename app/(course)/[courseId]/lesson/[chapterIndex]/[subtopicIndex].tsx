import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter, type Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import * as Haptics from "expo-haptics";
import { useAuth } from "../../../../../contexts/AuthContext";
import { useFullscreen } from "../../../../../hooks/useFullscreen";
import { useLessonMotion } from "../../../../../hooks/useLessonMotion";
import { useThemeColors } from "../../../../../hooks/useTheme";
import {
  ApiError,
  api,
  friendlyError,
} from "../../../../../lib/api";
import {
  clampSlideIndex,
  findAudioClip,
  formatTimecode,
  narrationEndAction,
} from "../../../../../lib/lesson/player";
import ErrorBoundary from "../../../../../component/ErrorBoundary";
import LessonStage from "../../../../../component/lesson/LessonStage";
import LessonCheckpointCard from "../../../../../component/lesson/LessonCheckpointCard";
import LessonCompleteCard from "../../../../../component/lesson/LessonCompleteCard";
import LessonExplainSheet from "../../../../../component/lesson/LessonExplainSheet";
import LessonNarrationCard from "../../../../../component/lesson/LessonNarrationCard";
import LessonProgress from "../../../../../component/lesson/LessonProgress";
import LessonTheater from "../../../../../component/lesson/LessonTheater";
import type {
  LessonExplainAction,
  LessonScript,
} from "../../../../../types/lesson";

const EXPLAIN_ACTIONS: {
  id: LessonExplainAction;
  label: string;
  icon: "sparkles-outline" | "bulb-outline" | "help-circle-outline";
}[] = [
  { id: "simplify", label: "Simpler", icon: "sparkles-outline" },
  { id: "example", label: "Example", icon: "bulb-outline" },
  { id: "why", label: "Why", icon: "help-circle-outline" },
];

function parseIndex(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : -1;
}

function LessonHeader({
  title,
  onBack,
  onPresent,
}: {
  title: string;
  onBack: () => void;
  onPresent: () => void;
}) {
  const theme = useThemeColors();
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={[styles.headerButton, { backgroundColor: theme.surface }]}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Close lesson"
      >
        <Ionicons name="chevron-back" size={21} color={theme.text} />
      </TouchableOpacity>
      <View style={styles.headerCopy}>
        <Text style={[styles.headerEyebrow, { color: theme.primary }]}>
          Animated lesson
        </Text>
        <Text
          style={[styles.headerTitle, { color: theme.text }]}
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.headerButton, { backgroundColor: theme.surface }]}
        onPress={onPresent}
        accessibilityRole="button"
        accessibilityLabel="Present full screen"
      >
        <Ionicons name="expand-outline" size={19} color={theme.text} />
      </TouchableOpacity>
    </View>
  );
}

export default function LessonScreen() {
  const { courseId, chapterIndex, subtopicIndex } = useLocalSearchParams<{
    courseId: string;
    chapterIndex: string;
    subtopicIndex: string;
  }>();
  const router = useRouter();
  const theme = useThemeColors();
  const motion = useLessonMotion();
  const { getToken } = useAuth();
  const chapterIdx = parseIndex(chapterIndex);
  const subtopicIdx = parseIndex(subtopicIndex);
  const hasValidParams =
    !!courseId && chapterIdx >= 0 && subtopicIdx >= 0;

  const player = useAudioPlayer();
  const status = useAudioPlayerStatus(player);
  const scrollRef = useRef<ScrollView>(null);
  const mountedRef = useRef(true);
  const pendingPlayRef = useRef(false);
  const clipStartedAtRef = useRef(0);
  const activeClipRef = useRef<string | null>(null);
  const finishedClipRef = useRef<string | null>(null);
  const audioRequestRef = useRef(false);
  const explainRequestRef = useRef(0);
  const explainCacheRef = useRef(new Map<string, string>());

  const [lesson, setLesson] = useState<LessonScript | null>(null);
  const [loading, setLoading] = useState(hasValidParams);
  const [building, setBuilding] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(
    hasValidParams ? null : "This lesson link is incomplete.",
  );
  const [reloadKey, setReloadKey] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [solvedCheckpoints, setSolvedCheckpoints] = useState<Set<string>>(
    () => new Set(),
  );
  const [finished, setFinished] = useState(false);
  const [presentVisible, setPresentVisible] = useState(false);
  const presentVisibleRef = useRef(false);
  const handlePresentExit = useCallback(() => {
    presentVisibleRef.current = false;
    setPresentVisible(false);
  }, []);
  const { enter: enterFullscreen, exit: exitFullscreen } = useFullscreen({
    onExit: handlePresentExit,
  });
  const [explainVisible, setExplainVisible] = useState(false);
  const [explainAction, setExplainAction] =
    useState<LessonExplainAction | null>(null);
  const [explainText, setExplainText] = useState<string | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);

  const slides = lesson?.slides ?? [];
  const total = slides.length;
  const currentSlide = slides[currentIndex] ?? null;
  const currentClip =
    lesson && currentSlide
      ? findAudioClip(lesson.audio, currentSlide.id)
      : null;
  const isLast = total > 0 && currentIndex >= total - 1;
  const checkpointSolved = currentSlide
    ? solvedCheckpoints.has(currentSlide.id)
    : true;
  const canAdvance = !currentSlide?.checkpoint || checkpointSolved;
  const clipDurationSec =
    status.duration > 0
      ? status.duration
      : (currentClip?.durationMs ?? 0) / 1000;
  const audioProgress =
    currentClip &&
    clipDurationSec > 0 &&
    Number.isFinite(status.currentTime)
      ? Math.min(1, Math.max(0, status.currentTime / clipDurationSec))
      : 0;
  const displayedTimeMs = currentClip ? status.currentTime * 1000 : 0;

  const chapterHref = useMemo(
    () =>
      ({
        pathname: "/(course)/[courseId]/chapter/[chapterIndex]",
        params: {
          courseId: courseId ?? "",
          chapterIndex: String(Math.max(chapterIdx, 0)),
        },
      }) as unknown as Href,
    [courseId, chapterIdx],
  );

  const handleClose = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    if (courseId && chapterIdx >= 0) {
      router.replace(chapterHref);
      return;
    }
    router.replace("/(tabs)");
  }, [router, courseId, chapterIdx, chapterHref]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      allowsRecording: false,
      interruptionMode: "duckOthers",
    }).catch((err) => {
      console.warn("[Lesson] audio mode failed:", err);
    });
  }, []);

  const handleRetry = useCallback(() => {
    if (!hasValidParams) return;
    pendingPlayRef.current = false;
    setLoading(true);
    setBuilding(false);
    setLoadError(null);
    setFinished(false);
    setCurrentIndex(0);
    setSolvedCheckpoints(new Set());
    setReloadKey((key) => key + 1);
  }, [hasValidParams]);

  useEffect(() => {
    let active = true;

    if (!hasValidParams) return;

    const load = async () => {
      const token = await getToken();
      if (!active) return;
      if (!token) {
        throw new Error("Please sign in again to open this lesson.");
      }

      let next: LessonScript;
      try {
        next = await api.lessons.get(
          courseId,
          chapterIdx,
          subtopicIdx,
          token,
        );
      } catch (err) {
        const missing =
          err instanceof ApiError &&
          (err.code === "lesson_missing" || err.code === "lesson_stale");
        if (!missing) throw err;

        if (active) setBuilding(true);
        next = await api.lessons.generate(
          courseId,
          chapterIdx,
          subtopicIdx,
          token,
        );
      }

      if (!active) return;
      setLesson(next);
      setAudioError(next.audioError ?? null);
      explainCacheRef.current.clear();
    };

    load()
      .catch((err) => {
        if (!active) return;
        console.warn("[Lesson] load failed", {
          courseId,
          chapterIndex: chapterIdx,
          subtopicIndex: subtopicIdx,
          status: err instanceof ApiError ? err.status : undefined,
          code: err instanceof ApiError ? err.code : undefined,
          message: err instanceof Error ? err.message : String(err),
        });
        setLoadError(
          friendlyError(err, "We couldn't open this lesson. Please try again."),
        );
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
        setBuilding(false);
      });

    return () => {
      active = false;
    };
  }, [courseId, chapterIdx, subtopicIdx, hasValidParams, reloadKey, getToken]);

  const goToSlide = useCallback(
    (index: number, autoPlay: boolean) => {
      if (total <= 0) return;
      const next = clampSlideIndex(index, total);
      if (autoPlay) pendingPlayRef.current = true;
      explainRequestRef.current += 1;
      setExplainVisible(false);
      setExplainAction(null);
      setExplainText(null);
      setExplainError(null);
      setExplainLoading(false);
      setFinished(false);
      setCurrentIndex(next);
    },
    [total],
  );

  const clipUrl = currentClip?.url ?? null;
  const clipSlideId = currentClip?.slideId ?? null;

  useEffect(() => {
    finishedClipRef.current = null;
    activeClipRef.current = clipSlideId;
    clipStartedAtRef.current = Date.now();

    if (!clipUrl) {
      pendingPlayRef.current = false;
      player.pause();
      return;
    }

    const shouldPlay = pendingPlayRef.current;
    pendingPlayRef.current = false;
    player.pause();
    player.replace(clipUrl);
    if (shouldPlay) player.play();
  }, [clipUrl, clipSlideId, player]);

  useEffect(() => {
    if (!status.didJustFinish || !currentSlide || !currentClip) return;
    if (activeClipRef.current !== currentClip.slideId) return;
    if (finishedClipRef.current === currentClip.slideId) return;
    if (Date.now() - clipStartedAtRef.current < 800) return;

    finishedClipRef.current = currentClip.slideId;
    const endAction = narrationEndAction(currentSlide, isLast);

    if (endAction === "checkpoint") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
        () => undefined,
      );
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 180);
      return;
    }

    if (endAction === "advance") {
      const timer = setTimeout(() => {
        if (mountedRef.current) goToSlide(currentIndex + 1, true);
      }, 0);
      return () => clearTimeout(timer);
    }

    const completionTimer = setTimeout(() => {
      if (mountedRef.current) setFinished(true);
    }, 0);
    void Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success,
    ).catch(() => undefined);
    return () => clearTimeout(completionTimer);
  }, [
    status.didJustFinish,
    currentSlide,
    currentClip,
    isLast,
    currentIndex,
    goToSlide,
  ]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [currentIndex]);

  const handlePlayPause = useCallback(async () => {
    if (!lesson || !currentSlide) return;

    if (status.playing) {
      player.pause();
      return;
    }

    if (currentClip) {
      setFinished(false);
      try {
        if (
          clipDurationSec > 0 &&
          status.currentTime >= clipDurationSec - 0.2
        ) {
          await player.seekTo(0);
          finishedClipRef.current = null;
          clipStartedAtRef.current = Date.now();
        }
        player.play();
      } catch (err) {
        setAudioError(friendlyError(err, "Narration couldn't start."));
      }
      return;
    }

    if (audioRequestRef.current) return;
    audioRequestRef.current = true;
    setAudioLoading(true);
    setAudioError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error("Please sign in again to create narration.");
      const updated = await api.lessons.generateAudio(lesson.id, token);
      if (!mountedRef.current) return;
      const clip = findAudioClip(updated.audio, currentSlide.id);
      if (clip && (Platform.OS !== "web" || presentVisibleRef.current)) {
        pendingPlayRef.current = true;
      }
      setLesson(updated);
      setAudioError(updated.audioError ?? null);
      if (!clip) {
        setAudioError(
          updated.audioError ??
            "Narration isn't available for this slide. You can still read it.",
        );
      }
    } catch (err) {
      if (mountedRef.current) {
        setAudioError(
          friendlyError(err, "Narration couldn't be created right now."),
        );
      }
    } finally {
      if (mountedRef.current) setAudioLoading(false);
      audioRequestRef.current = false;
    }
  }, [
    lesson,
    currentSlide,
    currentClip,
    status.playing,
    status.currentTime,
    clipDurationSec,
    player,
    getToken,
  ]);

  const handleOpenPresent = useCallback(() => {
    if (!currentSlide) return;

    presentVisibleRef.current = true;
    setPresentVisible(true);
    void enterFullscreen();
    if (!status.playing && !finished) void handlePlayPause();
  }, [
    currentSlide,
    enterFullscreen,
    finished,
    handlePlayPause,
    status.playing,
  ]);

  const handleClosePresent = useCallback(() => {
    const wasVisible = presentVisibleRef.current;
    presentVisibleRef.current = false;
    setPresentVisible(false);
    if (wasVisible) void exitFullscreen();
  }, [exitFullscreen]);

  const handleAnswerCheckpoint = useCallback(() => {
    handleClosePresent();
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 260);
  }, [handleClosePresent]);

  const handleReplayAudio = useCallback(() => {
    if (!currentClip) return;
    setFinished(false);
    finishedClipRef.current = null;
    clipStartedAtRef.current = Date.now();
    void player
      .seekTo(0)
      .then(() => player.play())
      .catch((err) => {
        setAudioError(friendlyError(err, "Narration couldn't replay."));
      });
  }, [currentClip, player]);

  const handlePrevious = useCallback(() => {
    if (currentIndex <= 0) return;
    player.pause();
    goToSlide(currentIndex - 1, false);
  }, [currentIndex, goToSlide, player]);

  const handleNext = useCallback(() => {
    if (!currentSlide || !canAdvance) return;
    player.pause();
    if (isLast) {
      setFinished(true);
      return;
    }
    goToSlide(currentIndex + 1, false);
  }, [currentSlide, canAdvance, isLast, currentIndex, goToSlide, player]);

  const handleCheckpointSolved = useCallback(() => {
    if (!currentSlide) return;
    setSolvedCheckpoints((prev) => {
      if (prev.has(currentSlide.id)) return prev;
      const next = new Set(prev);
      next.add(currentSlide.id);
      return next;
    });
  }, [currentSlide]);

  const handleReplayLesson = useCallback(() => {
    setSolvedCheckpoints(new Set());
    setExplainVisible(false);
    goToSlide(0, true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
      () => undefined,
    );
  }, [goToSlide]);

  const loadExplanation = useCallback(
    async (action: LessonExplainAction) => {
      if (!lesson || !currentSlide) return;
      const key = `${lesson.id}:${currentSlide.id}:${action}`;
      const requestId = explainRequestRef.current + 1;
      explainRequestRef.current = requestId;

      setExplainVisible(true);
      setExplainAction(action);
      setExplainError(null);

      const cached = explainCacheRef.current.get(key);
      if (cached) {
        setExplainText(cached);
        setExplainLoading(false);
        return;
      }

      setExplainText(null);
      setExplainLoading(true);
      try {
        const token = await getToken();
        if (!token) throw new Error("Please sign in again for an explanation.");
        const response = await api.lessons.explain(
          lesson.id,
          currentSlide.id,
          action,
          token,
        );
        if (explainRequestRef.current !== requestId) return;
        explainCacheRef.current.set(key, response.text);
        setExplainText(response.text);
      } catch (err) {
        if (explainRequestRef.current !== requestId) return;
        setExplainError(
          friendlyError(err, "We couldn't unpack this slide right now."),
        );
      } finally {
        if (explainRequestRef.current === requestId) {
          setExplainLoading(false);
        }
      }
    },
    [lesson, currentSlide, getToken],
  );

  const handleCloseExplain = useCallback(() => {
    explainRequestRef.current += 1;
    setExplainVisible(false);
    setExplainAction(null);
    setExplainText(null);
    setExplainError(null);
    setExplainLoading(false);
  }, []);

  const handleExplainRetry = useCallback(() => {
    if (explainAction) void loadExplanation(explainAction);
  }, [explainAction, loadExplanation]);

  let body: React.ReactNode;

  if (loading) {
    body = (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.stateTitle, { color: theme.text }]}>
          {building ? "Building your lesson..." : "Opening your lesson..."}
        </Text>
        <Text style={[styles.stateText, { color: theme.textMuted }]}>
          {building
            ? "Writing the slides and drawing the visuals. This can take a moment."
            : "Getting everything ready."}
        </Text>
      </View>
    );
  } else if (loadError) {
    body = (
      <View style={styles.center}>
        <View style={[styles.stateIcon, { backgroundColor: theme.surface }]}>
          <Ionicons name="cloud-offline-outline" size={30} color={theme.primary} />
        </View>
        <Text style={[styles.stateTitle, { color: theme.text }]}>
          {"Couldn't open this lesson"}
        </Text>
        <Text style={[styles.stateText, { color: theme.textMuted }]}>
          {loadError}
        </Text>
        <View style={styles.stateActions}>
          <TouchableOpacity
            style={[styles.stateButton, { backgroundColor: theme.primary }]}
            onPress={handleRetry}
            accessibilityRole="button"
          >
            <Text style={styles.stateButtonText}>Try again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.stateButton, { backgroundColor: theme.surface }]}
            onPress={handleClose}
            accessibilityRole="button"
          >
            <Text style={[styles.stateButtonText, { color: theme.text }]}>
              Go back
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  } else if (!lesson || !currentSlide) {
    body = (
      <View style={styles.center}>
        <Text style={[styles.stateTitle, { color: theme.text }]}>
          This lesson is empty
        </Text>
        <Text style={[styles.stateText, { color: theme.textMuted }]}>
          Try rebuilding it from the chapter screen.
        </Text>
      </View>
    );
  } else {
    body = (
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <LessonStage
            key={`stage-${currentSlide.id}`}
            slide={currentSlide}
            index={currentIndex}
            total={total}
          />

          <LessonProgress
            index={currentIndex}
            total={total}
            preset={motion}
          />

          <LessonNarrationCard
            key={`narration-${currentSlide.id}`}
            text={currentSlide.narration}
            clipReady={!!currentClip}
            playing={status.playing}
            progress={audioProgress}
            preset={motion}
          />

          <View
            style={[
              styles.playerBar,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <TouchableOpacity
              style={[styles.playButton, { backgroundColor: theme.primary }]}
              onPress={() => void handlePlayPause()}
              disabled={audioLoading}
              accessibilityRole="button"
              accessibilityLabel={status.playing ? "Pause narration" : "Play narration"}
              accessibilityState={{ disabled: audioLoading }}
            >
              {audioLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons
                  name={status.playing ? "pause" : "play"}
                  size={20}
                  color="#FFFFFF"
                  style={!status.playing ? styles.playIcon : undefined}
                />
              )}
            </TouchableOpacity>

            <View style={styles.playerInfo}>
              <View style={styles.playerTimes}>
                <Text style={[styles.playerTime, { color: theme.text }]}>
                  {audioLoading
                    ? "Creating narration..."
                    : currentClip
                      ? formatTimecode(displayedTimeMs)
                      : "Tap play to narrate"}
                </Text>
                <Text style={[styles.playerDuration, { color: theme.textMuted }]}>
                  {currentClip && !audioLoading
                    ? formatTimecode(clipDurationSec * 1000)
                    : "On demand"}
                </Text>
              </View>
              <View
                style={[styles.audioTrack, { backgroundColor: theme.surfaceAlt }]}
              >
                <View
                  style={[
                    styles.audioFill,
                    {
                      backgroundColor: theme.primary,
                      width: `${audioProgress * 100}%` as `${number}%`,
                    },
                  ]}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.replayButton,
                {
                  backgroundColor: theme.surfaceAlt,
                  opacity: currentClip ? 1 : 0.4,
                },
              ]}
              onPress={handleReplayAudio}
              disabled={!currentClip}
              accessibilityRole="button"
              accessibilityLabel="Replay narration"
              accessibilityState={{ disabled: !currentClip }}
            >
              <Ionicons name="refresh" size={17} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {audioError ? (
            <View
              style={[
                styles.audioError,
                {
                  backgroundColor: theme.warning + "10",
                  borderColor: theme.warning + "30",
                },
              ]}
            >
              <Ionicons name="volume-mute-outline" size={17} color={theme.warning} />
              <Text style={[styles.audioErrorText, { color: theme.warning }]}>
                {audioError}
              </Text>
            </View>
          ) : null}

          <View style={styles.explainSection}>
            <Text style={[styles.sectionEyebrow, { color: theme.textMuted }]}>
              Still curious?
            </Text>
            <View style={styles.explainRow}>
              {EXPLAIN_ACTIONS.map((entry) => (
                <TouchableOpacity
                  key={entry.id}
                  style={[
                    styles.explainChip,
                    { backgroundColor: theme.surface, borderColor: theme.border },
                  ]}
                  onPress={() => void loadExplanation(entry.id)}
                  accessibilityRole="button"
                >
                  <Ionicons name={entry.icon} size={15} color={theme.primary} />
                  <Text style={[styles.explainChipText, { color: theme.text }]}>
                    {entry.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {currentSlide.checkpoint ? (
            <LessonCheckpointCard
              key={`checkpoint-${currentSlide.id}`}
              checkpoint={currentSlide.checkpoint}
              preset={motion}
              initiallySolved={checkpointSolved}
              continueLabel={isLast ? "Finish lesson" : "Continue"}
              onSolved={handleCheckpointSolved}
              onContinue={handleNext}
            />
          ) : null}

          {finished ? (
            <LessonCompleteCard
              total={total}
              preset={motion}
              onReplay={handleReplayLesson}
              onDone={handleClose}
            />
          ) : null}

          <View style={styles.navRow}>
            <TouchableOpacity
              style={[
                styles.navButton,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  opacity: currentIndex > 0 ? 1 : 0.4,
                },
              ]}
              onPress={handlePrevious}
              disabled={currentIndex <= 0}
              accessibilityRole="button"
              accessibilityState={{ disabled: currentIndex <= 0 }}
            >
              <Ionicons name="chevron-back" size={17} color={theme.textSecondary} />
              <Text style={[styles.navButtonText, { color: theme.textSecondary }]}>
                Previous
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.navButtonPrimary,
                {
                  backgroundColor: canAdvance ? theme.primary : theme.surfaceAlt,
                  opacity: canAdvance ? 1 : 0.65,
                },
              ]}
              onPress={handleNext}
              disabled={!canAdvance}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canAdvance }}
            >
              <Text
                style={[
                  styles.navButtonPrimaryText,
                  { color: canAdvance ? "#FFFFFF" : theme.textMuted },
                ]}
              >
                {isLast ? "Finish lesson" : "Next slide"}
              </Text>
              <Ionicons
                name={isLast ? "checkmark" : "arrow-forward"}
                size={17}
                color={canAdvance ? "#FFFFFF" : theme.textMuted}
              />
            </TouchableOpacity>
          </View>

          {!canAdvance ? (
            <Text style={[styles.navHint, { color: theme.textMuted }]}>
              Answer the checkpoint to keep going.
            </Text>
          ) : null}

          <View style={{ height: 24 }} />
        </View>
      </ScrollView>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.bg }]}
        edges={["top", "bottom"]}
      >
        <Stack.Screen options={{ headerShown: false }} />
        <LessonHeader
          title={lesson?.title ?? "Lesson"}
          onBack={handleClose}
          onPresent={handleOpenPresent}
        />
        {body}
        {lesson && currentSlide ? (
          <LessonTheater
            visible={presentVisible}
            lessonTitle={lesson.title}
            slide={currentSlide}
            index={currentIndex}
            total={total}
            motion={motion}
            playing={status.playing}
            audioLoading={audioLoading}
            audioError={audioError}
            clipReady={!!currentClip}
            clipDurationSec={clipDurationSec}
            audioProgress={audioProgress}
            displayedTimeMs={displayedTimeMs}
            finished={finished}
            canAdvance={canAdvance}
            isLast={isLast}
            onClose={handleClosePresent}
            onPlayPause={() => void handlePlayPause()}
            onReplayAudio={handleReplayAudio}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onAnswerCheckpoint={handleAnswerCheckpoint}
            onReplayLesson={handleReplayLesson}
          />
        ) : null}
        <LessonExplainSheet
          visible={explainVisible}
          action={explainAction}
          text={explainText}
          loading={explainLoading}
          error={explainError}
          onAction={(action) => void loadExplanation(action)}
          onRetry={handleExplainRetry}
          onClose={handleCloseExplain}
        />
      </SafeAreaView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
  },
  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  headerEyebrow: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 10,
  },
  stateIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  stateText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "500",
    textAlign: "center",
    maxWidth: 340,
  },
  stateActions: {
    flexDirection: "row",
    gap: 9,
    marginTop: 8,
  },
  stateButton: {
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  stateButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 2,
  },
  content: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
  },
  playerBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderRadius: 18,
    borderWidth: 1,
    padding: 11,
    marginTop: 10,
  },
  playButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  playIcon: {
    marginLeft: 2,
  },
  playerInfo: {
    flex: 1,
    gap: 7,
  },
  playerTimes: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  playerTime: {
    fontSize: 11,
    fontWeight: "700",
  },
  playerDuration: {
    fontSize: 10,
    fontWeight: "600",
  },
  audioTrack: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  audioFill: {
    height: "100%",
    borderRadius: 2,
  },
  replayButton: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  audioError: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderWidth: 1,
    borderRadius: 13,
    padding: 11,
    marginTop: 9,
  },
  audioErrorText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    fontWeight: "600",
  },
  explainSection: {
    marginTop: 16,
  },
  sectionEyebrow: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.9,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  explainRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  explainChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  explainChipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 18,
  },
  navButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  navButtonText: {
    fontSize: 12,
    fontWeight: "700",
  },
  navButtonPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  navButtonPrimaryText: {
    fontSize: 12,
    fontWeight: "800",
  },
  navHint: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 9,
  },
});
