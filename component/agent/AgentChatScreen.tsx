import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import ExamSelect from "../tutor/ExamSelect";
import TutorToolsSheet from "../tutor/TutorToolsSheet";
import AgentActionCard from "./AgentActionCard";
import AgentMemoryPickerSheet from "./AgentMemoryPickerSheet";
import { fontFamily } from "../../constants/themes";
import { useAuth } from "../../contexts/AuthContext";
import { useThemeColors } from "../../hooks/useTheme";
import { api, friendlyError } from "../../lib/api";
import { TUTOR_MEMORY_HREF } from "../../constants/navigation";
import {
  memoryFileLabel,
  pickMemoryFile,
  uploadMemoryFile,
} from "../../lib/agent/memoryFiles";
import { executeScheduleAction } from "../../lib/agent/scheduleActions";
import { track } from "../../lib/analytics";
import { examLabel } from "../../data/exams";
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
import { useScheduleStore } from "../../store/scheduleStore";
import type {
  TutorCitation,
  TutorConversation,
  TutorMessageAttachment,
  TutorMode,
  TutorPersona,
  TutorPreferences,
} from "../../types/tutor";
import type {
  AgentMemoryRecord,
  AgentPendingAction,
  AgentProfile,
  AgentScheduleContext,
  AgentStep,
} from "../../types/agent";

interface UiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: TutorCitation[];
  attachments?: TutorMessageAttachment[];
  steps?: AgentStep[];
  pendingActions?: AgentPendingAction[];
  pending?: boolean;
}

