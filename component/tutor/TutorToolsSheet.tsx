import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { fontFamily } from "../../constants/themes";
import { useThemeColors } from "../../hooks/useTheme";

interface TutorToolsSheetProps {
  visible: boolean;
  onClose: () => void;
  onPlan: () => void;
  onQuiz: () => void;
  onSettings: () => void;
}

const TOOLS = [
  {
    key: "plan" as const,
    icon: "calendar-month-outline" as const,
    title: "Study plan",
    description: "Build a weekly revision plan and save it to your Schedule.",
  },
  {
    key: "quiz" as const,
    icon: "help-circle-outline" as const,
    title: "Practice quiz",
    description: "Generate questions from a topic or one of your materials.",
  },
  {
    key: "settings" as const,
    icon: "brain" as const,
    title: "Agent memory",
    description: "Review what the agent remembers and manage its settings.",
  },
];

export default function TutorToolsSheet({
  visible,
  onClose,
  onPlan,
  onQuiz,
  onSettings,
}: TutorToolsSheetProps) {
  const theme = useThemeColors();
  const actions = {
    plan: onPlan,
    quiz: onQuiz,
    settings: onSettings,
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.dismiss} onPress={onClose} accessibilityLabel="Close tools" />
        <View style={[styles.sheet, { backgroundColor: theme.bg }]}>
          <View style={[styles.handle, { backgroundColor: theme.textMuted }]} />
          <View style={styles.header}>
            <View>
            <Text style={[styles.title, { color: theme.text }]}>Agent tools</Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              Turn a question into a plan, memory update, or quick check.
            </Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close tools"
            >
              <MaterialCommunityIcons name="close" size={22} color={theme.textMuted} />
            </Pressable>
          </View>

          <View style={styles.list}>
            {TOOLS.map((tool) => (
              <Pressable
                key={tool.key}
                onPress={
                  tool.key === "plan"
                    ? actions.plan
                    : tool.key === "quiz"
                      ? actions.quiz
                      : actions.settings
                }
                style={[
                  styles.card,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
                accessibilityRole="button"
                accessibilityLabel={tool.title}
              >
                <View style={[styles.icon, { backgroundColor: theme.primaryLight }]}>
                  <MaterialCommunityIcons name={tool.icon} size={22} color={theme.primary} />
                </View>
                <View style={styles.cardCopy}>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>{tool.title}</Text>
                  <Text style={[styles.cardText, { color: theme.textMuted }]}>
                    {tool.description}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={22}
                  color={theme.textMuted}
                />
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  dismiss: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 30,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },
  title: {
    fontFamily,
    fontSize: 18,
    fontWeight: "700",
  },
  subtitle: {
    fontFamily,
    fontSize: 12,
    marginTop: 3,
  },
  list: {
    gap: 10,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardCopy: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    fontFamily,
    fontSize: 14,
    fontWeight: "700",
  },
  cardText: {
    fontFamily,
    fontSize: 11,
    lineHeight: 16,
  },
});
