import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import type { DownloadableModel } from "expo-ai-kit";
import { useThemeColors } from "../hooks/useTheme";
import { fontFamily } from "../constants/themes";
import { useModelStore } from "../store/modelStore";
import { useOfflineStore } from "../store/offlineStore";
import { AI_MODEL_DEFAULT } from "../lib/providers/modelRegistry";
import {
  deleteOfflineModel,
  downloadOfflineModel,
  ensureOfflineActivated,
  formatModelSize,
  getOfflineCatalog,
  getRecommendedOfflineModel,
  modelErrorMessage,
  offlineSupported,
} from "../lib/providers/offline";

function statusLabel(status: string): string {
  switch (status) {
    case "ready":
      return "Ready";
    case "downloaded":
      return "Downloaded";
    case "downloading":
      return "Downloading…";
    case "error":
      return "Error";
    default:
      return "Not installed";
  }
}

export default function OfflineAICard() {
  const theme = useThemeColors();
  const offline = useOfflineStore();
  const { selectedModel, setSelectedModel } = useModelStore();

  const [supported, setSupported] = useState<boolean | null>(null);
  const [catalog, setCatalog] = useState<DownloadableModel[]>([]);
  const [busy, setBusy] = useState(false);

  const selectedRef = useCallback(
    (id: string) => `offline::${id}`,
    [],
  );

  const refresh = useCallback(async () => {
    const ok = await offlineSupported();
    setSupported(ok);
    if (!ok) {
      setCatalog([]);
      return;
    }
    const models = await getOfflineCatalog();
    setCatalog(models);
    const ready = models.find((m) => m.status === "ready");
    const downloaded = ready ?? models.find((m) => m.status === "downloaded");
    if (downloaded) {
      const state = useOfflineStore.getState();
      if (state.status !== "downloading") {
        if (ready) {
          useOfflineStore.getState().setReady(downloaded.id);
        } else {
          useOfflineStore.getState().setDownloaded(downloaded.id);
        }
      }
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const targetModel =
    catalog.find((m) => m.id === offline.downloadedId) ??
    catalog.find((m) => m.id === selectedModel.split("::").pop()) ??
    catalog[0];

  const isActive = Boolean(
    targetModel && selectedModel === selectedRef(targetModel.id),
  );

  const handleDownload = async (model: DownloadableModel) => {
    setBusy(true);
    useOfflineStore.getState().setDownloading(model.id);
    try {
      await downloadOfflineModel(model.id, (p) =>
        useOfflineStore.getState().setProgress(model.id, p),
      );
      useOfflineStore.getState().setDownloaded(model.id);
    } catch (err) {
      useOfflineStore.getState().setError(modelErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (offline.downloadedId) {
      await cancelDownloadIgnoringErrors(offline.downloadedId);
    }
    useOfflineStore.getState().setNone();
  };

  const handleDelete = (model: DownloadableModel) => {
    Alert.alert("Delete Model", `Remove "${model.name}" from this device?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteOfflineModel(model.id);
          } finally {
            if (selectedModel === selectedRef(model.id)) {
              setSelectedModel(AI_MODEL_DEFAULT);
            }
            useOfflineStore.getState().setNone();
            refresh();
          }
        },
      },
    ]);
  };

  const handleUse = async (model: DownloadableModel) => {
    const ref = selectedRef(model.id);
    setSelectedModel(ref);
    setBusy(true);
    try {
      await ensureOfflineActivated(ref);
      useOfflineStore.getState().setReady(model.id);
    } catch (err) {
      useOfflineStore.getState().setError(modelErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const renderUnavailable = (
    <View style={styles.unavailableRow}>
      <MaterialCommunityIcons
        name="information-outline"
        size={22}
        color={theme.textSecondary}
      />
      <View style={styles.unavailableTextWrap}>
        <Text style={[styles.unavailableTitle, { color: theme.text }]}>
          Not available in this build
        </Text>
        <Text style={[styles.unavailableText, { color: theme.textSecondary }]}>
          On-device AI needs a development build with the expo-ai-kit plugin.
          Rebuild with{" "}
          <Text style={{ fontWeight: "700" }}>npx expo run:android</Text> (or
          iOS) once, then download a model here.
        </Text>
      </View>
    </View>
  );

  const renderChecking = (
    <View style={styles.checkingRow}>
      <ActivityIndicator size="small" color={theme.primary} />
      <Text style={[styles.checkingText, { color: theme.textSecondary }]}>
        Checking on-device AI…
      </Text>
    </View>
  );

  const renderModel = (model: DownloadableModel) => {
    const downloading = offline.status === "downloading" && offline.downloadedId === model.id;
    const installed =
      offline.status === "downloaded" || offline.status === "ready";

    return (
      <View
        style={[
          styles.modelBlock,
          { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
        ]}
      >
        <View style={styles.modelHead}>
          <View style={styles.modelTitleWrap}>
            <Text style={[styles.modelName, { color: theme.text }]}>
              {model.name}
            </Text>
            <Text style={[styles.modelMeta, { color: theme.textSecondary }]}>
              {formatModelSize(model.sizeBytes)} · {model.license}
            </Text>
          </View>
          <View
            style={[
              styles.statusChip,
              {
                backgroundColor:
                  offline.status === "error"
                    ? theme.danger + "20"
                    : installed
                      ? theme.primary + "20"
                      : theme.border + "40",
              },
            ]}
          >
            <Text
              style={[
                styles.statusChipText,
                {
                  color:
                    offline.status === "error"
                      ? theme.danger
                      : installed
                        ? theme.primary
                        : theme.textSecondary,
                },
              ]}
            >
              {offline.status === "error" ? "Error" : statusLabel(offline.status)}
            </Text>
          </View>
        </View>

        {!model.meetsRequirements && (
          <View style={[styles.ramWarning, { backgroundColor: theme.accent + "14" }]}>
            <MaterialCommunityIcons name="memory" size={14} color={theme.accent} />
            <Text style={[styles.ramWarningText, { color: theme.textSecondary }]}>
              Needs ~{(model.minRamBytes / 1_073_741_824).toFixed(1)} GB RAM.
              This device may not run it reliably.
            </Text>
          </View>
        )}

        {offline.status === "error" && offline.error ? (
          <Text style={[styles.errorText, { color: theme.danger }]}>{offline.error}</Text>
        ) : null}

        {downloading ? (
          <View style={styles.downloadRow}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: theme.primary, width: `${Math.max(4, Math.round(offline.progress * 100))}%` },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: theme.textSecondary }]}>
              {Math.round(offline.progress * 100)}%
            </Text>
            <Pressable onPress={handleCancel} hitSlop={8}>
              <Text style={[styles.cancelText, { color: theme.danger }]}>Cancel</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.modelActions}>
            {installed ? (
              <>
                <Pressable
                  style={[
                    styles.deleteBtn,
                    { borderColor: theme.border },
                  ]}
                  onPress={() => handleDelete(model)}
                >
                  <MaterialCommunityIcons name="delete-outline" size={16} color={theme.danger} />
                  <Text style={[styles.deleteBtnText, { color: theme.danger }]}>Delete</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.useBtn,
                    { backgroundColor: isActive ? theme.border : theme.primary },
                  ]}
                  onPress={() => handleUse(model)}
                  disabled={isActive}
                >
                  <MaterialCommunityIcons
                    name={isActive ? "check" : "play"}
                    size={16}
                    color="#FFFFFF"
                  />
                  <Text style={styles.useBtnText}>
                    {isActive ? "Active model" : "Use on-device"}
                  </Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                style={[
                  styles.downloadBtn,
                  { backgroundColor: busy ? theme.border : theme.primary },
                ]}
                onPress={() => handleDownload(model)}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <MaterialCommunityIcons name="download" size={16} color="#FFFFFF" />
                )}
                <Text style={styles.downloadBtnText}>
                  {busy ? "Starting…" : `Download (${formatModelSize(model.sizeBytes)})`}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.subRow}>
        <MaterialCommunityIcons name="chip" size={16} color={theme.primary} />
        <Text style={[styles.subText, { color: theme.textSecondary }]}>
          Run Yuinx on your device — no internet needed once a model is
          installed. Notes copilot, Study chat, quizzes, flashcards & cheat
          sheets work offline; course, bounty & subtopic generation fall back
          to your cloud model.
        </Text>
      </View>

      {supported === null
        ? renderChecking
        : supported === false
          ? renderUnavailable
          : catalog.length === 0
            ? renderUnavailable
            : renderModel(targetModel ?? catalog[0])}

      {supported === true && catalog.length > 0 && (
        <View style={styles.disclaimerRow}>
          <MaterialCommunityIcons
            name="shield-check-outline"
            size={14}
            color={theme.textMuted}
          />
          <Text style={[styles.disclaimerText, { color: theme.textMuted }]}>
            Files download only to this device. Runs on {formatModelSize((targetModel ?? catalog[0]).sizeBytes)} locally — your content
            never leaves your phone.
          </Text>
        </View>
      )}
    </View>
  );
}

async function cancelDownloadIgnoringErrors(id: string): Promise<void> {
  try {
    const { cancelOfflineDownload } = await import("../lib/providers/offline");
    await cancelOfflineDownload(id);
  } catch {
    // ignored
  }
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  subRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  subText: { flex: 1, fontSize: 12, lineHeight: 17, fontFamily },
  checkingRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  checkingText: { fontSize: 13, fontFamily },
  unavailableRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  unavailableTextWrap: { flex: 1 },
  unavailableTitle: { fontSize: 14, fontWeight: "700", fontFamily, marginBottom: 2 },
  unavailableText: { fontSize: 12, lineHeight: 17, fontFamily },
  modelBlock: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  modelHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  modelTitleWrap: { flex: 1 },
  modelName: { fontSize: 15, fontWeight: "700", fontFamily },
  modelMeta: { fontSize: 12, marginTop: 2, fontFamily },
  statusChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statusChipText: { fontSize: 11, fontWeight: "800", fontFamily },
  ramWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  ramWarningText: { flex: 1, fontSize: 11, lineHeight: 15, fontFamily },
  errorText: { fontSize: 12, fontFamily },
  downloadRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF22",
    overflow: "hidden",
  },
  progressFill: { height: 8, borderRadius: 4 },
  progressText: { fontSize: 12, fontWeight: "700", fontFamily, minWidth: 36, textAlign: "right" },
  cancelText: { fontSize: 13, fontWeight: "700", fontFamily },
  modelActions: { flexDirection: "row", gap: 10 },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deleteBtnText: { fontSize: 13, fontWeight: "700", fontFamily },
  useBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    paddingVertical: 9,
  },
  useBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800", fontFamily },
  downloadBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    paddingVertical: 9,
  },
  downloadBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800", fontFamily },
  disclaimerRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  disclaimerText: { flex: 1, fontSize: 11, lineHeight: 15, fontFamily },
});