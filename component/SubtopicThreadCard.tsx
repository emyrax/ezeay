import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useCallback, useState } from "react";
import {
  Linking,
  Pressable,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { safeFont } from "../constants/themes";
import { useAuth } from "../contexts/AuthContext";
import { useThemeColors } from "../hooks/useTheme";
import { eventBus } from "../lib/eventBus";
import {
  chapterDisplayNumber,
  formatCount,
  formatRelativeTime,
} from "../lib/threads/format";
import { getThreadCardMetrics } from "../lib/threads/layout";
import { useEnrollmentStore } from "../store/courseEnrollmentStore";
import { useProgressStore } from "../store/courseProgressStore";
import { useThreadLearningStore } from "../store/threadLearningStore";
import { useThreadStore } from "../store/threadStore";
import type { ThreadPost } from "../types/thread";
import CommunityAvatar from "./CommunityAvatar";

interface SubtopicThreadCardProps {
  post: ThreadPost;
  onPressSubtopic?: (post: ThreadPost) => void;
  onPressChapterThread?: (chapterId: string) => void;
  onPressProfile?: (post: ThreadPost) => void;
  onPressComments?: (post: ThreadPost) => void;
  onPressQuiz?: (post: ThreadPost) => void;
  onPressLesson?: (post: ThreadPost) => void;
  hideAuthorActions?: boolean;
  horizontalInset?: number;
}

export default function SubtopicThreadCard({
  post,
  onPressSubtopic,
  onPressChapterThread,
  onPressProfile,
  onPressComments,
  onPressQuiz,
  onPressLesson,
  hideAuthorActions = false,
  horizontalInset = 16,
}: SubtopicThreadCardProps) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const metrics = getThreadCardMetrics(width);
  const { getToken, profile } = useAuth();
  const likePost = useThreadStore((s) => s.likePost);
  const followUser = useThreadStore((s) => s.followUser);
  const enrollments = useEnrollmentStore((s) => s.enrollments);
  const enroll = useEnrollmentStore((s) => s.enroll);
  const unenroll = useEnrollmentStore((s) => s.unenroll);
  const quizSession = useThreadLearningStore((s) => s.quizSessions[post.id]);
  const lessonDone = useThreadLearningStore((s) => !!s.completedLessons[post.id]);
  const quizPassed = useProgressStore((s) =>
    s.isQuizPassed(post.courseId, post.chapterIndex, post.subtopicIndex),
  );

  const enrollment = enrollments.find((e) => e.courseId === post.courseId);
  const enrolled = !!enrollment;
  const [enrollPending, setEnrollPending] = useState(false);

  const isOwn = !!profile?.uid && profile.uid === post.authorId;
  const showAuthorActions = !isOwn && !hideAuthorActions;

  const handleToggleEnroll = useCallback(async () => {
    if (enrollPending) return;
    if (!profile?.uid) {
      eventBus.emit("toast:error", { title: "Sign in to enroll" });
      return;
    }
    setEnrollPending(true);
    try {
      if (enrollment) {
        const res = await unenroll(enrollment.id, getToken);
        if (res.success) {
          eventBus.emit("toast:success", { title: "Left course" });
        } else {
          eventBus.emit("toast:error", {
            title: res.error ?? "Couldn't leave course.",
          });
        }
      } else {
        const res = await enroll(profile.uid, post.courseId, getToken);
        if (res.success) {
          eventBus.emit("toast:success", { title: "Enrolled" });
        } else {
          eventBus.emit("toast:error", {
            title: res.error ?? "Couldn't enroll.",
          });
        }
      }
    } catch (err) {
      console.error("[SubtopicThreadCard] enroll toggle failed:", err);
      eventBus.emit("toast:error", { title: "Couldn't update enrollment." });
    } finally {
      setEnrollPending(false);
    }
  }, [
    enroll,
    enrollPending,
    enrollment,
    getToken,
    post.courseId,
    profile?.uid,
    unenroll,
  ]);

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
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          marginHorizontal: horizontalInset,
          marginBottom: metrics.cardBottom,
          padding: metrics.padding,
          borderRadius: metrics.radius,
        },
      ]}
    >
      <View style={[styles.header, { gap: metrics.headerGap }]}>
        <Pressable
          onPress={() => onPressProfile?.(post)}
          accessibilityRole="button"
          accessibilityLabel={`Open ${post.author.name ?? "author"} profile`}
          hitSlop={6}
        >
          <CommunityAvatar
            uid={post.author.id}
            photoURL={post.author.avatarUrl}
            size={metrics.avatar}
          />
        </Pressable>

        <View style={styles.headerText}>
          <View style={[styles.nameRow, { gap: Math.max(4, metrics.headerGap - 4) }]}>
            <Pressable
              onPress={() => onPressProfile?.(post)}
              hitSlop={6}
              style={styles.namePressable}
            >
              <Text
                style={[styles.name, { color: colors.text, fontSize: metrics.nameFont }]}
                numberOfLines={1}
              >
                {post.author.name ?? "Scholar"}
              </Text>
            </Pressable>
            <View style={[styles.iqBadge, { backgroundColor: colors.primary + "1A" }]}>
              <Text
                style={[
                  styles.iqText,
                  { color: colors.primary, fontSize: metrics.badgeFont },
                ]}
              >
                IQ {post.author.iqScore}
              </Text>
            </View>
            {metrics.showExamBadge && post.examCategory !== "General" && (
              <View style={[styles.examBadge, { borderColor: colors.info }]}>
                <Text
                  style={[
                    styles.examText,
                    { color: colors.info, fontSize: metrics.badgeFont },
                  ]}
                >
                  {post.examCategory}
                </Text>
              </View>
            )}
          </View>
          <Text
            style={[styles.meta, { color: colors.textMuted, fontSize: metrics.metaFont }]}
            numberOfLines={1}
          >
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
                minHeight: metrics.followHeight,
                paddingHorizontal: metrics.followPad,
              },
            ]}
            accessibilityRole="button"
          >
            <Text
              style={[
                styles.followText,
                {
                  color: post.author.isFollowing ? colors.textSecondary : "#FFFFFF",
                  fontSize: metrics.followFont,
                },
              ]}
              numberOfLines={1}
            >
              {post.author.isFollowing ? "Following" : "Follow"}
            </Text>
          </Pressable>
        )}
      </View>

      <Pressable
        onPress={() => onPressChapterThread?.(post.chapterId)}
        style={[
          styles.breadcrumb,
          {
            backgroundColor: colors.surfaceAlt,
            paddingVertical: metrics.breadcrumbPadV,
            paddingHorizontal: metrics.breadcrumbPadH,
            marginTop: metrics.breadcrumbMarginTop,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Open chapter thread"
      >
        <MaterialCommunityIcons
          name="book-open-variant"
          size={metrics.iconSize}
          color={colors.info}
        />
        <View style={styles.breadcrumbCopy}>
          <Text
            style={[
              styles.breadcrumbTitle,
              { color: colors.info, fontSize: metrics.breadcrumbFont },
            ]}
            numberOfLines={1}
          >
            {post.courseTitle || post.chapterTitle}
          </Text>
          {post.courseTitle ? (
            <Text
              style={[
                styles.breadcrumbSub,
                { color: colors.textMuted, fontSize: metrics.breadcrumbSubFont },
              ]}
              numberOfLines={1}
            >
              {post.chapterTitle}
            </Text>
          ) : null}
        </View>
        <View
          style={[
            styles.moduleBadge,
            {
              backgroundColor: colors.bg,
              paddingHorizontal: Math.max(4, metrics.breadcrumbPadH - 3),
            },
          ]}
        >
          <Text
            style={[
              styles.moduleText,
              { color: colors.textSecondary, fontSize: metrics.moduleFont },
            ]}
          >
            M{chapterDisplayNumber(post.chapterIndex)} · L{post.partNumber}
          </Text>
        </View>
      </Pressable>

      <Pressable onPress={() => onPressSubtopic?.(post)}>
        <Text
          style={[
            styles.subtopicTitle,
            {
              color: colors.text,
              fontSize: metrics.titleFont,
              lineHeight: Math.round(metrics.titleFont * 1.3),
            },
          ]}
        >
          {post.subtopicTitle}
        </Text>
        {post.content ? (
          <Text
            style={[
              styles.content,
              {
                color: colors.textSecondary,
                fontSize: metrics.contentFont,
                lineHeight: metrics.contentLine,
              },
            ]}
            numberOfLines={4}
          >
            {post.content}
          </Text>
        ) : null}
      </Pressable>

      {post.attachments.map((attachment, index) =>
        attachment.type === "image" ? (
          <Pressable key={`${attachment.url}-${index}`} onPress={() => handleAttachment(attachment.url)}>
            <Image
              source={{ uri: attachment.url }}
              style={[
                styles.attachmentImage,
                {
                  backgroundColor: colors.surfaceAlt,
                  maxHeight: metrics.imageMaxHeight,
                },
              ]}
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

      <View style={[styles.studyRow, { gap: metrics.studyGap }]}>
        <Pressable
          onPress={handleToggleEnroll}
          disabled={enrollPending}
          style={[
            styles.studyBtn,
            {
              borderColor: enrolled ? colors.primary : colors.border,
              backgroundColor: enrolled ? colors.primary + "12" : colors.surfaceAlt,
              minHeight: metrics.studyHeight,
              paddingHorizontal: metrics.studyPad,
              gap: Math.max(4, metrics.studyGap - 2),
              opacity: enrollPending ? 0.6 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={enrolled ? "Leave course" : "Enroll in course"}
        >
          <Ionicons
            name={enrolled ? "bookmark" : "bookmark-outline"}
            size={metrics.studyIcon}
            color={enrolled ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.studyText,
              { color: enrolled ? colors.primary : colors.textSecondary, fontSize: metrics.studyFont },
            ]}
          >
            {enrolled ? "Enrolled" : "Enroll"}
          </Text>
        </Pressable>

        {post.mediaType === "visual_lesson" ? (
          <Pressable
            onPress={() => (onPressLesson ? onPressLesson(post) : onPressSubtopic?.(post))}
            style={[
              styles.studyBtn,
              !metrics.compact && styles.lessonBtn,
              {
                borderColor: colors.primary,
                backgroundColor: colors.primary + "10",
                minHeight: metrics.studyHeight,
                paddingHorizontal: metrics.studyPad,
                gap: Math.max(4, metrics.studyGap - 2),
              },
            ]}
            accessibilityRole="button"
          >
            <Ionicons name="play-circle" size={metrics.studyIcon} color={colors.primary} />
            <Text style={[styles.studyText, { color: colors.primary, fontSize: metrics.studyFont }]}>
              {lessonDone ? "Review lesson" : "Visual lesson"}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View
        style={[
          styles.actions,
          { borderTopColor: colors.border, columnGap: metrics.actionGap },
        ]}
      >
        <Pressable
          onPress={() => likePost(post.id, getToken)}
          style={[
            styles.actionBtn,
            {
              minHeight: metrics.actionHeight,
              paddingHorizontal: metrics.actionPad,
              gap: Math.max(3, metrics.actionGap),
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={post.isLikedByMe ? "Unlike" : "Like"}
        >
          <Ionicons
            name={post.isLikedByMe ? "heart" : "heart-outline"}
            size={metrics.actionIcon}
            color={post.isLikedByMe ? colors.danger : colors.textSecondary}
          />
          <Text style={[styles.actionText, { color: colors.textSecondary, fontSize: metrics.actionFont }]}>
            {formatCount(post.likesCount)}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => onPressComments?.(post)}
          style={[
            styles.actionBtn,
            {
              minHeight: metrics.actionHeight,
              paddingHorizontal: metrics.actionPad,
              gap: Math.max(3, metrics.actionGap),
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Comments"
        >
          <Ionicons
            name="chatbubble-outline"
            size={metrics.actionIcon}
            color={colors.textSecondary}
          />
          <Text style={[styles.actionText, { color: colors.textSecondary, fontSize: metrics.actionFont }]}>
            {formatCount(post.commentsCount)}
          </Text>
        </Pressable>

        <Pressable
          onPress={handleShare}
          style={[
            styles.actionBtn,
            !metrics.showActionLabels && styles.actionBtnIconOnly,
            {
              minHeight: metrics.actionHeight,
              paddingHorizontal: metrics.actionPad,
              gap: Math.max(3, metrics.actionGap),
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Share lesson"
        >
          <Ionicons
            name="share-social-outline"
            size={metrics.actionIcon}
            color={colors.textSecondary}
          />
          {metrics.showActionLabels ? (
            <Text style={[styles.actionText, { color: colors.textSecondary, fontSize: metrics.actionFont }]}>
              Share
            </Text>
          ) : null}
        </Pressable>

        {onPressQuiz && post.subtopicDetails.trim() ? (
          <Pressable
            onPress={() => onPressQuiz(post)}
            style={[
              styles.actionBtn,
              !metrics.showActionLabels && styles.actionBtnIconOnly,
              {
                minHeight: metrics.actionHeight,
                paddingHorizontal: metrics.actionPad,
                gap: Math.max(3, metrics.actionGap),
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={quizPassed ? "Retake quiz" : "Take quiz"}
          >
            <Ionicons
              name={quizPassed ? "checkmark-circle" : "help-circle-outline"}
              size={metrics.actionIcon}
              color={quizPassed ? colors.success : colors.textSecondary}
            />
            {metrics.showActionLabels ? (
              <Text
                style={[
                  styles.actionText,
                  {
                    color: quizPassed ? colors.success : colors.textSecondary,
                    fontSize: metrics.actionFont,
                  },
                ]}
              >
                {quizPassed
                  ? "Passed"
                  : quizSession?.status === "generating"
                    ? "Building..."
                    : quizSession?.questions.length
                      ? "Take quiz"
                      : "Quiz"}
              </Text>
            ) : null}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },
  namePressable: {
    flexShrink: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: safeFont,
    fontWeight: "700",
    flexShrink: 1,
  },
  iqBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  iqText: {
    fontFamily: safeFont,
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
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  meta: {
    fontFamily: safeFont,
    marginTop: 2,
    flexShrink: 1,
  },
  followBtn: {
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  followText: {
    fontFamily: safeFont,
    fontWeight: "700",
  },
  breadcrumb: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
  },
  breadcrumbCopy: {
    flex: 1,
    minWidth: 0,
  },
  breadcrumbTitle: {
    fontFamily: safeFont,
    fontWeight: "700",
  },
  breadcrumbSub: {
    fontFamily: safeFont,
    marginTop: 1,
  },
  moduleBadge: {
    paddingVertical: 4,
    borderRadius: 7,
  },
  moduleText: {
    fontFamily: safeFont,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  subtopicTitle: {
    fontFamily: safeFont,
    fontWeight: "800",
    marginTop: 10,
  },
  content: {
    fontFamily: safeFont,
    marginTop: 4,
  },
  attachmentImage: {
    width: "100%",
    aspectRatio: 16 / 9,
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
  studyRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginTop: 10,
  },
  studyBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
  },
  lessonBtn: {
    flexGrow: 1,
    justifyContent: "center",
  },
  studyText: {
    fontFamily: safeFont,
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    rowGap: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 12,
    paddingTop: 10,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionBtnIconOnly: {
    minWidth: 38,
    justifyContent: "center",
  },
  actionText: {
    fontFamily: safeFont,
    fontWeight: "600",
  },
});
