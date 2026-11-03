import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { safeFont } from "../constants/themes";
import { useThemeColors } from "../hooks/useTheme";
import { focusProgress, nextRecommendedFocus } from "../lib/focus/selectors";
import { useProgressStore } from "../store/courseProgressStore";
import { useThreadLearningStore } from "../store/threadLearningStore";
import type { FocusSubtopic } from "../types/learning";

interface FocusRailProps {
  width: number;
  onOpenFocus: (item: FocusSubtopic) => void;
}

export default function FocusRail({ width, onOpenFocus }: FocusRailProps) {
  const colors = useThemeColors();
  const focusMap = useThreadLearningStore((state) => state.focus);
  const completedLessons = useThreadLearningStore((state) => state.completedLessons);
  const passedQuizzes = useProgressStore((state) => state.passedQuizzes);
  const items = Object.values(focusMap).sort((a, b) => a.addedAt.localeCompare(b.addedAt));

  const isPassed = (item: FocusSubtopic) =>
    !!passedQuizzes[`${item.courseId}_${item.chapterIndex}_${item.subtopicIndex}`];
  const progress = focusProgress(items, isPassed);
  const next = nextRecommendedFocus(items, isPassed);

  return (
    <View style={[styles.rail, { width }]}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>FOCUS</Text>
            <Text style={[styles.title, { color: colors.text }]}>Your learning path</Text>
          </View>
          <View style={[styles.countBadge, { backgroundColor: colors.primary + "1A" }]}>
            <Text style={[styles.countText, { color: colors.primary }]}>{progress.total}</Text>
          </View>
        </View>

        <View style={styles.progressRow}>
          <View style={[styles.track, { backgroundColor: colors.surfaceAlt }]}>
            <View
              style={[
                styles.fill,
                {
                  backgroundColor: colors.primary,
                  width: `${progress.percent}%` as `${number}%`,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            {progress.completed}/{progress.total}
          </Text>
        </View>

        {items.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="target" size={28} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Add a subtopic to focus and it will appear here.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {items.slice(0, 6).map((item) => {
              const passed = isPassed(item);
              const lessonDone = !!completedLessons[item.id];
              return (
                <Pressable
                  key={item.id}
                  onPress={() => onOpenFocus(item)}
                  style={styles.item}
                  accessibilityRole="button"
                  accessibilityLabel={`Open focus ${item.subtopicTitle}`}
                >
                  <View
                    style={[
                      styles.status,
                      {
                        backgroundColor: passed
                          ? colors.success + "1A"
                          : lessonDone
                            ? colors.info + "1A"
                            : colors.surfaceAlt,
                      },
                    ]}
                  >
                    <Ionicons
                      name={passed ? "checkmark" : lessonDone ? "play" : "ellipse-outline"}
                      size={14}
                      color={passed ? colors.success : lessonDone ? colors.info : colors.textMuted}
                    />
                  </View>
                  <View style={styles.itemCopy}>
                    <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
                      {item.subtopicTitle}
                    </Text>
                    <Text style={[styles.itemMeta, { color: colors.textMuted }]} numberOfLines={1}>
                      Module {item.chapterIndex + 1} · Lesson {item.partNumber}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.eyebrow, { color: colors.info }]}>RECOMMENDED NEXT</Text>
        {next ? (
          <Pressable
            onPress={() => onOpenFocus(next)}
            style={[styles.nextCard, { backgroundColor: colors.surfaceAlt }]}
            accessibilityRole="button"
          >
            <View style={styles.nextHeader}>
              <Text style={[styles.nextTitle, { color: colors.text }]} numberOfLines={2}>
                {next.subtopicTitle}
              </Text>
              <Ionicons name="arrow-forward" size={17} color={colors.primary} />
            </View>
            <Text style={[styles.nextMeta, { color: colors.textMuted }]} numberOfLines={1}>
              {next.courseTitle || next.chapterTitle}
            </Text>
            <View style={styles.nextFooter}>
              <View style={[styles.dot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.nextAction, { color: colors.primary }]}>
                Continue lesson
              </Text>
            </View>
          </Pressable>
        ) : (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {items.length > 0
              ? "Every focused subtopic is complete."
              : "Focus a subtopic to get your next step."}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    paddingVertical: 16,
    paddingRight: 8,
    gap: 14,
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  eyebrow: {
    fontFamily: safeFont,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  title: {
    fontFamily: safeFont,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 2,
  },
  countBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: {
    fontFamily: safeFont,
    fontSize: 12,
    fontWeight: "800",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },
  progressText: {
    fontFamily: safeFont,
    fontSize: 11,
    fontWeight: "700",
  },
  list: {
    marginTop: 12,
    gap: 4,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    minHeight: 44,
  },
  status: {
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  itemCopy: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    fontFamily: safeFont,
    fontSize: 13,
    fontWeight: "700",
  },
  itemMeta: {
    fontFamily: safeFont,
    fontSize: 11,
    marginTop: 1,
  },
  empty: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 18,
  },
  emptyText: {
    fontFamily: safeFont,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  nextCard: {
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
    gap: 5,
  },
  nextHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  nextTitle: {
    flex: 1,
    fontFamily: safeFont,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 19,
  },
  nextMeta: {
    fontFamily: safeFont,
    fontSize: 11,
  },
  nextFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  nextAction: {
    fontFamily: safeFont,
    fontSize: 11,
    fontWeight: "700",
  },
});
