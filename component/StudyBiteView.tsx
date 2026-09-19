import React from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { useThemeColors } from "../hooks/useTheme";
import type { StudyBite } from "../types/study";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface Props {
  bite: StudyBite;
  index: number;
  total: number;
}

export default function StudyBiteView({ bite, index, total }: Props) {
  const theme = useThemeColors();

  return (
    <View style={[styles.container, { width: SCREEN_WIDTH - 40 }]}>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.header}>
          <View style={[styles.badge, { backgroundColor: theme.primary + "25" }]}>
            <Text style={[styles.badgeText, { color: theme.primary }]}>
              {index + 1} / {total}
            </Text>
          </View>
        </View>
        <Text style={styles.biteTitle}>{bite.title}</Text>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <Text style={[styles.biteContent, { color: theme.textSecondary }]}>
          {bite.content}
        </Text>
        <View style={styles.quizHint}>
          <Text style={[styles.quizHintText, { color: theme.textMuted }]}>
            {bite.quizzes?.length ?? 0} question{(bite.quizzes?.length ?? 0) !== 1 ? "s" : ""} available
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    minHeight: 300,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 8,
  },
  badge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  biteTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    marginTop: 4,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  biteContent: {
    fontSize: 15,
    lineHeight: 24,
  },
  quizHint: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  quizHintText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
