import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AgentToolsSheet from "../../../component/coach/AgentToolsSheet";
import ChatHistorySheet from "../../../component/coach/ChatHistorySheet";
import CoachChatMenuSheet from "../../../component/coach/CoachChatMenuSheet";
import CoachHeader from "../../../component/coach/CoachHeader";
import CoachInputDock from "../../../component/coach/CoachInputDock";
import CoachMascot from "../../../component/coach/CoachMascot";
import CoachScreen from "../../../component/coach/CoachScreen";
import SuggestPromptsSheet from "../../../component/coach/SuggestPromptsSheet";
import MarkdownRenderer from "../../../component/MarkdownRenderer";
import { coachColors, coachFont, coachMarkdownTheme } from "../../../constants/coachTheme";
import { images } from "../../../constants/images";
import { useAuth } from "../../../contexts/AuthContext";
import { api, friendlyError } from "../../../lib/api";
import { getModelOption } from "../../../lib/providers/modelRegistry";
import { useModelStore } from "../../../store/modelStore";

type Role = "user" | "assistant";

interface CoachMessage {
  id: string;
  role: Role;
  content: string;
  createdAt: string;
}

const RECOMMENDATIONS = [
  {
    label: "Flu Relief Tablets",
    icon: "pill" as const,
    tint: "#FDECEC",
    color: "#E07A7A",
  },
  {
    label: "Zinc Supplements",
    icon: "bottle-tonic" as const,
    tint: "#EFECFC",
    color: "#8B7EF8",
  },
  {
    label: "Vitamin C",
    icon: "food-apple-outline" as const,
    tint: "#E7F6ED",
    color: "#5BB98C",
  },
];

function formatTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function AgentChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    prompt?: string | string[];
    conversationId?: string | string[];
  }>();
  const { getToken, user } = useAuth();
  const insets = useSafeAreaInsets();
  const selectedModel = useModelStore((state) => state.selectedModel);
  const modelLabel = getModelOption(selectedModel)?.label ?? "AI model";

  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [connectorsVisible, setConnectorsVisible] = useState(false);
  const [suggestionsVisible, setSuggestionsVisible] = useState(false);
  const sendingRef = useRef(false);
  const requestSeqRef = useRef(0);
  const sentInitialRef = useRef(false);
  const loadedConversationRef = useRef(false);
  const listRef = useRef<FlatList<CoachMessage>>(null);

  const sendMessage = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || sendingRef.current) return;
      sendingRef.current = true;
      const requestId = ++requestSeqRef.current;
      setError(null);
      setInput("");
      setLoading(true);

      const userMessage: CoachMessage = {
        id: `user_${Date.now()}`,
        role: "user",
        content: text,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);

      try {
        const token = await getToken();
        if (!token) {
          throw new Error("Your session expired. Please sign in again.");
        }
        const response = await api.agent.chat(
          {
            conversationId: conversationId ?? undefined,
            message: text,
            persona: "patient_tutor",
            mode: "general",
          },
          token,
          { modelRef: selectedModel },
        );
        if (requestId !== requestSeqRef.current) return;
        setConversationId(response.conversationId);
        setMessages((prev) => [
          ...prev,
          {
            id: response.message.id,
            role: "assistant",
            content: response.message.content,
            createdAt: new Date().toISOString(),
          },
        ]);
      } catch (err) {
        if (requestId !== requestSeqRef.current) return;
        setError(
          friendlyError(err, "The coach could not answer. Please try again."),
        );
      } finally {
        if (requestId === requestSeqRef.current) {
          sendingRef.current = false;
          setLoading(false);
        }
      }
    },
    [conversationId, getToken, selectedModel],
  );

  const resetChat = useCallback(() => {
    requestSeqRef.current += 1;
    sendingRef.current = false;
    setLoading(false);
    setMessages([]);
    setConversationId(null);
    setError(null);
    setInput("");
  }, []);

  const openConversation = useCallback(
    async (id: string) => {
      const token = await getToken();
      if (!token) {
        throw new Error("Your session expired. Please sign in again.");
      }
      const response = await api.tutor.conversations.get(id, token);
      requestSeqRef.current += 1;
      sendingRef.current = false;
      sentInitialRef.current = true;
      setLoading(false);
      setError(null);
      setInput("");
      setConversationId(response.conversation.id);
      setMessages(
        response.messages.map((item) => ({
          id: item.id,
          role: item.role,
          content: item.content,
          createdAt: item.createdAt,
        })),
      );
    },
    [getToken],
  );

  useEffect(() => {
    if (loadedConversationRef.current) return;
    const id = Array.isArray(params.conversationId)
      ? params.conversationId[0]
      : params.conversationId;
    if (!id?.trim()) return;
    loadedConversationRef.current = true;
    sentInitialRef.current = true;
    const timer = setTimeout(() => {
      void openConversation(id).catch((err) => {
        setError(
          friendlyError(
            err,
            "Could not open that conversation. Please try again.",
          ),
        );
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [openConversation, params.conversationId]);

  useEffect(() => {
    if (sentInitialRef.current) return;
    const initial = Array.isArray(params.prompt)
      ? params.prompt[0]
      : params.prompt;
    if (!initial?.trim()) return;
    sentInitialRef.current = true;
    const timer = setTimeout(() => void sendMessage(initial), 0);
    return () => clearTimeout(timer);
  }, [params.prompt, sendMessage]);

  const latestAssistantId = [...messages]
    .reverse()
    .find((message) => message.role === "assistant")?.id;

  const renderMessage = ({
    item,
  }: {
    item: CoachMessage;
  }) => {
    const isUser = item.role === "user";
    const time = formatTime(item.createdAt);
    const showRecommendations =
      !isUser && item.id === latestAssistantId && Boolean(latestAssistantId);

    if (isUser) {
      return (
        <View style={styles.userBlock}>
          <View style={styles.userRow}>
            <View style={styles.userBubble}>
              <Text style={styles.userText}>{item.content}</Text>
            </View>
            <Image
              source={
                user?.photoURL ? { uri: user.photoURL } : images.userProfilePhoto
              }
              style={styles.userAvatar}
              contentFit="cover"
            />
          </View>
          <Text style={styles.userTime}>{time}</Text>
        </View>
      );
    }

    return (
      <View style={styles.assistantBlock}>
        <View style={styles.assistantRow}>
          <CoachMascot size={28} accessibilityLabel="AI coach avatar" />
          <View style={styles.assistantBubble}>
            <MarkdownRenderer content={item.content} theme={coachMarkdownTheme} />

            {showRecommendations ? (
              <View style={styles.recommendations}>
                {RECOMMENDATIONS.map((item) => (
                  <View
                    key={item.label}
                    style={[
                      styles.recommendation,
                      { backgroundColor: item.tint },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={item.icon}
                      size={22}
                      color={item.color}
                    />
                    <Text style={styles.recommendationText} numberOfLines={2}>
                      {item.label}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.messageActions}>
              <Pressable
                onPress={async () => {
                  await Clipboard.setStringAsync(item.content);
                  Alert.alert("Copied", "Message copied to clipboard.");
                }}
                style={styles.messageAction}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="Copy message"
              >
                <MaterialCommunityIcons
                  name="content-copy"
                  size={14}
                  color={coachColors.textMuted}
                />
              </Pressable>
              <Pressable
                onPress={() => Alert.alert("Thanks", "Feedback recorded.")}
                style={styles.messageAction}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="Like message"
              >
                <MaterialCommunityIcons
                  name="thumb-up-outline"
                  size={14}
                  color={coachColors.textMuted}
                />
              </Pressable>
              <Pressable
                onPress={() => Alert.alert("Thanks", "Feedback recorded.")}
                style={styles.messageAction}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="Dislike message"
              >
                <MaterialCommunityIcons
                  name="thumb-down-outline"
                  size={14}
                  color={coachColors.textMuted}
                />
              </Pressable>
              <Pressable
                onPress={() =>
                  Alert.alert("Message", "More message actions are coming soon.")
                }
                style={styles.messageAction}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="More message options"
              >
                <MaterialCommunityIcons
                  name="dots-vertical"
                  size={14}
                  color={coachColors.textMuted}
                />
              </Pressable>
            </View>
          </View>
        </View>
        <Text style={styles.assistantTime}>{time}</Text>
      </View>
    );
  };

  return (
    <CoachScreen maxWidth={560}>
      <CoachHeader
        title="AI Chat"
        onBack={() => router.back()}
        onMore={() => setMenuVisible(true)}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: true })
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <CoachMascot size={96} halo />
              <Text style={styles.emptyTitle}>How can I help you today?</Text>
              <Text style={styles.emptyText}>
                Ask a question below and your coach will reply here.
              </Text>
            </View>
          }
        />

        {error ? (
          <View style={styles.errorBanner}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={16}
              color="#B45309"
            />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              onPress={() => setError(null)}
              accessibilityRole="button"
              accessibilityLabel="Dismiss error"
            >
              <MaterialCommunityIcons name="close" size={16} color="#B45309" />
            </Pressable>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.thinking}>
            <ActivityIndicator size="small" color={coachColors.accent} />
            <Text style={styles.thinkingText}>Coach is thinking...</Text>
          </View>
        ) : null}

        <View
          style={[styles.dockArea, { paddingBottom: Math.max(14, insets.bottom + 8) }]}
        >
          <CoachInputDock
            value={input}
            onChangeText={setInput}
            onSend={() => void sendMessage(input)}
            loading={loading}
            modelLabel={modelLabel}
            onAdd={() =>
              Alert.alert("Attachments", "Add a file from the chat composer.")
            }
            onLink={() =>
              Alert.alert("Attachments", "Add a file from the chat composer.")
            }
            onImage={() =>
              Alert.alert("Images", "Image uploads are coming soon.")
            }
            onMic={() =>
              Alert.alert("Voice input", "Voice input is coming soon.")
            }
          />
        </View>
      </KeyboardAvoidingView>

      <CoachChatMenuSheet
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNewChat={() => {
          resetChat();
          setMenuVisible(false);
        }}
        onHistory={() => setHistoryVisible(true)}
        onConnectors={() => setConnectorsVisible(true)}
        onSuggestions={() => setSuggestionsVisible(true)}
      />

      <ChatHistorySheet
        visible={historyVisible}
        activeConversationId={conversationId}
        getToken={getToken}
        onClose={() => setHistoryVisible(false)}
        onOpen={openConversation}
      />

      <AgentToolsSheet
        visible={connectorsVisible}
        getToken={getToken}
        onClose={() => setConnectorsVisible(false)}
        onPrompt={setInput}
      />

      <SuggestPromptsSheet
        visible={suggestionsVisible}
        onClose={() => setSuggestionsVisible(false)}
        onPick={setInput}
      />
    </CoachScreen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 16,
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
    gap: 6,
  },
  emptyTitle: {
    marginTop: 14,
    fontFamily: coachFont.bold,
    fontSize: 20,
    color: coachColors.text,
    textAlign: "center",
  },
  emptyText: {
    fontFamily: coachFont.regular,
    fontSize: 13,
    lineHeight: 19,
    color: coachColors.textMuted,
    textAlign: "center",
    maxWidth: 280,
  },
  userBlock: {
    alignItems: "flex-end",
  },
  userRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "flex-end",
    gap: 8,
    maxWidth: "92%",
  },
  userBubble: {
    borderRadius: 18,
    borderBottomRightRadius: 4,
    backgroundColor: coachColors.userBubble,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexShrink: 1,
  },
  userText: {
    fontFamily: coachFont.regular,
    fontSize: 14,
    lineHeight: 20,
    color: coachColors.text,
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginTop: 2,
    backgroundColor: coachColors.surface,
  },
  userTime: {
    marginTop: 4,
    marginRight: 36,
    fontFamily: coachFont.regular,
    fontSize: 10,
    color: coachColors.textMuted,
  },
  assistantBlock: {
    alignItems: "flex-start",
  },
  assistantRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    maxWidth: "96%",
  },
  assistantBubble: {
    flexShrink: 1,
    borderRadius: 18,
    borderTopLeftRadius: 4,
    backgroundColor: coachColors.aiBubble,
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 6,
    shadowColor: coachColors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 3,
  },
  recommendations: {
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
  },
  recommendation: {
    flex: 1,
    minWidth: 0,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: "center",
    gap: 6,
  },
  recommendationText: {
    fontFamily: coachFont.medium,
    fontSize: 10,
    lineHeight: 13,
    color: coachColors.textSecondary,
    textAlign: "center",
  },
  messageActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },
  messageAction: {
    paddingVertical: 2,
  },
  assistantTime: {
    marginTop: 4,
    marginLeft: 36,
    fontFamily: coachFont.regular,
    fontSize: 10,
    color: coachColors.textMuted,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: "#FEF3C7",
  },
  errorText: {
    flex: 1,
    fontFamily: coachFont.regular,
    fontSize: 12,
    lineHeight: 17,
    color: "#92400E",
  },
  thinking: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingBottom: 4,
  },
  thinkingText: {
    fontFamily: coachFont.medium,
    fontSize: 12,
    color: coachColors.textMuted,
  },
  dockArea: {
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
});
