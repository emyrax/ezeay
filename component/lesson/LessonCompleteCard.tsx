import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../../hooks/useTheme";
import type { LessonMotionPreset } from "../../lib/lesson/motion";
import { ConfettiLayer } from "../ConfettiLayer";
import MotionReveal from "./MotionReveal";

interface Props {
  total: number;
  preset: LessonMotionPreset;
  onReplay: () => void;
  onDone: () => void;
}

export default function LessonCompleteCard({
  total,
  preset,
  onReplay,
  onDone,
}: Props) {
  const theme = useThemeColors();
  const iconScale = useRef(
    new Animated.Value(preset.enabled ? 0.5 : 1),
  ).current;
  const ringScale = useRef(
    new Animated.Value(preset.enabled ? 0.7 : 1),
  ).current;
  const ringOpacity = useRef(
    new Animated.Value(preset.enabled ? 0.55 : 0),
  ).current;
  const [confettiExpired, setConfettiExpired] = useState(false);
  const showConfetti =
    preset.enabled && preset.confetti && !confettiExpired;

  useEffect(() => {
    iconScale.stopAnimation();

    if (!preset.enabled) {
      iconScale.setValue(1);
      return;
    }

    iconScale.setValue(0.5);
    const animation = Animated.spring(iconScale, {
      toValue: 1,
      friction: 5,
      tension: 120,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [iconScale, preset.enabled]);

  useEffect(() => {
    ringScale.stopAnimation();
    ringOpacity.stopAnimation();

    if (!preset.enabled) {
      ringScale.setValue(1);
      ringOpacity.setValue(0);
      return;
    }

    ringScale.setValue(0.7);
    ringOpacity.setValue(0.55);
    const animation = Animated.parallel([
      Animated.timing(ringScale, {
        toValue: 1.7,
        duration: 850,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(ringOpacity, {
        toValue: 0,
        duration: 850,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [preset.enabled, ringOpacity, ringScale]);

  useEffect(() => {
    if (!preset.enabled || !preset.confetti) return;

    const timer = setTimeout(() => setConfettiExpired(true), 3200);
    return () => clearTimeout(timer);
  }, [preset.confetti, preset.enabled]);

  return (
    <MotionReveal
      preset={preset}
      style={[
        styles.card,
        {
          backgroundColor: theme.success + "10",
          borderColor: theme.success + "35",
        },
      ]}
    >
      {showConfetti ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <ConfettiLayer />
        </View>
      ) : null}

      <View style={styles.iconStage}>
        <Animated.View
          style={[
            styles.ring,
            {
              borderColor: theme.success,
              opacity: ringOpacity,
              transform: [{ scale: ringScale }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.icon,
            {
              backgroundColor: theme.success + "18",
              transform: [{ scale: iconScale }],
            },
          ]}
        >
          <Ionicons name="checkmark-done" size={24} color={theme.success} />
        </Animated.View>
      </View>

      <View style={styles.copy}>
        <Text style={[styles.title, { color: theme.success }]}>
          Lesson complete
        </Text>
        <Text style={[styles.text, { color: theme.textSecondary }]}>
          You made it through all {total} slides.
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.surface }]}
          onPress={onReplay}
          accessibilityRole="button"
        >
          <Ionicons name="refresh" size={14} color={theme.text} />
          <Text style={[styles.buttonText, { color: theme.text }]}>Replay</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={onDone}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </MotionReveal>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 11,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginTop: 16,
    overflow: "hidden",
  },
  iconStage: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    minWidth: 150,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: "800",
  },
  text: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "500",
  },
  actions: {
    flexDirection: "row",
    gap: 7,
    marginLeft: 51,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
});
