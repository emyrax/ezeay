import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import { useThemeColors } from "../hooks/useTheme";

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
  borderWidth?: number;
  colors?: [string, string, ...string[]];
}

export default function GradientBorder({
  children,
  style,
  borderRadius = 20,
  borderWidth: bw = 1.5,
  colors,
}: Props) {
  const theme = useThemeColors();
  const gradientColors = colors ?? [theme.gradientStart, theme.gradientEnd];

  return (
    <View style={[{ borderRadius }, style]}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius, padding: bw }]}
      >
        <View
          style={{
            flex: 1,
            borderRadius: borderRadius - bw,
            backgroundColor: theme.glass,
          }}
        />
      </LinearGradient>
      <View style={{ borderRadius: borderRadius - 2, overflow: "hidden" }}>
        {children}
      </View>
    </View>
  );
}
