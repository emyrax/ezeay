import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LiveVoiceOrb from "./LiveVoiceOrb";
import ThemeIcon from "./notes/ThemeIcon";
import { useThemeColors } from "../hooks/useTheme";
import { bodyFont } from "../constants/themes";

type Props = {
  visible: boolean;
  transcript: string;
  elapsed: number;
  level: number;
  onStop: () => void;
  onDiscard: () => void;
};

function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function RecordingPanel({
  visible,
  transcript,
  elapsed,
  level,
  onStop,
  onDiscard,
}: Props) {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.glass,
          borderColor: theme.borderLight,
          bottom: (insets.bottom || 12) + 90,
          shadowColor: "#000",
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.inner}>
        <LiveVoiceOrb
          level={level}
          size={40}
          activeColor={theme.danger}
          glowColor={theme.danger}
        />

        <View style={styles.textCol}>
          <Text style={[styles.timer, { color: theme.danger, fontFamily: bodyFont }]}>
            {formatElapsed(elapsed)}
          </Text>
          <Text
            style={[styles.transcript, { color: theme.textMuted, fontFamily: bodyFont }]}
            numberOfLines={2}
          >
            {transcript || "Listening…"}
          </Text>
        </View>

        <Pressable
          onPress={onDiscard}
          hitSlop={8}
          style={({ pressed }) => [
            styles.iconBtn,
            { backgroundColor: theme.surfaceAlt },
            pressed && { opacity: 0.7 },
          ]}
        >
          <ThemeIcon sf="xmark" material="close" size={16} color={theme.textSecondary} weight="bold" />
        </Pressable>

        <Pressable
          onPress={onStop}
          hitSlop={8}
          style={({ pressed }) => [
            styles.stopBtn,
            { backgroundColor: theme.danger },
            pressed && { opacity: 0.8 },
          ]}
        >
          <ThemeIcon sf="stop.fill" material="stop" size={16} color="#fff" weight="bold" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  inner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  timer: {
    fontSize: 14,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  transcript: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 17,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  stopBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
});
