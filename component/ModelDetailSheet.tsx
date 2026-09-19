import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { DownloadableModel } from "expo-ai-kit";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { fontFamily } from "../constants/themes";
import { useAuth } from "../contexts/AuthContext";
import { useThemeColors } from "../hooks/useTheme";
import {
  AI_MODEL_DEFAULT,
  AI_PROVIDER_LABELS,
  type AiModelOption,
} from "../lib/providers/modelRegistry";
import {
  cancelOfflineDownload,
  deleteOfflineModel,
  downloadOfflineModel,
  ensureOfflineActivated,
  formatModelSize,
  getOfflineCatalog,
  modelErrorMessage,
  offlineSupported,
} from "../lib/providers/offline";
import { useAiKeysStore } from "../store/aiKeysStore";
import { useModelRatingStore } from "../store/modelRatingStore";
import { useModelStore } from "../store/modelStore";
import { useOfflineStore } from "../store/offlineStore";
import StarsRating from "./StarsRating";

interface ModelDetailSheetProps {
  model: AiModelOption;
  visible: boolean;
  serverConfigured: boolean | undefined;
  onSelect: (ref: string) => void;
  onClose: () => void;
}

export default function ModelDetailSheet({
  model,
  visible,
  serverConfigured,
  onSelect,
  onClose,
}: ModelDetailSheetProps) {
  const theme = useThemeColors();
  const keys = useAiKeysStore((s) => s.keys);
  const setKey = useAiKeysStore((s) => s.setKey);
  const clearKey = useAiKeysStore((s) => s.clearKey);
  const userRatings = useModelRatingStore((s) => s.ratings);
  const rateModel = useModelRatingStore((s) => s.rate);
  const { profile, getToken } = useAuth();

  const offlineStatus = useOfflineStore((s) => s.status);
  const offlineProgress = useOfflineStore((s) => s.progress);
  const offlineError = useOfflineStore((s) => s.error);
  const { selectedModel, setSelectedModel } = useModelStore();

  const [keyInput, setKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [offlineReady, setOfflineReady] = useState<boolean | null>(null);
  const [catalogModel, setCatalogModel] = useState<DownloadableModel | null>(null);
  const [offlineBusy, setOfflineBusy] = useState(false);
  const [offlineMessage, setOfflineMessage] = useState<string | null>(null);

  const isOffline = model.provider === "offline";
  const thisDownloading =
    isOffline && offlineStatus === "downloading" && useOfflineStore.getState().downloadedId === model.id;
  const thisInstalled =
    isOffline &&
    (offlineStatus === "downloaded" || offlineStatus === "ready") &&
    useOfflineStore.getState().downloadedId === model.id;

  const [savingRating, setSavingRating] = useState(false);
  const [ratingStatus, setRatingStatus] = useState<string | null>(null);
  const [justSavedRating, setJustSavedRating] = useState(false);

  const myRating = userRatings[model.ref] ?? null;
  const score = myRating ?? model.rating ?? null;

  useEffect(() => {
    if (visible) {
      setKeyInput("");
      setSaveError(null);
      setRatingStatus(null);
      setJustSavedRating(false);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || !isOffline) return;
    let active = true;
    (async () => {
      const supported = await offlineSupported();
      if (!active) return;
      setOfflineReady(supported);
      if (!supported) return;
      const models = await getOfflineCatalog();
      if (!active) return;
      const found = models.find((m) => m.id === model.id) ?? null;
      setCatalogModel(found);
      const state = useOfflineStore.getState();
      if (
        found &&
        (found.status === "ready" || found.status === "downloaded") &&
        state.status !== "downloading"
      ) {
        if (found.status === "ready") state.setReady(found.id);
        else state.setDownloaded(found.id);
      }
    })();
    return () => {
      active = false;
    };
  }, [visible, isOffline, model.id]);

  const handleOfflineDownload = useCallback(async () => {
    setOfflineBusy(true);
    setOfflineMessage(null);
    useOfflineStore.getState().setDownloading(model.id);
    try {
      await downloadOfflineModel(model.id, (p) =>
        useOfflineStore.getState().setProgress(model.id, p),
      );
      useOfflineStore.getState().setDownloaded(model.id);
    } catch (err) {
      const msg = modelErrorMessage(err);
      useOfflineStore.getState().setError(msg);
      setOfflineMessage(msg);
    } finally {
      setOfflineBusy(false);
    }
  }, [model.id]);

  const handleOfflineCancel = useCallback(() => {
    cancelOfflineDownload(model.id).catch(() => {});
    useOfflineStore.getState().setNone();
  }, [model.id]);

  const handleOfflineDelete = useCallback(async () => {
    try {
      await deleteOfflineModel(model.id);
    } finally {
      if (selectedModel === model.ref) setSelectedModel(AI_MODEL_DEFAULT);
      useOfflineStore.getState().setNone();
    }
  }, [model.id, model.ref, selectedModel, setSelectedModel]);

  const handleOfflineUse = useCallback(async () => {
    setOfflineBusy(true);
    setOfflineMessage(null);
    try {
      await ensureOfflineActivated(model.ref);
      useOfflineStore.getState().setReady(model.id);
      onSelect(model.ref);
    } catch (err) {
      setOfflineMessage(modelErrorMessage(err));
    } finally {
      setOfflineBusy(false);
    }
  }, [model.ref, model.id, onSelect]);

  const handleRate = useCallback(
    async (value: number) => {
      setRatingStatus(null);
      setJustSavedRating(false);
      setSavingRating(true);
      try {
        const token = await getToken();
        const uid = profile?.uid;
        if (!token || !uid) throw new Error("Sign in to save ratings.");
        await rateModel(model.ref, value === 0 ? null : value, uid, token);
        setJustSavedRating(true);
      } catch (err) {
        setRatingStatus(err instanceof Error ? err.message : "Couldn't save your rating.");
      } finally {
        setSavingRating(false);
      }
    },
    [model.ref, profile?.uid, getToken, rateModel],
  );

  const ownKey = keys[model.provider] ?? "";
  const hasOwnKey = Boolean(ownKey.trim());
  const serverReady = serverConfigured === true;
  const statusUnknown = serverConfigured === undefined;
  const needsKey = !serverReady && !hasOwnKey;
  const canSelect = isOffline
    ? offlineReady === true && thisInstalled
    : serverReady || hasOwnKey || statusUnknown;

  const offlineConfirmLabel = isOffline
    ? offlineReady === false
      ? "Rebuild to use"
      : offlineReady === null
        ? "Checking…"
        : thisInstalled
          ? "Use this model"
          : thisDownloading
            ? "Downloading…"
            : "Download first"
    : canSelect
      ? "Use this model"
      : "Add a key first";

  const handleSaveKey = useCallback(async () => {
    if (!keyInput.trim()) {
      setSaveError("Enter your API key first.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await setKey(model.provider, keyInput);
      setKeyInput("");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save the key.");
    } finally {
      setSaving(false);
    }
  }, [keyInput, model.provider, setKey]);

  const handleRemoveKey = useCallback(() => {
    clearKey(model.provider);
  }, [model.provider, clearKey]);

  if (!visible) return null;

  return (
    <View style={[st.overlay, { backgroundColor: theme.glass }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[st.sheet, { backgroundColor: theme.surface }]}>
          <View style={st.header}>
            <View style={{ flex: 1 }}>
              <Text style={[st.title, { color: theme.text }]}>{model.label}</Text>
              <View style={st.metaRow}>
                <Text style={[st.metaText, { color: theme.textSecondary }]}>
                  {AI_PROVIDER_LABELS[model.provider]}
                </Text>
                <View
                  style={[
                    st.tierChip,
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
                      st.tierText,
                      { color: model.tier === "paid" ? theme.accent : theme.primary },
                    ]}
                  >
                    {model.tier === "paid" ? "PAID" : "FREE"}
                  </Text>
                </View>
                {score != null && (
                  <View style={[st.ratingChip, { backgroundColor: theme.accent + "1A" }]}>
                    <MaterialCommunityIcons name="star" size={12} color={theme.accent} />
                    <Text style={[st.ratingText, { color: theme.accent }]}>{score}</Text>
                  </View>
                )}
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <MaterialIcons name="close" size={24} color={theme.textSecondary} />
            </Pressable>
          </View>

          {model.note ? (
            <Text style={[st.note, { color: theme.textMuted }]}>{model.note}</Text>
          ) : null}

          <View
            style={[st.ratingBlock, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
          >
            <View style={st.ratingHead}>
              <Text style={[st.ratingLabel, { color: theme.textSecondary }]}>Your rating</Text>
              {savingRating && <ActivityIndicator size="small" color={theme.textMuted} />}
              {justSavedRating && !savingRating && (
                <Text style={[st.ratingSaved, { color: theme.primary }]}>Saved</Text>
              )}
            </View>
            <View style={st.ratingRow}>
              <StarsRating
                value={myRating}
                onChange={handleRate}
                size={26}
                color={theme.accent}
                emptyColor={theme.border}
                disabled={savingRating}
              />
              {myRating != null && !savingRating && (
                <Pressable onPress={() => handleRate(0)} hitSlop={8}>
                  <Text style={[st.ratingClear, { color: theme.textMuted }]}>Clear</Text>
                </Pressable>
              )}
            </View>
            <Text style={[st.ratingHint, { color: theme.textMuted }]}>
              {myRating != null
                ? `Saved to your account · built-in: ${model.rating ?? "—"}/5`
                : `Built-in score: ${model.rating ?? "—"}/5`}
            </Text>
            {ratingStatus ? (
              <Text style={[st.ratingError, { color: theme.danger }]}>{ratingStatus}</Text>
            ) : null}
          </View>

          <Text style={[st.sectionLabel, { color: theme.textSecondary }]}>
            {isOffline ? "On this device" : "Required to run"}
          </Text>

          {isOffline ? (
            offlineReady === false ? (
              <View style={[st.warningBox, { backgroundColor: theme.accent + "14" }]}>
                <MaterialCommunityIcons
                  name="information-outline"
                  size={18}
                  color={theme.accent}
                />
                <Text style={[st.warningText, { color: theme.textSecondary }]}>
                  On-device AI isn&apos;t available in this build. Rebuild the
                  development build with the expo-ai-kit plugin once, then
                  download this model from Settings.
                </Text>
              </View>
            ) : (
              <>
                <View
                  style={[st.statusRow, { borderBottomColor: theme.border }]}
                >
                  <MaterialCommunityIcons
                    name="chip"
                    size={18}
                    color={
                      catalogModel ? theme.primary : theme.textMuted
                    }
                  />
                  <Text style={[st.statusLabel, { color: theme.text }]}>
                    On-device model
                  </Text>
                  <Text style={[st.statusValue, { color: theme.textSecondary }]}>
                    {thisInstalled
                      ? "Installed"
                      : thisDownloading
                        ? "Downloading…"
                        : offlineStatus === "error"
                          ? "Error"
                          : catalogModel
                            ? "Ready to download"
                            : "Not available"}
                  </Text>
                </View>

                {catalogModel && !catalogModel.meetsRequirements && (
                  <View style={[st.warningBox, { backgroundColor: theme.accent + "14" }]}>
                    <MaterialCommunityIcons
                      name="memory"
                      size={18}
                      color={theme.accent}
                    />
                    <Text style={[st.warningText, { color: theme.textSecondary }]}>
                      Needs ~{(catalogModel.minRamBytes / 1073741824).toFixed(1)} GB of
                      free RAM. This device may not run it reliably.
                    </Text>
                  </View>
                )}

                {thisDownloading && (
                  <View style={st.offlineProgressRow}>
                    <View style={st.offlineProgressTrack}>
                      <View
                        style={[
                          st.offlineProgressFill,
                          {
                            backgroundColor: theme.primary,
                            width: `${Math.max(4, Math.round(offlineProgress * 100))}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[st.offlineProgressText, { color: theme.textSecondary }]}>
                      {Math.round(offlineProgress * 100)}%
                    </Text>
                    <Pressable onPress={handleOfflineCancel} hitSlop={8}>
                      <Text style={[st.offlineCancel, { color: theme.danger }]}>Cancel</Text>
                    </Pressable>
                  </View>
                )}

                {offlineStatus === "error" && offlineError ? (
                  <Text style={[st.errorText, { color: theme.danger, marginTop: 10 }]}>
                    {offlineError}
                  </Text>
                ) : null}

                <View style={st.offlineActions}>
                  {thisInstalled ? (
                    <>
                      <Pressable
                        style={[st.deleteBtn, { borderColor: theme.border }]}
                        onPress={handleOfflineDelete}
                      >
                        <MaterialCommunityIcons
                          name="delete-outline"
                          size={16}
                          color={theme.danger}
                        />
                        <Text style={[st.deleteBtnText, { color: theme.danger }]}>
                          Delete
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[
                          st.offlinePrimaryBtn,
                          { backgroundColor: offlineBusy ? theme.border : theme.primary },
                        ]}
                        onPress={handleOfflineUse}
                        disabled={offlineBusy}
                      >
                        {offlineBusy ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <>
                            <MaterialCommunityIcons name="play" size={16} color="#FFF" />
                            <Text style={st.offlinePrimaryText}>Activate</Text>
                          </>
                        )}
                      </Pressable>
                    </>
                  ) : (
                    <Pressable
                      style={[
                        st.offlinePrimaryBtn,
                        {
                          backgroundColor:
                            offlineBusy || !catalogModel ? theme.border : theme.primary,
                        },
                      ]}
                      onPress={handleOfflineDownload}
                      disabled={offlineBusy || !catalogModel}
                    >
                      {offlineBusy ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <>
                          <MaterialCommunityIcons name="download" size={16} color="#FFF" />
                          <Text style={st.offlinePrimaryText}>
                            {catalogModel
                              ? `Download (${formatModelSize(catalogModel.sizeBytes)})`
                              : "Download"}
                          </Text>
                        </>
                      )}
                    </Pressable>
                  )}
                </View>

                {offlineMessage ? (
                  <Text style={[st.errorText, { color: theme.danger, marginTop: 10 }]}>
                    {offlineMessage}
                  </Text>
                ) : null}
              </>
            )
          ) : (
            <>
              <View
                style={[st.statusRow, { borderBottomColor: theme.border }]}
              >
                <MaterialCommunityIcons
                  name={serverReady ? "check-circle" : "server-off"}
                  size={18}
                  color={serverReady ? theme.primary : theme.textMuted}
                />
                <Text style={[st.statusLabel, { color: theme.text }]}>Server key</Text>
                <Text style={[st.statusValue, { color: theme.textSecondary }]}>
                  {serverReady ? "Configured on server" : "Not set on server"}
                </Text>
              </View>

              {!serverReady && (
                <View style={st.keySection}>
                  <Text style={[st.keySectionLabel, { color: theme.text }]}>
                    Your device key{" "}
                    <Text style={{ color: theme.textSecondary }}>
                      (supports OpenAI, Anthropic, OpenRouter, Gemini)
                    </Text>
                  </Text>

                  {hasOwnKey ? (
                    <View style={st.savedRow}>
                      <MaterialCommunityIcons
                        name="shield-check"
                        size={18}
                        color={theme.primary}
                      />
                      <Text style={[st.savedText, { color: theme.text }]}>
                        Key saved on this device
                      </Text>
                      <Pressable onPress={handleRemoveKey} hitSlop={8}>
                        <Text style={[st.removeText, { color: theme.danger }]}>
                          Remove
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}

                  <View style={st.keyInputRow}>
                    <TextInput
                      style={[
                        st.keyInput,
                        {
                          color: theme.text,
                          borderColor: theme.border,
                          backgroundColor: theme.surfaceAlt,
                        },
                      ]}
                      value={keyInput}
                      onChangeText={setKeyInput}
                      placeholder={`Paste your ${AI_PROVIDER_LABELS[model.provider]} API key`}
                      placeholderTextColor={theme.textMuted}
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!saving}
                    />
                    <Pressable
                      style={[st.saveBtn, { backgroundColor: theme.primary }]}
                      onPress={handleSaveKey}
                      disabled={saving}
                    >
                      {saving ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={st.saveBtnText}>Save</Text>
                      )}
                    </Pressable>
                  </View>

                  {saveError ? (
                    <Text style={[st.errorText, { color: theme.danger }]}>{saveError}</Text>
                  ) : null}
                </View>
              )}

              {needsKey ? (
                <View style={[st.warningBox, { backgroundColor: theme.accent + "14" }]}>
                  <MaterialCommunityIcons
                    name="alert-outline"
                    size={18}
                    color={theme.accent}
                  />
                  <Text style={[st.warningText, { color: theme.textSecondary }]}>
                    This provider has no key yet. Add yours above or configure it on
                    the server ({model.provider.toUpperCase()}_API_KEY) before using.
                  </Text>
                </View>
              ) : null}

              {statusUnknown ? (
                <View style={[st.warningBox, { backgroundColor: theme.surfaceAlt }]}>
                  <MaterialCommunityIcons
                    name="cloud-question"
                    size={18}
                    color={theme.textSecondary}
                  />
                  <Text style={[st.warningText, { color: theme.textSecondary }]}>
                    Cannot check the server key status right now. The app will use
                    the server key (if set) or your key saved on this device.
                  </Text>
                </View>
              ) : null}
            </>
          )}

          <View style={st.actions}>
            <Pressable
              style={[st.cancelBtn, { borderColor: theme.border }]}
              onPress={onClose}
            >
              <Text style={[st.cancelBtnText, { color: theme.textSecondary }]}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              style={[
                st.confirmBtn,
                {
                  backgroundColor: canSelect ? theme.primary : theme.border,
                },
              ]}
              onPress={() => onSelect(model.ref)}
              disabled={!canSelect}
            >
              <Text style={st.confirmBtnText}>
                {isOffline ? offlineConfirmLabel : canSelect ? "Use this model" : "Add a key first"}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const st = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 300,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 32,
    maxHeight: "88%",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  title: { fontSize: 18, fontWeight: "800", fontFamily },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  metaText: { fontSize: 12, fontWeight: "600", fontFamily },
  tierChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  tierText: { fontSize: 10, fontWeight: "700", fontFamily },
  ratingChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  ratingText: { fontSize: 10, fontWeight: "700", fontFamily },
  note: { fontSize: 13, fontFamily, marginBottom: 16 },
  ratingBlock: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  ratingHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  ratingLabel: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, flex: 1, fontFamily },
  ratingSaved: { fontSize: 12, fontWeight: "700", fontFamily },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  ratingClear: { fontSize: 13, fontWeight: "600", fontFamily },
  ratingHint: { fontSize: 12, marginTop: 8, fontFamily },
  ratingError: { fontSize: 12, marginTop: 6, fontFamily },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    fontFamily,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  statusLabel: { fontSize: 14, fontWeight: "600", flex: 1, fontFamily },
  statusValue: { fontSize: 13, fontFamily },
  keySection: { marginTop: 14 },
  keySectionLabel: { fontSize: 13, fontWeight: "600", marginBottom: 8, fontFamily },
  savedRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  savedText: { fontSize: 13, flex: 1, fontFamily },
  removeText: { fontSize: 13, fontWeight: "700", fontFamily },
  keyInputRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  keyInput: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    borderWidth: 1,
    fontFamily,
  },
  saveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 76,
    alignItems: "center",
  },
  saveBtnText: { color: "#FFF", fontSize: 14, fontWeight: "800", fontFamily },
  errorText: { fontSize: 12, marginTop: 8, fontFamily },
  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
  warningText: { fontSize: 12, flex: 1, fontFamily },
  actions: { flexDirection: "row", gap: 10, marginTop: 20 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  cancelBtnText: { fontSize: 15, fontWeight: "700", fontFamily },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  confirmBtnText: { color: "#FFF", fontSize: 15, fontWeight: "800", fontFamily },
  offlineProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
  },
  offlineProgressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF22",
    overflow: "hidden",
  },
  offlineProgressFill: { height: 8, borderRadius: 4 },
  offlineProgressText: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily,
    minWidth: 36,
    textAlign: "right",
  },
  offlineCancel: { fontSize: 13, fontWeight: "700", fontFamily },
  offlineActions: { flexDirection: "row", gap: 10, marginTop: 14 },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  deleteBtnText: { fontSize: 13, fontWeight: "700", fontFamily },
  offlinePrimaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    paddingVertical: 10,
  },
  offlinePrimaryText: { color: "#FFF", fontSize: 14, fontWeight: "800", fontFamily },
});