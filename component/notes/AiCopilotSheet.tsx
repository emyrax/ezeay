import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useThemeColors } from "../../hooks/useTheme";
import { api } from "../../lib/api";
import GlassSheet from "./GlassSheet";
import ThemeIcon from "./ThemeIcon";
import AiResultView from "./AiResultView";
import AiFlashcardsView, { AiFlashcard } from "./AiFlashcardsView";
import AiQuizView, { AiQuizQuestion } from "./AiQuizView";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

type CopilotView =
  | { name: "home" }
  | { name: "chat" }
  | { name: "result"; action: QuickAction["id"] }
  | { name: "flashcards"; cards: AiFlashcard[] }
  | { name: "quiz"; questions: AiQuizQuestion[] };

interface AiCopilotSheetProps {
  visible: boolean;
  onClose: () => void;
  noteTitle: string;
  noteContent: string;
  existingTags: string[];
  getToken: () => Promise<string | null>;
  onReplaceContent: (text: string) => void;
  onAppendContent: (text: string) => void;
  onApplyTags: (tags: string[]) => void;
}

interface QuickAction {
  id: "summary" | "polish" | "tags" | "cheatsheet";
  label: string;
  desc: string;
  sf: string;
  material: Parameters<typeof ThemeIcon>[0]["material"];
  resultKey: string;
  labelResult: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "summary",
    label: "Summarize",
    desc: "Key points in a few sentences",
    sf: "doc.text.magnifyingglass",
    material: "text-box-search-outline",
    resultKey: "summary",
    labelResult: "Summary",
  },
  {
    id: "polish",
    label: "Polish",
    desc: "Fix grammar and flow",
    sf: "wand.and.stars",
    material: "creation-outline",
    resultKey: "polished",
    labelResult: "Polished text",
  },
  {
    id: "tags",
    label: "Auto-tags",
    desc: "Suggest relevant tags",
    sf: "tag",
    material: "tag-multiple-outline",
    resultKey: "tags",
    labelResult: "Suggested tags",
  },
  {
    id: "cheatsheet",
    label: "Cheat sheet",
    desc: "One-page revision guide",
    sf: "text.book.closed",
    material: "notebook-outline",
    resultKey: "cheatsheet",
    labelResult: "Cheat sheet",
  },
];

const STUDY_TOOLS: {
  id: string;
  label: string;
  desc: string;
  sf: string;
  material: Parameters<typeof ThemeIcon>[0]["material"];
}[] = [
  {
    id: "flashcards",
    label: "Flashcards",
    desc: "6 recall cards",
    sf: "rectangle.stack",
    material: "cards-outline",
  },
  {
    id: "quiz",
    label: "Quiz",
    desc: "5 multiple choice questions",
    sf: "checkmark.circle",
    material: "head-question-outline",
  },
];

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*]\s+/gm, "• ")
    .trim();
}

function LoadingOverlay() {
  const theme = useThemeColors();
  return (
    <View style={styles.loadingWrap}>
      <ActivityIndicator size="small" color={theme.primary} />
      <Text style={[styles.loadingText, { color: theme.textMuted }]}>Brewing…</Text>
    </View>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  const theme = useThemeColors();
  return <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{children}</Text>;
}

function ActionCard({
  icon,
  label,
  desc,
  onPress,
  enabled = true,
  dimmed = false,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  onPress: () => void;
  enabled?: boolean;
  dimmed?: boolean;
}) {
  const theme = useThemeColors();
  return (
    <Pressable
      disabled={!enabled || dimmed}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionCard,
        { backgroundColor: theme.surface, borderColor: theme.borderLight },
        pressed && { opacity: 0.7 },
        (!enabled || dimmed) && { opacity: 0.4 },
      ]}
    >
      <View style={[styles.actionIcon, { backgroundColor: theme.surfaceAlt }]}>{icon}</View>
      <Text style={[styles.actionLabel, { color: theme.text }]}>{label}</Text>
      <Text style={[styles.actionDesc, { color: theme.textMuted }]} numberOfLines={1}>
        {desc}
      </Text>
    </Pressable>
  );
}

