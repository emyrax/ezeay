import { LinearGradient } from "expo-linear-gradient";
import React, { useRef } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from "react-native";
import { useThemeColors } from "../../hooks/useTheme";
import type { AudioClip } from "../../types/note";
import GlassSheet from "./GlassSheet";
import ThemeIcon from "./ThemeIcon";

interface VoicePlayerSheetProps {
  clip: AudioClip | null;
  currentTime: number;
  totalDuration: number;
  isPlaying: boolean;
  transcribing: boolean;
  onClose: () => void;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onDelete: () => void;
  onTranscribe: () => void;
  onAddTranscript: () => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const MINI_BARS = 28;

function MiniWaveform({
  clip,
  progress,
  playing,
}: {
  clip: AudioClip;
  progress: number;
  playing: boolean;
}) {
  const theme = useThemeColors();
  const raw = clip.waveform && clip.waveform.length ? clip.waveform : Array(40).fill(0.2);
  const playedIdx = Math.floor(progress * MINI_BARS);
  return (
    <View style={styles.miniWave}>
      {Array.from({ length: MINI_BARS }, (_, i) => {
        const idx = Math.floor((i / MINI_BARS) * raw.length);
        const amp = Math.max(0.08, Math.min(1, raw[idx]));
        const isPlayed = i < playedIdx;
        return (
          <View
            key={i}
            style={{
              width: 3,
              height: Math.max(4, amp * 26),
              borderRadius: 2,
              backgroundColor: isPlayed ? theme.primary : theme.textMuted,
              opacity: isPlayed ? 1 : playing ? 0.5 : 0.28,
            }}
          />
        );
      })}
    </View>
  );
}

function ScrubBar({
  progress,
  color,
  trackColor,
  onSeek,
}: {
  progress: number;
  color: string;
  trackColor: string;
  onSeek: (progress: number) => void;
}) {
  const widthRef = useRef(0);

  const handleMove = (e: GestureResponderEvent) => {
    const width = widthRef.current || 1;
    onSeek(clamp(e.nativeEvent.locationX / width, 0, 1));
  };

  return (
    <View
      style={styles.scrubTouch}
      onLayout={(e) => {
        widthRef.current = e.nativeEvent.layout.width;
      }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={handleMove}
      onResponderMove={handleMove}
    >
      <LinearGradient
        colors={[color, trackColor]}
        style={[styles.track, { backgroundColor: trackColor }]}
      >
        <View
          style={[
            styles.trackFill,
            { backgroundColor: color, width: `${progress * 100}%` },
          ]}
        />
      </LinearGradient>
      <View
        pointerEvents="none"
        style={[
          styles.thumb,
          { backgroundColor: "#fff", borderColor: color, left: `${progress * 100}%` },
        ]}
      />
    </View>
  );
}

export default function VoicePlayerSheet({
  clip,
  currentTime,
  totalDuration,
  isPlaying,
  transcribing,
  onClose,
  onTogglePlay,
  onSeek,
  onDelete,
  onTranscribe,
  onAddTranscript,
}: VoicePlayerSheetProps) {
  const theme = useThemeColors();
  if (!clip) return null;

  const totalSec = totalDuration > 0 ? totalDuration : clip.duration / 1000;
  const progress = totalSec > 0 ? clamp(currentTime / totalSec, 0, 1) : 0;

  return (
    <GlassSheet
      visible
      onClose={onClose}
      title="Voice Note"
      subtitle={formatTime(totalSec)}
      cornerRadius={36}
      footer={
        <Pressable
          onPress={onDelete}
          style={({ pressed }) => [
            styles.deleteRow,
            { backgroundColor: theme.surfaceAlt },
            pressed && { opacity: 0.8 },
          ]}
        >
          <ThemeIcon sf="trash" material="trash-can-outline" size={16} color={theme.danger} weight="semibold" />
          <Text style={[styles.deleteText, { color: theme.danger }]}>Delete Voice Note</Text>
        </Pressable>
      }
    >
      <View style={styles.playerBlock}>
        <MiniWaveform clip={clip} progress={progress} playing={isPlaying} />

        <ScrubBar
          progress={progress}
          color={theme.primary}
          trackColor={theme.borderLight}
          onSeek={(p) => onSeek(p * totalSec)}
        />

        <View style={styles.timeRow}>
          <Text style={[styles.timeText, { color: theme.textSecondary }]}>
            {formatTime(currentTime)}
          </Text>
          <Text style={[styles.timeText, { color: theme.textMuted }]}>
            {formatTime(totalSec)}
          </Text>
        </View>

        <View style={styles.controlsRow}>
          <Pressable
            onPress={() => onSeek(Math.max(0, currentTime - 10))}
            hitSlop={8}
            style={({ pressed }) => [
              styles.skipBtn,
              { backgroundColor: theme.surfaceAlt, borderColor: theme.borderLight },
              pressed && { opacity: 0.7 },
            ]}
          >
            <ThemeIcon sf="gobackward.10" material="rewind-10" size={22} color={theme.textSecondary} weight="semibold" />
          </Pressable>

          <Pressable onPress={onTogglePlay} hitSlop={8} style={({ pressed }) => pressed && { transform: [{ scale: 0.94 }] }}>
            <LinearGradient
              colors={[theme.primary, theme.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.playButton, { shadowColor: theme.primary }]}
            >
              <ThemeIcon
                sf={isPlaying ? "pause.fill" : "play.fill"}
                material={isPlaying ? "pause" : "play"}
                size={36}
                color="#fff"
                weight="bold"
              />
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={() => onSeek(Math.min(totalSec, currentTime + 10))}
            hitSlop={8}
            style={({ pressed }) => [
              styles.skipBtn,
              { backgroundColor: theme.surfaceAlt, borderColor: theme.borderLight },
              pressed && { opacity: 0.7 },
            ]}
          >
            <ThemeIcon sf="goforward.10" material="fast-forward-10" size={22} color={theme.textSecondary} weight="semibold" />
          </Pressable>
        </View>
      </View>

      <View style={[styles.transcriptSection, { borderColor: theme.borderLight }]}>
        <View style={styles.transcriptHeader}>
          <View style={[styles.transcriptChip, { backgroundColor: theme.primary + "1A" }]}>
            <ThemeIcon sf="quote.bubble" material="text-box-outline" size={12} color={theme.primary} weight="semibold" />
          </View>
          <Text style={[styles.transcriptLabel, { color: theme.textSecondary }]}>Transcription</Text>
        </View>

        {transcribing ? (
          <View style={styles.transcribeProgress}>
            <ActivityIndicator color={theme.primary} />
            <Text style={[styles.transcribeHint, { color: theme.textMuted }]}>Transcribing audio…</Text>
          </View>
        ) : clip.transcript ? (
          <View>
            <ScrollView style={styles.transcriptScroll} nestedScrollEnabled>
              <Text style={[styles.transcriptText, { color: theme.text }]}>{clip.transcript}</Text>
            </ScrollView>
            <Pressable
              onPress={onAddTranscript}
              style={({ pressed }) => [
                styles.transcriptAction,
                { backgroundColor: theme.primary },
                pressed && { opacity: 0.85 },
              ]}
            >
              <ThemeIcon sf="text.append" material="text-box-plus-outline" size={16} color="#fff" weight="bold" />
              <Text style={styles.transcriptActionText}>Add to note</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={onTranscribe}
            style={({ pressed }) => [
              styles.transcribeButton,
              { backgroundColor: theme.surfaceAlt, borderColor: theme.borderLight },
              pressed && { opacity: 0.8 },
            ]}
          >
            <ThemeIcon sf="waveform" material="transcribe" size={18} color={theme.primary} weight="semibold" />
            <Text style={[styles.transcribeButtonText, { color: theme.text }]}>Transcribe</Text>
          </Pressable>
        )}
      </View>
    </GlassSheet>
  );
}

const styles = StyleSheet.create({
  playerBlock: {
    gap: 12,
  },
  miniWave: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    height: 28,
  },
  scrubTouch: {
    height: 24,
    justifyContent: "center",
  },
  track: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  trackFill: {
    height: "100%",
    borderRadius: 3,
  },
  thumb: {
    position: "absolute",
    top: "50%",
    marginTop: -9,
    marginLeft: -9,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  timeText: {
    fontSize: 12,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 40,
  },
  skipBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    alignItems: "center",
  },
  playButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  transcriptSection: {
    marginTop: 4,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  transcriptHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  transcriptChip: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  transcriptLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  transcriptScroll: {
    maxHeight: 104,
  },
  transcriptText: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "500",
  },
  transcriptAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 46,
    borderRadius: 16,
    marginTop: 4,
  },
  transcriptActionText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  transcribeProgress: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
  },
  transcribeHint: {
    fontSize: 13,
    fontWeight: "500",
  },
  transcribeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  transcribeButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  deleteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 16,
  },
  deleteText: {
    fontSize: 14,
    fontWeight: "700",
  },
});