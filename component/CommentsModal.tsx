import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { safeFont } from "../constants/themes";
import { useAuth } from "../contexts/AuthContext";
import { useThemeColors } from "../hooks/useTheme";
import { friendlyError } from "../lib/api";
import { eventBus } from "../lib/eventBus";
import { formatRelativeTime } from "../lib/threads/format";
import { useThreadStore } from "../store/threadStore";
import type { ThreadComment } from "../types/thread";
import CommunityAvatar from "./CommunityAvatar";

interface CommentsModalProps {
  postId: string | null;
  visible: boolean;
  onClose: () => void;
}

export default function CommentsModal({ postId, visible, onClose }: CommentsModalProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const getComments = useThreadStore((s) => s.getComments);
  const addComment = useThreadStore((s) => s.addComment);
  const isWeb = Platform.OS === "web";

  const [comments, setComments] = useState<ThreadComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    if (!visible || !postId) return;
    let cancelled = false;
    setLoading(true);
    setComments([]);
    setText("");

    (async () => {
      try {
        const list = await getComments(postId, getToken);
        if (!cancelled) setComments(list);
      } catch (err) {
        if (!cancelled) {
          eventBus.emit("toast:error", {
            title: friendlyError(err, "Couldn't load comments"),
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, postId, getComments, getToken]);

  const handleSend = useCallback(async () => {
    const body = text.trim();
    if (!postId || !body || sending) return;
    setSending(true);
    try {
      const comment = await addComment(postId, body, getToken);
      setComments((current) => [...current, comment]);
      setText("");
    } catch (err) {
      eventBus.emit("toast:error", {
        title: friendlyError(err, "Couldn't post comment"),
      });
    } finally {
      setSending(false);
    }
  }, [addComment, getToken, postId, sending, text]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={isWeb ? "overFullScreen" : "pageSheet"}
      transparent={isWeb}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[styles.overlay, isWeb && styles.webOverlay]}
      >
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.bg,
              maxWidth: isWeb ? 560 : undefined,
              maxHeight: isWeb ? "86%" : undefined,
              borderRadius: isWeb ? 22 : 0,
              paddingBottom: isWeb ? 0 : insets.bottom,
            },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: isWeb ? 12 : insets.top + 4 }]}>
            <Text style={[styles.title, { color: colors.text }]}>Comments</Text>
            <Pressable
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.surfaceAlt }]}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close comments"
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.comment}>
                  <CommunityAvatar uid={item.author.id} photoURL={item.author.avatarUrl} size={34} />
                  <View style={styles.commentBody}>
                    <View style={styles.commentMeta}>
                      <Text style={[styles.commentName, { color: colors.text }]}>
                        {item.author.name ?? "Scholar"}
                      </Text>
                      <Text style={[styles.commentHandle, { color: colors.textMuted }]}>
                        @{item.author.handle}
                      </Text>
                      <Text style={[styles.commentTime, { color: colors.textMuted }]}>
                        {formatRelativeTime(item.createdAt)}
                      </Text>
                    </View>
                    <Text style={[styles.commentText, { color: colors.textSecondary }]}>
                      {item.body}
                    </Text>
                  </View>
                </View>
              )}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Ionicons name="chatbubble-ellipses-outline" size={34} color={colors.textMuted} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    No comments yet. Start the conversation.
                  </Text>
                </View>
              }
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            />
          )}

          <View style={[styles.inputRow, { borderTopColor: colors.border, backgroundColor: colors.bg }]}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Add a comment…"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                {
                  color: colors.text,
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                },
              ]}
              maxLength={1000}
              multiline
            />
            <Pressable
              onPress={handleSend}
              disabled={!text.trim() || sending}
              style={[
                styles.sendBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: !text.trim() || sending ? 0.45 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Send comment"
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={17} color="#FFFFFF" />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  webOverlay: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 24,
  },
  sheet: {
    flex: 1,
    width: "100%",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontFamily: safeFont, fontSize: 18, fontWeight: "800" },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { padding: 16, paddingBottom: 24, flexGrow: 1 },
  comment: { flexDirection: "row", gap: 10, marginBottom: 16 },
  commentBody: { flex: 1 },
  commentMeta: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  commentName: { fontFamily: safeFont, fontSize: 13, fontWeight: "700" },
  commentHandle: { fontFamily: safeFont, fontSize: 11 },
  commentTime: { fontFamily: safeFont, fontSize: 11, marginLeft: "auto" },
  commentText: { fontFamily: safeFont, fontSize: 13, lineHeight: 19, marginTop: 3 },
  empty: { alignItems: "center", justifyContent: "center", paddingVertical: 48, gap: 10 },
  emptyText: { fontFamily: safeFont, fontSize: 13, textAlign: "center" },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: safeFont,
    fontSize: 13,
    textAlignVertical: "top",
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
});
