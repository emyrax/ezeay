import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { coachColors, coachFont } from "../../constants/coachTheme";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

interface CoachInputDockProps {
  value: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  loading?: boolean;
  showMeta?: boolean;
  promptsLeft?: number;
  modelLabel?: string;
  onAdd?: () => void;
  onLink?: () => void;
  onImage?: () => void;
  onMic?: () => void;
  placeholder?: string;
}

function ToolButton({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.tool}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <MaterialCommunityIcons
        name={icon}
        size={17}
        color={coachColors.textSecondary}
      />
    </Pressable>
  );
}

export default function CoachInputDock({
  value,
  onChangeText,
  onSend,
  loading = false,
  showMeta = false,
  promptsLeft = 56,
  modelLabel = "GPT-4o",
  onAdd,
  onLink,
  onImage,
  onMic,
  placeholder = "Ask anything...",
}: CoachInputDockProps) {
  const canSend = value.trim().length > 0 && !loading;

  return (
    <View style={styles.outer}>
      {showMeta ? (
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>You have {promptsLeft} prompts left</Text>
          <Text style={styles.metaText}>Powered by {modelLabel}</Text>
        </View>
      ) : null}

      <View style={styles.inner}>
        <View style={styles.inputRow}>
          <MaterialCommunityIcons
            name="creation"
            size={18}
            color={coachColors.accent}
          />
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={coachColors.textMuted}
            style={styles.input}
            multiline
            maxLength={4000}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.actionsRow}>
          <View style={styles.tools}>
            <ToolButton icon="plus" label="Add attachment" onPress={onAdd} />
            <ToolButton icon="paperclip" label="Attach a file" onPress={onLink} />
            <ToolButton icon="image-outline" label="Add an image" onPress={onImage} />
            <ToolButton icon="microphone-outline" label="Use voice input" onPress={onMic} />
          </View>

          <Pressable
            onPress={onSend}
            disabled={!canSend}
            style={[
              styles.send,
              { opacity: canSend ? 1 : 0.45 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            {loading ? (
              <ActivityIndicator size="small" color={coachColors.white} />
            ) : (
              <MaterialCommunityIcons
                name="send"
                size={17}
                color={coachColors.white}
              />
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: 28,
    padding: 4,
    backgroundColor: "rgba(255, 248, 238, 0.74)",
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    shadowColor: coachColors.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 28,
    elevation: 10,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 5,
    gap: 8,
  },
  metaText: {
    fontFamily: coachFont.medium,
    fontSize: 11,
    color: coachColors.textMuted,
  },
  inner: {
    borderRadius: 24,
    backgroundColor: coachColors.surface,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 120,
    padding: 0,
    paddingTop: Platform.OS === "ios" ? 2 : 0,
    fontFamily: coachFont.regular,
    fontSize: 14,
    lineHeight: 20,
    color: coachColors.text,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  tools: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tool: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  send: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: coachColors.dark,
    alignItems: "center",
    justifyContent: "center",
  },
});
