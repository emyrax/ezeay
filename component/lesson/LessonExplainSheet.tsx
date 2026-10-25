import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "../../hooks/useTheme";
import type { LessonExplainAction } from "../../types/lesson";

interface Props {
  visible: boolean;
  action: LessonExplainAction | null;
  text: string | null;
  loading: boolean;
  error: string | null;
  onAction: (action: LessonExplainAction) => void;
  onRetry: () => void;
  onClose: () => void;
}

const ACTIONS: {
  id: LessonExplainAction;
  label: string;
  icon: "sparkles-outline" | "bulb-outline" | "help-circle-outline";
}[] = [
  { id: "simplify", label: "Simpler", icon: "sparkles-outline" },
  { id: "example", label: "Example", icon: "bulb-outline" },
  { id: "why", label: "Why it matters", icon: "help-circle-outline" },
];

export default function LessonExplainSheet({
  visible,
  action,
  text,
  loading,
  error,
  onAction,
  onRetry,
  onClose,
}: Props) {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.bg,
              borderColor: theme.border,
              paddingBottom: Math.max(insets.bottom, 18),
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: theme.border }]} />
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={[styles.eyebrow, { color: theme.primary }]}>
                Need a hand?
              </Text>
              <Text style={[styles.title, { color: theme.text }]}>
                Unpack this slide
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: theme.surfaceAlt }]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close explanation"
            >
              <Ionicons name="close" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.actions}>
            {ACTIONS.map((entry) => {
              const active = action === entry.id;
              return (
                <TouchableOpacity
                  key={entry.id}
                  style={[
                    styles.actionPill,
                    {
                      backgroundColor: active ? theme.primary : theme.surface,
                      borderColor: active ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => onAction(entry.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Ionicons
                    name={entry.icon}
                    size={15}
                    color={active ? "#FFFFFF" : theme.textSecondary}
                  />
                  <Text
                    style={[
                      styles.actionText,
                      { color: active ? "#FFFFFF" : theme.textSecondary },
                    ]}
                  >
                    {entry.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <ScrollView
            style={styles.responseScroll}
            contentContainerStyle={styles.responseContent}
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <View style={styles.stateWrap}>
                <ActivityIndicator size="small" color={theme.primary} />
                <Text style={[styles.stateText, { color: theme.textSecondary }]}>
                  Thinking it through...
                </Text>
              </View>
            ) : error ? (
              <View
                style={[
                  styles.errorCard,
                  {
                    backgroundColor: theme.danger + "10",
                    borderColor: theme.danger + "30",
                  },
                ]}
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={20}
                  color={theme.danger}
                />
                <Text style={[styles.errorText, { color: theme.danger }]}>
                  {error}
                </Text>
                <TouchableOpacity
                  style={[styles.retryButton, { backgroundColor: theme.surface }]}
                  onPress={onRetry}
                  accessibilityRole="button"
                >
                  <Text style={[styles.retryText, { color: theme.text }]}>
                    Try again
                  </Text>
                </TouchableOpacity>
              </View>
            ) : text ? (
              <Text style={[styles.responseText, { color: theme.textSecondary }]}>
                {text}
              </Text>
            ) : (
              <View style={styles.stateWrap}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={26}
                  color={theme.textMuted}
                />
                <Text style={[styles.stateText, { color: theme.textMuted }]}>
                  Choose an option above for a closer look at this idea.
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 18,
    paddingTop: 9,
    maxHeight: "78%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 15,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 21,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: "700",
  },
  responseScroll: {
    marginTop: 14,
    flexShrink: 1,
  },
  responseContent: {
    paddingBottom: 8,
  },
  stateWrap: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 34,
    paddingHorizontal: 18,
  },
  stateText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "500",
    textAlign: "center",
  },
  responseText: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "500",
    paddingVertical: 8,
  },
  errorCard: {
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
    textAlign: "center",
  },
  retryButton: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 2,
  },
  retryText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
