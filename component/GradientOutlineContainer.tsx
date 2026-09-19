import { LinearGradient } from "expo-linear-gradient";
import React, { ReactNode } from "react";
import { ColorValue, StyleProp, StyleSheet, View, ViewStyle } from "react-native";

interface Props {
  gradientColors: [ColorValue, ColorValue, ...ColorValue[]];
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  borderWidth?: number;
}

export default function GradientOutlineContainer({
  gradientColors,
  style,
  children,
  borderWidth = 1,
}: Props) {
  return (
    <LinearGradient
      colors={gradientColors}
      style={[styles.outer, style]}
    >
      <View style={[styles.inner, { margin: borderWidth }]}>
        {children}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: 20,
  },
  inner: {
    backgroundColor: "#111827",
    borderRadius: 19,
    padding: 16,
  },
});
