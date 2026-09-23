import React from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useThemeColors } from "../hooks/useTheme";
import { ensureOfflineActivated } from "../lib/providers/offline";
import {
  AI_PROVIDER_LABELS,
  effectiveRating,
  type AiModelOption,
  type AiProvider,
} from "../lib/providers/modelRegistry";
import StarsRating from "./StarsRating";

const FONT = Platform.OS === "ios" ? "Arial" : "sans-serif";

type ProviderStatus = "ready" | "needs-key" | "unknown";

export interface ModelGroup {
  provider: AiProvider;
  models: AiModelOption[];
}

interface ModelPickerSheetProps {
  visible: boolean;
  selectedModel: string;
  modelGroups: ModelGroup[];
  providerStatus: (provider: AiProvider) => ProviderStatus;
  userRatings: Record<string, number>;
  ratingPending: string | null;
  ratingErrorText?: string | null;
  onRate: (modelRef: string, value: number) => void;
  onSelect: (model: AiModelOption) => void;
  onInfo: (model: AiModelOption) => void;
  onClose: () => void;
}

export default function ModelPickerSheet(props: ModelPickerSheetProps) {
  const theme = useThemeColors();

  const handleTap = (model: AiModelOption) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    if (model.provider === "offline") {
      ensureOfflineActivated(model.ref).catch(() => {});
    }
    props.onSelect(model);
  };

  return (
    <Modal
      visible={props.visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={props.onClose}
    >
      <View style={styles.pickerRoot}>
        <Pressable
          style={[styles.pickerBackdrop, { backgroundColor: "rgba(0,0,0,0.5)" }]}
          onPress={props.onClose}
        />
        <View
          style={[
            styles.pickerSheet,
            { backgroundColor: theme.surface, borderColor: theme.borderLight },
          ]}
        >
          <View style={styles.pickerHandle} />
          <View style={styles.pickerHead}>
            <View style={styles.pickerHeadText}>
              <Text style={[styles.pickerTitle, { color: theme.text }]}>
                Choose AI Model
              </Text>
              <Text style={[styles.pickerSubtitle, { color: theme.textMuted }]}>
                Applies to all app AI &mdash; quizzes, notes, study and more
              </Text>
            </View>
            <Pressable
              onPress={props.onClose}
              hitSlop={8}
              style={[styles.pickerClose, { backgroundColor: theme.surfaceAlt }]}
            >
              <MaterialCommunityIcons
                name="close"
                size={16}
                color={theme.textSecondary}
              />
            </Pressable>
          </View>
          <ScrollView
            style={styles.pickerScroll}
            showsVerticalScrollIndicator={false}
          >
            {props.modelGroups.map(({ provider, models }) => (
              <View key={provider} style={styles.pickerGroup}>
                <Text
                  style={[styles.pickerGroupLabel, { color: theme.textSecondary }]}
                >
                  {AI_PROVIDER_LABELS[provider]}
                </Text>
                {models.map((model) => {
                  const active = model.ref === props.selectedModel;
                  const status = props.providerStatus(model.provider);
                  const dotColor =
                    status === "ready"
                      ? theme.primary
                      : status === "unknown"
                        ? theme.textMuted
                        : theme.accent;
                  const rating = effectiveRating(model, props.userRatings);
                  return (
                    <Pressable
                      key={model.ref}
                      accessibilityRole="button"
                      style={[
                        styles.pickerItem,
                        { borderBottomColor: theme.borderLight },
                      ]}
                      onPress={() => handleTap(model)}
                    >
                      <View style={[styles.pickerDot, { backgroundColor: dotColor }]} />
                      <View style={styles.pickerItemInfo}>
                        <View style={styles.pickerItemTitleRow}>
                          <Text
                            style={[
                              styles.pickerItemLabel,
                              {
                                color: theme.text,
                                fontWeight: active ? "700" : "400",
                              },
                            ]}
                          >
                            {model.label}
                          </Text>
                          <View
                            style={[
                              styles.aiTierChip,
                              {
                                backgroundColor:
                                  model.tier === "paid"
                                    ? theme.accent + "22"
                                    : theme.primary + "22",
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.aiTierText,
                                {
                                  color:
                                    model.tier === "paid"
                                      ? theme.accent
                                      : theme.primary,
                                },
                              ]}
                            >
                              {model.tier === "paid" ? "PAID" : "FREE"}
                            </Text>
                          </View>
                          {rating != null && (
                            <View
                              style={[
                                styles.aiRatingChip,
                                { backgroundColor: theme.accent + "1A" },
                              ]}
                            >
                              <MaterialCommunityIcons
                                name="star"
                                size={11}
                                color={theme.accent}
                              />
                              <Text
                                style={[styles.aiRatingText, { color: theme.accent }]}
                              >
                                {rating}
                              </Text>
                            </View>
                          )}
                        </View>
                        {model.note ? (
                          <Text style={[styles.pickerItemNote, { color: theme.textMuted }]}>
                            {model.note}
                          </Text>
                        ) : null}
                        <View style={styles.pickerStarsRow}>
                          <StarsRating
                            value={props.userRatings[model.ref] ?? null}
                            onChange={(value) => props.onRate(model.ref, value)}
                            size={14}
                            color={theme.accent}
                            emptyColor={theme.border}
                            disabled={props.ratingPending != null}
                          />
                          {props.ratingPending === model.ref && (
                            <ActivityIndicator size="small" color={theme.textMuted} />
                          )}
                        </View>
                      </View>
                      {active ? (
                        <View
                          style={[
                            styles.primaryChip,
                            { backgroundColor: theme.primary + "1A" },
                          ]}
                        >
                          <MaterialCommunityIcons
                            name="check"
                            size={11}
                            color={theme.primary}
                          />
                          <Text style={[styles.primaryChipText, { color: theme.primary }]}>
                            Primary
                          </Text>
                        </View>
                      ) : (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Details for ${model.label}`}
                          hitSlop={8}
                          onPress={() => props.onInfo(model)}
                          style={styles.pickerInfoBtn}
                        >
                          <MaterialCommunityIcons
                            name="information-outline"
                            size={18}
                            color={theme.textMuted}
                          />
                        </Pressable>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ))}
            {props.ratingErrorText ? (
              <View style={styles.pickerHint}>
                <MaterialCommunityIcons
                  name="alert-outline"
                  size={14}
                  color={theme.danger}
                />
                <Text style={[styles.pickerHintText, { color: theme.danger }]}>
                  {props.ratingErrorText}
                </Text>
              </View>
            ) : null}
            <View style={styles.pickerHint}>
              <MaterialCommunityIcons
                name="information-outline"
                size={14}
                color={theme.textMuted}
              />
              <Text style={[styles.pickerHintText, { color: theme.textMuted }]}>
                Green dot = ready to use. Tap a model to set it as the app default.
              </Text>
            </View>
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    paddingTop: 8,
    overflow: "hidden",
  },
  pickerHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(128,128,128,0.35)",
    marginBottom: 12,
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
    fontFamily: FONT,
  },
  pickerSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: FONT,
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
    fontFamily: FONT,
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
    marginLeft: 2,
  },
  pickerItemInfo: {
    flex: 1,
    gap: 4,
  },
  pickerItemTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  pickerItemLabel: {
    fontSize: 14,
    fontFamily: FONT,
  },
  pickerItemNote: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FONT,
  },
  pickerStarsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    gap: 6,
  },
  pickerInfoBtn: {
    padding: 6,
  },
  aiTierChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  aiTierText: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: FONT,
    textTransform: "uppercase" as const,
  },
  aiRatingChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  aiRatingText: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: FONT,
  },
  primaryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  primaryChipText: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: FONT,
    textTransform: "uppercase" as const,
  },
  pickerHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 12,
  },
  pickerHintText: {
    fontSize: 12,
    flex: 1,
    fontFamily: FONT,
  },
});