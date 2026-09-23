import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import StudyMaterialCard from "../../component/StudyMaterialCard";
import StudyUploadSheet from "../../component/StudyUploadSheet";
import ErrorBoundary from "../../component/ErrorBoundary";
import ScreenContainer from "../../component/ScreenContainer";
import { useThemeColors } from "../../hooks/useTheme";
import { useAuth } from "../../contexts/AuthContext";
import { fontFamily } from "../../constants/themes";
import { useStudyStore } from "../../store/studyStore";
import { api } from "../../lib/api";
import { uploadImage } from "../../lib/cloudinary";
import { uploadFile } from "../../lib/uploadFile";
import { requestStudyAccess } from "../../lib/studyPermissions";
import type { QuizAttempt, StudyMaterial } from "../../types/study";

export default function StudyScreen() {
  const { profile, getToken } = useAuth();
  const theme = useThemeColors();
  const router = useRouter();
  const materials = useStudyStore((s) => s.materials);
  const fetchMaterials = useStudyStore((s) => s.fetchMaterials);
  const processMaterial = useStudyStore((s) => s.processMaterial);
  const processing = useStudyStore((s) => s.processing);
  const loading = useStudyStore((s) => s.loading);
  const error = useStudyStore((s) => s.error);
  const clearError = useStudyStore((s) => s.clearError);

  const [showUpload, setShowUpload] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);

  const loadAttempts = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    try {
      const rows = await api.study.getAttempts(token);
      setAttempts(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.error("[StudyScreen] loadAttempts failed:", err);
    }
  }, [getToken]);

  useFocusEffect(
    useCallback(() => {
      if (profile) {
        fetchMaterials(profile.uid, getToken);
      }
      loadAttempts();
    }, [profile, getToken, fetchMaterials, loadAttempts]),
  );

  const onRefresh = useCallback(async () => {
    if (!profile) return;
    setRefreshing(true);
    await Promise.all([
      fetchMaterials(profile.uid, getToken),
      loadAttempts(),
    ]);
    setRefreshing(false);
  }, [profile, getToken, fetchMaterials, loadAttempts]);

  const handleProcess = async (fileUri: string, fileType: string, sourceType: string, mimeType?: string) => {
    try {
      const isImage = fileType === "image" || !mimeType || mimeType.startsWith("image/");
      let filename = `upload.${fileType}`;
      if (mimeType?.startsWith("audio/")) {
        const ext = mimeType === "audio/wav" ? "wav" : mimeType === "audio/mpeg" ? "mp3" : "m4a";
        filename = `lecture.${ext}`;
      }
      const url = isImage
        ? await uploadImage(fileUri, getToken)
        : await uploadFile(fileUri, filename, mimeType || "application/octet-stream", getToken);
      await processMaterial({ fileUrl: url, fileType, sourceType }, getToken);
    } catch (err: any) {
      console.error("[StudyScreen] upload failed:", { fileUri, fileType, sourceType, mimeType }, err);
      Alert.alert("Upload Failed", err.message || "Could not upload file.");
    }
  };

  const handleCamera = async () => {
    const granted = await requestStudyAccess("camera");
    if (!granted) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.7,
      allowsMultipleSelection: true,
    });
    if (!result.canceled && result.assets?.length > 0) {
      for (const asset of result.assets) {
        await handleProcess(asset.uri, "image", "camera");
      }
    }
  };

  const handleGallery = async () => {
    const granted = await requestStudyAccess("gallery");
    if (!granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.7,
      allowsMultipleSelection: true,
    });
    if (!result.canceled && result.assets?.length > 0) {
      for (const asset of result.assets) {
        await handleProcess(asset.uri, "image", "gallery");
      }
    }
  };

  const handleFile = async (uri: string, mimeType: string) => {
    let fileType = "txt";
    if (mimeType.includes("pdf")) fileType = "pdf";
    else if (mimeType.includes("word") || mimeType.includes("document")) fileType = "doc";
    else if (mimeType.includes("text")) fileType = "txt";
    else if (mimeType.includes("image")) fileType = "image";
    else if (mimeType.includes("audio")) fileType = "audio";

    handleProcess(uri, fileType, "file", mimeType);
  };

  const handleDelete = (id: string) => {
    getToken().then((token) => {
      if (token) {
        useStudyStore.getState().deleteMaterial(id, token);
      }
    });
  };

  const renderItem = ({ item }: { item: StudyMaterial }) => {
    const isProcessing = item.id.startsWith("processing_");
    return (
      <StudyMaterialCard
        material={item}
        processing={isProcessing}
        onPress={() => {
          if (!isProcessing) {
            router.push(`/(study)/${item.id}`);
          }
        }}
        onDelete={() => handleDelete(item.id)}
      />
    );
  };

  return (
    <ErrorBoundary>
      <ScreenContainer>
        <FlatList
          data={materials}
          keyExtractor={(item: StudyMaterial) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
          }
          ListHeaderComponent={
            <View>
              <View style={styles.headerRow}>
                <Text style={[styles.title, { color: theme.text }]}>Study Materials</Text>
                <TouchableOpacity
                  style={[styles.addBtn, { backgroundColor: theme.primary }]}
                  onPress={() => setShowUpload(true)}
                >
                  <Ionicons name="add" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Upload notes, timetables, PDFs — Yuinx will turn them into study bites
              </Text>
              {attempts.length > 0 && (
                <View
                  style={[
                    styles.scoresCard,
                    { backgroundColor: theme.surface, borderColor: theme.border },
                  ]}
                >
                  <Text style={[styles.scoresTitle, { color: theme.textSecondary }]}>
                    Recent scores
                  </Text>
                  {attempts.slice(0, 3).map((a) => (
                    <View key={a.id} style={styles.scoreRow}>
                      <View style={{ flex: 1 }}>
                        <Text
                          numberOfLines={1}
                          style={[styles.scoreMaterial, { color: theme.text }]}
                        >
                          {a.materialTitle}
                        </Text>
                        <Text style={[styles.scoreDate, { color: theme.textMuted }]}>
                          {new Date(a.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                      <Text style={[styles.scorePct, { color: theme.primary }]}>
                        {a.scorePct}%
                      </Text>
                      {a.awardedXp > 0 && (
                        <Text style={[styles.scoreXp, { color: theme.success }]}>
                          +{a.awardedXp}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyState}>
                <Ionicons name="library-outline" size={64} color={theme.textMuted} />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  No study materials yet.
                </Text>
                <Text style={[styles.emptySubtext, { color: theme.textMuted }]}>
                  Tap + to upload a document, photo, or timetable
                </Text>
              </View>
            ) : (
              <View style={styles.loadingState}>
                <ActivityIndicator size="large" color={theme.primary} />
              </View>
            )
          }
          ListFooterComponent={<View style={{ height: 40 }} />}
        />

        {processing && (
          <View style={[styles.processingBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={[styles.processingText, { color: theme.textSecondary }]}>
              Processing with Gemini...
            </Text>
          </View>
        )}

        {error && (
          <View style={[styles.errorBanner, { backgroundColor: theme.danger + "15", borderColor: theme.danger }]}>
            <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
            <TouchableOpacity onPress={clearError}>
              <Ionicons name="close" size={18} color={theme.danger} />
            </TouchableOpacity>
          </View>
        )}

        <StudyUploadSheet
          visible={showUpload}
          onClose={() => setShowUpload(false)}
          onCamera={handleCamera}
          onGallery={handleGallery}
          onFile={(result) => {
            for (const asset of result.assets ?? []) {
              handleFile(asset.uri, asset.mimeType || "text/plain");
            }
          }}
        />
      </ScreenContainer>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingBottom: 40 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    fontFamily,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  subtitle: {
    fontSize: 13,
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 8,
    lineHeight: 18,
  },
  scoresCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  scoresTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  scoreMaterial: {
    fontSize: 13,
    fontWeight: "600",
  },
  scoreDate: {
    fontSize: 11,
  },
  scorePct: {
    fontSize: 15,
    fontWeight: "800",
  },
  scoreXp: {
    fontSize: 12,
    fontWeight: "800",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  loadingState: {
    paddingVertical: 60,
    alignItems: "center",
  },
  processingBar: {
    position: "absolute",
    bottom: 100,
    left: 20,
    right: 20,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  processingText: {
    fontSize: 13,
    fontWeight: "600",
  },
  errorBanner: {
    position: "absolute",
    bottom: 100,
    left: 20,
    right: 20,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  errorText: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
});
