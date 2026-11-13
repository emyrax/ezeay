import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { coachColors } from "../../constants/coachTheme";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;
type TabId = "home" | "activity" | "coach" | "schedule" | "settings";

interface CoachTab {
  id: TabId;
  icon: IconName;
  label: string;
  href: string;
}

const TABS: CoachTab[] = [
  { id: "home", icon: "home-variant-outline", label: "Home", href: "/(tabs)" },
  { id: "activity", icon: "heart-pulse", label: "Activity", href: "/quests" },
  { id: "coach", icon: "creation", label: "AI coach", href: "/coach/idle" },
  { id: "schedule", icon: "calendar-month-outline", label: "Schedule", href: "/(schedule)" },
  {
    id: "settings",
    icon: "cog-outline",
    label: "Settings",
    href: "/(settings)/settings",
  },
];

export default function CoachFloatingTabBar({
  active = "home",
}: {
  active?: TabId;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View
      style={[
        styles.wrap,
        { bottom: Math.max(insets.bottom, 12) + 8 },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.bar}>
        {TABS.map((tab) => {
          const isActive = tab.id === active;
          const isCoach = tab.id === "coach";
          const filled = isActive || isCoach;
          return (
            <Pressable
              key={tab.id}
              onPress={() => {
                if (!isActive) router.navigate(tab.href as never);
              }}
              style={[
                styles.slot,
                filled && {
                  backgroundColor: isCoach
                    ? coachColors.accent
                    : coachColors.dark,
                },
              ]}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: isActive }}
            >
              <MaterialCommunityIcons
                name={tab.icon}
                size={21}
                color={filled ? coachColors.white : coachColors.textMuted}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 16,
  },
  bar: {
    width: "100%",
    maxWidth: 420,
    height: 64,
    borderRadius: 32,
    backgroundColor: coachColors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 10,
    shadowColor: coachColors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 10,
  },
  slot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
