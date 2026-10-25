import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useThemeColors } from "../hooks/useTheme";
import type { CommunityFeedPost } from "../types/community";

export interface UpNextItem {
  key: string;
  post: CommunityFeedPost;
  chapterTitle: string;
  subtopicTitle: string;
}

interface Props {
  items: UpNextItem[];
  activeKey: string | null;
  onSelect: (key: string) => void;
  onJumpToTop: () => void;
  style?: StyleProp<ViewStyle>;
}

export default function ExploreUpNextPanel({
  items,
  activeKey,
  onSelect,
  onJumpToTop,
  style,
}: Props) {
  const theme = useThemeColors();
  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.key === activeKey),
  );
  const current = items[activeIndex];
  const upcoming = items.slice(activeIndex + 1, activeIndex + 9);

  return (
    <View
      style={[
        styles.panel,
        { backgroundColor: theme.surface, borderColor: theme.border },
        style,
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: theme.textMuted }]}>UP NEXT</Text>
        <View style={[styles.countBadge, { backgroundColor: theme.primary + "18" }]}>
          <Text style={[styles.countText, { color: theme.primary }]}>{items.length}</Text>
        </View>
      </View>

      {current && (
        <View style={[styles.currentCard, { backgroundColor: theme.surfaceAlt }]}>
          <View style={[styles.accentBar, { backgroundColor: theme.primary }]} />
          <View style={styles.currentBody}>
            <Text style={[styles.currentLabel, { color: theme.textMuted }]}>
              NOW EXPLORING
            </Text>
            <Text
              style={[styles.currentTitle, { color: theme.text }]}
              numberOfLines={2}
            >
              {current.post.title}
            </Text>
            <Text
              style={[styles.currentSubtopic, { color: theme.textSecondary }]}
              numberOfLines={1}
            >
              {current.subtopicTitle}
            </Text>
            <View style={styles.metaRow}>
              <Text style={[styles.metaText, { color: theme.textMuted }]} numberOfLines={1}>
                {current.post.creatorName}
              </Text>
              <Text style={[styles.metaDot, { color: theme.textMuted }]}>·</Text>
              <Text style={[styles.metaText, { color: theme.textMuted }]} numberOfLines={1}>
                {current.chapterTitle}
              </Text>
            </View>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {upcoming.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="check-decagram-outline" size={26} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              You&apos;re at the end of this feed.
            </Text>
          </View>
        ) : (
          upcoming.map((item, index) => (
            <Pressable
              key={item.key}
              onPress={() => onSelect(item.key)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.subtopicTitle}`}
            >
              <View style={[styles.index, { backgroundColor: theme.surfaceAlt }]}>
                <Text style={[styles.indexText, { color: theme.textSecondary }]}>
                  {activeIndex + index + 2}
                </Text>
              </View>
              <View style={styles.rowBody}>
                <Text
                  style={[styles.rowTitle, { color: theme.text }]}
                  numberOfLines={2}
                >
                  {item.subtopicTitle}
                </Text>
                <Text
                  style={[styles.rowMeta, { color: theme.textMuted }]}
                  numberOfLines={1}
                >
                  {item.chapterTitle} · {item.post.category.replace("-", " ")}
                </Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={18}
                color={theme.textMuted}
              />
            </Pressable>
          ))
        )}
      </ScrollView>

      <Pressable
        onPress={onJumpToTop}
        style={({ pressed }) => [
          styles.footer,
          { borderTopColor: theme.border },
          pressed && styles.rowPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Back to the first lesson"
      >
        <MaterialCommunityIcons name="arrow-up" size={16} color={theme.primary} />
        <Text style={[styles.footerText, { color: theme.primary }]}>
          Back to the first lesson
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    height: "100%",
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  countBadge: {
    minWidth: 28,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  countText: {
    fontSize: 12,
    fontWeight: "800",
  },
  currentCard: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    overflow: "hidden",
  },
  accentBar: {
    width: 3,
    borderRadius: 2,
    marginRight: 12,
  },
  currentBody: {
    flex: 1,
    gap: 4,
  },
  currentLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  currentTitle: {
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 21,
  },
  currentSubtopic: {
    fontSize: 13,
    fontWeight: "600",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  metaText: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "600",
  },
  metaDot: {
    fontSize: 11,
  },
  list: {
    flex: 1,
    minHeight: 0,
  },
  listContent: {
    gap: 4,
    paddingBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  rowPressed: {
    opacity: 0.65,
  },
  index: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  indexText: {
    fontSize: 11,
    fontWeight: "800",
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 17,
  },
  rowMeta: {
    fontSize: 11,
    fontWeight: "500",
  },
  empty: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 24,
    paddingHorizontal: 12,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 14,
    marginTop: 8,
  },
  footerText: {
    fontSize: 12,
    fontWeight: "800",
  },
});
