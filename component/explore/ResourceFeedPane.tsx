import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
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
import type {
  CommunityFeedPost,
  ExploreResourcePost,
  ResourceType,
} from "../../types/community";
import CommunityAvatar from "../CommunityAvatar";

interface ResourceFeedPaneProps {
  refreshKey?: number;
  bottomInset?: number;
}

const TYPE_ICONS: Record<ResourceType, string> = {
  handwritten: "draw-pen",
  pdf: "file-pdf-box",
  text: "text-box-outline",
  image: "image-outline",
  audio: "headphones",
  other: "paperclip",
};

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

async function openResource(resource: ExploreResourcePost) {
  const url = resource.storageUrl || resource.previewUrl;
  if (!url) {
    Alert.alert(
      resource.title || "Resource",
      resource.previewText ||
        resource.summary ||
        "This resource is text-only. Its summary is shown above.",
    );
    return;
  }
  try {
    await Linking.openURL(url);
  } catch (err) {
    console.error("[ResourceFeedPane] open failed:", err);
    Alert.alert("Couldn't open resource", "Please try again.");
  }
}

export default function ResourceFeedPane({
  refreshKey = 0,
  bottomInset = 0,
}: ResourceFeedPaneProps) {
  const colors = useThemeColors();
  const { getToken } = useAuth();
  const { posts, loading, refreshing, loadingMore, error, refresh, loadMore } =
    useExploreFeed(getToken, "resources", refreshKey);

  const renderItem = useCallback(
    ({ item }: { item: CommunityFeedPost }) => {
      const resource = item.resourcePost;
      if (!resource) return null;
      return (
        <ResourceCard
          resource={resource}
          colors={colors}
          onPress={() => openResource(resource)}
        />
      );
    },
    [colors],
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
              Loading resources...
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
              Resources couldn't load
            </Text>
            <Text style={[styles.stateText, { color: colors.textMuted }]}>
              {error}
            </Text>
            <Pressable
              onPress={refresh}
              style={[styles.retryBtn, { borderColor: colors.primary }]}
              accessibilityRole="button"
              accessibilityLabel="Retry loading resources"
            >
              <Text style={[styles.retryText, { color: colors.primary }]}>
                Try again
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.state}>
            <MaterialCommunityIcons
              name="folder-open-outline"
              size={38}
              color={colors.textMuted}
            />
            <Text style={[styles.stateTitle, { color: colors.text }]}>
              No resources yet
            </Text>
            <Text style={[styles.stateText, { color: colors.textMuted }]}>
              Share notes, PDFs, or images to get the camp started.
            </Text>
          </View>
        )
      }
    />
  );
}

function ResourceCard({
  resource,
  colors,
  onPress,
}: {
  resource: ExploreResourcePost;
  colors: ReturnType<typeof useThemeColors>;
  onPress: () => void;
}) {
  const tags = resource.tags.slice(0, 3);
  const fileSize = formatFileSize(resource.fileSizeBytes);
  const hasPreview = Boolean(resource.previewUrl);
  const icon = TYPE_ICONS[resource.resourceType] ?? "paperclip";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Open ${resource.title}`}
    >
      <View style={styles.cardHeader}>
        <CommunityAvatar
          uid={resource.authorId}
          photoURL={resource.authorAvatar}
          size={36}
        />
        <View style={styles.authorCopy}>
          <Text
            style={[styles.authorName, { color: colors.text }]}
            numberOfLines={1}
          >
            {resource.authorName || "Scholar"}
          </Text>
          <Text style={[styles.authorMeta, { color: colors.textMuted }]}>
            {formatRelativeTime(resource.createdAt)} ·{" "}
            {resource.resourceType.toUpperCase()}
          </Text>
        </View>
        <View
          style={[styles.typeBadge, { backgroundColor: colors.primary + "18" }]}
        >
          <MaterialCommunityIcons
            name={icon as never}
            size={16}
            color={colors.primary}
          />
        </View>
      </View>

      <Text
        style={[styles.title, { color: colors.text }]}
        numberOfLines={2}
      >
        {resource.title}
      </Text>

      {resource.summary ? (
        <Text
          style={[styles.summary, { color: colors.textSecondary }]}
          numberOfLines={3}
        >
          {resource.summary}
        </Text>
      ) : null}

      {hasPreview ? (
        <Image
          source={{ uri: resource.previewUrl ?? "" }}
          style={[styles.preview, { backgroundColor: colors.surfaceAlt }]}
          contentFit="cover"
          accessibilityLabel={`Preview of ${resource.title}`}
        />
      ) : null}

      {tags.length > 0 ? (
        <View style={styles.tags}>
          {tags.map((tag) => (
            <View
              key={tag}
              style={[styles.tag, { backgroundColor: colors.surfaceAlt }]}
            >
              <Text style={[styles.tagText, { color: colors.textMuted }]}>
                {tag}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.metaRow}>
        <View style={styles.metaGroup}>
          <Meta
            icon="heart-outline"
            value={formatCount(resource.likes)}
            color={colors.textMuted}
          />
          <Meta
            icon="bookmark-outline"
            value={formatCount(resource.saves)}
            color={colors.textMuted}
          />
          <Meta
            icon="eye-outline"
            value={formatCount(resource.views)}
            color={colors.textMuted}
          />
          {fileSize ? (
            <Text style={[styles.fileSize, { color: colors.textMuted }]}>
              {fileSize}
            </Text>
          ) : null}
        </View>
        <View style={styles.metaAction}>
          <MaterialCommunityIcons
            name="open-in-new"
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
    marginHorizontal: 16,
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
  preview: {
    width: "100%",
    height: 156,
    borderRadius: 12,
    marginTop: 12,
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
  fileSize: {
    fontFamily: safeFont,
    fontSize: 10,
    fontWeight: "600",
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
