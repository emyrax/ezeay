import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { ColorValue, StyleSheet, Text, View } from "react-native";

interface Props {
  text: string;
  active: boolean;
  gradientColors?: [ColorValue, ColorValue, ...ColorValue[]];
}

export default function Pill({ text, active, gradientColors }: Props) {
  if (active && gradientColors) {
    return (
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.pill}
      >
        <Text style={styles.activeText}>{text}</Text>
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.pill, styles.inactivePill]}>
      <Text style={styles.inactiveText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    marginRight: 6,
  },
  inactivePill: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  activeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  inactiveText: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "600",
  },
});
