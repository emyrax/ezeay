import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../../hooks/useTheme";
import type { LessonSlide } from "../../types/lesson";
import LessonVisual from "./LessonVisual";

interface Props {
  slide: LessonSlide;
  index: number;
  total: number;
}

const REVEAL_LABEL = {
  fade: "Fade in",
  write: "Write",
  draw: "Draw",
  none: "Instant",
} as const;

export default function LessonStage({ slide, index, total }: Props) {
  const theme = useThemeColors();
  const opacity = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const reveal = slide.reveal;
    opacity.stopAnimation();
    translateX.stopAnimation();
    translateY.stopAnimation();
    scale.stopAnimation();

    if (reveal === "none") {
      opacity.setValue(1);
      translateX.setValue(0);
      translateY.setValue(0);
      scale.setValue(1);
      return;
    }

    opacity.setValue(0);
    translateX.setValue(reveal === "write" ? -14 : 0);
    translateY.setValue(reveal === "fade" ? 10 : 0);
    scale.setValue(reveal === "draw" ? 0.96 : 1);

    const animation = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 0,
        duration: 480,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 480,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
    ]);

    animation.start();
    return () => animation.stop();
  }, [slide.id, slide.reveal, opacity, translateX, translateY, scale]);

  return (
    <View
      style={[
        styles.stage,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {Array.from({ length: 5 }, (_, line) => (
          <View
            key={`v-${line}`}
            style={[
              styles.gridLineVertical,
              {
                left: `${(line + 1) * 16.67}%`,
                backgroundColor: theme.border,
              },
            ]}
          />
        ))}
        {Array.from({ length: 4 }, (_, line) => (
          <View
            key={`h-${line}`}
            style={[
              styles.gridLineHorizontal,
              {
                top: `${(line + 1) * 20}%`,
                backgroundColor: theme.border,
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.stageHeader}>
        <View style={styles.stageLabelWrap}>
          <View style={[styles.stageIcon, { backgroundColor: theme.primary + "16" }]}>
            <Ionicons name="easel-outline" size={14} color={theme.primary} />
          </View>
          <Text style={[styles.stageLabel, { color: theme.textMuted }]}>
            Slide {index + 1} of {total}
          </Text>
        </View>
        <View
          style={[
            styles.revealPill,
            { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.revealText, { color: theme.textMuted }]}>
            {REVEAL_LABEL[slide.reveal]}
          </Text>
        </View>
      </View>

      <Animated.View
        style={[
          styles.visualWrap,
          {
            opacity,
            transform: [{ translateX }, { translateY }, { scale }],
          },
        ]}
      >
        <LessonVisual visual={slide.visual} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    minHeight: 330,
    overflow: "hidden",
  },
  gridLineVertical: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    opacity: 0.24,
  },
  gridLineHorizontal: {
    position: "absolute",
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    opacity: 0.24,
  },
  stageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  stageLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stageIcon: {
    width: 25,
    height: 25,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  stageLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  revealPill: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  revealText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  visualWrap: {
    flex: 1,
    justifyContent: "center",
    minHeight: 250,
  },
});
