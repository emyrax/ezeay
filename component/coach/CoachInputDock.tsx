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
  modelLabel?: string;
  onModelPress?: () => void;
  onAdd?: () => void;
  onLink?: () => void;
  onImage?: () => void;
  onMic?: () => void;
  micActive?: boolean;
  attachments?: { id: string; label: string }[];
  attachmentBusy?: boolean;
  onRemoveAttachment?: (id: string) => void;
  placeholder?: string;
}

function ToolButton({
  icon,
  label,
  onPress,
  active = false,
}: {
  icon: IconName;
  label: string;
  onPress?: () => void;
  active?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tool, active && styles.toolActive]}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
    >
      <MaterialCommunityIcons
        name={icon}
        size={17}
        color={active ? coachColors.accent : coachColors.textSecondary}
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
  modelLabel = "GPT-4o",
  onModelPress,
  onAdd,
  onLink,
  onImage,
  onMic,
  micActive = false,
  attachments = [],
  attachmentBusy = false,
  onRemoveAttachment,
  placeholder = "Ask anything...",
}: CoachInputDockProps) {
  const canSend = value.trim().length > 0 && !loading && !attachmentBusy;

  return (
    <View style={styles.outer}>
      {showMeta ? (
        <View style={styles.metaRow}>
          <Text style={[styles.metaText, styles.metaCta]}>
            Go pro with yuinx agent
          </Text>
          <Pressable
            onPress={onModelPress}
            disabled={!onModelPress}
            style={styles.modelChip}
            hitSlop={6}
            accessibilityRole={onModelPress ? "button" : undefined}
            accessibilityLabel={`AI model: ${modelLabel}. Change model`}
          >
            <Text style={styles.metaText}>Powered by {modelLabel}</Text>
            {onModelPress ? (
              <MaterialCommunityIcons
                name="chevron-down"
                size={14}
                color={coachColors.textMuted}
              />
            ) : null}
          </Pressable>
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

        {attachmentBusy || attachments.length > 0 ? (
          <View style={styles.attachments}>
            {attachmentBusy ? (
              <View style={styles.attachmentChip}>
                <ActivityIndicator size="small" color={coachColors.accent} />
                <Text style={styles.attachmentText}>Uploading...</Text>
              </View>
            ) : null}
            {attachments.map((attachment) => (
              <View key={attachment.id} style={styles.attachmentChip}>
                <MaterialCommunityIcons
                  name="paperclip"
                  size={13}
                  color={coachColors.textSecondary}
                />
                <Text style={styles.attachmentText} numberOfLines={1}>
                  {attachment.label}
                </Text>
                {onRemoveAttachment ? (
                  <Pressable
                    onPress={() => onRemoveAttachment(attachment.id)}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${attachment.label}`}
                  >
                    <MaterialCommunityIcons
                      name="close"
                      size={13}
                      color={coachColors.textMuted}
                    />
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.actionsRow}>
          <View style={styles.tools}>
            <ToolButton icon="plus" label="Add attachment" onPress={onAdd} />
            <ToolButton icon="paperclip" label="Attach a file" onPress={onLink} />
            <ToolButton icon="image-outline" label="Add an image" onPress={onImage} />
            <ToolButton
              icon="microphone-outline"
              label={micActive ? "Stop voice input" : "Use voice input"}
              onPress={onMic}
              active={micActive}
            />
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
  metaCta: {
    color: coachColors.accent,
    fontWeight: "700",
  },
  modelChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
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
  attachments: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 9,
  },
  attachmentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    maxWidth: "100%",
    borderRadius: 10,
    backgroundColor: coachColors.canvas,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  attachmentText: {
    maxWidth: 190,
    fontFamily: coachFont.medium,
    fontSize: 10,
    color: coachColors.textSecondary,
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
  toolActive: {
    backgroundColor: coachColors.accentSoft,
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
