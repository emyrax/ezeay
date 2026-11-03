import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { safeFont } from "../constants/themes";
import { useAuth } from "../contexts/AuthContext";
import { useLessonMotion } from "../hooks/useLessonMotion";
import { useThemeColors } from "../hooks/useTheme";
import { useVisualLessonSession } from "../hooks/useVisualLessonSession";
import { eventBus } from "../lib/eventBus";
import { getVisualLessonMiniState } from "../lib/lesson/visualLessonStatus";
import { useThreadLearningStore } from "../store/threadLearningStore";
import type { ThreadPost } from "../types/thread";
import { LessonTheaterView } from "./lesson/LessonTheater";
import LessonCheckpointCard from "./lesson/LessonCheckpointCard";
import MinimizedLessonTab from "./MinimizedLessonTab";

interface VisualLessonModalProps {
  post: ThreadPost | null;
  minimized: boolean;
  minimizedBottom: number;
  minimizedRight: number;
  onMinimize: () => void;
  onRestore: () => void;
  onClose: () => void;
  onStartQuiz: () => void;
  onNextLesson: () => void;
}

const BUILD_STATUSES = [
  "Reading the chapter",
  "Writing the lesson script",
  "Sketching the visuals",
  "Preparing narration",
];

export default function VisualLessonModal({
  post,
  minimized,
  minimizedBottom,
  minimizedRight,
  onMinimize,
  onRestore,
  onClose,
  onStartQuiz,
  onNextLesson,
}: VisualLessonModalProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const motion = useLessonMotion();
  const { getToken } = useAuth();
  const markLessonCompleted = useThreadLearningStore((state) => state.markLessonCompleted);
  const generateQuiz = useThreadLearningStore((state) => state.generateQuiz);
  const [statusIndex, setStatusIndex] = useState(0);
  const [checkpointOpen, setCheckpointOpen] = useState(false);
  const wasMinimizedBusyRef = useRef(false);
  const readyNotifiedRef = useRef(false);
  const lastPostIdRef = useRef<string | null>(null);

  const session = useVisualLessonSession({
    courseId: post?.courseId ?? "",
    chapterIndex: post?.chapterIndex ?? 0,
    subtopicIndex: post?.subtopicIndex ?? 0,
    enabled: !!post,
  });

  const busy = session.loading || session.building;
  const buildStatus = BUILD_STATUSES[statusIndex];

  useEffect(() => {
    if (!busy) return;
    setStatusIndex(0);
    const timer = setInterval(() => {
      setStatusIndex((index) => (index + 1) % BUILD_STATUSES.length);
    }, 1800);
    return () => clearInterval(timer);
  }, [busy]);

  useEffect(() => {
    const postId = post?.id ?? null;
    if (lastPostIdRef.current === postId) return;
    lastPostIdRef.current = postId;
    wasMinimizedBusyRef.current = false;
    readyNotifiedRef.current = false;
  }, [post?.id]);

  useEffect(() => {
    if (!minimized) return;
    if (busy) {
      wasMinimizedBusyRef.current = true;
      return;
    }
    if (session.loadError) {
      wasMinimizedBusyRef.current = false;
      return;
    }
    if (
      wasMinimizedBusyRef.current &&
      session.currentSlide &&
      post &&
      !readyNotifiedRef.current
    ) {
      readyNotifiedRef.current = true;
      eventBus.emit("toast:success", {
        title: "Visual lesson ready",
        message: post.subtopicTitle,
      });
    }
  }, [minimized, busy, session.loadError, session.currentSlide, post]);

  useEffect(() => {
    if (!session.finished || !post) return;
    markLessonCompleted(post.id);
    void generateQuiz(post, getToken);
  }, [session.finished, post, markLessonCompleted, generateQuiz, getToken]);

  const handleMinimize = () => {
    setCheckpointOpen(false);
    session.pause();
    onMinimize();
  };

  const handleClose = () => {
    setCheckpointOpen(false);
    session.pause();
    onClose();
  };

  const handleStartQuiz = () => {
    setCheckpointOpen(false);
    session.pause();
    onStartQuiz();
  };

  const handleNextLesson = () => {
    setCheckpointOpen(false);
    session.pause();
    onNextLesson();
  };

  const handleReplayLesson = () => {
    setCheckpointOpen(false);
    session.replayLesson();
  };

  if (!post) return null;

  if (minimized) {
    return (
      <MinimizedLessonTab
        post={post}
        state={getVisualLessonMiniState({
          loading: session.loading,
          building: session.building,
          loadError: session.loadError,
          hasSlide: !!session.currentSlide,
          finished: session.finished,
          buildStatus,
        })}
        bottom={minimizedBottom}
        right={minimizedRight}
        onRestore={onRestore}
        onClose={handleClose}
      />
    );
  }

  if (!session.currentSlide) {
    return (
      <Modal
        visible
        animationType="fade"
        presentationStyle="fullScreen"
        statusBarTranslucent
        onRequestClose={handleMinimize}
      >
        <View style={[styles.shell, { backgroundColor: colors.bg }]}>
          <View
            style={[
              styles.shellHeader,
              {
                paddingTop: insets.top + 10,
                backgroundColor: colors.surface,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <View style={styles.headerCopy}>
              <Text style={[styles.eyebrow, { color: colors.primary }]}>VISUAL LESSON</Text>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                {post.subtopicTitle}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
                Module {post.chapterIndex + 1} · Lesson {post.partNumber}
              </Text>
            </View>
            <Pressable
              onPress={handleMinimize}
              style={[styles.headerBtn, { backgroundColor: colors.surfaceAlt }]}
              accessibilityRole="button"
              accessibilityLabel="Minimize visual lesson"
            >
              <Ionicons name="chevron-down" size={22} color={colors.text} />
            </Pressable>
            <Pressable
              onPress={handleClose}
              style={[styles.headerBtn, { backgroundColor: colors.surfaceAlt }]}
              accessibilityRole="button"
              accessibilityLabel="Close visual lesson"
            >
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          <View style={[styles.shellBody, { paddingBottom: insets.bottom + 24 }]}>
            {busy ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.stateTitle, { color: colors.text }]}>
                  {session.building ? "Building your lesson..." : "Opening your lesson..."}
                </Text>
                <View
                  style={[
                    styles.statusTag,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <View style={[styles.statusDot, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.statusText, { color: colors.textSecondary }]}>
                    {buildStatus}
                  </Text>
                </View>
              </View>
            ) : session.loadError ? (
              <View style={styles.center}>
                <Ionicons name="cloud-offline-outline" size={34} color={colors.textMuted} />
                <Text style={[styles.stateTitle, { color: colors.text }]}>
                  Lesson unavailable
                </Text>
                <Text style={[styles.stateText, { color: colors.textSecondary }]}>
                  {session.loadError}
                </Text>
                <View style={styles.stateActions}>
                  <Pressable
                    onPress={session.retry}
                    style={[styles.stateBtn, { backgroundColor: colors.primary }]}
                    accessibilityRole="button"
                  >
                    <Text style={styles.primaryText}>Try again</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleClose}
                    style={[styles.secondaryBtn, { borderColor: colors.border }]}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.secondaryText, { color: colors.text }]}>
                      Close
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.center}>
                <Text style={[styles.stateTitle, { color: colors.text }]}>
                  This lesson is empty
                </Text>
                <Text style={[styles.stateText, { color: colors.textSecondary }]}>
                  Try rebuilding it from the chapter screen.
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={handleMinimize}
    >
      <View style={styles.theaterRoot}>
        <LessonTheaterView
          visible
          lessonTitle={post.subtopicTitle}
          slide={session.currentSlide}
          index={session.currentIndex}
          total={session.total}
          motion={motion}
          playing={session.playing}
          audioLoading={session.audioLoading}
          audioError={session.audioError}
          clipReady={!!session.currentClip}
          clipDurationSec={session.clipDurationSec}
          audioProgress={session.audioProgress}
          displayedTimeMs={session.displayedTimeMs}
          finished={session.finished}
          canAdvance={session.canAdvance}
          isLast={session.isLast}
          closeLabel="Close lesson"
          onClose={handleClose}
          onMinimize={handleMinimize}
          onPlayPause={() => void session.playPause()}
          onReplayAudio={session.replayAudio}
          onPrevious={session.previous}
          onNext={session.next}
          onAnswerCheckpoint={() => setCheckpointOpen(true)}
          onReplayLesson={handleReplayLesson}
          onStartQuiz={handleStartQuiz}
          onNextLesson={handleNextLesson}
        />

        {checkpointOpen && session.currentSlide.checkpoint ? (
          <View style={[styles.checkpointOverlay, { paddingBottom: insets.bottom + 16 }]}>
            <Pressable
              style={styles.checkpointBackdrop}
              onPress={() => setCheckpointOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Close checkpoint"
            />
            <View style={styles.checkpointCardWrap}>
              <LessonCheckpointCard
                checkpoint={session.currentSlide.checkpoint}
                preset={motion}
                initiallySolved={session.checkpointSolved}
                continueLabel={session.isLast ? "Finish lesson" : "Continue"}
                onSolved={session.markCheckpointSolved}
                onContinue={() => {
                  setCheckpointOpen(false);
                  session.next();
                }}
              />
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  shellHeader: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 10,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontFamily: safeFont,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  title: {
    fontFamily: safeFont,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 2,
  },
  subtitle: {
    fontFamily: safeFont,
    fontSize: 12,
    marginTop: 2,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  shellBody: {
    flex: 1,
    paddingHorizontal: 20,
  },
  center: {
    flex: 1,
    minHeight: 360,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 24,
  },
  stateTitle: {
    fontFamily: safeFont,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  stateText: {
    fontFamily: safeFont,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  statusTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginTop: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontFamily: safeFont,
    fontSize: 12,
  },
  stateActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  stateBtn: {
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  primaryText: {
    fontFamily: safeFont,
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  secondaryBtn: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  secondaryText: {
    fontFamily: safeFont,
    fontSize: 12,
    fontWeight: "700",
  },
  theaterRoot: {
    flex: 1,
    backgroundColor: "#000000",
  },
  checkpointOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    zIndex: 20,
  },
  checkpointBackdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "#000000B8",
  },
  checkpointCardWrap: {
    width: "100%",
    maxWidth: 640,
  },
});
