import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { coachColors, coachFont } from "../../constants/coachTheme";
import CoachSheet from "./CoachSheet";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

interface SuggestPromptsSheetProps {
  visible: boolean;
  onClose: () => void;
  onPick: (prompt: string) => void;
}

const PROMPTS: {
  icon: IconName;
  prompt: string;
  tint: string;
  color: string;
}[] = [
  {
    icon: "calendar-check-outline",
    prompt: "Build a study plan for my next exam.",
    tint: "#EAF4FC",
    color: "#5B9BD5",
  },
  {
    icon: "chart-timeline-variant",
    prompt: "What should I focus on today based on my progress?",
    tint: "#E7F6ED",
    color: "#5BB98C",
  },
  {
    icon: "help-circle-outline",
    prompt: "Quiz me on what I studied this week.",
    tint: "#EFECFC",
    color: coachColors.accent,
  },
  {
    icon: "cards-outline",
    prompt: "Turn my notes into flashcards.",
    tint: "#FFF3DE",
    color: "#E0A34A",
  },
  {
    icon: "timer-outline",
    prompt: "Give me a focused 20-minute revision session.",
    tint: "#FDECEC",
    color: "#E07A7A",
  },
  {
    icon: "lightbulb-outline",
    prompt: "Explain a hard topic to me like a patient tutor.",
    tint: "#EAF7F3",
    color: "#4FA896",
  },
];

export default function SuggestPromptsSheet({
  visible,
  onClose,
  onPick,
}: SuggestPromptsSheetProps) {
  return (
    <CoachSheet
      visible={visible}
      title="Suggest a prompt"
      subtitle="Tap one to start a conversation."
      onClose={onClose}
    >
      {PROMPTS.map((item) => (
        <Pressable
          key={item.prompt}
          onPress={() => {
            onPick(item.prompt);
            onClose();
          }}
          style={styles.row}
          accessibilityRole="button"
          accessibilityLabel={item.prompt}
        >
          <View style={[styles.icon, { backgroundColor: item.tint }]}>
            <MaterialCommunityIcons
              name={item.icon}
              size={19}
              color={item.color}
            />
          </View>
          <Text style={styles.prompt}>{item.prompt}</Text>
          <MaterialCommunityIcons
            name="arrow-top-right"
            size={17}
            color={coachColors.textMuted}
          />
        </Pressable>
      ))}
    </CoachSheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: coachColors.background,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  prompt: {
    flex: 1,
    fontFamily: coachFont.medium,
    fontSize: 13,
    lineHeight: 19,
    color: coachColors.textSecondary,
  },
});
