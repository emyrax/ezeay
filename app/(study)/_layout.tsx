import React from "react";
import { Stack } from "expo-router";
import { useThemeColors } from "../../hooks/useTheme";

export default function StudyLayout() {
  const theme = useThemeColors();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.bg },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="upload" />
      <Stack.Screen name="[materialId]" />
      <Stack.Screen name="[materialId]/quiz" />
      <Stack.Screen name="flashcards" />
      <Stack.Screen name="flashcards/review" />
    </Stack>
  );
}
