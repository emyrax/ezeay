import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useCallback } from "react";
import { Linking, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { safeFont } from "../constants/themes";
import { useAuth } from "../contexts/AuthContext";
import { useThemeColors } from "../hooks/useTheme";
import {
  chapterDisplayNumber,
  formatCount,
  formatRelativeTime,
  threadLessonHref,
} from "../lib/threads/format";
import { useThreadStore } from "../store/threadStore";
import type { ThreadPost } from "../types/thread";
import CommunityAvatar from "./CommunityAvatar";

interface SubtopicThreadCardProps {
  post: ThreadPost;
  onPressSubtopic?: (post: ThreadPost) => void;
  onPressChapterThread?: (chapterId: string) => void;
  onPressProfile?: (post: ThreadPost) => void;
  onPressComments?: (post: ThreadPost) => void;
  hideAuthorActions?: boolean;
}

export default function SubtopicThreadCard({
  post,
  onPressSubtopic,
  onPressChapterThread,
  onPressProfile,
  onPressComments,
  hideAuthorActions = false,
}: SubtopicThreadCardProps) {
  const colors = useThemeColors();
  const { getToken, profile } = useAuth();
  const likePost = useThreadStore((s) => s.likePost);
  const followUser = useThreadStore((s) => s.followUser);
  const challengeUser = useThreadStore((s) => s.challengeUser);

  const isOwn = !!profile?.uid && profile.uid === post.authorId;
  const showAuthorActions = !isOwn && !hideAuthorActions;

  const handleShare = useCallback(async () => {
    const message = `${post.subtopicTitle} — ${post.content}\n\nLearn on Yuinx`;
    try {
      await Share.share({ message });
    } catch {
      // user dismissed or sharing is unavailable
    }
  }, [post.content, post.subtopicTitle]);

  const handleAttachment = useCallback(async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      // ignore broken links
    }
  }, []);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => onPressProfile?.(post)}
          accessibilityRole="button"
          accessibilityLabel={`Open ${post.author.name ?? "author"} profile`}
          hitSlop={6}
        >
          <CommunityAvatar uid={post.author.id} photoURL={post.author.avatarUrl} size={42} />
        </Pressable>

        <View style={styles.headerText}>
          <View style={styles.nameRow}>
            <Pressable onPress={() => onPressProfile?.(post)} hitSlop={6}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                {post.author.name ?? "Scholar"}
              </Text>
            </Pressable>
            <View style={[styles.iqBadge, { backgroundColor: colors.primary + "1A" }]}>
              <Text style={[styles.iqText, { color: colors.primary }]}>
                IQ {post.author.iqScore}
              </Text>
            </View>
            {post.examCategory !== "General" && (
              <View style={[styles.examBadge, { borderColor: colors.info }]}>
                <Text style={[styles.examText, { color: colors.info }]}>{post.examCategory}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
            @{post.author.handle} · {formatRelativeTime(post.createdAt)}
          </Text>
        </View>

        {showAuthorActions && (
          <Pressable
            onPress={() => followUser(post.authorId, getToken)}
            style={[
              styles.followBtn,
              {
                backgroundColor: post.author.isFollowing ? colors.surfaceAlt : colors.primary,
                borderColor: post.author.isFollowing ? colors.border : colors.primary,
              },
            ]}
            accessibilityRole="button"
          >
            <Text
              style={[
                styles.followText,
                { color: post.author.isFollowing ? colors.textSecondary : "#FFFFFF" },
              ]}
            >
              {post.author.isFollowing ? "Following" : "Follow"}
            </Text>
          </Pressable>
        )}
      </View>

      <Pressable
        onPress={() => onPressChapterThread?.(post.chapterId)}
        style={[styles.breadcrumb, { backgroundColor: colors.surfaceAlt }]}
        accessibilityRole="button"
        accessibilityLabel="Open chapter thread"
      >
        <MaterialCommunityIcons name="book-open-variant" size={14} color={colors.info} />
        <Text style={[styles.breadcrumbTitle, { color: colors.info }]} numberOfLines={1}>
          {post.chapterTitle}
        </Text>
        <Text style={[styles.breadcrumbMeta, { color: colors.textMuted }]}>
          Ch. {chapterDisplayNumber(post.chapterIndex)} · Part {post.partNumber}/{post.subtopicCount}
        </Text>
      </Pressable>

      <Pressable onPress={() => onPressSubtopic?.(post)}>
        <Text style={[styles.subtopicTitle, { color: colors.text }]}>{post.subtopicTitle}</Text>
        {post.content ? (
          <Text style={[styles.content, { color: colors.textSecondary }]} numberOfLines={4}>
            {post.content}
          </Text>
        ) : null}
      </Pressable>

      {post.attachments.map((attachment, index) =>
        attachment.type === "image" ? (
          <Pressable key={`${attachment.url}-${index}`} onPress={() => handleAttachment(attachment.url)}>
            <Image
              source={{ uri: attachment.url }}
              style={[styles.attachmentImage, { backgroundColor: colors.surfaceAlt }]}
              contentFit="cover"
              transition={150}
            />
          </Pressable>
        ) : (
          <Pressable
            key={`${attachment.url}-${index}`}
            onPress={() => handleAttachment(attachment.url)}
            style={[
              styles.fileRow,
              { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
            ]}
          >
            <View style={[styles.fileIcon, { backgroundColor: colors.primary + "18" }]}>
              <MaterialCommunityIcons
                name={attachment.type === "pdf" ? "file-pdf-box" : "file-document-outline"}
                size={22}
                color={colors.primary}
              />
            </View>
            <View style={styles.fileMeta}>
              <Text style={[styles.fileTitle, { color: colors.text }]} numberOfLines={1}>
                {attachment.type === "pdf" ? "PDF resource" : "Study attachment"}
              </Text>
              <Text style={[styles.fileSize, { color: colors.textMuted }]}>
                {attachment.fileSizeMb.toFixed(2)} MB
              </Text>
            </View>
            <Ionicons name="open-outline" size={18} color={colors.textMuted} />
          </Pressable>
        ),
      )}

      {post.mediaType === "visual_lesson" && (
        <Pressable
          onPress={() => onPressSubtopic?.(post)}
          style={[styles.lessonBtn, { borderColor: colors.primary, backgroundColor: colors.primary + "12" }]}
        >
          <Ionicons name="play-circle" size={20} color={colors.primary} />
          <Text style={[styles.lessonText, { color: colors.primary }]}>Open visual lesson</Text>
          <Text style={[styles.lessonPath, { color: colors.textMuted }]} numberOfLines={1}>
            {threadLessonHref(post)}
          </Text>
        </Pressable>
      )}

      <View style={[styles.actions, { borderTopColor: colors.border }]}>
        <Pressable
          onPress={() => likePost(post.id, getToken)}
          style={styles.actionBtn}
          accessibilityRole="button"
          accessibilityLabel={post.isLikedByMe ? "Unlike" : "Like"}
        >
          <Ionicons
            name={post.isLikedByMe ? "heart" : "heart-outline"}
            size={19}
            color={post.isLikedByMe ? colors.danger : colors.textSecondary}
          />
          <Text style={[styles.actionText, { color: colors.textSecondary }]}>
            {formatCount(post.likesCount)}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => onPressComments?.(post)}
          style={styles.actionBtn}
          accessibilityRole="button"
          accessibilityLabel="Comments"
        >
          <Ionicons name="chatbubble-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.actionText, { color: colors.textSecondary }]}>
            {formatCount(post.commentsCount)}
          </Text>
        </Pressable>

        <Pressable onPress={handleShare} style={styles.actionBtn} accessibilityRole="button">
          <Ionicons name="share-social-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.actionText, { color: colors.textSecondary }]}>Share</Text>
        </Pressable>

        {showAuthorActions && (
          <Pressable
            onPress={() => challengeUser(post.authorId, post.id, getToken)}
            style={styles.actionBtn}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons
              name={post.author.isChallenged ? "check-circle" : "sword-cross"}
              size={18}
              color={post.author.isChallenged ? colors.success : colors.textSecondary}
            />
            <Text
              style={[
                styles.actionText,
                { color: post.author.isChallenged ? colors.success : colors.textSecondary },
              ]}
            >
              {post.author.isChallenged ? "Challenged" : "Challenge"}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerText: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  name: {
    fontFamily: safeFont,
    fontSize: 15,
    fontWeight: "700",
    maxWidth: "58%",
  },
  iqBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  iqText: {
    fontFamily: safeFont,
    fontSize: 10,
    fontWeight: "800",
  },
  examBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
  },
  examText: {
    fontFamily: safeFont,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  meta: {
    fontFamily: safeFont,
    fontSize: 12,
    marginTop: 2,
  },
  followBtn: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  followText: {
    fontFamily: safeFont,
    fontSize: 12,
    fontWeight: "700",
  },
  breadcrumb: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginTop: 12,
  },
  breadcrumbTitle: {
    fontFamily: safeFont,
    fontSize: 12,
    fontWeight: "700",
    flexShrink: 1,
  },
  breadcrumbMeta: {
    fontFamily: safeFont,
    fontSize: 11,
    marginLeft: "auto",
  },
  subtopicTitle: {
    fontFamily: safeFont,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 10,
  },
  content: {
    fontFamily: safeFont,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  attachmentImage: {
    width: "100%",
    height: 170,
    borderRadius: 12,
    marginTop: 10,
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
  },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  fileMeta: {
    flex: 1,
  },
  fileTitle: {
    fontFamily: safeFont,
    fontSize: 13,
    fontWeight: "700",
  },
  fileSize: {
    fontFamily: safeFont,
    fontSize: 11,
    marginTop: 1,
  },
  lessonBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  lessonText: {
    fontFamily: safeFont,
    fontSize: 13,
    fontWeight: "700",
  },
  lessonPath: {
    fontFamily: safeFont,
    fontSize: 10,
    flexShrink: 1,
    marginLeft: "auto",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 12,
    paddingTop: 10,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minHeight: 36,
    paddingHorizontal: 6,
  },
  actionText: {
    fontFamily: safeFont,
    fontSize: 12,
    fontWeight: "600",
  },
});
