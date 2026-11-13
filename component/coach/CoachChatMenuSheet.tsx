import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { coachColors, coachFont } from "../../constants/coachTheme";
import CoachSheet from "./CoachSheet";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

interface CoachChatMenuSheetProps {
  visible: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onHistory: () => void;
  onConnectors: () => void;
  onSuggestions: () => void;
}

const ITEMS: {
  id: "new" | "history" | "connectors" | "suggestions";
  icon: IconName;
  title: string;
  subtitle: string;
  tint: string;
  color: string;
}[] = [
  {
    id: "new",
    icon: "plus",
    title: "New chat",
    subtitle: "Start with a clean conversation",
    tint: coachColors.accentSoft,
    color: coachColors.accent,
  },
  {
    id: "history",
    icon: "history",
    title: "Chat history",
    subtitle: "Open a previous conversation",
    tint: "#EAF4FC",
    color: "#5B9BD5",
  },
  {
    id: "connectors",
    icon: "connection",
    title: "Agent connectors",
    subtitle: "Connect calendar, notes, tasks and more",
    tint: "#E7F6ED",
    color: "#5BB98C",
  },
  {
    id: "suggestions",
    icon: "lightbulb-on-outline",
    title: "Suggest other prompts",
    subtitle: "Get ideas for what to ask next",
    tint: "#FFF3DE",
    color: "#E0A34A",
  },
];

export default function CoachChatMenuSheet({
  visible,
  onClose,
  onNewChat,
  onHistory,
  onConnectors,
  onSuggestions,
}: CoachChatMenuSheetProps) {
  const actions = {
    new: onNewChat,
    history: onHistory,
    connectors: onConnectors,
    suggestions: onSuggestions,
  };

  return (
    <CoachSheet
      visible={visible}
      title="Chat tools"
      subtitle="Manage this conversation and what your coach can use."
      onClose={onClose}
    >
      {ITEMS.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => {
            onClose();
            actions[item.id]();
          }}
          style={styles.row}
          accessibilityRole="button"
          accessibilityLabel={item.title}
        >
          <View style={[styles.icon, { backgroundColor: item.tint }]}>
            <MaterialCommunityIcons
              name={item.icon}
              size={19}
              color={item.color}
            />
          </View>
          <View style={styles.copy}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
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
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: coachFont.semibold,
    fontSize: 14,
    color: coachColors.text,
  },
  subtitle: {
    fontFamily: coachFont.regular,
    fontSize: 11,
    lineHeight: 16,
    color: coachColors.textMuted,
  },
});
