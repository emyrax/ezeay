import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { coachColors, coachFont } from "../../constants/coachTheme";
import { api, friendlyError } from "../../lib/api";
import { formatRelativeTime } from "../../lib/threads/format";
import type { TutorConversation } from "../../types/tutor";
import CoachSheet from "./CoachSheet";

function formatHistoryTime(iso: string) {
  const relative = formatRelativeTime(iso);
  if (!relative) return "";
  if (relative === "now") return "Just now";
  if (/^\d+[mhdw]$/.test(relative)) return `${relative} ago`;
  return relative;
}

interface ChatHistorySheetProps {
  visible: boolean;
  activeConversationId: string | null;
  getToken: () => Promise<string | null>;
  onClose: () => void;
  onOpen: (conversationId: string) => Promise<void>;
}

export default function ChatHistorySheet({
  visible,
  activeConversationId,
  getToken,
  onClose,
  onOpen,
}: ChatHistorySheetProps) {
  const [conversations, setConversations] = useState<TutorConversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Your session expired. Please sign in again.");
      const response = await api.tutor.conversations.list(token);
      setConversations(response.conversations);
    } catch (err) {
      setError(
        friendlyError(err, "Could not load your chat history. Please try again."),
      );
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (visible) void load();
  }, [visible, load]);

  const openConversation = async (id: string) => {
    if (openingId) return;
    setOpeningId(id);
    setError(null);
    try {
      await onOpen(id);
      onClose();
    } catch (err) {
      setError(
        friendlyError(err, "Could not open that conversation. Please try again."),
      );
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <CoachSheet
      visible={visible}
      title="Chat history"
      subtitle="Pick up where you left off."
      onClose={onClose}
      headerAction={
        <Pressable
          onPress={() => void load()}
          style={styles.refresh}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Refresh chat history"
        >
          <MaterialCommunityIcons
            name="refresh"
            size={18}
            color={coachColors.textSecondary}
          />
        </Pressable>
      }
    >
      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator size="small" color={coachColors.accent} />
          <Text style={styles.stateText}>Loading conversations...</Text>
        </View>
      ) : null}

      {!loading && error ? (
        <View style={styles.errorBox}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={16}
            color="#B45309"
          />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => void load()} hitSlop={8}>
            <Text style={styles.retry}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {!loading && !error && conversations.length === 0 ? (
        <View style={styles.state}>
          <MaterialCommunityIcons
            name="message-text-outline"
            size={24}
            color={coachColors.textMuted}
          />
          <Text style={styles.stateTitle}>No conversations yet</Text>
          <Text style={styles.stateText}>
            Your chat history will appear here after your first question.
          </Text>
        </View>
      ) : null}

      {!loading && !error
        ? conversations.map((conversation) => {
            const active = conversation.id === activeConversationId;
            const opening = conversation.id === openingId;
            return (
              <Pressable
                key={conversation.id}
                onPress={() => void openConversation(conversation.id)}
                disabled={openingId != null}
                style={[styles.row, active && styles.rowActive]}
                accessibilityRole="button"
                accessibilityLabel={`Open ${conversation.title}`}
              >
                <View
                  style={[styles.icon, active && styles.iconActive]}
                >
                  <MaterialCommunityIcons
                    name={active ? "message-text" : "message-text-outline"}
                    size={18}
                    color={active ? coachColors.accent : coachColors.textMuted}
                  />
                </View>
                <View style={styles.copy}>
                  <Text style={styles.title} numberOfLines={1}>
                    {conversation.title || "Untitled chat"}
                  </Text>
                  <Text style={styles.meta}>
                    {formatHistoryTime(conversation.updatedAt)}
                  </Text>
                </View>
                {opening ? (
                  <ActivityIndicator size="small" color={coachColors.accent} />
                ) : active ? (
                  <View style={styles.activeChip}>
                    <Text style={styles.activeChipText}>Open</Text>
                  </View>
                ) : (
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color={coachColors.textMuted}
                  />
                )}
              </Pressable>
            );
          })
        : null}
    </CoachSheet>
  );
}

const styles = StyleSheet.create({
  refresh: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: coachColors.canvas,
    alignItems: "center",
    justifyContent: "center",
  },
  state: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 34,
    paddingHorizontal: 24,
    gap: 6,
  },
  stateTitle: {
    marginTop: 4,
    fontFamily: coachFont.semibold,
    fontSize: 14,
    color: coachColors.text,
  },
  stateText: {
    fontFamily: coachFont.regular,
    fontSize: 12,
    lineHeight: 18,
    color: coachColors.textMuted,
    textAlign: "center",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    flex: 1,
    fontFamily: coachFont.regular,
    fontSize: 12,
    lineHeight: 17,
    color: "#92400E",
  },
  retry: {
    fontFamily: coachFont.semibold,
    fontSize: 12,
    color: "#92400E",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: coachColors.background,
  },
  rowActive: {
    backgroundColor: coachColors.accentSoft,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: coachColors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  iconActive: {
    backgroundColor: "rgba(255,255,255,0.8)",
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontFamily: coachFont.semibold,
    fontSize: 13,
    color: coachColors.text,
  },
  meta: {
    fontFamily: coachFont.regular,
    fontSize: 11,
    color: coachColors.textMuted,
  },
  activeChip: {
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: coachColors.surface,
  },
  activeChipText: {
    fontFamily: coachFont.semibold,
    fontSize: 10,
    color: coachColors.accent,
  },
});
