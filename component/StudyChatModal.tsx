import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "../hooks/useTheme";
import { fontFamily } from "../constants/themes";
import { api } from "../lib/api";
import { useNoteStore } from "../store/noteStore";
import { useModelStore } from "../store/modelStore";
import { buildStudyChatPrompt } from "../lib/offline/studyPrompts";
import {
  ensureOfflineActivated,
  isOfflineRef,
  modelErrorMessage,
  offlineGenerateText,
} from "../lib/providers/offline";

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
}

interface Props {
  visible: boolean;
  materialIds: string[];
  materialTitle: string;
  getToken: () => Promise<string | null>;
  onClose: () => void;
}

export default function StudyChatModal({ visible, materialIds, materialTitle, getToken, onClose }: Props) {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const notes = useNoteStore((s) => s.notes);
  const [includeNotes, setIncludeNotes] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "intro",
      role: "assistant",
      text: `Ask me anything about "${materialTitle}". I'll answer based on your study material${includeNotes ? " and notes" : ""}.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);
  const selectedModel = useModelStore((s) => s.selectedModel);
  const offlineActive = isOfflineRef(selectedModel);

  const noteTexts = useMemo(() => {
    if (!includeNotes) return [];
    return notes
      .filter((n) => n.content.trim().length > 0)
      .slice(0, 20)
      .map((n) => ({ title: n.title || "Note", content: n.content }));
  }, [includeNotes, notes]);

  const handleSend = useCallback(async () => {
    const q = input.trim();
    if (!q || loading) return;

    setInput("");
    const userMsg: Message = { id: `u_${Date.now()}`, role: "user", text: q };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      let aiMsg: Message;
      if (offlineActive) {
        await ensureOfflineActivated(selectedModel);
        const token = await getToken();
        if (!token) throw new Error("You need to be signed in to search your content.");
        const res = await api.ai.ragContexts(
          {
            question: q,
            materialIds,
            noteTexts: noteTexts.length > 0 ? noteTexts : undefined,
          },
          token,
        );
        const contexts = res.contexts || [];
        const system = buildStudyChatPrompt({
          materialTitle,
          includeNotes,
          contexts,
          question: q,
        });
        const answerText = await offlineGenerateText({
          system,
          messages: [{ role: "user", content: q }],
        });
        const cits = contexts.slice(0, 5);
        const citationText =
          cits.length > 0
            ? `\n\nCitations:\n${cits
                .map(
                  (c: { source: string; text: string }, i: number) =>
                    `${i + 1}. "${c.text.slice(0, 120)}" — ${c.source}`,
                )
                .join("\n")}`
            : "";
        aiMsg = { id: `a_${Date.now()}`, role: "assistant", text: answerText + citationText };
      } else {
        const body: {
          question: string;
          materialIds: string[];
          noteTexts?: { title: string; content: string }[];
        } = { question: q, materialIds };
        if (noteTexts.length > 0) body.noteTexts = noteTexts;

        const result = await api.study.ragQuery(body, getToken);
        const cits = result.citations || [];
        const citationText =
          cits.length > 0
            ? `\n\nCitations:\n${cits
                .map((c: { quote: string; source: string }, i: number) => `${i + 1}. "${c.quote}" — ${c.source}`)
                .join("\n")}`
            : "";
        aiMsg = { id: `a_${Date.now()}`, role: "assistant", text: result.answer + citationText };
      }
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      Alert.alert("Error", err instanceof Error ? modelErrorMessage(err) : "Failed to get answer");
    } finally {
      setLoading(false);
    }
  }, [input, loading, materialIds, noteTexts, getToken, offlineActive, selectedModel, materialTitle, includeNotes]);

  if (!visible) return null;

  const toggleNotes = () => {
    setIncludeNotes((v) => !v);
    setMessages((prev) => [
      {
        id: `intro_${Date.now()}`,
        role: "assistant",
        text: `Ask me anything about "${materialTitle}". I'll answer based on your study material${includeNotes ? " and notes" : ""}.`,
      },
    ]);
  };

  return (
    <View style={[styles.overlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
      <Pressable style={{ flex: 1 }} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[styles.sheet, { backgroundColor: theme.surface, paddingBottom: insets.bottom + 12 }]}
      >
        <View style={[styles.handle, { backgroundColor: theme.border }]} />
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Ask AI</Text>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={24} color={theme.textSecondary} />
          </Pressable>
        </View>

        {offlineActive && (
          <View
            style={[
              styles.offlineChip,
              { backgroundColor: theme.surfaceAlt, borderColor: theme.borderLight },
            ]}
          >
            <Ionicons name="phone-portrait-outline" size={12} color={theme.primary} />
            <Text style={[styles.offlineChipText, { color: theme.textMuted }]}>
              Answering on-device · no internet needed
            </Text>
          </View>
        )}

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.chatList}
          onContentSizeChange={() => listRef.current?.scrollToEnd()}
          renderItem={({ item }) => (
            <View
              style={[
                styles.bubble,
                item.role === "user"
                  ? [styles.userBubble, { backgroundColor: theme.primary + "20" }]
                  : [styles.aiBubble, { backgroundColor: theme.surfaceAlt }],
              ]}
            >
              {item.role === "assistant" && (
                <View style={[styles.avatarDot, { backgroundColor: theme.accent }]}>
                  <Ionicons name="sparkles" size={12} color="#FFF" />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.bubbleText,
                    { color: item.role === "user" ? theme.text : theme.textSecondary },
                  ]}
                >
                  {item.text}
                </Text>
              </View>
            </View>
          )}
          ListFooterComponent={
            loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={theme.primary} />
                <Text style={[styles.loadingText, { color: theme.textMuted }]}>Thinking...</Text>
              </View>
            ) : null
          }
        />

        <Pressable
          onPress={toggleNotes}
          style={[
            styles.notesToggle,
            {
              borderColor: includeNotes ? theme.primary : theme.border,
              backgroundColor: includeNotes ? theme.primary + "15" : "transparent",
            },
          ]}
        >
          <Ionicons
            name="document-text-outline"
            size={14}
            color={includeNotes ? theme.primary : theme.textMuted}
          />
          <Text
            style={[
              styles.notesToggleText,
              { color: includeNotes ? theme.primary : theme.textMuted },
            ]}
          >
            Include my notes
          </Text>
        </Pressable>

        <View style={[styles.inputRow, { borderTopColor: theme.borderLight }]}>
          <TextInput
            style={[styles.input, { color: theme.text, backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
            placeholder="Ask a question..."
            placeholderTextColor={theme.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            onSubmitEditing={handleSend}
          />
          <Pressable
            onPress={handleSend}
            style={[styles.sendBtn, { backgroundColor: loading ? theme.border : theme.primary }]}
            disabled={loading || !input.trim()}
          >
            <Ionicons name="send" size={18} color="#FFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 200,
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "78%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  title: { fontSize: 18, fontWeight: "700", fontFamily },
  offlineChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginHorizontal: 20,
    marginBottom: 6,
  },
  offlineChipText: { fontSize: 11, fontFamily },
  chatList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  bubble: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 16,
    padding: 12,
    maxWidth: "85%",
  },
  userBubble: {
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  avatarDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingLeft: 12,
  },
  loadingText: { fontSize: 13, fontFamily },
  notesToggle: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 16,
    marginBottom: 4,
  },
  notesToggleText: { fontSize: 12, fontWeight: "600", fontFamily },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
    fontFamily,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
});