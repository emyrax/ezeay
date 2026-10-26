import React, { useEffect, useRef, type ReactNode } from "react";
import {
  Animated,
  Easing,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import type { LessonMotionPreset } from "../../lib/lesson/motion";

type RevealDirection = "up" | "down" | "left" | "right" | "none";

interface Props {
  children: ReactNode;
  preset: LessonMotionPreset;
  delay?: number;
  direction?: RevealDirection;
  distance?: number;
  scaleFrom?: number;
  enabled?: boolean;
  replayKey?: string | number;
  style?: StyleProp<ViewStyle>;
}

export default function MotionReveal({
  children,
  preset,
  delay = 0,
  direction = "up",
  distance,
  scaleFrom,
  enabled = true,
  replayKey,
  style,
}: Props) {
  const active = enabled && preset.enabled && preset.duration > 0;
  const progress = useRef(new Animated.Value(active ? 0 : 1)).current;

  useEffect(() => {
    progress.stopAnimation();

    if (!active) {
      progress.setValue(1);
      return;
    }

    progress.setValue(0);
    const animation = Animated.sequence([
      Animated.delay(delay),
      Animated.timing(progress, {
        toValue: 1,
        duration: preset.duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    animation.start();
    return () => animation.stop();
  }, [active, delay, preset.duration, progress, replayKey]);

  const offset = distance ?? preset.distance;
  const startX =
    direction === "left" ? -offset : direction === "right" ? offset : 0;
  const startY =
    direction === "up" ? offset : direction === "down" ? -offset : 0;
  const startScale = scaleFrom ?? preset.scaleFrom;

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateX: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [startX, 0],
              }),
            },
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [startY, 0],
              }),
            },
            {
              scale: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [startScale, 1],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
