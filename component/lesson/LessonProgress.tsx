import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { useThemeColors } from "../../hooks/useTheme";
import type { LessonMotionPreset } from "../../lib/lesson/motion";

interface Props {
  index: number;
  total: number;
  preset: LessonMotionPreset;
}

export default function LessonProgress({ index, total, preset }: Props) {
  const theme = useThemeColors();
  const target = total > 0 ? Math.min(1, Math.max(0, (index + 1) / total)) : 0;
  const progress = useRef(
    new Animated.Value(preset.enabled ? 0 : target),
  ).current;

  useEffect(() => {
    progress.stopAnimation();

    if (!preset.enabled || preset.duration <= 0) {
      progress.setValue(target);
      return;
    }

    const animation = Animated.timing(progress, {
      toValue: target,
      duration: Math.max(180, preset.duration),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [preset.duration, preset.enabled, progress, target]);

  return (
    <View style={styles.row}>
      <View style={[styles.track, { backgroundColor: theme.surfaceAlt }]}>
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: theme.primary,
              width: progress.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>
      <Text style={[styles.text, { color: theme.textMuted }]}>
        {index + 1} / {total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 13,
    marginBottom: 14,
  },
  track: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },
  text: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
});
