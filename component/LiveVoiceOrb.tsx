import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, View, StyleSheet } from "react-native";

type Props = {
  /** 0–1 voice level driven by volume-change events */
  level: number;
  size?: number;
  activeColor?: string;
  glowColor?: string;
};

export default function LiveVoiceOrb({
  level,
  size = 48,
  activeColor = "#38BDF8",
  glowColor = "#38BDF8",
}: Props) {
  const baseScale = useRef(new Animated.Value(1)).current;
  const glowScale = useRef(new Animated.Value(1)).current;
  const coreScale = useRef(new Animated.Value(1)).current;

  // idle breathing loop
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(baseScale, {
          toValue: 1.12,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(baseScale, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [baseScale]);

  // react to level changes (smooth via spring)
  useEffect(() => {
    Animated.spring(glowScale, {
      toValue: 1 + level * 0.45,
      damping: 14,
      stiffness: 220,
      useNativeDriver: true,
    }).start();
    Animated.spring(coreScale, {
      toValue: 0.92 + level * 0.18,
      damping: 16,
      stiffness: 240,
      useNativeDriver: true,
    }).start();
  }, [level, glowScale, coreScale]);

  const glowOpacity = useMemo(() => Math.min(0.45, 0.12 + level * 0.33), [level]);
  const coreOpacity = useMemo(() => Math.min(1, 0.75 + level * 0.25), [level]);

  return (
    <View style={[styles.container, { width: size, height: size }]}>  
      {/* outer halo */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          width: size * 1.6,
          height: size * 1.6,
          borderRadius: size * 0.8,
          backgroundColor: glowColor,
          opacity: glowOpacity,
          transform: [
            { scale: Animated.multiply(baseScale, glowScale) },
          ],
          left: -(size * 0.3),
          top: -(size * 0.3),
        }}
      />
      {/* mid ring */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          width: size * 1.22,
          height: size * 1.22,
          borderRadius: size * 0.61,
          borderWidth: 1.5,
          borderColor: activeColor,
          opacity: 0.3 + level * 0.4,
          transform: [{ scale: Animated.multiply(baseScale, glowScale) }],
          left: -(size * 0.11),
          top: -(size * 0.11),
        }}
      />
      {/* core dot */}
      <Animated.View
        style={{
          width: size * 0.44,
          height: size * 0.44,
          borderRadius: size * 0.22,
          backgroundColor: activeColor,
          opacity: coreOpacity,
          transform: [{ scale: coreScale }],
          alignSelf: "center",
          marginTop: size * 0.28,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: "relative" },
});
