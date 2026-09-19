import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../hooks/useTheme";

interface StreakData {
  label: string;
  streak: number;
  icon?: keyof typeof Ionicons.glyphMap;
  unit?: string;
}

const MOCK_STREAKS: StreakData[] = [
  { label: "Learning", streak: 7, icon: "flame", unit: "days" },
  { label: "Login", streak: 12, icon: "log-in", unit: "days" },
  { label: "Quizzes", streak: 4, icon: "help-circle", unit: "days" },
];

export default function StreakCarousel() {
  const theme = useThemeColors();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      {MOCK_STREAKS.map((item) => (
        <TouchableOpacity
          key={item.label}
          activeOpacity={0.7}
          style={[styles.card, { backgroundColor: theme.surface }]}
        >
          <Ionicons name={item.icon ?? "flame"} size={28} color={theme.primary} />
          <Text style={[styles.streakValue, { color: theme.text }]}>
            {item.streak}
            <Text style={[styles.unit, { color: theme.textMuted }]}> {item.unit}</Text>
          </Text>
          <Text style={[styles.streakLabel, { color: theme.textMuted }]}>{item.label}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity
        activeOpacity={0.7}
        style={[styles.button, { backgroundColor: theme.surface }]}
      >
        <Ionicons name="add" size={28} color={theme.primary} />
        <Text style={[styles.buttonText, { color: theme.primary }]}>New Streak</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 0,
    gap: 12,
    flexDirection: "row",
  },
  card: {
    width: 140,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    gap: 6,
  },
  streakValue: {
    fontSize: 28,
    fontWeight: "800",
  },
  unit: {
    fontSize: 14,
    fontWeight: "400",
  },
  streakLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  button: {
    width: 100,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
