import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { coachColors, coachFont } from "../../constants/coachTheme";
import { useReducedMotion } from "../../hooks/useReducedMotion";

const WAVE_WIDTH = 44;
const WAVE_HEIGHT = 10;
const WAVE_PATH =
  "M0 5 Q5.5 0 11 5 T22 5 T33 5 T44 5 V10 H0 Z";

interface LiquidBatteryProps {
  progress: number;
  tint?: string;
  color?: string;
}

export default function LiquidBattery({
  progress,
  tint = coachColors.heartTint,
  color = coachColors.heartIcon,
}: LiquidBatteryProps) {
  const reduceMotion = useReducedMotion();
  const fill = useRef(new Animated.Value(0)).current;
  const wave = useRef(new Animated.Value(0)).current;
  const clamped = Math.min(Math.max(progress, 0), 100);

  useEffect(() => {
    if (reduceMotion) {
      fill.setValue(clamped);
      return;
    }
    const animation = Animated.timing(fill, {
      toValue: clamped,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [clamped, fill, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) {
      wave.setValue(0);
      return;
    }
    const animation = Animated.loop(
      Animated.timing(wave, {
        toValue: 1,
        duration: 2200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [reduceMotion, wave]);

  const fillHeight = fill.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });
  const waveTranslate = wave.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -WAVE_WIDTH / 2],
  });

  return (
    <View
      style={styles.root}
      accessibilityRole="progressbar"
      accessibilityLabel={`XP progress ${Math.round(clamped)} percent`}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}
    >
      <View style={[styles.cap, { backgroundColor: color }]} />
      <View
        style={[
          styles.body,
          { backgroundColor: tint, borderColor: color },
        ]}
      >
        <Animated.View
          style={[
            styles.fill,
            { height: fillHeight, backgroundColor: color },
          ]}
        >
          <Animated.View
            style={[
              styles.wave,
              { transform: [{ translateX: waveTranslate }] },
            ]}
          >
            <Svg width={WAVE_WIDTH} height={WAVE_HEIGHT}>
              <Path d={WAVE_PATH} fill="rgba(255,255,255,0.28)" />
            </Svg>
          </Animated.View>
        </Animated.View>
        <Text style={styles.xpLabel}>XP</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: 22,
    height: 34,
    alignItems: "center",
  },
  cap: {
    width: 9,
    height: 3,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  body: {
    width: 22,
    height: 30,
    borderRadius: 6,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  fill: {
    position: "absolute",
    left: 1,
    right: 1,
    bottom: 1,
    borderRadius: 4,
    overflow: "hidden",
  },
  wave: {
    position: "absolute",
    top: 0,
    left: -11,
    width: WAVE_WIDTH,
    height: WAVE_HEIGHT,
  },
  xpLabel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 5,
    textAlign: "center",
    fontFamily: coachFont.extrabold,
    fontSize: 6,
    letterSpacing: 0.4,
    color: "#7A3E3E",
  },
});
