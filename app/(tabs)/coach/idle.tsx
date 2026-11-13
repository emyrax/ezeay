import { useRouter } from "expo-router";
import { useState } from "react";
import {
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
import CoachModelPickerSheet from "../../../component/coach/CoachModelPickerSheet";
import CoachPhotoSheet from "../../../component/coach/CoachPhotoSheet";
import CoachScreen from "../../../component/coach/CoachScreen";
import SuggestPromptsSheet from "../../../component/coach/SuggestPromptsSheet";
import { coachColors, coachFont } from "../../../constants/coachTheme";
import { useAuth } from "../../../contexts/AuthContext";
import { useCoachAttachments } from "../../../hooks/useCoachAttachments";
import { useResponsive } from "../../../hooks/useResponsive";
import { useVoiceDictation } from "../../../hooks/useVoiceDictation";
import { friendlyError } from "../../../lib/api";
import {
  memoryFileLabel,
  pickMemoryFile,
  pickMemoryImage,
} from "../../../lib/agent/memoryFiles";
import { getModelOption } from "../../../lib/providers/modelRegistry";
import { getFloatingTabBarInset } from "../../../lib/responsive";
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
  const { showSidebar } = useResponsive();
  const { getToken } = useAuth();
  const selectedModel = useModelStore((state) => state.selectedModel);
  const setSelectedModel = useModelStore((state) => state.setSelectedModel);
  const modelLabel = getModelOption(selectedModel)?.label ?? "GPT-4o";
  const attachments = useCoachAttachments();
  const [input, setInput] = useState("");
  const [menuVisible, setMenuVisible] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [connectorsVisible, setConnectorsVisible] = useState(false);
  const [suggestionsVisible, setSuggestionsVisible] = useState(false);
  const [modelPickerVisible, setModelPickerVisible] = useState(false);
  const [photoVisible, setPhotoVisible] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);

  const openChat = (prompt?: string, memoryIds = attachments.ids) => {
    const text = prompt?.trim() ?? input.trim();
    router.push({
      pathname: "/coach/chat",
      params: {
        ...(text ? { prompt: text } : {}),
        ...(memoryIds.length
          ? { memoryIds: JSON.stringify(memoryIds) }
          : {}),
      },
    } as never);
  };

  const startChat = () => openChat();

  const pickFile = async () => {
    try {
      setPickError(null);
      const file = await pickMemoryFile();
      if (file) await attachments.upload(file, "file");
    } catch (err) {
      setPickError(friendlyError(err, "Could not attach that file."));
    }
  };

  const pickPhoto = async (source: "camera" | "gallery") => {
    setPhotoVisible(false);
    setPickError(null);
    try {
      const file = await pickMemoryImage(source);
      if (file) await attachments.upload(file, "photo");
    } catch (err) {
      setPickError(friendlyError(err, "Could not attach that photo."));
    }
  };

  const voice = useVoiceDictation({
    onTranscript: (text) =>
      setInput((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text)),
  });

  const attachmentError = pickError ?? attachments.error;
  const dockBottom = showSidebar
    ? Math.max(18, insets.bottom + 10)
    : getFloatingTabBarInset(insets.bottom);

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

        <View style={[styles.dockArea, { paddingBottom: dockBottom }]}>
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

          {attachmentError ? (
            <View style={styles.attachmentError}>
              <Text style={styles.attachmentErrorText}>{attachmentError}</Text>
              <Pressable
                onPress={() => {
                  setPickError(null);
                  attachments.clearError();
                }}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Dismiss attachment error"
              >
                <Text style={styles.attachmentErrorDismiss}>Dismiss</Text>
              </Pressable>
            </View>
          ) : null}

          <CoachInputDock
            value={input}
            onChangeText={setInput}
            onSend={startChat}
            showMeta
            modelLabel={modelLabel}
            onModelPress={() => setModelPickerVisible(true)}
            onAdd={() => void pickFile()}
            onLink={() => void pickFile()}
            onImage={() => setPhotoVisible(true)}
            onMic={voice.toggle}
            micActive={voice.listening}
            attachments={attachments.items.map((memory) => ({
              id: memory.id,
              label: memoryFileLabel(memory),
            }))}
            attachmentBusy={attachments.uploading}
            onRemoveAttachment={attachments.remove}
          />
        </View>
      </KeyboardAvoidingView>

      <CoachChatMenuSheet
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNewChat={() => {
          const memoryIds = attachments.ids;
          router.push({
            pathname: "/coach/chat",
            params: memoryIds.length
              ? { memoryIds: JSON.stringify(memoryIds) }
              : {},
          } as never);
        }}
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

      <CoachModelPickerSheet
        visible={modelPickerVisible}
        selectedModel={selectedModel}
        onSelect={(model) => setSelectedModel(model.ref)}
        onClose={() => setModelPickerVisible(false)}
      />

      <CoachPhotoSheet
        visible={photoVisible}
        onCamera={() => void pickPhoto("camera")}
        onGallery={() => void pickPhoto("gallery")}
        onClose={() => setPhotoVisible(false)}
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
  attachmentError: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  attachmentErrorText: {
    flex: 1,
    fontFamily: coachFont.regular,
    fontSize: 11,
    lineHeight: 16,
    color: "#92400E",
  },
  attachmentErrorDismiss: {
    fontFamily: coachFont.semibold,
    fontSize: 11,
    color: "#92400E",
  },
});
