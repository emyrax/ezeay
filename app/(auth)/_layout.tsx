import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet } from "react-native";
import { Stack } from "expo-router";
import GridBackground from "../../component/GridBackground";
import { landingColors } from "../../constants/landing";

export default function AuthLayout() {
  return (
    <>
      <LinearGradient
        colors={["#07111F", landingColors.bg, "#05070C"]}
        locations={[0, 0.55, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <GridBackground opacity={0.035} />
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
