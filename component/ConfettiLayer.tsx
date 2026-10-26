import React, { useEffect, useRef } from "react";
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

function pseudoRandom(index: number, salt: number): number {
  const value =
    Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

const CONFETTI_PIECES: ConfettiPieceConfig[] = Array.from(
  { length: 18 },
  (_, index) => ({
    id: index,
    x: 3 + pseudoRandom(index, 1) * 92,
    size: 5 + pseudoRandom(index, 2) * 7,
    color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
    delay: pseudoRandom(index, 3) * 900,
    duration: 2300 + pseudoRandom(index, 4) * 1500,
    spin: (pseudoRandom(index, 5) * 2 - 1) * 240,
  }),
);

export function ConfettiLayer() {
  return (
    <View style={styles.layer} pointerEvents="none">
      {CONFETTI_PIECES.map((piece) => (
        <ConfettiPiece key={piece.id} {...piece} />
      ))}
    </View>
  );
}

function ConfettiPiece({ x, size, color, delay, duration, spin }: ConfettiPieceConfig) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
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