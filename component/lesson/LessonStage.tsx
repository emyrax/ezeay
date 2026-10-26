import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLessonMotion } from "../../hooks/useLessonMotion";
import type { LessonMotionPreset } from "../../lib/lesson/motion";
import type { LessonSlide } from "../../types/lesson";
import LessonVisual from "./LessonVisual";
import { useLessonTheme } from "./LessonThemeContext";
import MotionBackdrop from "./MotionBackdrop";
import MotionReveal from "./MotionReveal";

interface Props {
  slide: LessonSlide;
  index: number;
  total: number;
  presentation?: boolean;
}

const REVEAL_LABEL = {
  fade: "Fade in",
  write: "Write",
  draw: "Draw",
  none: "Instant",
} as const;

function StageSweep({
  color,
  preset,
  enabled,
  replayKey,
}: {
  color: string;
  preset: LessonMotionPreset;
  enabled: boolean;
  replayKey: string;
}) {
  const active = enabled && preset.enabled && preset.sweep;
  const progress = useRef(new Animated.Value(active ? 0 : 1)).current;

  useEffect(() => {
    progress.stopAnimation();

    if (!active) {
      progress.setValue(1);
      return;
    }

    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: Math.max(680, preset.duration * 1.8),
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [active, preset.duration, progress, replayKey]);

  if (!active) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.sweep,
        {
          transform: [
            {
              translateX: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [-180, 920],
              }),
            },
            { rotate: "16deg" },
          ],
        },
      ]}
    >
      <LinearGradient
        colors={["transparent", color + "30", "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

export default function LessonStage({
  slide,
  index,
  total,
  presentation = false,
}: Props) {
  const theme = useLessonTheme();
  const motion = useLessonMotion();
  const shouldAnimate = slide.reveal !== "none" && motion.enabled;
  const opacity = useRef(new Animated.Value(shouldAnimate ? 0 : 1)).current;
  const translateX = useRef(
    new Animated.Value(
      shouldAnimate && slide.reveal === "write" ? -motion.distance : 0,
    ),
  ).current;
  const translateY = useRef(
    new Animated.Value(
      shouldAnimate && slide.reveal === "fade" ? motion.distance * 0.65 : 0,
    ),
  ).current;
  const scale = useRef(
    new Animated.Value(
      shouldAnimate && slide.reveal === "draw" ? motion.scaleFrom : 1,
    ),
  ).current;
  const entrance = useRef(new Animated.Value(shouldAnimate ? 0 : 1)).current;

  useEffect(() => {
    entrance.stopAnimation();

    if (!shouldAnimate || motion.duration <= 0) {
      entrance.setValue(1);
      return;
    }

    entrance.setValue(0);
    const animation = Animated.timing(entrance, {
      toValue: 1,
      duration: Math.max(260, motion.duration * 0.9),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [entrance, motion.duration, shouldAnimate, slide.id]);

  useEffect(() => {
    const reveal = slide.reveal;
    opacity.stopAnimation();
    translateX.stopAnimation();
    translateY.stopAnimation();
    scale.stopAnimation();

    if (reveal === "none" || !motion.enabled) {
      opacity.setValue(1);
      translateX.setValue(0);
      translateY.setValue(0);
      scale.setValue(1);
      return;
    }

    opacity.setValue(0);
    translateX.setValue(reveal === "write" ? -motion.distance : 0);
    translateY.setValue(reveal === "fade" ? motion.distance * 0.65 : 0);
    scale.setValue(reveal === "draw" ? motion.scaleFrom : 1);

    const animation = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: motion.duration * 0.85,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 0,
        duration: motion.duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: motion.duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: motion.duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    animation.start();
    return () => animation.stop();
  }, [
    slide.id,
    slide.reveal,
    opacity,
    translateX,
    translateY,
    scale,
    motion.enabled,
    motion.duration,
    motion.distance,
    motion.scaleFrom,
  ]);

  return (
    <Animated.View
      style={[
        styles.stage,
        presentation && styles.stagePresentation,
        {
          backgroundColor: presentation ? "transparent" : theme.surface,
          borderColor: theme.border,
          opacity: entrance,
          transform: [
            {
              translateY: entrance.interpolate({
                inputRange: [0, 1],
                outputRange: [motion.distance * 0.7, 0],
              }),
            },
            {
              scale: entrance.interpolate({
                inputRange: [0, 1],
                outputRange: [0.985, 1],
              }),
            },
          ],
        },
      ]}
    >
      <MotionBackdrop
        preset={motion}
        color={theme.primary}
        accent={theme.accent}
      />

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

      <StageSweep
        color={theme.primary}
        preset={motion}
        enabled={slide.reveal !== "none"}
        replayKey={slide.id}
      />

      {presentation ? null : (
        <View style={styles.stageHeader}>
          <MotionReveal
            preset={motion}
            replayKey={slide.id}
            direction="left"
            distance={6}
          >
            <View style={styles.stageLabelWrap}>
              <View
                style={[
                  styles.stageIcon,
                  { backgroundColor: theme.primary + "16" },
                ]}
              >
                <Ionicons name="easel-outline" size={14} color={theme.primary} />
              </View>
              <Text style={[styles.stageLabel, { color: theme.textMuted }]}>
                Slide {index + 1} of {total}
              </Text>
            </View>
          </MotionReveal>
          <MotionReveal
            preset={motion}
            replayKey={slide.id}
            direction="right"
            distance={6}
            delay={motion.stagger}
          >
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
          </MotionReveal>
        </View>
      )}

      <Animated.View
        style={[
          styles.visualWrap,
          {
            opacity,
            transform: [{ translateX }, { translateY }, { scale }],
          },
        ]}
      >
        <LessonVisual
          key={slide.id}
          visual={slide.visual}
          preset={motion}
          reveal={slide.reveal}
        />
      </Animated.View>
    </Animated.View>
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
  stagePresentation: {
    borderWidth: 0,
    borderRadius: 0,
    paddingHorizontal: 8,
    paddingVertical: 0,
    minHeight: 300,
  },
  sweep: {
    position: "absolute",
    top: -60,
    bottom: -60,
    left: 0,
    width: 110,
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
