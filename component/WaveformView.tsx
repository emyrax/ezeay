import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { useThemeColors } from "../hooks/useTheme";
import type { AudioClip } from "../types/note";
import ThemeIcon from "./notes/ThemeIcon";

interface WaveformViewProps {
  clip: AudioClip;
  isPlaying: boolean;
  progress?: number;
  totalDurationMs?: number;
  onPlay: () => void;
  onDelete: () => void;
}

const TARGET_BARS = 32;
const BAR_WIDTH = 3;
const BAR_GAP = 2;

function normalizeWaveform(data: number[]): number[] {
  if (!data || data.length === 0) return Array(TARGET_BARS).fill(0.15);
  const result: number[] = [];
  for (let i = 0; i < TARGET_BARS; i++) {
    const idx = Math.floor((i / TARGET_BARS) * data.length);
    result.push(Math.max(0.05, Math.min(1, data[idx])));
  }
  return result;
}

function formatDuration(ms: number): string {
  const dur = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(dur / 60)}:${(dur % 60).toString().padStart(2, "0")}`;
}

export default function WaveformView({
  clip,
  isPlaying,
  progress = 0,
  totalDurationMs,
  onPlay,
  onDelete,
}: WaveformViewProps) {
  const theme = useThemeColors();
  const bars = normalizeWaveform(clip.waveform);
  const totalWidth = bars.length * (BAR_WIDTH + BAR_GAP);
  const height = 30;
  const playedBars = Math.floor(progress * bars.length);
  const label = formatDuration(totalDurationMs ?? clip.duration);

  return (
    <Pressable
      onPress={onPlay}
      onLongPress={() => {
        Alert.alert("Delete recording", `Delete this ${label} recording?`, [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: onDelete },
        ]);
      }}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: theme.surfaceAlt, borderColor: theme.borderLight },
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={styles.topHighlight} />
      <View style={styles.svgWrap}>
        <Svg width={totalWidth} height={height}>
          {bars.map((amp, i) => {
            const barHeight = Math.max(3, amp * height * 0.9);
            const y = (height - barHeight) / 2;
            const isPlayed = i < playedBars;
            return (
              <Rect
                key={i}
                x={i * (BAR_WIDTH + BAR_GAP)}
                y={y}
                width={BAR_WIDTH}
                height={barHeight}
                rx={1.5}
                fill={isPlayed ? theme.primary : theme.textMuted}
                opacity={isPlayed ? 1 : isPlaying ? 0.5 : 0.18}
              />
            );
          })}
        </Svg>
      </View>

      <LinearGradient
        colors={[theme.primary, theme.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.playButton,
          { shadowColor: theme.primary },
        ]}
      >
        <ThemeIcon
          sf={isPlaying ? "pause.fill" : "play.fill"}
          material={isPlaying ? "pause" : "play"}
          size={26}
          color="#fff"
          weight="bold"
        />
      </LinearGradient>

      <View style={[styles.durationChip, { backgroundColor: "rgba(0,0,0,0.45)" }]}>
        <Text style={[styles.durationText, { color: "#fff" }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 76,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  topHighlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  svgWrap: {
    alignSelf: "center",
    overflow: "hidden",
  },
  playButton: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -24,
    marginLeft: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  durationChip: {
    position: "absolute",
    right: 9,
    bottom: 9,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.15)",
  },
  durationText: {
    fontSize: 11,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
});