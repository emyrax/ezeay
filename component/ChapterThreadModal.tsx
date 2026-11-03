import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { safeFont } from "../constants/themes";
import { useAuth } from "../contexts/AuthContext";
import { useThemeColors } from "../hooks/useTheme";
import { useThreadStore } from "../store/threadStore";
import type { ThreadPost } from "../types/thread";
import SubtopicThreadCard from "./SubtopicThreadCard";

interface ChapterThreadModalProps {
  visible: boolean;
  chapterId: string | null;
  onClose: () => void;
  onPressSubtopic?: (post: ThreadPost) => void;
  onPressProfile?: (post: ThreadPost) => void;
  onPressComments?: (post: ThreadPost) => void;
}

export default function ChapterThreadModal({
  visible,
  chapterId,
  onClose,
  onPressSubtopic,
  onPressProfile,
  onPressComments,
}: ChapterThreadModalProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const fetchChapterThread = useThreadStore((s) => s.fetchChapterThread);
  const chapterThreads = useThreadStore((s) => s.chapterThreads);
  const chapterLoading = useThreadStore((s) => s.chapterLoading);
  const isWeb = Platform.OS === "web";

  useEffect(() => {
    if (visible && chapterId) {
      fetchChapterThread(chapterId, getToken);
    }
  }, [visible, chapterId, fetchChapterThread, getToken]);

  const posts = useMemo(() => {
    if (!chapterId) return [];
    return [...(chapterThreads[chapterId] ?? [])].sort(
      (a, b) => a.subtopicIndex - b.subtopicIndex,
    );
  }, [chapterId, chapterThreads]);

  const loading = chapterId ? chapterLoading[chapterId] === true : false;
  const headerTitle = posts[0]?.chapterTitle ?? "Chapter thread";

  const renderEmpty = useCallback(
    () =>
      loading ? (
        <View style={styles.empty}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <View style={styles.empty}>
          <Ionicons name="layers-outline" size={36} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Nothing in this chapter thread yet.
          </Text>
        </View>
      ),
    [colors.primary, colors.textMuted, colors.textSecondary, loading],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={isWeb ? "overFullScreen" : "pageSheet"}
      transparent={isWeb}
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, isWeb && styles.webOverlay]}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.bg,
              maxWidth: isWeb ? 680 : undefined,
              paddingTop: isWeb ? 0 : insets.top,
              paddingBottom: isWeb ? 0 : insets.bottom,
            },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                {headerTitle}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Chapter thread · {posts.length} parts
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.surfaceAlt }]}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close chapter thread"
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>

          <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <SubtopicThreadCard
                post={item}
                onPressSubtopic={onPressSubtopic}
                onPressProfile={onPressProfile}
                onPressComments={onPressComments}
                hideAuthorActions
              />
            )}
            contentContainerStyle={styles.content}
            ListEmptyComponent={renderEmpty()}
            ListFooterComponent={
              posts.length > 0 ? (
                <Text style={[styles.footer, { color: colors.textMuted }]}>
                  End of chapter · follow the author to see new parts
                </Text>
              ) : null
            }
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  webOverlay: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 24,
  },
  sheet: {
    flex: 1,
    width: "100%",
    borderRadius: Platform.OS === "web" ? 22 : 0,
    overflow: "hidden",
    maxHeight: Platform.OS === "web" ? "88%" : undefined,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerText: { flex: 1 },
  title: {
    fontFamily: safeFont,
    fontSize: 18,
    fontWeight: "800",
  },
  subtitle: {
    fontFamily: safeFont,
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { paddingTop: 12, paddingBottom: 24 },
  empty: { alignItems: "center", paddingVertical: 48, gap: 10 },
  emptyText: {
    fontFamily: safeFont,
    fontSize: 13,
    textAlign: "center",
  },
  footer: {
    fontFamily: safeFont,
    fontSize: 11,
    textAlign: "center",
    paddingVertical: 16,
  },
});
