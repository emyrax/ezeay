import React from "react";
import { Platform, StatusBar } from "react-native";
import { Redirect, Stack } from "expo-router";
import { useFeatureFlags } from "../../hooks/useFeatureFlags";
import { useThemeColors, useThemeMode } from "../../hooks/useTheme";

export default function TutorLayout() {
  const theme = useThemeColors();
  const resolvedTheme = useThemeMode();
  const { agent, tutor } = useFeatureFlags();

  if (!agent && !tutor) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <>
      {Platform.OS === "android" && (
        <StatusBar
          barStyle={resolvedTheme === "light" ? "dark-content" : "light-content"}
          backgroundColor={theme.bg}
        />
      )}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.bg },
          animation: "slide_from_right",
          animationDuration: 250,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="plan" />
        <Stack.Screen name="quiz" />
        <Stack.Screen name="settings" />
      </Stack>
    </>
  );
}
