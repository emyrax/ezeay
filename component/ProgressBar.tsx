import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { ColorValue, StyleProp, StyleSheet, View, ViewStyle } from "react-native";

interface Props {
  progress: number;
  trackColor: string;
  filledColors: [ColorValue, ColorValue, ...ColorValue[]];
  style?: StyleProp<ViewStyle>;
  height?: number;
  borderRadius?: number;
}

export default function ProgressBar({
  progress,
  trackColor,
  filledColors,
  style,
  height = 6,
  borderRadius = 3,
}: Props) {
  return (
    <View style={[styles.track, { backgroundColor: trackColor, height, borderRadius }, style]}>
      <LinearGradient
        colors={filledColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.fill, { width: `${Math.min(progress, 1) * 100}%`, borderRadius }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
  },
});
