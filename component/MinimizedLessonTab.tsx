import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { safeFont } from "../constants/themes";
import { useThemeColors } from "../hooks/useTheme";
import type {
  VisualLessonMiniState,
  VisualLessonMiniTone,
} from "../lib/lesson/visualLessonStatus";
import type { ThreadPost } from "../types/thread";
import { createShadow } from "@/lib/shadow";

interface MinimizedLessonTabProps {
  post: ThreadPost;
  state: VisualLessonMiniState;
  bottom: number;
  right: number;
  onRestore: () => void;
  onClose: () => void;
}

const TONE_ICON: Record<
  VisualLessonMiniTone,
  React.ComponentProps<typeof Ionicons>["name"]
> = {
  loading: "hourglass-outline",
  ready: "play-circle",
  error: "alert-circle",
  complete: "checkmark-circle",
};

export default function MinimizedLessonTab({
  post,
  state,
  bottom,
  right,
  onRestore,
  onClose,
}: MinimizedLessonTabProps) {
  const colors = useThemeColors();
  const toneColor =
    state.tone === "ready"
      ? colors.primary
      : state.tone === "complete"
        ? colors.success
        : state.tone === "error"
          ? colors.danger
          : colors.info;

  return (
    <View
      style={[
        styles.wrap,
        {
          bottom,
          right,
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <Pressable
        onPress={onRestore}
        style={styles.main}
        accessibilityRole="button"
        accessibilityLabel={`Open minimized visual lesson: ${state.title}`}
      >
        <View style={[styles.iconWrap, { backgroundColor: toneColor + "18" }]}>
          {state.tone === "loading" ? (
            <ActivityIndicator size="small" color={toneColor} />
          ) : (
            <Ionicons name={TONE_ICON[state.tone]} size={20} color={toneColor} />
          )}
        </View>
        <View style={styles.copy}>
          <Text style={[styles.eyebrow, { color: toneColor }]}>VISUAL LESSON</Text>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {state.title}
          </Text>
          <Text style={[styles.detail, { color: colors.textMuted }]} numberOfLines={1}>
            {state.detail}
          </Text>
          <Text style={[styles.lesson, { color: colors.textSecondary }]} numberOfLines={1}>
            {post.subtopicTitle}
          </Text>
        </View>
        <Ionicons name="chevron-up" size={18} color={colors.textMuted} />
      </Pressable>

      <Pressable
        onPress={onClose}
        style={[styles.closeBtn, { backgroundColor: colors.surfaceAlt }]}
        accessibilityRole="button"
        accessibilityLabel="Cancel visual lesson"
        hitSlop={6}
      >
        <Ionicons name="close" size={14} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    width: 320,
    maxWidth: "92%",
    borderWidth: 1,
    borderRadius: 16,
    padding: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    zIndex: 40,
    elevation: 10,
    ...createShadow("#000000", 0, 8, 16, 0.28),
  },
  main: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontFamily: safeFont,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  title: {
    fontFamily: safeFont,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 1,
  },
  detail: {
    fontFamily: safeFont,
    fontSize: 11,
    marginTop: 1,
  },
  lesson: {
    fontFamily: safeFont,
    fontSize: 10,
    marginTop: 2,
  },
  closeBtn: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
});
