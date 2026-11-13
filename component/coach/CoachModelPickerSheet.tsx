import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { coachColors, coachFont } from "../../constants/coachTheme";
import {
  AI_PROVIDER_LABELS,
  type AiModelOption,
} from "../../lib/providers/modelRegistry";
import { ensureOfflineActivated } from "../../lib/providers/offline";
import { modelStatusLabel, useAiModelCatalog } from "../../hooks/useAiModelCatalog";
import CoachSheet from "./CoachSheet";

interface CoachModelPickerSheetProps {
  visible: boolean;
  selectedModel: string;
  onSelect: (model: AiModelOption) => void;
  onClose: () => void;
}

function statusColor(status: "ready" | "needs-key" | "unknown") {
  if (status === "ready") return "#4E9F73";
  if (status === "unknown") return coachColors.textMuted;
  return "#C98A2E";
}

export default function CoachModelPickerSheet({
  visible,
  selectedModel,
  onSelect,
  onClose,
}: CoachModelPickerSheetProps) {
  const { modelGroups, providerStatus, offlineStatus } = useAiModelCatalog();

  const selectModel = (model: AiModelOption) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    if (model.provider === "offline") {
      ensureOfflineActivated(model.ref).catch(() => {});
    }
    onSelect(model);
    onClose();
  };

  return (
    <CoachSheet
      visible={visible}
      title="Choose AI model"
      subtitle="Powers this coach chat and the rest of Yuinx."
      onClose={onClose}
    >
      {modelGroups.map(({ provider, models }) => (
        <View key={provider} style={styles.group}>
          <Text style={styles.groupLabel}>{AI_PROVIDER_LABELS[provider]}</Text>
          {models.map((model) => {
            const active = model.ref === selectedModel;
            const status = providerStatus(model.provider);
            return (
              <Pressable
                key={model.ref}
                onPress={() => selectModel(model)}
                style={[styles.row, active && styles.rowActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Use ${model.label}`}
              >
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: statusColor(status) },
                  ]}
                />
                <View style={styles.copy}>
                  <View style={styles.titleRow}>
                    <Text
                      style={[styles.title, active && styles.titleActive]}
                      numberOfLines={1}
                    >
                      {model.label}
                    </Text>
                    <View
                      style={[
                        styles.tier,
                        model.tier === "paid" ? styles.tierPaid : styles.tierFree,
                      ]}
                    >
                      <Text
                        style={[
                          styles.tierText,
                          model.tier === "paid"
                            ? styles.tierTextPaid
                            : styles.tierTextFree,
                        ]}
                      >
                        {model.tier === "paid" ? "PAID" : "FREE"}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.meta} numberOfLines={2}>
                    {modelStatusLabel(model.provider, status, offlineStatus)}
                    {model.note ? ` · ${model.note}` : ""}
                  </Text>
                </View>
                {active ? (
                  <View style={styles.activeChip}>
                    <MaterialCommunityIcons
                      name="check"
                      size={12}
                      color={coachColors.accent}
                    />
                    <Text style={styles.activeText}>Active</Text>
                  </View>
                ) : (
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={19}
                    color={coachColors.textMuted}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </CoachSheet>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 6,
    marginBottom: 4,
  },
  groupLabel: {
    marginTop: 4,
    marginBottom: 2,
    fontFamily: coachFont.semibold,
    fontSize: 10,
    letterSpacing: 0.8,
    color: coachColors.textMuted,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: coachColors.border,
    backgroundColor: coachColors.background,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  rowActive: {
    borderColor: "rgba(139, 126, 248, 0.38)",
    backgroundColor: coachColors.accentSoft,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 7,
  },
  title: {
    fontFamily: coachFont.medium,
    fontSize: 13,
    color: coachColors.text,
  },
  titleActive: {
    fontFamily: coachFont.semibold,
    color: coachColors.accent,
  },
  tier: {
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tierFree: {
    backgroundColor: "#E7F6ED",
  },
  tierPaid: {
    backgroundColor: "#FFF3DE",
  },
  tierText: {
    fontFamily: coachFont.semibold,
    fontSize: 8,
    letterSpacing: 0.4,
  },
  tierTextFree: {
    color: "#3F8D63",
  },
  tierTextPaid: {
    color: "#B7791F",
  },
  meta: {
    fontFamily: coachFont.regular,
    fontSize: 11,
    lineHeight: 16,
    color: coachColors.textMuted,
  },
  activeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 10,
    backgroundColor: coachColors.surface,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  activeText: {
    fontFamily: coachFont.semibold,
    fontSize: 9,
    color: coachColors.accent,
    textTransform: "uppercase",
  },
});
