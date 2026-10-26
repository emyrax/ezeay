import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { lessonTheaterTheme } from "../../constants/lessonTheater";
import type { LessonMotionPreset } from "../../lib/lesson/motion";
import {
  estimateNarrationDurationMs,
  formatTimecode,
  narrationScrollTarget,
} from "../../lib/lesson/player";
import type { LessonSlide } from "../../types/lesson";
import LessonStage from "./LessonStage";
import { LessonThemeProvider } from "./LessonThemeContext";
import MotionBackdrop from "./MotionBackdrop";
import SyncedNarration, {
  type NarrationWordLayout,
} from "./SyncedNarration";

interface Props {
  visible: boolean;
  lessonTitle: string;
  slide: LessonSlide;
  index: number;
  total: number;
  motion: LessonMotionPreset;
  playing: boolean;
  audioLoading: boolean;
  audioError: string | null;
  clipReady: boolean;
  clipDurationSec: number;
  audioProgress: number;
  displayedTimeMs: number;
  finished: boolean;
  canAdvance: boolean;
  isLast: boolean;
  onClose: () => void;
  onPlayPause: () => void;
  onReplayAudio: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onAnswerCheckpoint: () => void;
  onReplayLesson: () => void;
}

type PresentationMode = "visual" | "text";

function IconButton({
  icon,
  label,
  onPress,
  selected,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.iconButton,
        selected && styles.iconButtonSelected,
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected }}
    >
      <Ionicons name={icon} size={18} color="#FFFFFF" />
    </TouchableOpacity>
  );
}