function mergeStep(steps: AgentStep[] | undefined, step: AgentStep): AgentStep[] {
  const next = [...(steps ?? [])];
  const index = next.findIndex((item) => item.id === step.id);
  if (index >= 0) {
    next[index] = step;
  } else {
    next.push(step);
  }
  return next;
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
  attachments?: TutorMessageAttachment[];
}): UiMessage {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    citations: message.citations,
    attachments: message.attachments ?? [],
  };
}

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function AgentChatScreen() {
  const router = useRouter();
  const theme = useThemeColors();
  const { getToken } = useAuth();
  const notes = useNoteStore((s) => s.notes);
  const loadNotes = useNoteStore((s) => s.loadNotes);
  const notesLoaded = useNoteStore((s) => s.loaded);
  const scheduleTasks = useScheduleStore((s) => s.tasks);
  const selectedModel = useModelStore((s) => s.selectedModel);

  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<TutorConversation[]>([]);
  const [agentProfiles, setAgentProfiles] = useState<AgentProfile[]>([]);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<TutorPreferences | null>(null);
  const [examType, setExamType] = useState("");
  const [persona, setPersona] = useState<TutorPersona>("patient_tutor");
  const [mode, setMode] = useState<TutorMode>("materials");
  const [includeNotes, setIncludeNotes] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [memories, setMemories] = useState<AgentMemoryRecord[]>([]);
  const [selectedMemoryIds, setSelectedMemoryIds] = useState<string[]>([]);
  const [showMemories, setShowMemories] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  const listRef = useRef<FlatList<UiMessage>>(null);
  const abortRef = useRef<AbortController | null>(null);
  const examSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const offlineActive = isOfflineRef(selectedModel);
  const streamCapable = !offlineActive;
  const memoryFiles = useMemo(
    () => memories.filter((memory) => Boolean(memory.fileUrl)),
    [memories],
  );
  const selectedMemories = useMemo(
    () => memories.filter((memory) => selectedMemoryIds.includes(memory.id)),
    [memories, selectedMemoryIds],
  );

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

  const scheduleContext = useMemo<AgentScheduleContext[]>(() => {
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 30);
    const from = dateKey(start);
    const to = dateKey(end);
    return scheduleTasks
      .filter((task) => task.date >= from && task.date <= to)
      .sort((a, b) =>
        `${a.date}T${a.time ?? "24:00"}`.localeCompare(
          `${b.date}T${b.time ?? "24:00"}`,
        ),
      )
      .slice(0, 60)
      .map((task) => ({
        id: task.id,
        date: task.date,
        title: task.title,
        time: task.time,
        durationMinutes: task.durationMinutes,
        subject: task.subject,
      }));
  }, [scheduleTasks]);

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

  const refreshMemories = useCallback(async () => {
    const token = await getToken();
    if (!token) return [];
    try {
      const res = await api.agent.memories.list(token);
      setMemories(res.memories);
      return res.memories;
    } catch {
      return [];
    }
  }, [getToken]);

  useEffect(() => {
    track("agent_opened");
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
        // the agent still works with defaults
      }
      try {
        const res = await api.agent.profiles.list(token);
        if (!cancelled) {
          setAgentProfiles(res.profiles);
          const preferred =
            res.profiles.find((profile) => profile.isDefault) ?? res.profiles[0];
          if (preferred) {
            setAgentId(preferred.id);
            setPersona(preferred.persona);
          }
        }
      } catch {
        // custom agents are optional
      }
      try {
        const res = await api.agent.memories.list(token);
        if (!cancelled) setMemories(res.memories);
      } catch {
        // memory files are optional
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

  useFocusEffect(
    useCallback(() => {
      void refreshMemories().then((memories) => {
        setMemories(memories);
        setSelectedMemoryIds((prev) =>
          prev.filter((id) => memories.some((m) => m.id === id)),
        );
      });
    }, [refreshMemories]),
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getToken();
      if (!token || cancelled) return;
      try {
        const res = await api.agent.actions.list(token);
        if (cancelled || res.actions.length === 0) return;
        const id = `pending_actions_${res.actions.map((action) => action.id).join("_")}`;
        setMessages((prev) => {
          if (prev.some((message) => message.id === id)) return prev;
          return [
            ...prev,
            {
              id,
              role: "assistant",
              content: "I have actions waiting for your approval.",
              citations: [],
              pendingActions: res.actions,
            },
          ];
        });
      } catch {
        // approval cards still arrive with new replies
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

  const approveAction = useCallback(
    async (action: AgentPendingAction) => {
      const token = await getToken();
      if (!token) {
        throw new Error("Your session expired. Please sign in again.");
      }
      if (action.execution === "client") {
        const result = await executeScheduleAction(action);
        await api.agent.actions.approve(
          action.id,
          { ok: true, summary: result.summary },
          token,
        );
        return;
      }
      const res = await api.agent.actions.approve(action.id, undefined, token);
      if (res.action.status !== "success") {
        throw new Error(
          res.action.error ??
            res.action.summary ??
            "Could not apply this action.",
        );
      }
    },
    [getToken],
  );

  const rejectAction = useCallback(
    async (action: AgentPendingAction) => {
      const token = await getToken();
      if (!token) {
        throw new Error("Your session expired. Please sign in again.");
      }
      await api.agent.actions.reject(action.id, token);
    },
    [getToken],
  );

  const choosePersona = useCallback(
    (next: TutorPersona) => {
      setPersona(next);
      setAgentId(null);
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

  const chooseAgent = useCallback((profile: AgentProfile) => {
    setAgentId(profile.id);
    setPersona(profile.persona);
  }, []);

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
        setAgentId(res.conversation.agentProfileId ?? null);
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

  const handleAttachFile = useCallback(async () => {
    if (uploadingFile) return;
    if (offlineActive) {
      setError("File context needs a cloud model. Switch models to tag files.");
      return;
    }
    const token = await getToken();
    if (!token) {
      setError("Your session expired. Please sign in again.");
      return;
    }
    try {
      const file = await pickMemoryFile();
      if (!file) return;
      setUploadingFile(true);
      const result = await uploadMemoryFile(file, token);
      setMemories((prev) => [
        result.memory,
        ...prev.filter((memory) => memory.id !== result.memory.id),
      ]);
      setSelectedMemoryIds((prev) =>
        prev.includes(result.memory.id) ? prev : [...prev, result.memory.id],
      );
      setError(null);
      if (result.extractionFailed) {
        Alert.alert(
          "File saved",
          "We could not read text from this file. You can still add a note to it from Agent memory.",
        );
      }
    } catch (err) {
      setError(friendlyError(err, "Could not upload that file."));
    } finally {
      setUploadingFile(false);
    }
  }, [getToken, offlineActive, uploadingFile]);

  const toggleMemory = useCallback((memory: AgentMemoryRecord) => {
    setSelectedMemoryIds((prev) =>
      prev.includes(memory.id)
        ? prev.filter((id) => id !== memory.id)
        : [...prev, memory.id],
    );
  }, []);

  const openMemories = useCallback(() => {
    setShowMemories(true);
    void refreshMemories();
  }, [refreshMemories]);

  const handleSend = useCallback(async () => {
    const question = input.trim();
    if (!question || loading) return;
    if (offlineActive && selectedMemoryIds.length > 0) {
      setError("Tagged files need a cloud model. Switch models or remove the tags.");
      return;
    }

    setInput("");
    setError(null);
    setLoading(true);

    const assistantId = `pending_${Date.now()}`;
    const taggedAttachments = selectedMemories.map((memory) => ({
      id: memory.id,
      label: memoryFileLabel(memory),
      fileName: memory.fileName ?? undefined,
      mimeType: memory.mimeType ?? undefined,
      url: memory.fileUrl ?? undefined,
      sizeBytes: memory.sizeBytes ?? undefined,
    }));
    const taggedMemoryIds = [...selectedMemoryIds];
    const userMessage: UiMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: question,
      citations: [],
      attachments: taggedAttachments,
    };
    setMessages((prev) => [
      ...prev,
      userMessage,
      {
        id: assistantId,
        role: "assistant",
        content: "",
        citations: [],
        steps: [],
        pending: true,
      },
    ]);
    setSelectedMemoryIds([]);
    track("agent_message_sent", {
      mode,
      offline: offlineActive,
      hasNotes: noteTexts.length > 0,
      hasFiles: taggedMemoryIds.length > 0,
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
        agentId: agentId ?? undefined,
        message: question,
        persona,
        mode,
        examType: examType.trim() || undefined,
        memoryIds: taggedMemoryIds.length > 0 ? taggedMemoryIds : undefined,
        noteTexts: noteTexts.length > 0 ? noteTexts : undefined,
        schedule: scheduleContext.length > 0 ? scheduleContext : undefined,
      };

      if (streamCapable) {
        const controller = new AbortController();
        abortRef.current = controller;
        let streamError: string | null = null;

        await api.agent.chatStream(
          body,
          token,
          {
            onDelta: () => {},
            onStep: (step) => {
              setMessages((prev) =>
                prev.map((message) =>
                  message.id === assistantId
                    ? {
                        ...message,
                        steps: mergeStep(message.steps, step),
                      }
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
                          steps: payload?.steps ?? message.steps,
                          pendingActions: payload?.pendingActions ?? [],
                          pending: false,
                        }
                      : message,
                  ),
                );
              } else {
                setMessages((prev) =>
                  prev.map((message) =>
                    message.id === assistantId
                      ? {
                          ...message,
                          steps: payload?.steps ?? message.steps,
                          pendingActions: payload?.pendingActions ?? [],
                          pending: false,
                        }
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
        const res = await api.agent.chat(body, token, { modelRef: selectedModel });
        setConversationId(res.conversationId);
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  id: res.message.id,
                  content: res.message.content,
                  citations: res.message.citations,
                  steps: res.steps,
                  pendingActions: res.pendingActions ?? [],
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
          : friendlyError(err, "The study agent could not answer. Try again."),
      );
    } finally {
      abortRef.current = null;
      setLoading(false);
    }
  }, [
    agentId,
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
    scheduleContext,
    selectedMemories,
    selectedMemoryIds,
    selectedModel,
    streamCapable,
  ]);

  const modeLabel = mode === "materials" ? "Your materials" : "General knowledge";
  const selectedAgent =
    agentProfiles.find((profile) => profile.id === agentId) ?? null;
  const personaLabel =
    TUTOR_PERSONA_OPTIONS.find((option) => option.value === persona)?.label ??
    "Custom tutor";

  return (
<SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.headerButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.text} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
            {selectedAgent?.name ?? "Study agent"}
          </Text>
          <Text
            style={[styles.headerSubtitle, { color: theme.textMuted }]}
            numberOfLines={1}
          >
            {selectedAgent ? "Custom agent" : personaLabel} - {modeLabel}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push(TUTOR_MEMORY_HREF)}
          style={styles.headerButton}
          accessibilityRole="button"
          accessibilityLabel="Open agent memory"
        >
          <MaterialCommunityIcons name="brain" size={21} color={theme.primary} />
        </Pressable>
        <Pressable
          onPress={() => setShowTools(true)}
          style={styles.headerButton}
          accessibilityRole="button"
          accessibilityLabel="Open agent tools"
        >
          <MaterialCommunityIcons
            name="dots-horizontal"
            size={21}
            color={theme.textMuted}
          />
        </Pressable>
        <Pressable
          onPress={() => setShowHistory(true)}
          style={styles.headerButton}
          accessibilityRole="button"
          accessibilityLabel="Open chat history"
        >
          <MaterialCommunityIcons name="history" size={20} color={theme.textMuted} />
        </Pressable>
        <Pressable
          onPress={startNewChat}
          style={styles.headerButton}
          accessibilityRole="button"
          accessibilityLabel="Start a new chat"
        >
          <MaterialCommunityIcons
            name="square-edit-outline"
            size={19}
            color={theme.textMuted}
          />
        </Pressable>
      </View>

      {agentProfiles.length > 0 ? (
        <View style={styles.agentRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.personaList}
          >
            <Pressable
              onPress={() => setAgentId(null)}
              style={[
                styles.agentChip,
                {
                  backgroundColor: agentId ? theme.surface : theme.primary + "22",
                  borderColor: agentId ? theme.border : theme.primary,
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: !agentId }}
            >
              <MaterialCommunityIcons
                name="account-group-outline"
                size={15}
                color={agentId ? theme.textMuted : theme.primary}
              />
              <Text
                style={[
                  styles.personaText,
                  { color: agentId ? theme.textMuted : theme.primary },
                ]}
              >
                Built-in
              </Text>
            </Pressable>
            {agentProfiles.map((profile) => {
              const active = profile.id === agentId;
              return (
                <Pressable
                  key={profile.id}
                  onPress={() => chooseAgent(profile)}
                  style={[
                    styles.agentChip,
                    {
                      backgroundColor: active ? theme.primary + "22" : theme.surface,
                      borderColor: active ? theme.primary : theme.border,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <MaterialCommunityIcons
                    name={profile.avatar as never}
                    size={15}
                    color={active ? theme.primary : theme.textMuted}
                  />
                  <Text
                    style={[
                      styles.personaText,
                      { color: active ? theme.primary : theme.textMuted },
                    ]}
                  >
                    {profile.name}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => router.push(TUTOR_MEMORY_HREF)}
              style={[styles.agentChip, { borderColor: theme.border }]}
              accessibilityRole="button"
              accessibilityLabel="Open agent memory"
            >
              <MaterialCommunityIcons name="brain" size={15} color={theme.textMuted} />
              <Text style={[styles.personaText, { color: theme.textMuted }]}>
                Memory
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      ) : null}

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

      <View
        style={[
          styles.modeSwitch,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        {MODES.map((option) => {
          const active = option.value === mode;
          return (
            <Pressable
              key={option.value}
              onPress={() => setMode(option.value)}
              style={[styles.modeButton, active && { backgroundColor: theme.primary }]}
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
                      accessibilityRole="button"
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
                    {item.attachments?.length ? (
                      <View style={styles.userAttachments}>
                        {item.attachments.map((attachment) => (
                          <View key={attachment.id} style={styles.userAttachment}>
                            <MaterialCommunityIcons
                              name="paperclip"
                              size={12}
                              color="#FFFFFF"
                            />
                            <Text style={styles.userAttachmentText} numberOfLines={1}>
                              {attachment.label}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
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
                  {item.steps && item.steps.length > 0 ? (
                    <View style={styles.steps}>
                      {item.steps.map((step) => (
                        <View
                          key={step.id}
                          style={[
                            styles.stepRow,
                            {
                              backgroundColor: theme.surfaceAlt,
                              borderColor: theme.borderLight,
                            },
                          ]}
                        >
                          {step.status === "running" ? (
                            <ActivityIndicator size="small" color={theme.primary} />
                          ) : (
                            <MaterialCommunityIcons
                              name={
                                step.status === "done"
                                  ? "check-circle-outline"
                                  : step.status === "awaiting_approval"
                                    ? "clock-outline"
                                    : "alert-circle-outline"
                              }
                              size={15}
                              color={
                                step.status === "done"
                                  ? theme.primary
                                  : step.status === "awaiting_approval"
                                    ? theme.warning
                                    : theme.danger
                              }
                            />
                          )}
                          <View style={styles.stepCopy}>
                            <Text style={[styles.stepText, { color: theme.textSecondary }]}>
                              {step.label}
                            </Text>
                            {step.detail ? (
                              <Text
                                style={[styles.stepDetail, { color: theme.textMuted }]}
                                numberOfLines={2}
                              >
                                {step.detail}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : null}
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
                      {item.pendingActions?.length ? (
                        <View style={styles.pendingActions}>
                          {item.pendingActions.map((action) => (
                            <AgentActionCard
                              key={action.id}
                              action={action}
                              onApprove={approveAction}
                              onReject={rejectAction}
                            />
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
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={16}
              color={theme.warning}
            />
            <Text style={[styles.errorText, { color: theme.warning }]}>{error}</Text>
            <Pressable
              onPress={() => setError(null)}
              accessibilityRole="button"
              accessibilityLabel="Dismiss error"
            >
              <MaterialCommunityIcons name="close" size={16} color={theme.warning} />
            </Pressable>
          </View>
        ) : null}

        <View style={styles.composerWrap}>
          {selectedMemories.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.taggedList}
            >
              {selectedMemories.map((memory) => (
                <Pressable
                  key={memory.id}
                  onPress={() => toggleMemory(memory)}
                  style={[styles.taggedChip, { borderColor: theme.primary }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${memoryFileLabel(memory)}`}
                >
                  <MaterialCommunityIcons name="paperclip" size={12} color={theme.primary} />
                  <Text
                    style={[styles.taggedText, { color: theme.primary }]}
                    numberOfLines={1}
                  >
                    {memoryFileLabel(memory)}
                  </Text>
                  <MaterialCommunityIcons name="close" size={12} color={theme.primary} />
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          <View style={styles.composerActions}>
            <Pressable
              onPress={handleAttachFile}
              disabled={uploadingFile}
              style={[styles.composerAction, { borderColor: theme.border }]}
              accessibilityRole="button"
              accessibilityLabel="Upload file to agent memory"
            >
              {uploadingFile ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <MaterialCommunityIcons name="paperclip" size={15} color={theme.primary} />
              )}
              <Text style={[styles.composerActionText, { color: theme.textSecondary }]}>
                {uploadingFile ? "Uploading..." : "Attach file"}
              </Text>
            </Pressable>
            <Pressable
              onPress={openMemories}
              style={[styles.composerAction, { borderColor: theme.border }]}
              accessibilityRole="button"
              accessibilityLabel="Tag memory files"
            >
              <MaterialCommunityIcons
                name="file-multiple-outline"
                size={15}
                color={theme.textMuted}
              />
              <Text style={[styles.composerActionText, { color: theme.textSecondary }]}>
                Files{memoryFiles.length > 0 ? ` (${memoryFiles.length})` : ""}
              </Text>
            </Pressable>
          </View>

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

      <AgentMemoryPickerSheet
        visible={showMemories}
        memories={memoryFiles}
        selectedIds={selectedMemoryIds}
        onToggle={toggleMemory}
        onClose={() => setShowMemories(false)}
        onManage={() => {
          setShowMemories(false);
          router.push(TUTOR_MEMORY_HREF);
        }}
      />

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
          router.push(TUTOR_MEMORY_HREF);
        }}
      />

      <Modal
        visible={showHistory}
        transparent
        animationType="slide"
        onRequestClose={() => setShowHistory(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalDismiss}
            onPress={() => setShowHistory(false)}
            accessibilityLabel="Close chat history"
          />
          <View style={[styles.historySheet, { backgroundColor: theme.bg }]}>
            <View style={[styles.historyHandle, { backgroundColor: theme.textMuted }]} />
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
                  Your study agent conversations will appear here.
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
                      accessibilityRole="button"
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
  agentRow: {
    paddingBottom: 6,
  },
  agentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
  userAttachments: {
    marginTop: 8,
    gap: 4,
  },
  userAttachment: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    maxWidth: "100%",
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  userAttachmentText: {
    flexShrink: 1,
    color: "#FFFFFF",
    fontFamily,
    fontSize: 11,
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
  steps: {
    gap: 6,
    marginBottom: 8,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  stepCopy: {
    flex: 1,
    gap: 1,
  },
  stepText: {
    fontFamily,
    fontSize: 12,
    fontWeight: "600",
  },
  stepDetail: {
    fontFamily,
    fontSize: 11,
    lineHeight: 15,
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
  pendingActions: {
    marginTop: 2,
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
  taggedList: {
    gap: 6,
    paddingRight: 8,
  },
  taggedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    maxWidth: 220,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  taggedText: {
    flexShrink: 1,
    fontFamily,
    fontSize: 11,
    fontWeight: "600",
  },
  composerActions: {
    flexDirection: "row",
    gap: 8,
  },
  composerAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  composerActionText: {
    fontFamily,
    fontSize: 11,
    fontWeight: "600",
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
