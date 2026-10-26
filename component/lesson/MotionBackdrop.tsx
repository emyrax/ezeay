import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { LessonMotionPreset } from "../../lib/lesson/motion";

interface Props {
  preset: LessonMotionPreset;
  color: string;
  accent: string;
}

export default function MotionBackdrop({ preset, color, accent }: Props) {
  const active = preset.enabled && preset.ambient;
  const driftA = useRef(new Animated.Value(0)).current;
  const driftB = useRef(new Animated.Value(0)).current;
  const beam = useRef(new Animated.Value(0)).current;
  const spark = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    driftA.stopAnimation();
    driftB.stopAnimation();
    beam.stopAnimation();
    spark.stopAnimation();

    if (!active) {
      driftA.setValue(0);
      driftB.setValue(0);
      beam.setValue(0);
      spark.setValue(0);
      return;
    }

    const loops = [
      Animated.loop(
        Animated.sequence([
          Animated.timing(driftA, {
            toValue: 1,
            duration: 11000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(driftA, {
            toValue: 0,
            duration: 11000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(driftB, {
            toValue: 1,
            duration: 15000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(driftB, {
            toValue: 0,
            duration: 15000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(beam, {
            toValue: 1,
            duration: 9500,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.delay(1400),
          Animated.timing(beam, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(spark, {
            toValue: 1,
            duration: 2200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(spark, {
            toValue: 0,
            duration: 2200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ),
    ];

    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [active, beam, driftA, driftB, spark]);

  if (!active) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[
          styles.orb,
          styles.orbTop,
          {
            opacity: driftA.interpolate({
              inputRange: [0, 1],
              outputRange: [0.55, 0.95],
            }),
            transform: [
              {
                translateX: driftA.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-16, 26],
                }),
              },
              {
                translateY: driftA.interpolate({
                  inputRange: [0, 1],
                  outputRange: [8, -20],
                }),
              },
              {
                scale: driftA.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.12],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={[color + "2A", color + "00"]}
          start={{ x: 0.2, y: 0.1 }}
          end={{ x: 0.8, y: 0.9 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.orb,
          styles.orbBottom,
          {
            opacity: driftB.interpolate({
              inputRange: [0, 1],
              outputRange: [0.4, 0.8],
            }),
            transform: [
              {
                translateX: driftB.interpolate({
                  inputRange: [0, 1],
                  outputRange: [18, -24],
                }),
              },
              {
                translateY: driftB.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-10, 16],
                }),
              },
              {
                scale: driftB.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1.08, 0.94],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={[accent + "22", accent + "00"]}
          start={{ x: 0.8, y: 0.2 }}
          end={{ x: 0.1, y: 0.9 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.beam,
          {
            opacity: beam.interpolate({
              inputRange: [0, 0.15, 0.8, 1],
              outputRange: [0, 0.7, 0.4, 0],
            }),
            transform: [
              {
                translateX: beam.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-260, 320],
                }),
              },
              { rotate: "18deg" },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={["transparent", color + "20", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {[0, 1, 2].map((index) => (
        <Animated.View
          key={index}
          style={[
            styles.spark,
            styles[`spark${index}` as "spark0" | "spark1" | "spark2"],
            {
              backgroundColor: index === 1 ? accent : color,
              opacity: spark.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange:
                  index === 1 ? [0.08, 0.5, 0.08] : [0.3, 0.08, 0.3],
              }),
              transform: [
                {
                  translateY: spark.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, index === 1 ? -14 : 10],
                  }),
                },
                {
                  scale: spark.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [1, 1.5, 1],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: "absolute",
    borderRadius: 999,
    overflow: "hidden",
  },
  orbTop: {
    width: 230,
    height: 230,
    top: -90,
    right: -70,
  },
  orbBottom: {
    width: 190,
    height: 190,
    bottom: -100,
    left: -60,
  },
  beam: {
    position: "absolute",
    top: -80,
    bottom: -80,
    left: 0,
    width: 120,
  },
  spark: {
    position: "absolute",
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  spark0: {
    top: "26%",
    left: "15%",
  },
  spark1: {
    top: "18%",
    right: "22%",
  },
  spark2: {
    bottom: "24%",
    right: "14%",
  },
});
