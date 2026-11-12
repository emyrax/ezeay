import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MarkdownRenderer from "../MarkdownRenderer";
import ExamSelect from "./ExamSelect";
import TutorToolsSheet from "./TutorToolsSheet";
import { fontFamily } from "../../constants/themes";
import { useAuth } from "../../contexts/AuthContext";
import { useThemeColors } from "../../hooks/useTheme";
import { TutorScreenHeader } from "../../component/tutor/TutorScreenHeader";
import { api, friendlyError } from "../../lib/api";
import { track } from "../../lib/analytics";
import { examLabel } from "../../data/exams";
import { getModelOption } from "../../lib/providers/modelRegistry";
import {
  ensureOfflineActivated,
  isOfflineRef,
  modelErrorMessage,
  offlineGenerateText,
} from "../../lib/providers/offline";
import {
  buildOfflineTutorSystem,
  TUTOR_PERSONA_OPTIONS,
} from "../../lib/tutor/prompt";
import { useModelStore } from "../../store/modelStore";
import { useNoteStore } from "../../store/noteStore";
import type {
  TutorCitation,
  TutorConversation,
  TutorMode,
  TutorPersona,
  TutorPreferences,
} from "../../types/tutor";

interface UiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: TutorCitation[];
  pending?: boolean;
}

const SUGGESTIONS = [
  "Explain photosynthesis in simple English",
  "Quiz me on quadratic equations",
  "Help me plan two weeks of revision",
];

const MODES: { value: TutorMode; label: string; icon: string }[] = [
  { value: "materials", label: "My materials", icon: "book-open-variant" },
  { value: "general", label: "General", icon: "earth" },
];

function formatWhen(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff) || diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return new Date(iso).toLocaleDateString();
}

function toUiMessage(message: {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: TutorCitation[];
}): UiMessage {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    citations: message.citations,
  };
}