export default function AiCopilotSheet({
  visible,
  onClose,
  noteTitle,
  noteContent,
  existingTags,
  getToken,
  onReplaceContent,
  onAppendContent,
  onApplyTags,
}: AiCopilotSheetProps) {
  const theme = useThemeColors();
  const [view, setView] = useState<CopilotView>({ name: "home" });
  const [loadingAction, setLoadingAction] = useState<QuickAction["id"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ action: QuickAction["id"]; key: string; value: string } | null>(null);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const hasText = noteContent.trim().length > 0;

  const reset = useCallback(() => {
    setView({ name: "home" });
    setLoadingAction(null);
    setError(null);
    setResult(null);
    setSuggestedTags([]);
    setSelectedTags(new Set());
    setMessages([]);
    setChatInput("");
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  const runAi = async (body: Record<string, unknown>) => {
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        setError("You need to be signed in to use AI.");
        return null;
      }
      return await api.notes.ai(body, token);
    } catch (err: any) {
      setError(err?.message || "AI request failed. Please try again.");
      return null;
    }
  };

  const handleQuickAction = async (action: QuickAction) => {
    setLoadingAction(action.id);
    const data = await runAi({
      action: action.id,
      noteTitle,
      noteContent,
      question: undefined,
      existingTags,
    });
    setLoadingAction(null);
    if (!data) return;

    if (action.id === "tags") {
      const tags = Array.isArray(data.tags)
        ? (data.tags as unknown[]).map((t) => String(t)).slice(0, 6)
        : [];
      setSuggestedTags(tags);
      setSelectedTags(new Set());
      setView({ name: "result", action: "tags" });
      return;
    }

    const value = data[action.resultKey];
    setResult({ action: action.id, key: action.resultKey, value: stripMarkdown(String(value ?? "")) });
    setView({ name: "result", action: action.id });
  };

  const handleStudyTool = async (id: string) => {
    setLoadingAction(id as QuickAction["id"]);
    const data = await runAi({
      action: id,
      noteTitle,
      noteContent,
      question: undefined,
      existingTags,
    });
    setLoadingAction(null);
    if (!data) return;

    if (id === "flashcards") {
      const cards = Array.isArray(data.flashcards)
        ? (data.flashcards as { front?: unknown; back?: unknown }[])
            .filter((c) => c && (c.front ?? "") !== "" && (c.back ?? "") !== "")
            .map((c) => ({ front: String(c.front), back: String(c.back) }))
        : [];
      if (cards.length > 0) setView({ name: "flashcards", cards });
      else setError("Could not generate flashcards from this note.");
    } else if (id === "quiz") {
      const questions = Array.isArray(data.questions)
        ? (data.questions as AiQuizQuestion[]).filter((q) => q && Array.isArray(q.options))
        : [];
      if (questions.length > 0) setView({ name: "quiz", questions });
      else setError("Could not generate quiz questions from this note.");
    }
  };

  const handleSend = async () => {
    const question = chatInput.trim();
    if (!question || chatLoading) return;
    setChatInput("");
    setMessages((prev) => [...prev, { id: `u_${Date.now()}`, role: "user", text: question }]);
    setChatLoading(true);
    const data = await runAi({
      action: "chat",
      noteTitle,
      noteContent,
      question,
      existingTags,
    });
    setChatLoading(false);
    if (!data) return;
    setMessages((prev) => [
      ...prev,
      { id: `a_${Date.now()}`, role: "assistant", text: stripMarkdown(String(data.answer ?? "")) },
    ]);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const applyNow = (value: string, mode: "replace" | "append") => {
    if (!value.trim()) return;
    if (mode === "replace") onReplaceContent(value);
    else onAppendContent(value);
    handleClose();
  };

  const applyTags = () => {
    if (selectedTags.size === 0) {
      Alert.alert("No tags selected", "Pick at least one suggested tag to add.");
      return;
    }
    onApplyTags([...selectedTags]);
    handleClose();
  };

  const renderHome = () => (
    <View>
      <View style={styles.twoCol}>
        {QUICK_ACTIONS.map((a) => (
          <ActionCard
            key={a.id}
            icon={
              <ThemeIcon
                sf={a.sf}
                material={a.material}
                size={18}
                color={theme.primary}
                weight="semibold"
              />
            }
            label={a.label}
            desc={a.desc}
            enabled={hasText}
            dimmed={loadingAction !== null || chatLoading}
            onPress={() => handleQuickAction(a)}
          />
        ))}
      </View>
      <SectionTitle>Study tools</SectionTitle>
      <View style={styles.twoCol}>
        {STUDY_TOOLS.map((t) => (
          <ActionCard
            key={t.id}
            icon={
              <ThemeIcon sf={t.sf} material={t.material} size={18} color={theme.accent} weight="semibold" />
            }
            label={t.label}
            desc={t.desc}
            enabled={hasText}
            dimmed={loadingAction !== null || chatLoading}
            onPress={() => handleStudyTool(t.id)}
          />
        ))}
      </View>
      <SectionTitle>Ask about this note</SectionTitle>
      <View style={[styles.chatBar, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
        <ThemeIcon sf="bubble.left.and.bubble.right" material="message-text-outline" size={16} color={theme.textMuted} />
        <Text style={[styles.chatPrompt, { color: theme.textSecondary }]} numberOfLines={1}>
          Ask a question grounded in this note…
        </Text>
        <Pressable
          onPress={() => setView({ name: "chat" })}
          style={[styles.miniArrow, { backgroundColor: theme.surfaceAlt }]}
        >
          <ThemeIcon sf="chevron.right" material="chevron-right" size={14} color={theme.text} />
        </Pressable>
      </View>
    </View>
  );

  const renderChat = () => (
    <View>
      <Pressable onPress={() => setView({ name: "home" })} style={styles.backRow}>
        <ThemeIcon sf="chevron.left" material="chevron-left" size={16} color={theme.primary} />
        <Text style={[styles.backLabel, { color: theme.primary }]}>Back to AI tools</Text>
      </Pressable>
      {messages.length === 0 && (
        <Text style={[styles.chatEmpty, { color: theme.textMuted }]}>
          Ask anything about this note — summaries, clarifications, or questions grounded only in what
          {"you've"} written.
        </Text>
      )}
      <View>
        {messages.map((m) => (
          <View
            key={m.id}
            style={[
              styles.bubble,
              m.role === "user"
                ? [styles.bubbleUser, { backgroundColor: theme.primary }]
                : [styles.bubbleAi, { backgroundColor: theme.surface, borderColor: theme.borderLight }],
            ]}
          >
            <Text
              style={[styles.bubbleText, m.role === "user" ? { color: "#FFFFFF" } : { color: theme.text }]}
            >
              {m.text}
            </Text>
          </View>
        ))}
        {chatLoading && (
          <View style={[styles.bubble, styles.bubbleAi, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
            <ActivityIndicator size="small" color={theme.primary} />
          </View>
        )}
      </View>
      <View style={[styles.chatInputRow, { borderTopColor: theme.borderLight }]}>
        <TextInput
          value={chatInput}
          onChangeText={setChatInput}
          placeholder="Ask about this note…"
          placeholderTextColor={theme.textMuted}
          style={[styles.chatInput, { color: theme.text }]}
          multiline
          maxLength={500}
        />
        <Pressable
          onPress={handleSend}
          disabled={!chatInput.trim() || chatLoading}
          style={[styles.sendBtn, { backgroundColor: theme.primary }, (!chatInput.trim() || chatLoading) && { opacity: 0.4 }]}
        >
          <ThemeIcon sf="arrow.up" material="arrow-up" size={16} color="#FFFFFF" weight="bold" />
        </Pressable>
      </View>
    </View>
  );

  const renderBody = () => {
    if (view.name === "chat") return renderChat();
    if (view.name === "flashcards") {
      return (
        <View>
          <View style={styles.inlineHeader}>
            <Pressable onPress={() => setView({ name: "home" })} style={styles.backRow}>
              <ThemeIcon sf="chevron.left" material="chevron-left" size={16} color={theme.primary} />
              <Text style={[styles.backLabel, { color: theme.primary }]}>Back</Text>
            </Pressable>
            <Text style={[styles.inlineTitle, { color: theme.text }]}>Flashcards</Text>
          </View>
          <AiFlashcardsView cards={view.cards} />
        </View>
      );
    }
    if (view.name === "quiz") {
      return (
        <View>
          <View style={styles.inlineHeader}>
            <Pressable onPress={() => setView({ name: "home" })} style={styles.backRow}>
              <ThemeIcon sf="chevron.left" material="chevron-left" size={16} color={theme.primary} />
              <Text style={[styles.backLabel, { color: theme.primary }]}>Back</Text>
            </Pressable>
            <Text style={[styles.inlineTitle, { color: theme.text }]}>Quiz</Text>
          </View>
          <AiQuizView questions={view.questions} />
        </View>
      );
    }
    if (view.name === "result") {
      const action = QUICK_ACTIONS.find((a) => a.id === view.action);
      if (view.action === "tags") {
        return (
          <View>
            <View style={styles.inlineHeader}>
              <Pressable onPress={() => setView({ name: "home" })} style={styles.backRow}>
                <ThemeIcon sf="chevron.left" material="chevron-left" size={16} color={theme.primary} />
                <Text style={[styles.backLabel, { color: theme.primary }]}>Back</Text>
              </Pressable>
              <Text style={[styles.inlineTitle, { color: theme.text }]}>Suggested tags</Text>
            </View>
            {suggestedTags.length === 0 ? (
              <Text style={[styles.errorText, { color: theme.textMuted }]}>
                No tag suggestions came back. Try again.
              </Text>
            ) : (
              <View style={styles.chipWrap}>
                {suggestedTags.map((tag) => {
                  const on = selectedTags.has(tag);
                  return (
                    <Pressable
                      key={tag}
                      onPress={() => toggleTag(tag)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: on ? theme.primary : theme.surface,
                          borderColor: on ? theme.primary : theme.borderLight,
                        },
                      ]}
                    >
                      <Text style={[styles.chipLabel, { color: on ? "#FFFFFF" : theme.text }]}>
                        #{tag}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            <Pressable
              onPress={applyTags}
              style={[styles.applyBtn, { backgroundColor: theme.primary }, selectedTags.size === 0 && { opacity: 0.4 }]}
            >
              <Text style={styles.applyLabel}>Add {selectedTags.size > 0 ? `${selectedTags.size} ` : ""}tags</Text>
            </Pressable>
          </View>
        );
      }
      return (
        <View>
          <AiResultView
            kind={view.action}
            text={result?.value || ""}
            onReplace={(text) => applyNow(text, "replace")}
            onAppend={(text) => applyNow(text, "append")}
            onDiscard={() => setView({ name: "home" })}
          />
          <Pressable onPress={() => action && handleQuickAction(action)} style={styles.regenerateRow}>
            <ThemeIcon sf="arrow.clockwise" material="reload" size={14} color={theme.textMuted} />
            <Text style={[styles.regenerateLabel, { color: theme.textMuted }]}>Regenerate</Text>
          </Pressable>
        </View>
      );
    }
    return renderHome();
  };

  const sheetHeaderIcon = (
    <View style={[styles.sparkleWrap, { backgroundColor: theme.primary }]}>
      <ThemeIcon sf="sparkles" material="creation" size={18} color="#FFFFFF" />
    </View>
  );

  return (
    <GlassSheet
      visible={visible}
      onClose={handleClose}
      title="AI Copilot"
      subtitle="Generate, refine and learn from this note"
      icon={sheetHeaderIcon}
    >
      <View style={styles.body}>
        {loadingAction && <LoadingOverlay />}
        {!hasText && view.name === "home" && (
          <Text style={[styles.errorText, { color: theme.warning }]}>
            Add some content to this note first, then AI can work its magic.
          </Text>
        )}
        {error && (
          <View style={[styles.errorCard, { backgroundColor: theme.surface, borderColor: theme.danger }]}>
            <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
            <Pressable onPress={() => setError(null)} hitSlop={8}>
              <ThemeIcon sf="xmark.circle.fill" material="close-circle-outline" size={16} color={theme.textMuted} />
            </Pressable>
          </View>
        )}
        {chatLoading && view.name === "home" ? <LoadingOverlay /> : renderBody()}
      </View>
    </GlassSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    minHeight: 120,
  },
  twoCol: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  actionCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 13,
  },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "SpaceGrotesk",
  },
  actionDesc: {
    fontSize: 11,
    marginTop: 2,
    fontFamily: "SpaceGrotesk",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 10,
    fontFamily: "SpaceGrotesk",
  },
  chatBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  chatPrompt: {
    flex: 1,
    fontSize: 13,
    fontFamily: "SpaceGrotesk",
  },
  miniArrow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 18,
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 13,
    fontFamily: "SpaceGrotesk",
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  backLabel: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "SpaceGrotesk",
  },
  inlineHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(128,128,128,0.25)",
  },
  inlineTitle: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "SpaceGrotesk",
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "SpaceGrotesk",
  },
  applyBtn: {
    borderRadius: 13,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 16,
  },
  applyLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "SpaceGrotesk",
  },
  regenerateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
    marginTop: 14,
  },
  regenerateLabel: {
    fontSize: 13,
    fontFamily: "SpaceGrotesk",
  },
  sparkleWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 19,
    flexShrink: 1,
    fontFamily: "SpaceGrotesk",
  },
  chatEmpty: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
    fontFamily: "SpaceGrotesk",
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 10,
    marginBottom: 8,
    maxWidth: "88%",
  },
  bubbleUser: {
    alignSelf: "flex-end",
    borderBottomRightRadius: 6,
  },
  bubbleAi: {
    alignSelf: "flex-start",
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomLeftRadius: 6,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "SpaceGrotesk",
  },
  chatInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  chatInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "SpaceGrotesk",
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
});