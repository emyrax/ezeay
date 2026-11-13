import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
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
import { coachColors, coachFont } from "../../../constants/coachTheme";
import { useAuth } from "../../../contexts/AuthContext";
import { getModelOption } from "../../../lib/providers/modelRegistry";
import { useModelStore } from "../../../store/modelStore";

const SUGGESTIONS = [
  "Generate Summary",
  "Are they a good fit for my job",
  "Build a simple wellness routine",
  "What should I focus on today",
];

export default function AgentIdleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const selectedModel = useModelStore((state) => state.selectedModel);
  const modelLabel = getModelOption(selectedModel)?.label ?? "GPT-4o";
  const [input, setInput] = useState("");
  const [menuVisible, setMenuVisible] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [connectorsVisible, setConnectorsVisible] = useState(false);
  const [suggestionsVisible, setSuggestionsVisible] = useState(false);

  const openChat = (prompt?: string) => {
    const text = prompt?.trim() ?? input.trim();
    router.push({
      pathname: "/coach/chat",
      params: text ? { prompt: text } : {},
    } as never);
  };

  const startChat = () => openChat();

  const showAttachmentMessage = () => {
    Alert.alert(
      "Attachments",
      "Send your question first, then attach files from the chat.",
    );
  };

  return (
    <CoachScreen>
      <CoachHeader
        title="AI Agent"
        onBack={() => router.back()}
        onMore={() => setMenuVisible(true)}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <View style={styles.hero}>
          <CoachMascot size={120} halo />
          <Text style={styles.title}>
            How can I{"\n"}
            <Text style={styles.accent}>help you</Text> today?
          </Text>
        </View>

        <View
          style={[styles.dockArea, { paddingBottom: Math.max(18, insets.bottom + 10) }]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            {SUGGESTIONS.map((suggestion) => (
              <Pressable
                key={suggestion}
                onPress={() => setInput(suggestion)}
                style={styles.chip}
                accessibilityRole="button"
                accessibilityLabel={suggestion}
              >
                <Text style={styles.chipText}>{suggestion}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <CoachInputDock
            value={input}
            onChangeText={setInput}
            onSend={startChat}
            showMeta
            promptsLeft={56}
            modelLabel={modelLabel}
            onAdd={showAttachmentMessage}
            onLink={showAttachmentMessage}
            onImage={showAttachmentMessage}
            onMic={() =>
              Alert.alert("Voice input", "Voice input is available in chat.")
            }
          />
        </View>
      </KeyboardAvoidingView>

      <CoachChatMenuSheet
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNewChat={() => router.push("/coach/chat" as never)}
        onHistory={() => setHistoryVisible(true)}
        onConnectors={() => setConnectorsVisible(true)}
        onSuggestions={() => setSuggestionsVisible(true)}
      />

      <ChatHistorySheet
        visible={historyVisible}
        activeConversationId={null}
        getToken={getToken}
        onClose={() => setHistoryVisible(false)}
        onOpen={async (conversationId) => {
          router.push({
            pathname: "/coach/chat",
            params: { conversationId },
          } as never);
        }}
      />

      <AgentToolsSheet
        visible={connectorsVisible}
        getToken={getToken}
        onClose={() => setConnectorsVisible(false)}
        onPrompt={openChat}
      />

      <SuggestPromptsSheet
        visible={suggestionsVisible}
        onClose={() => setSuggestionsVisible(false)}
        onPick={openChat}
      />
    </CoachScreen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  hero: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  title: {
    marginTop: 22,
    textAlign: "center",
    fontFamily: coachFont.bold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
    color: coachColors.text,
  },
  accent: {
    color: coachColors.accent,
  },
  dockArea: {
    paddingHorizontal: 20,
    paddingBottom: 18,
    gap: 10,
  },
  chips: {
    gap: 8,
    paddingRight: 12,
  },
  chip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "rgba(255, 255, 255, 0.82)",
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
  },
  chipText: {
    fontFamily: coachFont.medium,
    fontSize: 12,
    color: coachColors.textSecondary,
  },
});
