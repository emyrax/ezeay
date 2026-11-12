import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { safeFont } from "../../constants/themes";
import { useThemeColors } from "../../hooks/useTheme";
import type { FocusSubtopic } from "../../types/learning";
import type { ThreadPost } from "../../types/thread";
import FocusRail from "../FocusRail";

interface StatsRightRailProps {
  width: number;
  posts: ThreadPost[];
  onOpenFocus: (item: FocusSubtopic) => void;
  onOpenComments: (postId: string) => void;
}

export default function StatsRightRail({
  width,
  posts,
  onOpenFocus,
  onOpenComments,
}: StatsRightRailProps) {
  return (
    <View style={{ width }}>
      <FocusRail width={width} onOpenFocus={onOpenFocus} />
      <ActiveDiscussions posts={posts} width={width} onPress={onOpenComments} />
    </View>
  );
}

function ActiveDiscussions({
  posts,
  width,
  onPress,
}: {
  posts: ThreadPost[];
  width: number;
  onPress: (postId: string) => void;
}) {
  const colors = useThemeColors();
  const discussions = useMemo(
    () =>
      [...posts]
        .filter((post) => post.commentsCount > 0)
        .sort((a, b) => b.commentsCount - a.commentsCount)
        .slice(0, 4),
    [posts],
  );

  return (
    <View
      style={[
        styles.rail,
        { width, backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.eyebrow, { color: colors.info }]}>
        ACTIVE DISCUSSIONS
      </Text>
      {discussions.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textMuted }]}>
          Conversations will surface here as learners reply.
        </Text>
      ) : (
        <View style={styles.list}>
          {discussions.map((post) => (
            <Pressable
              key={post.id}
              onPress={() => onPress(post.id)}
              style={styles.row}
              accessibilityRole="button"
              accessibilityLabel={`Open discussion for ${post.subtopicTitle}`}
            >
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: colors.primary + "16" },
                ]}
              >
                <MaterialCommunityIcons
                  name="message-text-outline"
                  size={16}
                  color={colors.primary}
                />
              </View>
              <View style={styles.copy}>
                <Text
                  style={[styles.title, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {post.subtopicTitle}
                </Text>
                <Text
                  style={[styles.meta, { color: colors.textMuted }]}
                  numberOfLines={1}
                >
                  {post.commentsCount}{" "}
                  {post.commentsCount === 1 ? "reply" : "replies"} ·{" "}
                  {post.courseTitle}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    marginTop: 14,
    marginRight: 8,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  eyebrow: {
    fontFamily: safeFont,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  list: {
    marginTop: 10,
    gap: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    minHeight: 46,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: safeFont,
    fontSize: 13,
    fontWeight: "700",
  },
  meta: {
    fontFamily: safeFont,
    fontSize: 10,
    marginTop: 2,
  },
  empty: {
    fontFamily: safeFont,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
});