export default function TutorScreen() {
  const router = useRouter();
  const theme = useThemeColors();
  const { getToken } = useAuth();
  const notes = useNoteStore((s) => s.notes);
  const loadNotes = useNoteStore((s) => s.loadNotes);
  const notesLoaded = useNoteStore((s) => s.loaded);
  const selectedModel = useModelStore((s) => s.selectedModel);

  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<TutorConversation[]>([]);
  const [preferences, setPreferences] = useState<TutorPreferences | null>(null);
  const [examType, setExamType] = useState("");
  const [persona, setPersona] = useState<TutorPersona>("patient_tutor");
  const [mode, setMode] = useState<TutorMode>("materials");
  const [includeNotes, setIncludeNotes] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showTools, setShowTools] = useState(false);

  const listRef = useRef<FlatList<UiMessage>>(null);
  const abortRef = useRef<AbortController | null>(null);
  const examSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const offlineActive = isOfflineRef(selectedModel);
  const streamCapable =
    !offlineActive && getModelOption(selectedModel)?.provider === "gemini";

  const noteTexts = useMemo(() => {
    if (!includeNotes) return [];
    return notes
      .filter((note) => note.content.trim().length > 0)
      .slice(0, 20)
      .map((note) => ({
        title: note.title || "Note",
        content: note.content,
      }));
  }, [includeNotes, notes]);

  const refreshConversations = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    try {
      const res = await api.tutor.conversations.list(token);
      setConversations(res.conversations);
    } catch {
      // keep the current list
    }
  }, [getToken]);

  useEffect(() => {
    track("tutor_opened");
  }, []);

  useEffect(() => {
    if (!notesLoaded) {
      loadNotes().catch(() => {});
    }
  }, [loadNotes, notesLoaded]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getToken();
      if (!token) return;
      try {
        const res = await api.tutor.preferences.get(token);
        if (!cancelled) {
          setPreferences(res.preferences);
          setPersona(res.preferences.persona);
          setExamType(res.preferences.examType ?? "");
        }
      } catch {
        // the tutor still works with defaults
      }
      try {
        const res = await api.tutor.conversations.list(token);
        if (!cancelled) setConversations(res.conversations);
      } catch {
        if (!cancelled) setConversations([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (examSaveTimer.current) clearTimeout(examSaveTimer.current);
    };
  }, []);

  const choosePersona = useCallback(
    (next: TutorPersona) => {
      setPersona(next);
      getToken()
        .then((token) => {
          if (!token) return;
          return api.tutor.preferences.update({ persona: next }, token);
        })
        .catch(() => {});
    },
    [getToken],
  );

  const chooseExam = useCallback(
    (next: string) => {
      setExamType(next);
      if (examSaveTimer.current) clearTimeout(examSaveTimer.current);
      examSaveTimer.current = setTimeout(() => {
        getToken()
          .then((token) => {
            if (!token) return;
            return api.tutor.preferences.update({ examType: next }, token);
          })
          .catch(() => {});
      }, 500);
    },
    [getToken],
  );

  const startNewChat = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setConversationId(null);
    setMessages([]);
    setError(null);
    setInput("");
  }, []);

  const openConversation = useCallback(
    async (conversation: TutorConversation) => {
      const token = await getToken();
      if (!token) return;
      try {
        const res = await api.tutor.conversations.get(conversation.id, token);
        setConversationId(res.conversation.id);
        setPersona(res.conversation.persona);
        setMode(res.conversation.mode);
        setMessages(res.messages.map(toUiMessage));
        setError(null);
        setShowHistory(false);
      } catch (err) {
        setError(friendlyError(err, "Could not open that conversation."));
      }
    },
    [getToken],
  );

  const removeConversation = useCallback(
    async (conversation: TutorConversation) => {
      const token = await getToken();
      if (!token) return;
      try {
        await api.tutor.conversations.remove(conversation.id, token);
        setConversations((prev) => prev.filter((item) => item.id !== conversation.id));
        if (conversationId === conversation.id) {
          startNewChat();
        }
      } catch (err) {
        setError(friendlyError(err, "Could not delete that conversation."));
      }
    },
    [conversationId, getToken, startNewChat],
  );

  const handleSend = useCallback(async () => {
    const question = input.trim();
    if (!question || loading) return;

    setInput("");
    setError(null);
    setLoading(true);

    const assistantId = `pending_${Date.now()}`;
    const userMessage: UiMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: question,
      citations: [],
    };
    setMessages((prev) => [
      ...prev,
      userMessage,
      {
        id: assistantId,
        role: "assistant",
        content: "",
        citations: [],
        pending: true,
      },
    ]);
    track("tutor_message_sent", {
      mode,
      offline: offlineActive,
      hasNotes: noteTexts.length > 0,
    });

    const wasOffline = offlineActive;
    const history = messages
      .filter((message) => !message.pending)
      .map((message) => ({ role: message.role, content: message.content }));

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Your session expired. Please sign in again.");
      }

      if (wasOffline) {
        await ensureOfflineActivated(selectedModel);
        let contexts: { source: string; text: string }[] = [];
        if (mode === "materials") {
          const res = await api.ai.ragContexts(
            {
              question,
              noteTexts: noteTexts.length > 0 ? noteTexts : undefined,
            },
            token,
          );
          contexts = res.contexts ?? [];
        }
        const system = buildOfflineTutorSystem({
          persona,
          examType,
          mode,
          instructions: preferences?.instructions,
          contexts,
        });
        const answer = await offlineGenerateText({
          system,
          messages: [...history, { role: "user", content: question }],
        });
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  content: answer,
                  citations: contexts.slice(0, 5).map((context) => ({
                    quote: context.text.slice(0, 240),
                    source: context.source,
                  })),
                  pending: false,
                }
              : message,
          ),
        );
        return;
      }

      const body = {
        conversationId: conversationId ?? undefined,
        message: question,
        persona,
        mode,
        examType: examType.trim() || undefined,
        noteTexts: noteTexts.length > 0 ? noteTexts : undefined,
      };

      if (streamCapable) {
        const controller = new AbortController();
        abortRef.current = controller;
        let streamed = "";
        let streamError: string | null = null;

        await api.tutor.chatStream(
          body,
          token,
          {
            onDelta: (text) => {
              streamed += text;
              setMessages((prev) =>
                prev.map((message) =>
                  message.id === assistantId
                    ? { ...message, content: streamed, pending: false }
                    : message,
                ),
              );
            },
            onDone: (payload) => {
              if (payload?.conversationId) {
                setConversationId(payload.conversationId);
              }
              const stored = payload?.message;
              if (stored) {
                setMessages((prev) =>
                  prev.map((message) =>
                    message.id === assistantId
                      ? {
                          ...message,
                          id: stored.id,
                          content: stored.content,
                          citations: stored.citations,
                          pending: false,
                        }
                      : message,
                  ),
                );
              } else {
                setMessages((prev) =>
                  prev.map((message) =>
                    message.id === assistantId
                      ? { ...message, pending: false }
                      : message,
                  ),
                );
              }
              void refreshConversations();
            },
            onError: (message) => {
              streamError = message;
            },
          },
          { signal: controller.signal, modelRef: selectedModel },
        );

        if (streamError) {
          throw new Error(streamError);
        }
      } else {
        const res = await api.tutor.chat(body, token, { modelRef: selectedModel });
        setConversationId(res.conversationId);
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  id: res.message.id,
                  content: res.message.content,
                  citations: res.message.citations,
                  pending: false,
                }
              : message,
          ),
        );
        void refreshConversations();
      }
    } catch (err) {
      if (
        err instanceof Error &&
        (err.name === "AbortError" || err.message.toLowerCase().includes("aborted"))
      ) {
        return;
      }
      setMessages((prev) => {
        const assistant = prev.find((message) => message.id === assistantId);
        if (assistant?.content.trim()) {
          return prev.map((message) =>
            message.id === assistantId
              ? { ...message, pending: false }
              : message,
          );
        }
        return prev.filter((message) => message.id !== assistantId);
      });
      setError(
        wasOffline
          ? modelErrorMessage(err)
          : friendlyError(err, "The tutor could not answer. Try again."),
      );
    } finally {
      abortRef.current = null;
      setLoading(false);
    }
  }, [
    conversationId,
    examType,
    getToken,
    input,
    loading,
    messages,
    mode,
    noteTexts,
    offlineActive,
    persona,
    preferences?.instructions,
    refreshConversations,
    selectedModel,
    streamCapable,
  ]);

  const modeLabel = mode === "materials" ? "Your materials" : "General knowledge";
  const personaLabel =
    TUTOR_PERSONA_OPTIONS.find((option) => option.value === persona)?.label ??
    "Custom tutor";

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      <TutorScreenHeader
        title="AI Tutor"
        subtitle={examLabel(examType) + " " + modeLabel}
        leftAction={{
          label: "Back",
          icon: "arrow-left",
          onPress: () => router.back(),
          accessibilityLabel: "Go back",
        }}
      />

      <View style={styles.personaRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.personaList}
        >
          {TUTOR_PERSONA_OPTIONS.map((option) => {
            const active = option.value === persona;
            return (
              <Pressable
                key={option.value}
                onPress={() => choosePersona(option.value)}
                style={[
                  styles.personaChip,
                  {
                    backgroundColor: active ? theme.primary + "22" : theme.surface,
                    borderColor: active ? theme.primary : theme.border,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <MaterialCommunityIcons
                  name={option.icon as never}
                  size={14}
                  color={active ? theme.primary : theme.textMuted}
                />
                <Text
                  style={[
                    styles.personaText,
                    { color: active ? theme.primary : theme.textMuted },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.examRow}>
        <Text style={[styles.examLabel, { color: theme.textMuted }]}>Exam</Text>
        <View style={styles.examSelect}>
          <ExamSelect value={examType} onChange={chooseExam} />
        </View>
      </View>

      <View style={[styles.modeSwitch, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {MODES.map((option) => {
          const active = option.value === mode;
          return (
            <Pressable
              key={option.value}
              onPress={() => setMode(option.value)}
              style={[
                styles.modeButton,
                active && { backgroundColor: theme.primary },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <MaterialCommunityIcons
                name={option.icon as never}
                size={15}
                color={active ? "#FFFFFF" : theme.textMuted}
              />
              <Text
                style={[
                  styles.modeText,
                  { color: active ? "#FFFFFF" : theme.textMuted },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(message) => message.id}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListHeaderComponent={
            messages.length === 0 ? (
              <View style={styles.welcome}>
                <LinearGradient
                  colors={[theme.tabActive, theme.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.welcomeIcon}
                >
                  <MaterialCommunityIcons name="school-outline" size={30} color="#FFFFFF" />
                </LinearGradient>
                <Text style={[styles.welcomeTitle, { color: theme.text }]}>
                  What are we learning today?
                </Text>
                <Text style={[styles.welcomeText, { color: theme.textMuted }]}>
                  Ask about your notes and study materials, or switch to General for any{" "}
                  {examType.trim() ? `${examLabel(examType)} topic.` : "topic."}
                </Text>
                <View style={styles.suggestions}>
                  {SUGGESTIONS.map((suggestion) => (
                    <Pressable
                      key={suggestion}
                      onPress={() => setInput(suggestion)}
                      style={[
                        styles.suggestion,
                        { backgroundColor: theme.surface, borderColor: theme.border },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="lightbulb-outline"
                        size={15}
                        color={theme.primary}
                      />
                      <Text style={[styles.suggestionText, { color: theme.textSecondary }]}>
                        {suggestion}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.quickActions}>
                  <Pressable
                    onPress={() => router.push("/(tutor)/plan")}
                    style={[styles.quickAction, { borderColor: theme.border }]}
                    accessibilityRole="button"
                  >
                    <MaterialCommunityIcons
                      name="calendar-month-outline"
                      size={17}
                      color={theme.primary}
                    />
                    <Text style={[styles.quickActionText, { color: theme.textSecondary }]}>
                      Study plan
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => router.push("/(tutor)/quiz")}
                    style={[styles.quickAction, { borderColor: theme.border }]}
                    accessibilityRole="button"
                  >
                    <MaterialCommunityIcons
                      name="help-circle-outline"
                      size={17}
                      color={theme.primary}
                    />
                    <Text style={[styles.quickActionText, { color: theme.textSecondary }]}>
                      Practice quiz
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            if (item.role === "user") {
              return (
                <View style={styles.userRow}>
                  <View style={[styles.userBubble, { backgroundColor: theme.primary }]}>
                    <Text style={styles.userText}>{item.content}</Text>
                  </View>
                </View>
              );
            }
            const empty = item.pending && !item.content.trim();
            return (
              <View style={styles.assistantRow}>
                <LinearGradient
                  colors={[theme.tabActive, theme.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.assistantAvatar}
                >
                  <MaterialCommunityIcons name="school-outline" size={15} color="#FFFFFF" />
                </LinearGradient>
                <View style={[styles.assistantBubble, { backgroundColor: theme.surface }]}>
                  {empty ? (
                    <View style={styles.thinkingRow}>
                      <ActivityIndicator size="small" color={theme.primary} />
                      <Text style={[styles.thinkingText, { color: theme.textMuted }]}>
                        Thinking...
                      </Text>
                    </View>
                  ) : (
                    <>
                      <MarkdownRenderer content={item.content} theme={theme} />
                      {item.citations.length > 0 ? (
                        <View style={styles.citations}>
                          {item.citations.slice(0, 3).map((citation, index) => (
                            <View
                              key={`${item.id}_citation_${index}`}
                              style={[
                                styles.citation,
                                {
                                  backgroundColor: theme.surfaceAlt,
                                  borderColor: theme.borderLight,
                                },
                              ]}
                            >
                              <Text
                                style={[styles.citationQuote, { color: theme.textSecondary }]}
                                numberOfLines={3}
                              >
                                “{citation.quote}”
                              </Text>
                              <Text style={[styles.citationSource, { color: theme.primary }]}>
                                {citation.source}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ) : null}
                    </>
                  )}
                </View>
              </View>
            );
          }}
        />

        {error ? (
          <View style={[styles.errorBanner, { backgroundColor: theme.warning + "18" }]}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color={theme.warning} />
            <Text style={[styles.errorText, { color: theme.warning }]}>{error}</Text>
            <Pressable onPress={() => setError(null)} accessibilityLabel="Dismiss error">
              <MaterialCommunityIcons name="close" size={16} color={theme.warning} />
            </Pressable>
          </View>
        ) : null}

        <View style={styles.composerWrap}>
          {mode === "materials" ? (
            <Pressable
              onPress={() => setIncludeNotes((value) => !value)}
              style={[
                styles.notesToggle,
                {
                  borderColor: includeNotes ? theme.primary : theme.border,
                  backgroundColor: includeNotes ? theme.primary + "15" : "transparent",
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: includeNotes }}
            >
              <MaterialCommunityIcons
                name="notebook-check-outline"
                size={14}
                color={includeNotes ? theme.primary : theme.textMuted}
              />
              <Text
                style={[
                  styles.notesToggleText,
                  { color: includeNotes ? theme.primary : theme.textMuted },
                ]}
              >
                {includeNotes ? "Including my notes" : "Include my notes"}
              </Text>
            </Pressable>
          ) : null}

          <View
            style={[
              styles.composer,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder={
                mode === "materials"
                  ? "Ask about your notes or materials..."
                  : examType.trim()
                    ? `Ask any ${examLabel(examType)} question...`
                    : "Ask any study question..."
              }
              placeholderTextColor={theme.textMuted}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={8000}
              editable={!loading}
            />
            <Pressable
              onPress={handleSend}
              disabled={!input.trim() || loading}
              style={[
                styles.sendButton,
                {
                  backgroundColor:
                    input.trim() && !loading ? theme.primary : theme.surfaceAlt,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Send message"
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <MaterialCommunityIcons name="send" size={18} color="#FFFFFF" />
              )}
            </Pressable>
          </View>
          <Text style={[styles.disclaimer, { color: theme.textMuted }]}>
            {personaLabel} · answers can be wrong, always verify with your textbook
          </Text>
        </View>
      </KeyboardAvoidingView>

      <TutorToolsSheet
        visible={showTools}
        onClose={() => setShowTools(false)}
        onPlan={() => {
          setShowTools(false);
          router.push("/(tutor)/plan");
        }}
        onQuiz={() => {
          setShowTools(false);
          router.push("/(tutor)/quiz");
        }}
        onSettings={() => {
          setShowTools(false);
          router.push("/(tutor)/settings");
        }}
      />

      <Modal
        visible={showHistory}
        transparent
        animationType="slide"
        onRequestClose={() => setShowHistory(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalDismiss} onPress={() => setShowHistory(false)} />
          <View style={[styles.historySheet, { backgroundColor: theme.bg }]}>
            <View style={styles.historyHandle} />
            <View style={styles.historyHeader}>
              <Text style={[styles.historyTitle, { color: theme.text }]}>Chat history</Text>
              <Pressable
                onPress={() => setShowHistory(false)}
                accessibilityRole="button"
                accessibilityLabel="Close chat history"
              >
                <MaterialCommunityIcons name="close" size={22} color={theme.textMuted} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.historyList}>
              {conversations.length === 0 ? (
                <Text style={[styles.historyEmpty, { color: theme.textMuted }]}>
                  Your Tutor conversations will appear here.
                </Text>
              ) : (
                conversations.map((conversation) => (
                  <View
                    key={conversation.id}
                    style={[
                      styles.historyRow,
                      {
                        backgroundColor:
                          conversation.id === conversationId
                            ? theme.primary + "15"
                            : theme.surface,
                        borderColor:
                          conversation.id === conversationId
                            ? theme.primary
                            : theme.border,
                      },
                    ]}
                  >
                    <Pressable
                      style={styles.historyMain}
                      onPress={() => openConversation(conversation)}
                    >
                      <Text
                        style={[styles.historyRowTitle, { color: theme.text }]}
                        numberOfLines={1}
                      >
                        {conversation.title}
                      </Text>
                      <Text style={[styles.historyRowMeta, { color: theme.textMuted }]}>
                        {conversation.mode === "materials" ? "Materials" : "General"} ·{" "}
                        {formatWhen(conversation.updatedAt)}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => removeConversation(conversation)}
                      style={styles.historyDelete}
                      accessibilityRole="button"
                      accessibilityLabel="Delete conversation"
                    >
                      <MaterialCommunityIcons
                        name="trash-can-outline"
                        size={18}
                        color={theme.textMuted}
                      />
                    </Pressable>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 2,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: {
    flex: 1,
    paddingHorizontal: 4,
  },
  headerTitle: {
    fontFamily,
    fontSize: 19,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontFamily,
    fontSize: 12,
    marginTop: 1,
  },
  personaRow: {
    paddingBottom: 8,
  },
  personaList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  personaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  personaText: {
    fontFamily,
    fontSize: 12,
    fontWeight: "600",
  },
  examRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  examLabel: {
    fontFamily,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 10,
  },
  examSelect: {
    flex: 1,
  },
  modeSwitch: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 16,
    padding: 3,
    gap: 3,
  },
  modeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 11,
    paddingVertical: 8,
  },
  modeText: {
    fontFamily,
    fontSize: 12,
    fontWeight: "600",
  },
  chatArea: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 14,
    flexGrow: 1,
  },
  welcome: {
    flex: 1,
    alignItems: "center",
    paddingTop: 36,
    paddingHorizontal: 8,
  },
  welcomeIcon: {
    width: 60,
    height: 60,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  welcomeTitle: {
    fontFamily,
    fontSize: 22,
    fontWeight: "700",
    marginTop: 16,
    textAlign: "center",
  },
  welcomeText: {
    fontFamily,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    textAlign: "center",
    maxWidth: 330,
  },
  suggestions: {
    width: "100%",
    gap: 8,
    marginTop: 22,
  },
  suggestion: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  suggestionText: {
    fontFamily,
    fontSize: 13,
    flex: 1,
  },
  quickActions: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
    marginTop: 12,
  },
  quickAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
  },
  quickActionText: {
    fontFamily,
    fontSize: 12,
    fontWeight: "600",
  },
  userRow: {
    alignItems: "flex-end",
  },
  userBubble: {
    borderRadius: 18,
    borderBottomRightRadius: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: "86%",
  },
  userText: {
    color: "#FFFFFF",
    fontFamily,
    fontSize: 14,
    lineHeight: 20,
  },
  assistantRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  assistantAvatar: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  assistantBubble: {
    flex: 1,
    borderRadius: 18,
    borderTopLeftRadius: 5,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  thinkingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 2,
  },
  thinkingText: {
    fontFamily,
    fontSize: 13,
  },
  citations: {
    gap: 7,
    marginTop: 10,
  },
  citation: {
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  citationQuote: {
    fontFamily,
    fontSize: 12,
    lineHeight: 17,
  },
  citationSource: {
    fontFamily,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  errorText: {
    flex: 1,
    fontFamily,
    fontSize: 12,
    lineHeight: 17,
  },
  composerWrap: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
    gap: 6,
  },
  notesToggle: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  notesToggleText: {
    fontFamily,
    fontSize: 11,
    fontWeight: "600",
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    borderWidth: 1,
    borderRadius: 22,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    fontFamily,
    fontSize: 14,
    lineHeight: 20,
    maxHeight: 120,
    paddingTop: 8,
    paddingBottom: 8,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  disclaimer: {
    fontFamily,
    fontSize: 10,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalDismiss: {
    flex: 1,
  },
  historySheet: {
    maxHeight: "72%",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingBottom: 28,
  },
  historyHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignSelf: "center",
    marginTop: 10,
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  historyTitle: {
    fontFamily,
    fontSize: 18,
    fontWeight: "700",
  },
  historyList: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 12,
  },
  historyEmpty: {
    fontFamily,
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 30,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingLeft: 14,
  },
  historyMain: {
    flex: 1,
    paddingVertical: 12,
  },
  historyRowTitle: {
    fontFamily,
    fontSize: 14,
    fontWeight: "600",
  },
  historyRowMeta: {
    fontFamily,
    fontSize: 11,
    marginTop: 3,
  },
  historyDelete: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
});
