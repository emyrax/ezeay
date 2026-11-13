import { Redirect, Stack } from "expo-router";
import { useFeatureFlags } from "../../../hooks/useFeatureFlags";

export default function CoachLayout() {
  const { agent } = useFeatureFlags();

  if (!agent) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: "transparent" },
      }}
    />
  );
}
