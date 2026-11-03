import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useAuth } from "../contexts/AuthContext";
import { ApiError, api, friendlyError } from "../lib/api";
import {
  clampSlideIndex,
  findAudioClip,
  narrationEndAction,
} from "../lib/lesson/player";
import type { LessonScript } from "../types/lesson";

interface Options {
  courseId: string;
  chapterIndex: number;
  subtopicIndex: number;
  enabled: boolean;
}

export function useVisualLessonSession({
  courseId,
  chapterIndex,
  subtopicIndex,
  enabled,
}: Options) {
  const { getToken } = useAuth();
  const player = useAudioPlayer();
  const status = useAudioPlayerStatus(player);
  const mountedRef = useRef(true);
  const pendingPlayRef = useRef(false);
  const clipStartedAtRef = useRef(0);
  const activeClipRef = useRef<string | null>(null);
  const finishedClipRef = useRef<string | null>(null);
  const audioRequestRef = useRef(false);

  const [lesson, setLesson] = useState<LessonScript | null>(null);
  const [loading, setLoading] = useState(false);
  const [building, setBuilding] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [solvedCheckpoints, setSolvedCheckpoints] = useState<Set<string>>(() => new Set());
  const [finished, setFinished] = useState(false);

  const slides = lesson?.slides ?? [];
  const total = slides.length;
  const currentSlide = slides[currentIndex] ?? null;
  const currentClip =
    lesson && currentSlide ? findAudioClip(lesson.audio, currentSlide.id) : null;
  const isLast = total > 0 && currentIndex >= total - 1;
  const checkpointSolved = currentSlide ? solvedCheckpoints.has(currentSlide.id) : true;
  const canAdvance = !currentSlide?.checkpoint || checkpointSolved;
  const clipDurationSec =
    status.duration > 0 ? status.duration : (currentClip?.durationMs ?? 0) / 1000;
  const audioProgress =
    currentClip && clipDurationSec > 0 && Number.isFinite(status.currentTime)
      ? Math.min(1, Math.max(0, status.currentTime / clipDurationSec))
      : 0;
  const displayedTimeMs = currentClip ? status.currentTime * 1000 : 0;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      allowsRecording: false,
      interruptionMode: "duckOthers",
    }).catch((err) => {
      console.warn("[VisualLesson] audio mode failed:", err);
    });
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    let active = true;
    setLesson(null);
    setLoading(true);
    setBuilding(false);
    setLoadError(null);
    setCurrentIndex(0);
    setFinished(false);
    setAudioError(null);
    setSolvedCheckpoints(new Set());

    const load = async () => {
      const token = await getToken();
      if (!token) throw new Error("Please sign in again to open this lesson.");
      let next: LessonScript;
      try {
        next = await api.lessons.get(courseId, chapterIndex, subtopicIndex, token);
      } catch (err) {
        const missing =
          err instanceof ApiError &&
          (err.code === "lesson_missing" || err.code === "lesson_stale");
        if (!missing) throw err;
        if (active) setBuilding(true);
        next = await api.lessons.generate(courseId, chapterIndex, subtopicIndex, token);
      }
      if (!active) return;
      setLesson(next);
      setAudioError(next.audioError ?? null);
    };

    load()
      .catch((err) => {
        if (!active) return;
        setLoadError(friendlyError(err, "We couldn't open this lesson. Please try again."));
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
        setBuilding(false);
      });

    return () => {
      active = false;
    };
  }, [enabled, courseId, chapterIndex, subtopicIndex, reloadKey, getToken]);

  useEffect(() => {
    if (!enabled) player.pause();
  }, [enabled, player]);

  const goToSlide = useCallback(
    (index: number, autoPlay: boolean) => {
      if (total <= 0) return;
      const next = clampSlideIndex(index, total);
      if (autoPlay) pendingPlayRef.current = true;
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

    const shouldPlay = pendingPlayRef.current && Platform.OS !== "web";
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
    if (endAction === "checkpoint") return;
    if (endAction === "advance") {
      goToSlide(currentIndex + 1, true);
      return;
    }
    setFinished(true);
  }, [status.didJustFinish, currentSlide, currentClip, isLast, currentIndex, goToSlide]);

  const playPause = useCallback(async () => {
    if (!lesson || !currentSlide) return;
    if (status.playing) {
      player.pause();
      return;
    }
    if (currentClip) {
      setFinished(false);
      try {
        if (clipDurationSec > 0 && status.currentTime >= clipDurationSec - 0.2) {
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
      if (clip && Platform.OS !== "web") pendingPlayRef.current = true;
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
        setAudioError(friendlyError(err, "Narration couldn't be created right now."));
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

  const replayAudio = useCallback(() => {
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

  const previous = useCallback(() => {
    if (currentIndex <= 0) return;
    player.pause();
    goToSlide(currentIndex - 1, false);
  }, [currentIndex, goToSlide, player]);

  const next = useCallback(() => {
    if (!currentSlide || !canAdvance) return;
    player.pause();
    if (isLast) {
      setFinished(true);
      return;
    }
    goToSlide(currentIndex + 1, false);
  }, [currentSlide, canAdvance, isLast, currentIndex, goToSlide, player]);

  const markCheckpointSolved = useCallback(() => {
    if (!currentSlide) return;
    setSolvedCheckpoints((prev) => {
      if (prev.has(currentSlide.id)) return prev;
      const following = new Set(prev);
      following.add(currentSlide.id);
      return following;
    });
  }, [currentSlide]);

  const replayLesson = useCallback(() => {
    setSolvedCheckpoints(new Set());
    goToSlide(0, true);
  }, [goToSlide]);

  const retry = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  return useMemo(
    () => ({
      lesson,
      loading,
      building,
      loadError,
      reloadKey,
      retry,
      slides,
      total,
      currentSlide,
      currentIndex,
      currentClip,
      isLast,
      canAdvance,
      checkpointSolved,
      markCheckpointSolved,
      finished,
      setFinished,
      audioLoading,
      audioError,
      audioProgress,
      displayedTimeMs,
      clipDurationSec,
      playing: status.playing,
      playPause,
      replayAudio,
      previous,
      next,
      replayLesson,
      goToSlide,
      pause: () => player.pause(),
    }),
    [
      lesson,
      loading,
      building,
      loadError,
      reloadKey,
      retry,
      slides,
      total,
      currentSlide,
      currentIndex,
      currentClip,
      isLast,
      canAdvance,
      checkpointSolved,
      markCheckpointSolved,
      finished,
      audioLoading,
      audioError,
      audioProgress,
      displayedTimeMs,
      clipDurationSec,
      status.playing,
      playPause,
      replayAudio,
      previous,
      next,
      replayLesson,
      goToSlide,
      player,
    ],
  );
}
