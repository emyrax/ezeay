import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

const CONFETTI_COLORS = ["#38BDF8", "#F59E0B", "#34D399", "#A78BFA", "#FB7185"];

interface ConfettiPieceConfig {
  id: number;
  x: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  spin: number;
}

export function ConfettiLayer() {
  const confetti = useMemo<ConfettiPieceConfig[]>(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        x: 3 + Math.random() * 92,
        size: 5 + Math.random() * 7,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        delay: Math.random() * 900,
        duration: 2300 + Math.random() * 1500,
        spin: (Math.random() * 2 - 1) * 240,
      })),
    [],
  );

  return (
    <View style={styles.layer} pointerEvents="none">
      {confetti.map((c) => (
        <ConfettiPiece key={c.id} {...c} />
      ))}
    </View>
  );
}

function ConfettiPiece({ x, size, color, delay, duration, spin }: ConfettiPieceConfig) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, [anim, duration, delay]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-60, 560] });
  const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${spin}deg`] });
  const opacity = anim.interpolate({ inputRange: [0, 0.75, 1], outputRange: [0.95, 0.9, 0] });

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          left: `${x}%`,
          width: size,
          height: size * 1.6,
          borderRadius: size / 4,
          backgroundColor: color,
          opacity,
          transform: [{ translateY }, { rotate }],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  layer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
  },
  piece: {
    position: "absolute",
    top: 0,
  },
});