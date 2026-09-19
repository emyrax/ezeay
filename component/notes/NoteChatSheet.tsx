import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { File } from "expo-file-system";
import { useThemeColors } from "../../hooks/useTheme";
import { bodyFont, type ThemeColors } from "../../constants/themes";
import type { NoteImage } from "../../types/note";
import { api, type AiImagesArg, type NoteChatMessage, type NoteChatMessageInput } from "../../lib/api";
import { useModelStore } from "../../store/modelStore";
import { useOfflineStore } from "../../store/offlineStore";
import InfoTip from "./InfoTip";
import GlassSheet from "./GlassSheet";
import { buildNotesAiPrompt, buildNotesChatPrompt } from "../../lib/offline/notesPrompts";
import { shapeToSchema } from "../../lib/offline/jsonSchema";
import {
  ensureOfflineActivated,
  isOfflineRef,
  modelErrorMessage,
  offlineGenerateObject,
  offlineGenerateText,
  offlineStreamText,
} from "../../lib/providers/offline";
import { useModelRatingStore } from "../../store/modelRatingStore";
import { useAuth } from "../../contexts/AuthContext";
import { AI_PROVIDERS, useAiKeysStore } from "../../store/aiKeysStore";
import {
  AI_MODEL_DEFAULT,
  AI_MODELS,
  AI_PROVIDER_LABELS,
  effectiveRating,
  getModelOption,
  sortModels,
  type AiModelOption,
  type AiProvider,
} from "../../lib/providers/modelRegistry";
import ThemeIcon from "./ThemeIcon";
import StarsRating from "../StarsRating";
import AiFlashcardsView, { AiFlashcard } from "./AiFlashcardsView";
import AiQuizView, { AiQuizQuestion } from "./AiQuizView";

type ToolKind = Exclude<NoteChatMessage["kind"], "chat">;

interface ToolCommand {
  id: ToolKind;
  label: string;
  sf: string;
  material: Parameters<typeof ThemeIcon>[0]["material"];
  colorKey: "primary" | "accent" | "info" | "success" | "warning";
}

const TOOL_COMMANDS: ToolCommand[] = [
  { id: "summary", label: "Summarize", sf: "doc.text.magnifyingglass", material: "text-box-search-outline", colorKey: "primary" },
  { id: "tags", label: "Auto-tags", sf: "tag", material: "tag-multiple-outline", colorKey: "info" },
  { id: "cheatsheet", label: "Cheat sheet", sf: "text.book.closed", material: "notebook-outline", colorKey: "accent" },
  { id: "flashcards", label: "Flashcards", sf: "rectangle.stack", material: "cards-outline", colorKey: "success" },
  { id: "quiz", label: "Quiz", sf: "checkmark.circle", material: "head-question-outline", colorKey: "accent" },
];

const COMMAND_TEXT: Record<ToolKind, string> = {
  summary: "Summarize this note",
  tags: "Suggest tags for this note",
  cheatsheet: "Make a cheat sheet for this note",
  flashcards: "Make flashcards for this note",
  quiz: "Make a quiz for this note",
};

const NOTES_TEXT_TOOL_KEYS: Partial<Record<ToolKind, string>> = {
  summary: "summary",
  cheatsheet: "cheat_sheet",
};

const SECTION_TITLES: Partial<Record<ToolKind, string>> = {
  summary: "## Summary",
  cheatsheet: "## Cheat Sheet",
};

const TOOL_RESULT_META: Partial<
  Record<ToolKind, { label: string; sf: string; material: ToolCommand["material"]; colorKey: ToolCommand["colorKey"] }>
> = {
  summary: { label: "Summary", sf: "doc.text.magnifyingglass", material: "text-box-search-outline", colorKey: "primary" },
  cheatsheet: { label: "Cheat sheet", sf: "text.book.closed", material: "notebook-outline", colorKey: "accent" },
  flashcards: { label: "Flashcards", sf: "rectangle.stack", material: "cards-outline", colorKey: "success" },
  quiz: { label: "Quiz", sf: "checkmark.circle", material: "head-question-outline", colorKey: "warning" },
};

type GroundingMode = "note" | "web";

interface GroundingOption {
  id: GroundingMode;
  label: string;
  sf: string;
  material: React.ComponentProps<typeof ThemeIcon>["material"];
}

const GROUNDING_MODES: GroundingOption[] = [
  { id: "note", label: "Note", sf: "note.text", material: "note-text-outline" },
  { id: "web", label: "Web", sf: "globe", material: "web" },
];

const TAGS_META = {
  label: "Tags",
  sf: "tag",
  material: "tag-multiple-outline",
  colorKey: "info",
} as const;

const IMAGE_READ_LIMIT = 4;
const IMAGE_BASE64_MAX = 2.5 * 1024 * 1024;

function formatMsgTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function mimeFromUri(uri: string): string {
  const m = /\.(jpe?g|png|webp|heic|heif|avif|bmp|gif)$/i.exec(uri);
  if (!m) return "image/jpeg";
  const ext = m[1].toLowerCase();
  return ext === "jpg" ? "image/jpeg" : `image/${ext}`;
}

function ReceiptCard({
  theme,
  m,
  payload,
}: {
  theme: ThemeColors;
  m: NoteChatMessage;
  payload: Payload;
}) {
  const scale = useRef(new Animated.Value(0.94)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 90,
    }).start();
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  }, [scale, opacity]);

  const meta =
    m.kind !== "chat"
      ? (TOOL_RESULT_META[m.kind] ?? TAGS_META)
      : TAGS_META;
  const color = theme[meta.colorKey];
  const time = formatMsgTime(m.createdAt);

  const count =
    m.kind === "flashcards"
      ? payload.cards?.length
      : m.kind === "quiz"
        ? payload.questions?.length
        : m.kind === "tags"
          ? payload.tags?.length
          : undefined;

  const rows = useMemo(() => {
    if (m.kind === "flashcards") {
      return (payload.cards ?? []).slice(0, 3).map((c, i) => (
        <View key={i} style={[styles.receiptRow, { borderBottomColor: theme.borderLight }]}>
          <Text style={[styles.receiptRowLabel, { color: theme.text }]} numberOfLines={1}>
            {c.front}
          </Text>
          <ThemeIcon sf="arrow.right" material="arrow-right" size={11} color={theme.textMuted} weight="bold" />
          <Text style={[styles.receiptRowValue, { color }]} numberOfLines={1}>
            {c.back}
          </Text>
        </View>
      ));
    }
    if (m.kind === "quiz") {
      const items: { q: string; a: string }[] = [];
      for (const q of payload.questions ?? []) {
        if (items.length >= 3) break;
        items.push({ q: q.question, a: q.options[q.correctAnswer] ?? "" });
      }
      return items.map((item, i) => (
        <View key={i} style={[styles.receiptRow, { borderBottomColor: theme.borderLight }]}>
          <Text style={[styles.receiptRowLabel, { color: theme.text }]} numberOfLines={1}>
            {item.q}
          </Text>
          <ThemeIcon sf="checkmark.circle.fill" material="check-circle-outline" size={11} color={color} weight="bold" />
          <Text style={[styles.receiptRowValue, { color }]} numberOfLines={1}>
            {item.a}
          </Text>
        </View>
      ));
    }
    return null;
  }, [m.kind, payload, theme, color]);

  const tags = m.kind === "tags" ? (payload.tags ?? []).slice(0, 6) : null;
  const showSnippet = m.kind === "summary" || m.kind === "cheatsheet";

  return (
    <Animated.View
      style={[
        styles.receiptCard,
        { borderColor: color + "38", backgroundColor: theme.surfaceAlt, transform: [{ scale }], opacity },
      ]}
    >
      <View style={styles.receiptHead}>
        <View style={[styles.receiptIcon, { backgroundColor: color + "1A" }]}>
          <ThemeIcon sf={meta.sf} material={meta.material} size={13} color={color} weight="semibold" />
        </View>
        <Text style={[styles.receiptTitle, { color: theme.text }]} numberOfLines={1}>
          {meta.label}
        </Text>
        {count !== undefined && (
          <View style={[styles.receiptBadge, { backgroundColor: color + "22" }]}>
            <Text style={[styles.receiptBadgeText, { color }]}>{count}</Text>
          </View>
        )}
      </View>

      {tags !== null && tags.length > 0 && (
        <View style={styles.receiptTagsWrap}>
          {tags.map((t) => (
            <View key={t} style={[styles.receiptTagChip, { backgroundColor: color + "1A" }]}>
              <Text style={[styles.receiptTagLabel, { color }]}>#{t}</Text>
            </View>
          ))}
        </View>
      )}

      {showSnippet && (
        <Text style={[styles.receiptSnippet, { color: theme.textSecondary }]} numberOfLines={2}>
          {stripMarkdown(payload.text ?? m.content)}
        </Text>
      )}

      {rows}

      <View style={[styles.receiptFooter, { borderTopColor: theme.borderLight }]}>
        <ThemeIcon sf="checkmark.circle.fill" material="check-circle-outline" size={12} color={theme.success} weight="bold" />
        <Text style={[styles.receiptFooterText, { color: theme.textSecondary }]}>
          {time ? `Added to note · ${time}` : "Added to note"}
        </Text>
      </View>
    </Animated.View>
  );
}

