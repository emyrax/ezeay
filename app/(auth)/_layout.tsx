import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet } from "react-native";
import { Stack } from "expo-router";
import GridBackground from "../../component/GridBackground";
import { hero } from "../../constants/themes";

export default function AuthLayout() {
  return (
    <>
      <LinearGradient
        colors={[hero.gradientStart, hero.gradientMid, hero.gradientEnd]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <GridBackground opacity={0.04} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
    </>
  );
}