export default function LessonTheater({
  visible,
  lessonTitle,
  slide,
  index,
  total,
  motion,
  playing,
  audioLoading,
  audioError,
  clipReady,
  clipDurationSec,
  audioProgress,
  displayedTimeMs,
  finished,
  canAdvance,
  isLast,
  onClose,
  onPlayPause,
  onReplayAudio,
  onPrevious,
  onNext,
  onAnswerCheckpoint,
  onReplayLesson,
}: Props) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const narrationTopRef = useRef(0);
  const scrollOffsetRef = useRef(0);
  const scrollViewportRef = useRef(0);
  const scrollContentRef = useRef(0);
  const lastAutoScrollRef = useRef(-1);
  const followPausedUntilRef = useRef(0);
  const [mode, setMode] = useState<PresentationMode>("visual");
  const presentationKey = `${slide.id}:${mode}`;
  const presentationKeyRef = useRef(presentationKey);
  presentationKeyRef.current = presentationKey;
  const lastWordLayoutRef = useRef<{
    key: string;
    layout: NarrationWordLayout;
  } | null>(null);
  const [fallbackProgress, setFallbackProgress] = useState(0);
  const fallbackDuration = useMemo(
    () => estimateNarrationDurationMs(slide.narration),
    [slide.narration],
  );
  const progress = clipReady ? audioProgress : fallbackProgress;
  const durationMs =
    clipReady && clipDurationSec > 0
      ? clipDurationSec * 1000
      : fallbackDuration;
  const currentTimeMs = clipReady
    ? displayedTimeMs
    : Math.round(fallbackProgress * fallbackDuration);
  const slideProgress = total > 0 ? (index + 1) / total : 0;
  const fallbackRunning =
    !clipReady && !audioLoading && fallbackDuration > 0 && fallbackProgress < 1;
  const followNarration = playing || fallbackRunning;
  const followRef = useRef(followNarration);
  followRef.current = followNarration;

  const applyAutoScroll = useCallback((layout: NarrationWordLayout) => {
    if (!followRef.current) return;
    if (Date.now() < followPausedUntilRef.current) return;

    const target = narrationScrollTarget({
      wordTop: narrationTopRef.current + layout.y,
      wordHeight: layout.height,
      scrollOffset: scrollOffsetRef.current,
      viewportHeight: scrollViewportRef.current,
      contentHeight: scrollContentRef.current,
    });
    if (target === null) return;
    if (Math.abs(target - lastAutoScrollRef.current) < 6) return;

    lastAutoScrollRef.current = target;
    scrollRef.current?.scrollTo({ y: target, animated: true });
  }, []);

  const handleNarrationWordLayout = useCallback(
    (layout: NarrationWordLayout) => {
      lastWordLayoutRef.current = {
        key: presentationKeyRef.current,
        layout,
      };
      applyAutoScroll(layout);
    },
    [applyAutoScroll],
  );

  const reapplyLastWordLayout = useCallback(() => {
    const entry = lastWordLayoutRef.current;
    if (!entry || entry.key !== presentationKeyRef.current) return;
    applyAutoScroll(entry.layout);
  }, [applyAutoScroll]);

  const handleScrollBeginDrag = useCallback(() => {
    followPausedUntilRef.current = Date.now() + 2800;
    lastAutoScrollRef.current = -1;
  }, []);

  useEffect(() => {
    if (visible) return;
    scrollViewportRef.current = 0;
    scrollContentRef.current = 0;
    scrollOffsetRef.current = 0;
    lastAutoScrollRef.current = -1;
    followPausedUntilRef.current = 0;
    lastWordLayoutRef.current = null;
    narrationTopRef.current = 0;
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    scrollOffsetRef.current = 0;
    lastAutoScrollRef.current = -1;
    followPausedUntilRef.current = 0;
  }, [slide.id, mode]);

  useEffect(() => {
    setFallbackProgress(0);
    if (!visible || clipReady || audioLoading || fallbackDuration <= 0) return;

    const startedAt = Date.now();
    const timer = setInterval(() => {
      const next = Math.min(
        1,
        (Date.now() - startedAt) / Math.max(1, fallbackDuration),
      );
      setFallbackProgress(next);
      if (next >= 1) clearInterval(timer);
    }, 80);

    return () => clearInterval(timer);
  }, [audioLoading, clipReady, fallbackDuration, slide.id, visible]);

  useEffect(() => {
    if (!visible || Platform.OS !== "web" || typeof document === "undefined") {
      return;
    }

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.fullscreenElement) onClose();
    };

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose, visible]);

  const toggleMode = useCallback(() => {
    setMode((current) => (current === "visual" ? "text" : "visual"));
  }, []);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
      supportedOrientations={["portrait", "landscape"]}
    >
      <StatusBar hidden />
      <LessonThemeProvider theme={lessonTheaterTheme}>
        <View style={styles.root}>
          <MotionBackdrop
            preset={motion}
            color="#FFFFFF"
            accent="#A1A1AA"
          />
          <LinearGradient
            pointerEvents="none"
            colors={[
              "rgba(0, 0, 0, 0.72)",
              "transparent",
              "transparent",
              "rgba(0, 0, 0, 0.96)",
            ]}
            locations={[0, 0.2, 0.68, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View pointerEvents="none" style={styles.grid}>
            {Array.from({ length: 3 }, (_, line) => (
              <View
                key={`v-${line}`}
                style={[styles.gridLine, { left: `${(line + 1) * 25}%` }]}
              />
            ))}
            {Array.from({ length: 2 }, (_, line) => (
              <View
                key={`h-${line}`}
                style={[
                  styles.gridLineHorizontal,
                  { top: `${(line + 1) * 33.33}%` },
                ]}
              />
            ))}
          </View>

          <View
            style={[
              styles.topBar,
              { paddingTop: Math.max(insets.top, 12) + 4 },
            ]}
          >
            <View style={styles.topCopy}>
              <Text style={styles.slideLabel}>
                Slide {String(index + 1).padStart(2, "0")} /{" "}
                {String(total).padStart(2, "0")}
              </Text>
              <Text style={styles.lessonTitle} numberOfLines={1}>
                {lessonTitle}
              </Text>
            </View>
            <View style={styles.topActions}>
              <IconButton
                icon={mode === "visual" ? "text-outline" : "albums-outline"}
                label={
                  mode === "visual"
                    ? "Switch to narration only"
                    : "Switch to visual and narration"
                }
                onPress={toggleMode}
                selected={mode === "text"}
              />
              <IconButton
                icon="refresh"
                label="Replay narration"
                onPress={onReplayAudio}
                disabled={!clipReady}
              />
              <IconButton icon="close" label="Exit full screen" onPress={onClose} />
            </View>
          </View>

          <View style={styles.slideTrack}>
            <View
              style={[
                styles.slideFill,
                { width: `${slideProgress * 100}%` as `${number}%` },
              ]}
            />
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={[
              styles.body,
              mode === "text" && styles.bodyText,
            ]}
            showsVerticalScrollIndicator={false}
            onLayout={(event) => {
              scrollViewportRef.current = event.nativeEvent.layout.height;
              reapplyLastWordLayout();
            }}
            onContentSizeChange={(_, height) => {
              scrollContentRef.current = height;
              reapplyLastWordLayout();
            }}
            onScroll={(event) => {
              scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
            }}
            onScrollBeginDrag={handleScrollBeginDrag}
            scrollEventThrottle={16}
          >
            {mode === "visual" ? (
              <View style={styles.stageWrap}>
                <LessonStage
                  key={`theater-stage-${slide.id}`}
                  slide={slide}
                  index={index}
                  total={total}
                  presentation
                />
              </View>
            ) : (
              <View style={styles.textEyebrowRow}>
                <View style={styles.eyebrowRule} />
                <Text style={styles.textEyebrow}>Narration</Text>
                <View style={styles.eyebrowRule} />
              </View>
            )}

            <View
              style={styles.narrationWrap}
              onLayout={(event) => {
                narrationTopRef.current = event.nativeEvent.layout.y;
                reapplyLastWordLayout();
              }}
            >
              <SyncedNarration
                key={`theater-narration-${slide.id}`}
                text={slide.narration}
                progress={progress}
                preset={motion}
                variant={mode}
                follow={followNarration}
                onActiveWordLayout={handleNarrationWordLayout}
              />
            </View>

            {audioLoading ? (
              <View style={styles.statusRow}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.statusText}>Preparing narration...</Text>
              </View>
            ) : null}

            {audioError ? (
              <View style={styles.statusRow}>
                <Ionicons name="volume-mute-outline" size={16} color="#FFFFFF" />
                <Text style={styles.statusText}>{audioError}</Text>
              </View>
            ) : null}

            {canAdvance ? null : (
              <TouchableOpacity
                style={styles.checkpointButton}
                onPress={onAnswerCheckpoint}
                accessibilityRole="button"
              >
                <Ionicons name="help-circle-outline" size={18} color="#FFFFFF" />
                <Text style={styles.checkpointText}>
                  Answer the checkpoint to continue
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          <View
            style={[
              styles.controls,
              { paddingBottom: Math.max(insets.bottom, 12) + 4 },
            ]}
          >
            <View style={styles.timelineRow}>
              <Text style={styles.timeText}>{formatTimecode(currentTimeMs)}</Text>
              <View style={styles.timelineTrack}>
                <View
                  style={[
                    styles.timelineFill,
                    {
                      width: `${Math.min(1, Math.max(0, progress)) * 100}%` as `${number}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.timeText}>{formatTimecode(durationMs)}</Text>
            </View>

            <View style={styles.controlRow}>
              <IconButton
                icon="chevron-back"
                label="Previous slide"
                onPress={onPrevious}
                disabled={index <= 0}
              />
              <TouchableOpacity
                style={styles.playButton}
                onPress={onPlayPause}
                disabled={audioLoading}
                accessibilityRole="button"
                accessibilityLabel={playing ? "Pause narration" : "Play narration"}
                accessibilityState={{ disabled: audioLoading }}
              >
                {audioLoading ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <Ionicons
                    name={playing ? "pause" : "play"}
                    size={24}
                    color="#000000"
                    style={!playing ? styles.playIcon : undefined}
                  />
                )}
              </TouchableOpacity>
              <IconButton
                icon="chevron-forward"
                label={isLast ? "Finish lesson" : "Next slide"}
                onPress={onNext}
                disabled={!canAdvance}
              />
            </View>
          </View>

          {finished ? (
            <View style={styles.completeOverlay}>
              <View style={styles.completeIcon}>
                <Ionicons name="checkmark" size={30} color="#000000" />
              </View>
              <Text style={styles.completeTitle}>Lesson complete</Text>
              <Text style={styles.completeText}>
                You made it through every slide.
              </Text>
              <View style={styles.completeActions}>
                <TouchableOpacity
                  style={styles.completePrimary}
                  onPress={onReplayLesson}
                  accessibilityRole="button"
                >
                  <Ionicons name="refresh" size={17} color="#000000" />
                  <Text style={styles.completePrimaryText}>Replay lesson</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.completeSecondary}
                  onPress={onClose}
                  accessibilityRole="button"
                >
                  <Text style={styles.completeSecondaryText}>Exit full screen</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>
      </LessonThemeProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000000",
  },
  grid: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    opacity: 0.18,
  },
  gridLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
  },
  gridLineHorizontal: {
    position: "absolute",
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  topCopy: {
    flex: 1,
    minWidth: 0,
  },
  slideLabel: {
    color: "rgba(255, 255, 255, 0.52)",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  lessonTitle: {
    color: "rgba(255, 255, 255, 0.84)",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  iconButtonSelected: {
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderColor: "rgba(255, 255, 255, 0.32)",
  },
  disabled: {
    opacity: 0.32,
  },
  slideTrack: {
    height: 2,
    marginHorizontal: 20,
    borderRadius: 1,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    overflow: "hidden",
  },
  slideFill: {
    height: "100%",
    borderRadius: 1,
    backgroundColor: "#FFFFFF",
  },
  scroll: {
    flex: 1,
  },
  body: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 30,
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 32,
  },
  bodyText: {
    gap: 24,
    paddingTop: 42,
  },
  stageWrap: {
    width: "100%",
    maxWidth: 860,
  },
  narrationWrap: {
    width: "100%",
    alignItems: "center",
  },
  textEyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
    maxWidth: 1040,
  },
  eyebrowRule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
  },
  textEyebrow: {
    color: "rgba(255, 255, 255, 0.56)",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2.2,
    textTransform: "uppercase",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    maxWidth: 720,
    paddingHorizontal: 12,
  },
  statusText: {
    flex: 1,
    color: "rgba(255, 255, 255, 0.58)",
    fontSize: 11,
    lineHeight: 17,
    fontWeight: "600",
  },
  checkpointButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.28)",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 11,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  checkpointText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  controls: {
    gap: 11,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255, 255, 255, 0.12)",
    backgroundColor: "rgba(0, 0, 0, 0.72)",
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  timeText: {
    color: "rgba(255, 255, 255, 0.52)",
    fontSize: 10,
    fontWeight: "700",
    minWidth: 34,
    textAlign: "center",
  },
  timelineTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    overflow: "hidden",
  },
  timelineFill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
  },
  controlRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  playIcon: {
    marginLeft: 3,
  },
  completeOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 28,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
  },
  completeIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    marginBottom: 6,
  },
  completeTitle: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  completeText: {
    color: "rgba(255, 255, 255, 0.58)",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "500",
    textAlign: "center",
  },
  completeActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 10,
  },
  completePrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },
  completePrimaryText: {
    color: "#000000",
    fontSize: 12,
    fontWeight: "800",
  },
  completeSecondary: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.24)",
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  completeSecondaryText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
});
