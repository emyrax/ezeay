import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter, type Href } from "expo-router";
import { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { safeFont } from "../../constants/themes";
import { useAuth } from "../../contexts/AuthContext";
import { useExploreFeed } from "../../hooks/useExploreFeed";
import { useThemeColors } from "../../hooks/useTheme";
import { formatCount, formatRelativeTime } from "../../lib/threads/format";
import type { CommunityFeedPost } from "../../types/community";
import CommunityAvatar from "../CommunityAvatar";

interface CourseFeedPaneProps {
  refreshKey?: number;
  bottomInset?: number;
  horizontalInset?: number;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

export default function CourseFeedPane({
  refreshKey = 0,
  bottomInset = 0,
  horizontalInset = 16,
  onScroll,
}: CourseFeedPaneProps) {
  const colors = useThemeColors();
  const router = useRouter();
  const { getToken } = useAuth();
  const { posts, loading, refreshing, loadingMore, error, refresh, loadMore } =
    useExploreFeed(getToken, "courses", refreshKey);

  const openCourse = useCallback(
    (post: CommunityFeedPost) => {
      router.push(`/(course)/${post.id}/chapters` as Href);
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: CommunityFeedPost }) => (
      <CourseCard
        post={item}
        colors={colors}
        horizontalInset={horizontalInset}
        onPress={() => openCourse(item)}
      />
    ),
    [colors, horizontalInset, openCourse],
  );

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      style={styles.root}
      contentContainerStyle={[
        styles.listContent,
        { paddingBottom: bottomInset },
        posts.length === 0 && !loading && styles.listContentEmpty,
      ]}
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={32}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
      onEndReached={loadMore}
      onEndReachedThreshold={0.6}
      ListFooterComponent={
        loadingMore ? (
          <View style={styles.footer}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : null
      }
      ListEmptyComponent={
        loading ? (
          <View style={styles.state}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.stateText, { color: colors.textMuted }]}>
              Loading courses...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.state}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={34}
              color={colors.danger}
            />
            <Text style={[styles.stateTitle, { color: colors.text }]}>
              Courses couldn't load
            </Text>
            <Text style={[styles.stateText, { color: colors.textMuted }]}>
              {error}
            </Text>
            <Pressable
              onPress={refresh}
              style={[styles.retryBtn, { borderColor: colors.primary }]}
              accessibilityRole="button"
              accessibilityLabel="Retry loading courses"
            >
              <Text style={[styles.retryText, { color: colors.primary }]}>
                Try again
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.state}>
            <MaterialCommunityIcons
              name="book-open-page-variant-outline"
              size={38}
              color={colors.textMuted}
            />
            <Text style={[styles.stateTitle, { color: colors.text }]}>
              No courses yet
            </Text>
            <Text style={[styles.stateText, { color: colors.textMuted }]}>
              Publish a course to share it with the camp.
            </Text>
          </View>
        )
      }
    />
  );
}

function CourseCard({
  post,
  colors,
  horizontalInset,
  onPress,
}: {
  post: CommunityFeedPost;
  colors: ReturnType<typeof useThemeColors>;
  horizontalInset: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          marginHorizontal: horizontalInset,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Open ${post.title}`}
    >
      <View style={styles.cardHeader}>
        <CommunityAvatar
          uid={post.creatorId}
          photoURL={post.creatorAvatar}
          size={36}
        />
        <View style={styles.authorCopy}>
          <Text
            style={[styles.authorName, { color: colors.text }]}
            numberOfLines={1}
          >
            {post.creatorName || "Scholar"}
          </Text>
          <Text style={[styles.authorMeta, { color: colors.textMuted }]}>
            {formatRelativeTime(post.sharedAt)}
          </Text>
        </View>
        <View
          style={[styles.typeBadge, { backgroundColor: colors.primary + "18" }]}
        >
          <MaterialCommunityIcons
            name="book-open-variant"
            size={16}
            color={colors.primary}
          />
        </View>
      </View>

      {post.thumbnailUrl ? (
        <Image
          source={{ uri: post.thumbnailUrl }}
          style={[styles.preview, { backgroundColor: colors.surfaceAlt }]}
          contentFit="cover"
          accessibilityLabel={`Cover for ${post.title}`}
        />
      ) : null}

      <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
        {post.title}
      </Text>

      {post.description ? (
        <Text
          style={[styles.summary, { color: colors.textSecondary }]}
          numberOfLines={3}
        >
          {post.description}
        </Text>
      ) : null}

      <View style={styles.tags}>
        {post.category ? (
          <View style={[styles.tag, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[styles.tagText, { color: colors.textMuted }]}>
              {post.category}
            </Text>
          </View>
        ) : null}
        {post.difficulty ? (
          <View style={[styles.tag, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[styles.tagText, { color: colors.textMuted }]}>
              {post.difficulty}
            </Text>
          </View>
        ) : null}
        <View style={[styles.tag, { backgroundColor: colors.surfaceAlt }]}>
          <Text style={[styles.tagText, { color: colors.textMuted }]}>
            {post.totalChapters} chapters
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaGroup}>
          <Meta
            icon="heart-outline"
            value={formatCount(post.likeCount)}
            color={colors.textMuted}
          />
          <Meta
            icon="eye-outline"
            value={formatCount(post.viewCount)}
            color={colors.textMuted}
          />
          <Meta
            icon="star-outline"
            value={`${formatCount(post.rewardXp)} XP`}
            color={colors.textMuted}
          />
        </View>
        <View style={styles.metaAction}>
          <Text style={[styles.openText, { color: colors.primary }]}>
            Open course
          </Text>
          <MaterialCommunityIcons
            name="chevron-right"
            size={16}
            color={colors.primary}
          />
        </View>
      </View>
    </Pressable>
  );
}

function Meta({
  icon,
  value,
  color,
}: {
  icon: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.meta}>
      <MaterialCommunityIcons name={icon as never} size={14} color={color} />
      <Text style={[styles.metaText, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  listContent: {
    paddingTop: 10,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: "center",
  },
  card: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  authorCopy: {
    flex: 1,
    minWidth: 0,
  },
  authorName: {
    fontFamily: safeFont,
    fontSize: 13,
    fontWeight: "800",
  },
  authorMeta: {
    fontFamily: safeFont,
    fontSize: 10,
    marginTop: 2,
  },
  typeBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  preview: {
    width: "100%",
    height: 156,
    borderRadius: 12,
    marginTop: 12,
  },
  title: {
    fontFamily: safeFont,
    fontSize: 17,
    fontWeight: "800",
    marginTop: 12,
  },
  summary: {
    fontFamily: safeFont,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 12,
  },
  tag: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  tagText: {
    fontFamily: safeFont,
    fontSize: 10,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    rowGap: 6,
    marginTop: 12,
  },
  metaGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
    rowGap: 6,
    minWidth: 0,
  },
  metaAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: "auto",
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontFamily: safeFont,
    fontSize: 10,
    fontWeight: "700",
  },
  openText: {
    fontFamily: safeFont,
    fontSize: 10,
    fontWeight: "800",
  },
  state: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 40,
    gap: 8,
  },
  stateTitle: {
    fontFamily: safeFont,
    fontSize: 16,
    fontWeight: "800",
  },
  stateText: {
    fontFamily: safeFont,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 8,
    minHeight: 38,
    paddingHorizontal: 18,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  retryText: {
    fontFamily: safeFont,
    fontSize: 12,
    fontWeight: "800",
  },
  footer: {
    paddingVertical: 18,
    alignItems: "center",
  },
});