const COPILOT_HELP_LINES = [
  "Ask anything — the AI answers using this note",
  "Switch grounding: this note, or web",
  "Reads note images in order when present",
  "Use quick tools: summarize, quiz, flashcards",
  "Append or replace the result straight into your note",
];

interface Persistable {
  role: "user" | "assistant";
  kind: NoteChatMessage["kind"];
  content: string;
}

interface Payload {
  text?: string;
  tags?: string[];
  cards?: AiFlashcard[];
  questions?: AiQuizQuestion[];
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*]\s+/gm, "• ")
    .trim();
}

function parsePayload(content: string): Payload {
  try {
    const data = JSON.parse(content);
    if (data && typeof data === "object") return data as Payload;
  } catch {
    // fall through
  }
  return { text: content };
}

interface NoteChatSheetProps {
  visible: boolean;
  onClose?: () => void;
  noteId: string;
  noteTitle: string;
  noteContent: string;
  images?: NoteImage[];
  existingTags: string[];
  getToken: () => Promise<string | null>;
  onAppendContent: (text: string) => void;
  onReplaceContent: (text: string) => void;
  onApplyTags: (tags: string[]) => void;
  onBusyChange?: (busy: boolean) => void;
  inline?: boolean;
}

export default function NoteChatSheet({
  visible,
  onClose,
  noteId,
  noteTitle,
  noteContent,
  images = [],
  existingTags,
  getToken,
  onAppendContent,
  onReplaceContent,
  onApplyTags,
  onBusyChange,
  inline = false,
}: NoteChatSheetProps) {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const userRatings = useModelRatingStore((s) => s.ratings);
  const rateModel = useModelRatingStore((s) => s.rate);
  const [ratingPending, setRatingPending] = useState<string | null>(null);
  const [ratingErrorText, setRatingErrorText] = useState<string | null>(null);

  const [modelRef, setModelRef] = useState(() => useModelStore.getState().selectedModel);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [serverKeys, setServerKeys] = useState<Partial<Record<AiProvider, boolean>>>({});
  const [serverKeysError, setServerKeysError] = useState(false);
  const clientKeys = useAiKeysStore((s) => s.keys);

  useEffect(() => {
    setModelRef(useModelStore.getState().selectedModel);
  }, [noteId]);

  useEffect(() => {
    useAiKeysStore.getState().loadKeys().catch(() => {});
  }, []);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    getToken()
      .then((token) => {
        if (!token) return;
        return api.ai
          .providers(token)
          .then((res) => {
            if (!active) return;
            const status: Partial<Record<AiProvider, boolean>> = {};
            for (const provider of AI_PROVIDERS) {
              status[provider] = res.providers[provider]?.serverKeyConfigured ?? false;
            }
            setServerKeys(status);
            setServerKeysError(false);
          })
          .catch(() => {
            if (active) setServerKeysError(true);
          });
      })
      .catch(() => {
        if (active) setServerKeysError(true);
      });
    return () => {
      active = false;
    };
  }, [visible, getToken]);

  const offlineAvailable = useOfflineStore((s) => s.available);
  const offlineStatus = useOfflineStore((s) => s.status);

  const providerStatus = useCallback(
    (provider: AiProvider): "ready" | "needs-key" | "unknown" => {
      if (provider === "offline") {
        if (!offlineAvailable) return "unknown";
        return offlineStatus === "ready" || offlineStatus === "downloaded"
          ? "ready"
          : "needs-key";
      }
      if (clientKeys[provider]) return "ready";
      if (serverKeysError) return "unknown";
      return serverKeys[provider] ? "ready" : "needs-key";
    },
    [clientKeys, serverKeys, serverKeysError, offlineAvailable, offlineStatus],
  );

  const modelGroups = useMemo(() => {
    const order: AiProvider[] = ["gemini", "openai", "anthropic", "openrouter", "offline"];
    return order
      .map((provider) => ({
        provider,
        models: sortModels(
          AI_MODELS.filter((m) => m.provider === provider),
          userRatings,
        ),
      }))
      .filter((group) => group.models.length > 0);
  }, [userRatings]);

  const handleRate = useCallback(
    async (ref: string, value: number) => {
      if (ratingPending) return;
      setRatingPending(ref);
      setRatingErrorText(null);
      try {
        const token = await getToken();
        const uid = profile?.uid;
        if (!token || !uid) throw new Error("Sign in to save ratings.");
        await rateModel(ref, value === 0 ? null : value, uid, token);
      } catch (err) {
        setRatingErrorText(err instanceof Error ? err.message : "Couldn't save your rating.");
      } finally {
        setRatingPending(null);
      }
    },
    [ratingPending, getToken, profile?.uid, rateModel],
  );

  const currentModel: AiModelOption =
    getModelOption(modelRef) ?? getModelOption(AI_MODEL_DEFAULT)!;

  const offlineActive = isOfflineRef(currentModel.ref);
  const offlineStopRef = useRef<(() => void) | null>(null);

  const [messages, setMessages] = useState<NoteChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [chatFocused, setChatFocused] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFailure, setLastFailure] = useState<
    | { kind: "tool"; tool: ToolKind }
    | { kind: "chat"; question: string; mode: GroundingMode; reasoning: boolean; stream: boolean }
    | null
  >(null);
  const [hydrating, setHydrating] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [appliedFor, setAppliedFor] = useState<string | null>(null);
  const [quizDoneId, setQuizDoneId] = useState<string | null>(null);

  const [grounding, setGrounding] = useState<GroundingMode>("note");
  const [reasoning, setReasoning] = useState(false);
  const [streamEnabled, setStreamEnabled] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const streamAbortRef = useRef<AbortController | null>(null);
  const streamSeqRef = useRef(0);
  const [useImages, setUseImages] = useState(images.length > 0);
  const imageTouchedRef = useRef(false);

  const hydratedFor = useRef<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const chatInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!visible) {
      streamAbortRef.current?.abort();
      offlineStopRef.current?.();
    }
  }, [visible]);

  useEffect(
    () => () => {
      streamAbortRef.current?.abort();
      offlineStopRef.current?.();
    },
    [],
  );

  const effectiveProvider: AiProvider =
    grounding === "web" ? "gemini" : currentModel.provider;
  const canStream = effectiveProvider === "gemini" || effectiveProvider === "offline";
  const isBusy = thinking || streaming;
  const controlsActive =
    grounding !== "note" || streamEnabled || reasoning || (useImages && images.length > 0);

  useEffect(() => {
    if (!imageTouchedRef.current) {
      setUseImages(images.length > 0);
    }
  }, [noteId, images.length]);

  useEffect(() => {
    onBusyChange?.(isBusy);
  }, [isBusy, onBusyChange]);

  useEffect(() => {
    if (offlineActive && grounding === "web") {
      setGrounding("note");
    }
  }, [offlineActive, grounding]);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const applyConfirm = useCallback((id: string) => {
    setAppliedFor(id);
  }, []);

  const formatFlashcards = useCallback((cards: AiFlashcard[]): string => {
    return `## Flashcards\n\n${cards
      .map((c, i) => `${i + 1}. ${c.front}\n   → ${c.back}`)
      .join("\n\n")}`;
  }, []);

  const formatQuiz = useCallback((questions: AiQuizQuestion[]): string => {
    return `## Quiz Q&A\n\n${questions
      .map((q, i) => `${i + 1}. ${q.question}\n   → ${q.options[q.correctAnswer] ?? ""}`)
      .join("\n\n")}`;
  }, []);

  const hasText = noteContent.trim().length > 0;

  const readAiImages = useCallback(async (): Promise<AiImagesArg[] | undefined> => {
    if (!useImages || offlineActive || images.length === 0) return undefined;
    const out: AiImagesArg[] = [];
    const picked = images.slice(0, IMAGE_READ_LIMIT);
    for (let i = 0; i < picked.length; i++) {
      try {
        const base64 = await new File(picked[i].uri).base64();
        if (!base64 || base64.length > IMAGE_BASE64_MAX) continue;
        out.push({ order: i, base64, mimeType: mimeFromUri(picked[i].uri) });
      } catch {
        // skip unreadable images — never block the AI call on a file error
      }
    }
    return out.length > 0 ? out : undefined;
  }, [useImages, offlineActive, images]);

  const persist = useCallback(
    async (all: NoteChatMessage[]) => {
      try {
        const token = await getToken();
        if (!token) return;
        const inputs: NoteChatMessageInput[] = all.map((m) => ({
          id: m.id,
          role: m.role,
          kind: m.kind,
          content: m.content,
          createdAt: m.createdAt,
        }));
        await api.notes.chats.save(noteId, inputs.slice(0, 200), token);
      } catch (err: any) {
        console.warn("[NoteChat] persistence failed:", err?.message);
      }
    },
    [getToken, noteId],
  );

  const handleClearChat = useCallback(() => {
    if (messages.length === 0) return;
    Alert.alert(
      "Clear chat?",
      `Delete all ${messages.length} messages in this note's AI chat? The note itself is untouched.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            streamAbortRef.current?.abort();
            offlineStopRef.current?.();
            setStreaming(false);
            setStreamText("");
            setThinking(false);
            setError(null);
            setLastFailure(null);
            setAppliedFor(null);
            setQuizDoneId(null);
            setMessages([]);
            hydratedFor.current = null;
            getToken().then((token) => {
              if (!token) return;
              api.notes.chats.clear(noteId, token).catch((e: any) => {
                console.warn("[NoteChat] clear failed:", e?.message);
              });
            });
          },
        },
      ],
    );
  }, [messages.length, getToken, noteId]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    if (hydratedFor.current === noteId) return;

    const load = async () => {
      setHydrating(true);
      try {
        const token = await getToken();
        if (!token) return;
        const rows = await api.notes.chats.list(noteId, token);
        if (!cancelled) {
          setMessages(rows);
          hydratedFor.current = noteId;
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Could not load chat history.");
      } finally {
        if (!cancelled) setHydrating(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [visible, noteId, getToken]);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  useEffect(() => {
    if (messages.length > 0) scrollToEnd();
  }, [messages.length, scrollToEnd]);

  const offlineChatPrompt = async (
    question: string,
    turns: { role: "user" | "assistant"; content: string }[],
    opts: { mode: GroundingMode; reasoning: boolean },
  ): Promise<string> => {
    const mode: GroundingMode = opts.mode === "web" ? "note" : opts.mode;
    return buildNotesChatPrompt({
      mode,
      noteTitle,
      noteContent,
      messages: turns,
      question,
      reasoning: opts.reasoning,
    });
  };

  const runAi = async (body: Record<string, unknown>): Promise<Record<string, unknown> | null> => {
    setError(null);
    try {
      if (offlineActive) {
        await ensureOfflineActivated(modelRef);
        const action = (body.action as ToolKind | undefined) ?? "chat";
        const prompt = buildNotesAiPrompt({
          action,
          noteTitle,
          noteContent,
          question: typeof body.question === "string" ? body.question : undefined,
          existingTags,
        });
        const textKey = action === "chat" ? undefined : NOTES_TEXT_TOOL_KEYS[action];
        if (textKey) {
          const text = await offlineGenerateText({
            system: prompt.system,
            messages: [],
          });
          const clean = text.trim();
          if (!clean) {
            setError(`${currentModel.label} couldn't generate that from this note. Try again or switch to a more reliable model.`);
            return null;
          }
          return { [textKey]: clean };
        }
        return await offlineGenerateObject<Record<string, unknown>>(
          shapeToSchema(prompt.jsonShape),
          {
            system: prompt.system,
            messages: [{ role: "user", content: "Generate the requested JSON output." }],
          },
        );
      }
      const token = await getToken();
      if (!token) {
        setError("You need to be signed in to use AI.");
        return null;
      }
      return await api.notes.ai(body, token, { modelRef });
    } catch (err: any) {
      setError(modelErrorMessage(err));
      return null;
    }
  };

  const addMessages = (next: Persistable[]) => {
    const stamped: NoteChatMessage[] = next.map((m) => ({
      ...m,
      id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    }));
    setMessages((prev) => {
      const all = [...prev, ...stamped];
      persist(all);
      return all;
    });
  };

  const runTool = async (kind: ToolKind, addUserMsg: boolean) => {
    if (!hasText || thinking) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (addUserMsg) {
      addMessages([{ role: "user", kind, content: COMMAND_TEXT[kind] }]);
    }
    setThinking(true);
    const data = await runAi({
      action: kind,
      noteTitle,
      noteContent,
      question: undefined,
      existingTags,
      images: await readAiImages(),
    });
    setThinking(false);
    if (!data) {
      setLastFailure({ kind: "tool", tool: kind });
      return;
    }

    let assistant: Persistable | null = null;
    if (kind === "tags") {
      const tags = Array.isArray(data.tags)
        ? (data.tags as unknown[]).map((t) => String(t)).filter(Boolean).slice(0, 8)
        : [];
      if (tags.length > 0) {
        assistant = { role: "assistant", kind, content: JSON.stringify({ tags }) };
      } else {
        setError(`${currentModel.label} couldn't suggest tags for this note. Try again or switch to a more reliable model.`);
      }
    } else if (kind === "flashcards") {
      const rawCards = Array.isArray(data.flashcards)
        ? data.flashcards
        : Array.isArray(data.cards)
          ? data.cards
          : [];
      const cards = rawCards
        .filter((c): c is { front?: unknown; back?: unknown } => Boolean(c) && typeof c === "object")
        .filter((c) => (c.front ?? "") !== "" && (c.back ?? "") !== "")
        .map((c) => ({ front: String(c.front), back: String(c.back) }));
      if (cards.length > 0) {
        assistant = { role: "assistant", kind, content: JSON.stringify({ cards }) };
      } else {
        setError(`${currentModel.label} couldn't produce flashcards from this note. Try again or switch to a more reliable model.`);
      }
    } else if (kind === "quiz") {
      const rawQuestions = Array.isArray(data.questions)
        ? data.questions
        : Array.isArray(data.quiz)
          ? data.quiz
          : [];
      const questions: AiQuizQuestion[] = rawQuestions
        .map((q, qi) => {
          if (!q || typeof q !== "object") return null;
          const o = q as Record<string, unknown>;
          if (typeof o.question !== "string" || !Array.isArray(o.options)) return null;
          const options = o.options.map((x) => String(x)).filter((s) => s.trim() !== "");
          if (options.length === 0) return null;
          let correctAnswer =
            typeof o.correctAnswer === "number"
              ? o.correctAnswer
              : typeof o.correct === "number"
                ? o.correct
                : -1;
          if (correctAnswer < 0 || correctAnswer >= options.length) {
            const answerText = String(o.answer ?? "").trim();
            const byIndex = Number(answerText);
            correctAnswer = Number.isInteger(byIndex)
              ? byIndex >= 0 && byIndex < options.length
                ? byIndex
                : -1
              : answerText
                ? options.findIndex((opt) => opt.toLowerCase() === answerText.toLowerCase())
                : -1;
          }
          return { id: String(o.id ?? qi), question: o.question, options, correctAnswer };
        })
        .filter((q): q is AiQuizQuestion => q !== null);
      if (questions.length > 0) {
        assistant = { role: "assistant", kind, content: JSON.stringify({ questions }) };
      } else {
        setError(`${currentModel.label} couldn't produce quiz questions from this note. Try again or switch to a more reliable model.`);
      }
    } else {
      const value = String(data[NOTES_TEXT_TOOL_KEYS[kind] ?? kind] ?? data[kind] ?? data.text ?? "");
      const text = kind === "summary" ? stripMarkdown(value) : value;
      if (text.trim()) {
        assistant = { role: "assistant", kind, content: text };
      } else {
        setError(`${currentModel.label} couldn't generate that from this note. Try again or switch to a more reliable model.`);
      }
    }

    if (assistant) {
      addMessages([assistant]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLastFailure(null);
    } else {
      setLastFailure({ kind: "tool", tool: kind });
    }
  };

  const runChat = async (
    question: string,
    addUserMsg: boolean,
    opts: { mode: GroundingMode; reasoning: boolean; stream: boolean },
  ) => {
    if (!question.trim() || isBusy) return;
    setError(null);
    if (addUserMsg) {
      setInput("");
      addMessages([{ role: "user", kind: "chat", content: question }]);
    }

    const turns = buildChatTurns(question);
    const useStream =
      opts.stream && (effectiveProvider === "gemini" || effectiveProvider === "offline");
    if (useStream) {
      startStream(question, opts, turns);
      return;
    }

    setThinking(true);
    try {
      await ensureOfflineActivated(modelRef);
      let answer: string;
      if (effectiveProvider === "offline") {
        const system = await offlineChatPrompt(question, turns, opts);
        answer = await offlineGenerateText({
          system,
          messages: [{ role: "user", content: question }],
        });
      } else {
        const token = await getToken();
        if (!token) {
          setError("You need to be signed in to use AI.");
          setLastFailure({ kind: "chat", question, ...opts });
          return;
        }
        const data = await api.notes.chat(
          {
            mode: opts.mode,
            reasoning: opts.reasoning,
            noteId,
            noteTitle,
            noteContent,
            messages: turns,
            images: await readAiImages(),
          },
          token,
          { modelRef },
        );
        answer = String(data?.answer ?? "");
      }
      const clean = stripMarkdown(answer).trim();
      if (!clean) {
        setError(`${currentModel.label} did not return an answer. Try again or switch to a more reliable model.`);
        setLastFailure({ kind: "chat", question, ...opts });
        return;
      }
      addMessages([{ role: "assistant", kind: "chat", content: clean }]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLastFailure(null);
    } catch (err: unknown) {
      setError(modelErrorMessage(err));
      setLastFailure({ kind: "chat", question, ...opts });
    } finally {
      setThinking(false);
    }
  };

  const buildChatTurns = (question: string): { role: "user" | "assistant"; content: string }[] => {
    const turns: { role: "user" | "assistant"; content: string }[] = messages
      .filter((m) => m.kind === "chat")
      .map((m) => ({ role: m.role, content: m.content }));
    const last = turns[turns.length - 1];
    if (!(last && last.role === "user" && last.content === question)) {
      turns.push({ role: "user", content: question });
    }
    return turns.slice(-13);
  };

  const startStream = async (
    question: string,
    opts: { mode: GroundingMode; reasoning: boolean },
    turns: { role: "user" | "assistant"; content: string }[],
  ) => {
    setThinking(true);
    setStreaming(true);
    setStreamText("");
    const controller = new AbortController();
    streamAbortRef.current = controller;
    const seq = ++streamSeqRef.current;
    let accumulated = "";
    const fail = (message: string) => {
      setError(message);
      setLastFailure({ kind: "chat", question, mode: opts.mode, reasoning: opts.reasoning, stream: true });
    };

    try {
      await ensureOfflineActivated(modelRef);
      if (effectiveProvider === "offline") {
        let stopped = false;
        try {
          const system = await offlineChatPrompt(question, turns, opts);
          const handle = offlineStreamText({
            system,
            messages: [{ role: "user", content: question }],
            onToken: (text) => {
              if (seq !== streamSeqRef.current) return;
              accumulated += text;
              setStreamText(accumulated);
              scrollToEnd();
            },
          });
          offlineStopRef.current = () => {
            stopped = true;
            handle.stop();
          };
          const finalText = await handle.promise;
          if (seq !== streamSeqRef.current) return;
          offlineStopRef.current = null;
          streamAbortRef.current = null;
          const final = stripMarkdown(finalText).trim();
          setStreaming(false);
          setThinking(false);
          setStreamText("");
          if (final) {
            addMessages([{ role: "assistant", kind: "chat", content: final }]);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setLastFailure(null);
          } else {
            fail(`${currentModel.label} returned an empty answer. Try again or switch to a more reliable model.`);
          }
        } catch (err: unknown) {
          if (seq !== streamSeqRef.current) return;
          setStreaming(false);
          setThinking(false);
          setStreamText("");
          offlineStopRef.current = null;
          streamAbortRef.current = null;
          const final = stripMarkdown(accumulated).trim();
          if (stopped && final) {
            addMessages([{ role: "assistant", kind: "chat", content: final }]);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setLastFailure(null);
          } else if (!stopped) {
            fail(modelErrorMessage(err));
          }
        }
        return;
      }
      const token = await getToken();
      if (!token) {
        fail("You need to be signed in to use AI.");
        setStreaming(false);
        setThinking(false);
        return;
      }
      await api.notes.chatStream(
        {
          mode: opts.mode,
          reasoning: opts.reasoning,
          noteId,
          noteTitle,
          noteContent,
          messages: turns,
          images: await readAiImages(),
        },
        token,
        {
          onDelta: (text) => {
            if (seq !== streamSeqRef.current) return;
            accumulated += text;
            setStreamText(accumulated);
            scrollToEnd();
          },
          onDone: () => {
            if (seq !== streamSeqRef.current) return;
            const final = stripMarkdown(accumulated).trim();
            setStreaming(false);
            setThinking(false);
            setStreamText("");
            streamAbortRef.current = null;
            if (final) {
              addMessages([{ role: "assistant", kind: "chat", content: final }]);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setLastFailure(null);
            } else {
              fail(`${currentModel.label} returned an empty answer. Try again or switch to a more reliable model.`);
            }
          },
          onError: (message) => {
            if (seq !== streamSeqRef.current) return;
            setStreaming(false);
            setThinking(false);
            setStreamText("");
            streamAbortRef.current = null;
            fail(message);
          },
        },
        { modelRef, signal: controller.signal },
      );
    } catch (err: unknown) {
      if (seq !== streamSeqRef.current) return;
      const aborted = (err as { name?: string })?.name === "AbortError";
      setStreaming(false);
      setThinking(false);
      setStreamText("");
      streamAbortRef.current = null;
      const final = stripMarkdown(accumulated).trim();
      if (aborted && final) {
        addMessages([{ role: "assistant", kind: "chat", content: final }]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (!aborted) {
        fail(err instanceof Error ? err.message : "AI request failed. Please try again.");
      }
    }
  };

  const stopStream = () => {
    if (!streaming) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    streamAbortRef.current?.abort();
    offlineStopRef.current?.();
  };

  const handleTool = (kind: ToolKind) => runTool(kind, true);

  const handleSend = () =>
    runChat(input.trim(), true, { mode: grounding, reasoning, stream: streamEnabled });

  const retryLast = () => {
    if (!lastFailure || isBusy) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (lastFailure.kind === "tool") {
      runTool(lastFailure.tool, false);
    } else {
      runChat(lastFailure.question, false, {
        mode: lastFailure.mode,
        reasoning: lastFailure.reasoning,
        stream: lastFailure.stream,
      });
    }
  };

  const lastUserMsgId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") return messages[i].id;
    }
    return null;
  }, [messages]);

  const failedUserMsgId = useMemo(() => {
    if (!lastFailure) return null;
    if (lastFailure.kind === "tool") {
      for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        if (m.role === "user" && m.kind === lastFailure.tool) return m.id;
      }
      return null;
    }
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === "user" && m.kind === "chat" && m.content === lastFailure.question) return m.id;
    }
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === "user" && m.kind === "chat") return m.id;
    }
    return null;
  }, [messages, lastFailure]);

  const handleUpdateMessage = (m: NoteChatMessage) => {
    const idx = messages.findIndex((x) => x.id === m.id);
    if (idx < 0) return;
    const trimmed = messages.slice(0, idx);
    setMessages(trimmed);
    persist(trimmed);
    setLastFailure(null);
    setError(null);
    setInput(m.content);
    requestAnimationFrame(() => chatInputRef.current?.focus());
  };

  const renderTextContent = (m: NoteChatMessage, payload: Payload) => {
    const text = payload.text ?? m.content;
    return <Text style={[styles.bubbleText, { color: theme.text }]}>{stripMarkdown(text)}</Text>;
  };

  const renderResultHeader = (
    meta: NonNullable<(typeof TOOL_RESULT_META)[ToolKind]>,
  ) => {
    const color = theme[meta.colorKey];
    return (
      <View style={[styles.resultHeader, { borderBottomColor: theme.borderLight }]}>
        <View style={[styles.resultIcon, { backgroundColor: color + "1A" }]}>
          <ThemeIcon sf={meta.sf} material={meta.material} size={13} color={color} weight="semibold" />
        </View>
        <Text style={[styles.resultKind, { color }]}>{meta.label}</Text>
      </View>
    );
  };

  const renderToolResult = (m: NoteChatMessage, payload: Payload) => {
    if (m.kind === "tags" && payload.tags && payload.tags.length > 0) {
      return (
        <View>
          <View style={styles.tagChipWrap}>
            {payload.tags.map((tag) => (
              <View
                key={tag}
                style={[styles.tagChip, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderLight }]}
              >
                <Text style={[styles.tagChipLabel, { color: theme.textSecondary }]}>#{tag}</Text>
              </View>
            ))}
          </View>
          {appliedFor === m.id ? (
            <ReceiptCard theme={theme} m={m} payload={payload} />
          ) : (
            <Pressable
              onPress={() => {
                onApplyTags(payload.tags || []);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                applyConfirm(m.id);
              }}
              style={[styles.applyBtn, { backgroundColor: theme.primary }]}
            >
              <Text style={styles.applyBtnLabel}>Add tags to note</Text>
            </Pressable>
          )}
        </View>
      );
    }
    if (m.kind === "flashcards" && payload.cards && payload.cards.length > 0) {
      const cards = payload.cards;
      const applied = appliedFor === m.id;
      return (
        <View>
          {renderResultHeader(TOOL_RESULT_META.flashcards!)}
          <AiFlashcardsView cards={cards} />
          {applied ? (
            <ReceiptCard theme={theme} m={m} payload={payload} />
          ) : (
            <Pressable
              onPress={() => {
                onAppendContent(formatFlashcards(cards));
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                applyConfirm(m.id);
              }}
              style={[styles.insertPrimaryBtn, { backgroundColor: theme.primary }]}
            >
              <ThemeIcon sf="plus" material="plus" size={14} color="#FFFFFF" weight="bold" />
              <Text style={styles.insertPrimaryLabel}>Add flashcards to note</Text>
            </Pressable>
          )}
        </View>
      );
    }
    if (m.kind === "quiz" && payload.questions && payload.questions.length > 0) {
      const questions = payload.questions;
      const done = quizDoneId === m.id;
      const applied = appliedFor === m.id;
      return (
        <View>
          {renderResultHeader(TOOL_RESULT_META.quiz!)}
          <AiQuizView questions={questions} onComplete={() => setQuizDoneId(m.id)} />
          {done &&
            (applied ? (
              <ReceiptCard theme={theme} m={m} payload={payload} />
            ) : (
              <Pressable
                onPress={() => {
                  onAppendContent(formatQuiz(questions));
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  applyConfirm(m.id);
                }}
                style={[styles.insertPrimaryBtn, { backgroundColor: theme.primary }]}
              >
                <ThemeIcon sf="plus" material="plus" size={14} color="#FFFFFF" weight="bold" />
                <Text style={styles.insertPrimaryLabel}>Insert Q&A into note</Text>
              </Pressable>
            ))}
        </View>
      );
    }
    const meta = m.kind === "chat" ? undefined : TOOL_RESULT_META[m.kind];
    if (meta) {
      return (
        <View>
          {renderResultHeader(meta)}
          {renderTextContent(m, payload)}
        </View>
      );
    }
    return renderTextContent(m, payload);
  };

  const renderActions = (m: NoteChatMessage) => {
    if (m.role !== "assistant") return null;
    if (m.kind === "tags" || m.kind === "flashcards" || m.kind === "quiz") return null;
    const content = m.content;
    const sectionTitle = SECTION_TITLES[m.kind as ToolKind];
    const appendContent = sectionTitle ? `${sectionTitle}\n\n${content}` : content;
    const applied = appliedFor === m.id;
    const replaceLabel = m.kind === "summary" ? "Replace with summary" : "Replace";
    return (
      <>
        {applied && <ReceiptCard theme={theme} m={m} payload={parsePayload(m.content)} />}
        <View style={styles.actionRow}>
          {!applied && (
            <Pressable
              onPress={() => {
                onAppendContent(appendContent);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                applyConfirm(m.id);
              }}
              style={[styles.insertPrimaryBtn, { backgroundColor: theme.primary }]}
            >
              <ThemeIcon sf="plus" material="plus" size={14} color="#FFFFFF" weight="bold" />
              <Text style={styles.insertPrimaryLabel}>Add to end</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => {
              onReplaceContent(content);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              applyConfirm(m.id);
            }}
            style={[styles.insertSecondBtn, { backgroundColor: theme.surfaceAlt }]}
          >
            <ThemeIcon sf="arrow.triangle.2.circlepath" material="swap-horizontal" size={14} color={theme.textSecondary} weight="semibold" />
            <Text style={[styles.insertSecondLabel, { color: theme.textSecondary }]}>{replaceLabel}</Text>
          </Pressable>
        </View>
      </>
    );
  };

  const renderMessage = (m: NoteChatMessage) => {
    const isUser = m.role === "user";
    const payload = isUser ? { text: m.content } : parsePayload(m.content);
    const failed = isUser && m.id === failedUserMsgId;
    const inFlight = isUser && m.id === lastUserMsgId && !failed && isBusy;
    const isLastUser = isUser && m.id === lastUserMsgId;
    const settledLastUser = isLastUser && !failed && !inFlight;
    return (
      <View key={m.id} style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAi]}>
        {!isUser && (
          <View style={[styles.aiAvatar, { backgroundColor: theme.primary }]}>
            <ThemeIcon sf="sparkles" material="creation" size={13} color="#FFFFFF" />
          </View>
        )}
        <View
          style={[
            styles.bubble,
            isUser
              ? [
                  styles.bubbleUser,
                  { backgroundColor: failed ? theme.danger + "14" : theme.primary },
                  failed && { borderWidth: 1, borderColor: theme.danger },
                ]
              : [styles.bubbleAi, { backgroundColor: theme.surface, borderColor: theme.borderLight }],
          ]}
        >
          {isUser ? (
            <>
              {renderTextContent({ ...m, content: m.content }, { text: m.content })}
              {failed && (
                <View style={[styles.msgFailedRow, { backgroundColor: theme.danger + "1A" }]}>
                  <ThemeIcon sf="exclamationmark.triangle.fill" material="alert-circle-outline" size={12} color={theme.danger} weight="bold" />
                  <Text style={[styles.msgFailedLabel, { color: theme.danger }]}>Failed</Text>
                </View>
              )}
              {inFlight && (
                <View style={styles.pendingRow}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.pendingLabel}>Sending…</Text>
                </View>
              )}
            </>
          ) : (
            renderToolResult(m, payload)
          )}
          {renderActions(m)}
          {isLastUser && (failed || settledLastUser) && (
            <View style={styles.userMsgControls}>
              {failed && (
                <Pressable
                  onPress={retryLast}
                  hitSlop={6}
                  accessibilityLabel="Retry message"
                  style={[styles.userMsgIconBtn, { backgroundColor: theme.danger + "1A", borderColor: theme.danger + "55" }]}
                >
                  <ThemeIcon sf="arrow.clockwise" material="refresh" size={14} color={theme.danger} weight="semibold" />
                  <Text style={[styles.userMsgIconLabel, { color: theme.danger }]}>Retry</Text>
                </Pressable>
              )}
              {m.kind === "chat" && (
                <Pressable
                  onPress={() => handleUpdateMessage(m)}
                  hitSlop={6}
                  accessibilityLabel="Edit message"
                  style={[styles.userMsgIconBtn, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderLight }]}
                >
                  <ThemeIcon sf="pencil" material="pencil-outline" size={14} color={theme.primary} weight="semibold" />
                  <Text style={[styles.userMsgIconLabel, { color: theme.primary }]}>Edit</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  const toolColor = (t: ToolCommand) => theme[t.colorKey];

  const content = (
    <>
      <View style={styles.head}>
        <View style={styles.headLeft}>
          <View style={[styles.logoWrap, { backgroundColor: theme.primary }]}>
            <ThemeIcon sf="bubble.left.and.bubble.right.fill" material="message-text" size={17} color="#FFFFFF" weight="semibold" />
          </View>
          <View style={styles.headText}>
            <Text style={[styles.title, { color: theme.text }]}>
              {inline ? "AI Copilot" : "Chat with note"}
            </Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]} numberOfLines={1}>
              AI grounded in this note · {hasText ? "ready" : "add content first"}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => setShowControls((v) => !v)}
          hitSlop={8}
          style={[styles.controlsBtn, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderLight }]}
        >
          <ThemeIcon
            sf="slider.horizontal.3"
            material="tune-variant"
            size={15}
            color={controlsActive ? theme.primary : theme.textSecondary}
            weight={controlsActive ? "bold" : "semibold"}
          />
        </Pressable>
        <InfoTip
          lines={COPILOT_HELP_LINES}
          open={showHelp}
          onToggle={() => setShowHelp((v) => !v)}
          closeSignal={!chatFocused}
          wrapStyle={styles.helpBtn}
        />
        {!inline && onClose && (
          <Pressable onPress={onClose} hitSlop={8} style={[styles.closeBtn, { backgroundColor: theme.surfaceAlt }]}>
            <ThemeIcon sf="xmark" material="close" size={16} color={theme.textSecondary} weight="bold" />
          </Pressable>
        )}
      </View>

      <View style={styles.modelRow}>
        <Pressable
          onPress={() => setShowModelPicker(true)}
          style={[styles.modelChip, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderLight }]}
        >
          <ThemeIcon sf="cpu" material="chip" size={13} color={theme.primary} weight="semibold" />
          <Text style={[styles.modelChipLabel, { color: theme.text }]} numberOfLines={1}>
            {currentModel.label}
          </Text>
          <View
            style={[
              styles.modelTierChip,
              { backgroundColor: currentModel.tier === "paid" ? theme.accent + "22" : theme.primary + "22" },
            ]}
          >
            <Text
              style={[
                styles.modelTierText,
                { color: currentModel.tier === "paid" ? theme.accent : theme.primary },
              ]}
            >
              {currentModel.tier === "paid" ? "PAID" : "FREE"}
            </Text>
          </View>
          {effectiveRating(currentModel, userRatings) != null && (
            <View style={[styles.modelRatingChip, { backgroundColor: theme.accent + "1A" }]}>
              <ThemeIcon sf="star.fill" material="star" size={10} color={theme.accent} />
              <Text style={[styles.modelRatingText, { color: theme.accent }]}>
                {effectiveRating(currentModel, userRatings)}
              </Text>
            </View>
          )}
          <ThemeIcon sf="chevron.down" material="chevron-down" size={14} color={theme.textSecondary} weight="bold" />
        </Pressable>
        <Pressable
          onPress={handleClearChat}
          hitSlop={8}
          style={[styles.clearChatBtn, { borderColor: theme.borderLight }]}
        >
          <ThemeIcon
            sf="trash"
            material="trash-can-outline"
            size={13}
            color={messages.length > 0 ? theme.danger : theme.textMuted}
            weight="semibold"
          />
          <Text
            style={[styles.clearChatLabel, { color: messages.length > 0 ? theme.danger : theme.textMuted }]}
          >
            Clear
          </Text>
        </Pressable>
      </View>

      {error && (
        <View style={[styles.errorCard, { backgroundColor: theme.surface, borderColor: theme.danger }]}>
          <View style={styles.errorCardRow}>
            <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
            <Pressable onPress={() => { setError(null); setLastFailure(null); }} hitSlop={8}>
              <ThemeIcon sf="xmark.circle.fill" material="close-circle-outline" size={16} color={theme.textMuted} />
            </Pressable>
          </View>
          {lastFailure && (
            <Pressable
              onPress={retryLast}
              style={[styles.retryBtn, { backgroundColor: theme.danger + "1A" }]}
            >
              <ThemeIcon sf="arrow.clockwise" material="refresh" size={13} color={theme.danger} weight="semibold" />
              <Text style={[styles.retryBtnText, { color: theme.danger }]}>Retry</Text>
            </Pressable>
          )}
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 8 }]}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={scrollToEnd}
      >
        {hydrating && (
          <View style={styles.centerHint}>
            <ActivityIndicator size="small" color={theme.primary} />
          </View>
        )}
        {!hydrating && messages.length === 0 && (
          <View style={styles.emptyWrap}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.surfaceAlt }]}>
              <ThemeIcon sf="sparkles" material="creation" size={26} color={theme.primary} weight="semibold" />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.textSecondary }]}>
              Ask anything about this note
            </Text>
            <Text style={[styles.emptySub, { color: theme.textMuted }]}>
              Run a tool below, or type a question. You can Summarize, Polish, Auto-tag,
              Cheat sheet, Flashcards, and Quiz — all in one chat.
            </Text>
          </View>
        )}
        {messages.map(renderMessage)}
        {streaming && (
          <View style={[styles.msgRow, styles.msgRowAi]}>
            <View style={[styles.aiAvatar, { backgroundColor: theme.primary }]}>
              <ThemeIcon sf="sparkles" material="creation" size={13} color="#FFFFFF" />
            </View>
            <View
              style={[styles.bubble, styles.bubbleAi, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}
            >
              {streamText ? (
                <>
                  <Text style={[styles.bubbleText, { color: theme.text }]}>{stripMarkdown(streamText)}</Text>
                  <Pressable onPress={stopStream} hitSlop={6} style={[styles.stopBtn, { backgroundColor: theme.surfaceAlt }]}>
                    <ThemeIcon sf="stop.fill" material="stop-circle-outline" size={13} color={theme.textSecondary} weight="semibold" />
                    <Text style={[styles.stopBtnText, { color: theme.textSecondary }]}>Stop</Text>
                  </Pressable>
                </>
              ) : (
                <View style={styles.typingRow}>
                  <ActivityIndicator size="small" color={theme.primary} />
                  <Text style={[styles.typingText, { color: theme.textMuted }]}>Thinking…</Text>
                </View>
              )}
            </View>
          </View>
        )}
        {!streaming && thinking && (
          <View style={[styles.msgRow, styles.msgRowAi]}>
            <View style={[styles.aiAvatar, { backgroundColor: theme.primary }]}>
              <ThemeIcon sf="sparkles" material="creation" size={13} color="#FFFFFF" />
            </View>
            <View style={[styles.bubble, styles.bubbleAi, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
              <View style={styles.typingRow}>
                <ActivityIndicator size="small" color={theme.primary} />
                <Text style={[styles.typingText, { color: theme.textMuted }]}>{reasoning ? "Reasoning…" : "Thinking…"}</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.toolsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolsContent}>
          {TOOL_COMMANDS.map((t) => {
            const color = toolColor(t);
            const disabled = !hasText || isBusy;
            return (
              <Pressable
                key={t.id}
                disabled={disabled}
                onPress={() => handleTool(t.id)}
                style={[
                  styles.toolChip,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.borderLight,
                  },
                  disabled && { opacity: 0.4 },
                ]}
              >
                <ThemeIcon sf={t.sf} material={t.material} size={15} color={color} weight="semibold" />
                <Text style={[styles.toolChipLabel, { color: theme.text }]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={[styles.inputRow, { borderTopColor: theme.borderLight }]}>
        <TextInput
          ref={chatInputRef}
          value={input}
          onChangeText={setInput}
          onFocus={() => setChatFocused(true)}
          onBlur={() => setChatFocused(false)}
          placeholder={hasText ? "Ask about this note…" : "Add content to the note first…"}
          placeholderTextColor={theme.textMuted}
          style={[styles.input, { color: theme.text }]}
          multiline
          maxLength={500}
          contextMenuHidden={Platform.OS === "android"}
        />
        <Pressable
          onPress={handleSend}
          disabled={!input.trim() || isBusy || !hasText}
          style={[
            styles.sendBtn,
            { backgroundColor: theme.primary },
            (!input.trim() || isBusy || !hasText) && { opacity: 0.4 },
          ]}
        >
          <ThemeIcon sf="arrow.up" material="arrow-up" size={16} color="#FFFFFF" weight="bold" />
        </Pressable>
      </View>

      <GlassSheet
        visible={showControls}
        onClose={() => setShowControls(false)}
        title="AI Controls"
        subtitle="Settings that shape every AI answer"
        cornerRadius={36}
      >
        <Text style={[styles.ctrlSectionLabel, { color: theme.textSecondary }]}>Grounding</Text>
        <View
          style={[styles.segWrap, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderLight }]}
        >
          {GROUNDING_MODES.filter((m) => (offlineActive ? m.id !== "web" : true)).map((mode) => {
            const active = grounding === mode.id;
            return (
              <Pressable
                key={mode.id}
                disabled={isBusy}
                onPress={() => setGrounding(mode.id)}
                style={[
                  styles.segChip,
                  active && { backgroundColor: theme.primary },
                  isBusy && { opacity: 0.5 },
                ]}
              >
                <ThemeIcon
                  sf={mode.sf}
                  material={mode.material}
                  size={13}
                  color={active ? "#FFFFFF" : theme.textMuted}
                  weight={active ? "bold" : "regular"}
                />
                <Text
                  style={[
                    styles.segChipLabel,
                    { color: active ? "#FFFFFF" : theme.textSecondary },
                    active && { fontWeight: "700" },
                  ]}
                >
                  {mode.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {images.length > 0 && !offlineActive && (
          <>
            <Text style={[styles.ctrlSectionLabel, { color: theme.textSecondary }]}>Inputs</Text>
            <View
              style={[styles.ctrlCard, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderLight }]}
            >
              <View style={styles.ctrlRow}>
                <View style={[styles.ctrlIcon, { backgroundColor: theme.primary + "1A" }]}>
                  <ThemeIcon sf="photo" material="image-outline" size={15} color={theme.primary} weight="semibold" />
                </View>
                <View style={styles.ctrlText}>
                  <Text style={[styles.ctrlLabel, { color: theme.text }]}>Read note images</Text>
                  <Text style={[styles.ctrlHint, { color: theme.textMuted }]}>
                    {useImages
                      ? `Reads up to ${Math.min(images.length, IMAGE_READ_LIMIT)} images in order`
                      : "Text only"}
                  </Text>
                </View>
                <Switch
                  value={useImages}
                  onValueChange={(v) => {
                    imageTouchedRef.current = true;
                    setUseImages(v);
                  }}
                  disabled={isBusy}
                  trackColor={{ true: theme.primary, false: theme.border }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor={theme.border}
                />
              </View>
            </View>
          </>
        )}

        <Text style={[styles.ctrlSectionLabel, { color: theme.textSecondary }]}>Output</Text>
        <View
          style={[styles.ctrlCard, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderLight }]}
        >
          <View style={styles.ctrlRow}>
            <View style={[styles.ctrlIcon, { backgroundColor: theme.primary + "1A" }]}>
              <ThemeIcon sf="waveform" material="waveform" size={15} color={theme.primary} weight="semibold" />
            </View>
            <View style={styles.ctrlText}>
              <Text style={[styles.ctrlLabel, { color: theme.text }]}>Stream</Text>
              <Text style={[styles.ctrlHint, { color: theme.textMuted }]}>
                {canStream ? "Token-by-token" : "Cloud models only"}
              </Text>
            </View>
            <Switch
              value={streamEnabled}
              onValueChange={setStreamEnabled}
              disabled={!canStream || isBusy}
              trackColor={{ true: theme.primary, false: theme.border }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={theme.border}
            />
          </View>
          <View style={[styles.ctrlDivider, { backgroundColor: theme.borderLight }]} />
          <View style={styles.ctrlRow}>
            <View style={[styles.ctrlIcon, { backgroundColor: theme.accent + "1A" }]}>
              <ThemeIcon sf="brain.head.profile" material="brain" size={15} color={theme.accent} weight="semibold" />
            </View>
            <View style={styles.ctrlText}>
              <Text style={[styles.ctrlLabel, { color: theme.text }]}>Reasoning</Text>
              <Text style={[styles.ctrlHint, { color: theme.textMuted }]}>
                {reasoning
                  ? effectiveProvider === "gemini"
                    ? "Deep thinking"
                    : "Step-by-step"
                  : "Deeper answers"}
              </Text>
            </View>
            <Switch
              value={reasoning}
              onValueChange={setReasoning}
              disabled={isBusy}
              trackColor={{ true: theme.accent, false: theme.border }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={theme.border}
            />
          </View>
        </View>

        <View style={styles.modeHint}>
          <ThemeIcon sf="info.circle" material="information-outline" size={12} color={theme.textMuted} />
          <Text style={[styles.modeHintText, { color: theme.textMuted }]}>
            {grounding === "web"
              ? "Web answers use live Google Search via Gemini."
              : "Answers are grounded only in this note."}
          </Text>
        </View>
      </GlassSheet>
    </>
  );

  const renderModelPicker = () => (
    <Modal
      visible={showModelPicker}
      transparent
      animationType="slide"
      onRequestClose={() => setShowModelPicker(false)}
    >
      <View style={styles.pickerRoot}>
        <Pressable
          style={[styles.pickerBackdrop, { backgroundColor: "rgba(0,0,0,0.5)" }]}
          onPress={() => setShowModelPicker(false)}
        />
        <View style={[styles.pickerSheet, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
          <View style={styles.pickerHead}>
            <View style={styles.pickerHeadText}>
              <Text style={[styles.pickerTitle, { color: theme.text }]}>Choose AI model</Text>
              <Text style={[styles.pickerSubtitle, { color: theme.textMuted }]}>
                Applies to this note's copilot
              </Text>
            </View>
            <Pressable
              onPress={() => setShowModelPicker(false)}
              hitSlop={8}
              style={[styles.pickerClose, { backgroundColor: theme.surfaceAlt }]}
            >
              <ThemeIcon sf="xmark" material="close" size={16} color={theme.textSecondary} weight="bold" />
            </Pressable>
          </View>
          <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
            {modelGroups.map(({ provider, models }) => (
              <View key={provider} style={styles.pickerGroup}>
                <Text style={[styles.pickerGroupLabel, { color: theme.textSecondary }]}>
                  {AI_PROVIDER_LABELS[provider]}
                </Text>
                {models.map((m) => {
                  const active = m.ref === modelRef;
                  const status = providerStatus(m.provider);
                  const dotColor =
                    status === "ready"
                      ? theme.primary
                      : status === "unknown"
                        ? theme.textMuted
                        : theme.accent;
                  return (
                    <Pressable
                      key={m.ref}
                      style={[styles.pickerItem, { borderBottomColor: theme.borderLight }]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setModelRef(m.ref);
                        setShowModelPicker(false);
                        if (m.provider === "offline") {
                          ensureOfflineActivated(m.ref).catch(() => {});
                        }
                      }}
                    >
                      <View style={[styles.pickerDot, { backgroundColor: dotColor }]} />
                      <View style={styles.pickerItemInfo}>
                        <View style={styles.pickerItemTitleRow}>
                          <Text
                            style={[
                              styles.pickerItemLabel,
                              { color: theme.text, fontWeight: active ? "700" : "400" },
                            ]}
                          >
                            {m.label}
                          </Text>
                          <View
                            style={[
                              styles.pickerTierChip,
                              {
                                backgroundColor:
                                  m.tier === "paid" ? theme.accent + "22" : theme.primary + "22",
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.pickerTierText,
                                { color: m.tier === "paid" ? theme.accent : theme.primary },
                              ]}
                            >
                              {m.tier === "paid" ? "PAID" : "FREE"}
                            </Text>
                          </View>
                          {effectiveRating(m, userRatings) != null && (
                            <View style={[styles.pickerRatingChip, { backgroundColor: theme.accent + "1A" }]}>
                              <ThemeIcon sf="star.fill" material="star" size={11} color={theme.accent} />
                              <Text style={[styles.pickerRatingText, { color: theme.accent }]}>
                                {effectiveRating(m, userRatings)}
                              </Text>
                            </View>
                          )}
                        </View>
                        {m.note ? (
                          <Text style={[styles.pickerItemNote, { color: theme.textMuted }]}>
                            {m.note}
                          </Text>
                        ) : null}
                        <View style={styles.pickerStarsRow}>
                          <StarsRating
                            value={userRatings[m.ref] ?? null}
                            onChange={(value) => handleRate(m.ref, value)}
                            size={14}
                            color={theme.accent}
                            emptyColor={theme.border}
                            disabled={ratingPending != null}
                          />
                          {ratingPending === m.ref && (
                            <ActivityIndicator size="small" color={theme.textMuted} />
                          )}
                        </View>
                      </View>
                      {active && (
                        <ThemeIcon sf="checkmark" material="check" size={18} color={theme.primary} weight="bold" />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ))}
            {ratingErrorText ? (
              <View style={styles.pickerHint}>
                <ThemeIcon sf="exclamationmark.triangle" material="alert-outline" size={14} color={theme.danger} />
                <Text style={[styles.pickerHintText, { color: theme.danger }]}>{ratingErrorText}</Text>
              </View>
            ) : null}
            <View style={styles.pickerHint}>
              <ThemeIcon sf="info.circle" material="information-outline" size={14} color={theme.textMuted} />
              <Text style={[styles.pickerHintText, { color: theme.textMuted }]}>
                Green dot = key ready. Missing keys can be added in Settings → AI Model.
              </Text>
            </View>
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (inline) {
    return (
      <>
        <View style={styles.inlineRoot}>
          <View
            style={[
              styles.innerRoot,
              keyboardHeight > 0 && { paddingBottom: keyboardHeight + 12 },
            ]}
          >
            {content}
          </View>
        </View>
        {renderModelPicker()}
      </>
    );
  }

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.root}>
          <Pressable style={[styles.backdrop, { backgroundColor: "rgba(0,0,0,0.5)" }]} onPress={onClose} />
          <KeyboardAvoidingView
            style={styles.sheetOuter}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={14}
          >
            <BlurView
              intensity={Platform.OS === "ios" ? 80 : 50}
              tint="dark"
              style={[styles.blur, { borderColor: theme.borderLight }]}
            >
              <View style={[styles.tint, { backgroundColor: theme.glass }]}>
                {content}
              </View>
            </BlurView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
      {renderModelPicker()}
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetOuter: {
    height: "92%",
  },
  blur: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  tint: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 14,
    overflow: "hidden",
  },
  inlineRoot: {
    flex: 1,
  },
  innerRoot: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingBottom: 12,
  },
  headLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  helpBtn: {
    alignSelf: "center",
    marginRight: -2,
  },
  controlsBtn: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  logoWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  headText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: bodyFont,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 1,
    fontFamily: bodyFont,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },
  modelChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  modelChipLabel: {
    fontSize: 13,
    fontWeight: "600",
    maxWidth: 180,
    flexShrink: 1,
    fontFamily: bodyFont,
  },
  clearChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexShrink: 0,
  },
  clearChatLabel: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: bodyFont,
  },
  modelTierChip: {
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  modelTierText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
    fontFamily: bodyFont,
  },
  modelRatingChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  modelRatingText: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: bodyFont,
  },
  pickerRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  pickerBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  pickerSheet: {
    maxHeight: "82%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 16,
    overflow: "hidden",
  },
  pickerHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingBottom: 12,
  },
  pickerHeadText: {
    flex: 1,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: bodyFont,
  },
  pickerSubtitle: {
    fontSize: 12,
    marginTop: 1,
    fontFamily: bodyFont,
  },
  pickerClose: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerScroll: {
    flexGrow: 0,
  },
  pickerGroup: {
    marginBottom: 6,
  },
  pickerGroupLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
    marginTop: 8,
    paddingHorizontal: 2,
    fontFamily: bodyFont,
  },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  pickerItemInfo: {
    flex: 1,
  },
  pickerItemTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pickerItemLabel: {
    fontSize: 15,
    flexShrink: 1,
    fontFamily: bodyFont,
  },
  pickerTierChip: {
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  pickerTierText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
    fontFamily: bodyFont,
  },
  pickerRatingChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  pickerRatingText: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: bodyFont,
  },
  pickerItemNote: {
    fontSize: 12,
    marginTop: 3,
    fontFamily: bodyFont,
  },
  pickerStarsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 7,
  },
  pickerHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 2,
  },
  pickerHintText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 17,
    fontFamily: bodyFont,
  },
  errorCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  errorCardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 19,
    flexShrink: 1,
    fontFamily: bodyFont,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 8,
  },
  retryBtnText: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: bodyFont,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 6,
  },
  centerHint: {
    alignItems: "center",
    paddingVertical: 20,
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 34,
    paddingHorizontal: 16,
    gap: 8,
  },
  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: bodyFont,
  },
  emptySub: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    fontFamily: bodyFont,
  },
  msgRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 12,
  },
  msgRowUser: {
    justifyContent: "flex-end",
  },
  msgRowAi: {
    justifyContent: "flex-start",
  },
  aiAvatar: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 10,
    maxWidth: "84%",
  },
  bubbleUser: {
    borderBottomRightRadius: 6,
  },
  bubbleAi: {
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomLeftRadius: 6,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: bodyFont,
  },
  msgFailedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 6,
  },
  msgFailedLabel: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: bodyFont,
  },
  pendingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    opacity: 0.9,
  },
  pendingLabel: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
    fontFamily: bodyFont,
  },
  userMsgControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
    marginTop: 8,
  },
  userMsgIconBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  userMsgIconLabel: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: bodyFont,
  },
  tagChipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: 10,
  },
  tagChip: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  tagChipLabel: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: bodyFont,
  },
  applyBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 2,
    alignSelf: "flex-start",
  },
  applyBtnLabel: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    fontFamily: bodyFont,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  insertPrimaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderRadius: 12,
    paddingVertical: 10,
  },
  insertPrimaryLabel: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    fontFamily: bodyFont,
  },
  insertSecondBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderRadius: 12,
    paddingVertical: 10,
  },
  insertSecondLabel: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: bodyFont,
  },
  appliedChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    paddingVertical: 10,
  },
  appliedChipLabel: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: bodyFont,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingBottom: 8,
    marginBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultIcon: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  resultKind: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
    fontFamily: bodyFont,
  },
  receiptCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
    gap: 8,
  },
  receiptHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  receiptIcon: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  receiptTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    fontFamily: bodyFont,
  },
  receiptBadge: {
    minWidth: 20,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  receiptBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: bodyFont,
  },
  receiptRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  receiptRowLabel: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "600",
    fontFamily: bodyFont,
  },
  receiptRowValue: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "600",
    textAlign: "right",
    fontFamily: bodyFont,
  },
  receiptTagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  receiptTagChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  receiptTagLabel: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: bodyFont,
  },
  receiptSnippet: {
    fontSize: 12.5,
    lineHeight: 18,
    fontFamily: bodyFont,
  },
  receiptFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  receiptFooterText: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: bodyFont,
  },
  typingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  typingText: {
    fontSize: 13,
    fontFamily: bodyFont,
  },
  toolsRow: {
    paddingTop: 10,
    paddingBottom: 8,
  },
  toolsContent: {
    gap: 8,
    paddingRight: 8,
  },
  toolChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  toolChipLabel: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: bodyFont,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: 6,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: bodyFont,
    minHeight: 40,
    maxHeight: 100,
    paddingVertical: 6,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  stopBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginTop: 8,
  },
  stopBtnText: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: bodyFont,
  },
  modeHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 2,
  },
  modeHintText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
    fontFamily: bodyFont,
  },
  ctrlSectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 4,
    paddingHorizontal: 2,
    fontFamily: bodyFont,
  },
  segWrap: {
    flexDirection: "row",
    gap: 4,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    marginBottom: 16,
  },
  segChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  segChipLabel: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: bodyFont,
  },
  ctrlCard: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  ctrlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  ctrlIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  ctrlText: {
    flex: 1,
  },
  ctrlLabel: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: bodyFont,
  },
  ctrlHint: {
    fontSize: 12,
    marginTop: 1,
    fontFamily: bodyFont,
  },
  ctrlDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 52,
  },
});