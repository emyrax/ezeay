import React from "react";
import { Platform, StatusBar } from "react-native";
import { Stack } from "expo-router";
import { useThemeColors } from "../../hooks/useTheme";

export default function SettingsLayout() {
  const theme = useThemeColors();

  return (
    <>
      {Platform.OS === "android" && (
        <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
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
      </Stack>
    </>
  );
}
