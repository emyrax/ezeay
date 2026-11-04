import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { safeFont } from "../constants/themes";
import { useAuth } from "../contexts/AuthContext";
import { useThemeColors } from "../hooks/useTheme";
import { api } from "../lib/api";
import { uploadImage } from "../lib/cloudinary";
import {
  MAX_THREAD_ATTACHMENT_BYTES,
  exceedsThreadAttachmentLimit,
  formatFileSize,
} from "../lib/uploadLimits";
import { uploadFile } from "../lib/uploadFile";
import type { ExploreResourcePost, ReelHookMeta, ResourceType } from "../types/community";

interface ResourceUploadSheetProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (post: ExploreResourcePost) => void;
}

const RESOURCE_TYPES: {
  type: ResourceType;
  label: string;
  icon: string;
  desc: string;
  proOnly?: boolean;
}[] = [
  { type: "handwritten", label: "Handwritten", icon: "draw", desc: "Notes, formulas, sketches" },
  { type: "pdf", label: "PDF Document", icon: "file-pdf-box", desc: "Cheatsheets, guides, papers" },
  { type: "image", label: "Image / Diagram", icon: "image", desc: "Infographics, mind maps" },
  { type: "text", label: "Text / Summary", icon: "file-document-outline", desc: "Excerpts, outlines, notes" },
  { type: "audio", label: "Audio Lecture", icon: "file-music", desc: "Recorded lectures and audio notes", proOnly: true },
  { type: "other", label: "Other File", icon: "folder-open-outline", desc: "Presentations, data, code" },
];

export default function ResourceUploadSheet({ visible, onClose, onSuccess }: ResourceUploadSheetProps) {
  const theme = useThemeColors();
  const { getToken, profile } = useAuth();
  const isPro = profile?.isPro ?? false;
  const resourceTypes = RESOURCE_TYPES.filter((item) => !item.proOnly || isPro);

  const [resourceType, setResourceType] = useState<ResourceType>("handwritten");
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [fileSize, setFileSize] = useState<number>(0);
  const [mimeType, setMimeType] = useState<string>("application/octet-stream");

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [hook, setHook] = useState("");

  const [generatingChallenge, setGeneratingChallenge] = useState(false);
  const [challengePreview, setChallengePreview] = useState<ReelHookMeta | null>(null);
  const [publishing, setPublishing] = useState(false);

  const buzz = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, []);

  const clearFile = () => {
    setFileUri(null);
    setFileName("");
    setFileSize(0);
    setMimeType("application/octet-stream");
  };

  const selectResourceType = (type: ResourceType) => {
    if (type !== resourceType) clearFile();
    setResourceType(type);
  };

  const resetForm = () => {
    clearFile();
    setTitle("");
    setSummary("");
    setHook("");
    setChallengePreview(null);
    setGeneratingChallenge(false);
    setPublishing(false);
  };

  const handleClose = () => {
    if (publishing) return;
    resetForm();
    onClose();
  };

  const handlePickDocument = async () => {
    buzz();
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: resourceType === "audio" ? ["audio/*"] : ["*/*"],
        copyToCacheDirectory: true,
      });

      if (res.canceled || !res.assets || res.assets.length === 0) return;
      const asset = res.assets[0];

      if (asset.size && exceedsThreadAttachmentLimit(asset.size)) {
        Alert.alert(
          "File Too Large",
          `Maximum supported file size is ${formatFileSize(MAX_THREAD_ATTACHMENT_BYTES)}.`,
        );
        return;
      }
      if (asset.size === 0) {
        Alert.alert("Empty File", "The selected file is empty. Please pick a valid file.");
        return;
      }

      setFileUri(asset.uri);
      setFileName(asset.name || "upload");
      setFileSize(asset.size || 1024);
      setMimeType(asset.mimeType || "application/octet-stream");
      if (!title) {
        const cleanName = (asset.name || "")
          .replace(/\.[^/.]+$/, "")
          .replace(/[-_]/g, " ")
          .trim();
        if (cleanName) setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }
    } catch (err: any) {
      console.error("[ResourceUpload] Doc picker error:", err);
      Alert.alert("Picker Error", "Failed to choose file.");
    }
  };

  const handlePickImage = async () => {
    buzz();
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.85,
      });

      if (res.canceled || !res.assets || res.assets.length === 0) return;
      const asset = res.assets[0];

      if (asset.fileSize && exceedsThreadAttachmentLimit(asset.fileSize)) {
        Alert.alert(
          "Image Too Large",
          `Maximum supported size is ${formatFileSize(MAX_THREAD_ATTACHMENT_BYTES)}.`,
        );
        return;
      }

      setFileUri(asset.uri);
      setFileName(asset.fileName || `image_${Date.now()}.jpg`);
      setFileSize(asset.fileSize || 100_000);
      setMimeType(asset.mimeType || "image/jpeg");
    } catch (err: any) {
      console.error("[ResourceUpload] Image picker error:", err);
      Alert.alert("Picker Error", "Failed to choose image.");
    }
  };

  const handleGenerateChallenge = async () => {
    if (!title.trim() || !summary.trim()) {
      Alert.alert("Missing Information", "Please enter a title and brief summary first.");
      return;
    }
    buzz();
    setGeneratingChallenge(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not signed in");
      const generated = await api.community.resources.generateChallenge(
        {
          title: title.trim(),
          summary: summary.trim(),
          resourceType,
        },
        token,
      );
      setChallengePreview(generated);
      if (!hook.trim() && generated.hook) {
        setHook(generated.hook);
      }
    } catch (err: any) {
      console.error("[ResourceUpload] Challenge generation failed:", err);
      Alert.alert("Challenge Preview", "Couldn't generate a challenge preview right now, but you can still publish!");
    } finally {
      setGeneratingChallenge(false);
    }
  };

  const handlePublish = async () => {
    const isTextResource = resourceType === "text";
    if (!fileUri && !isTextResource) {
      Alert.alert("No File Selected", "Please select a file or image to share.");
      return;
    }
    if (fileUri && exceedsThreadAttachmentLimit(fileSize)) {
      Alert.alert(
        "File Too Large",
        `Thread attachments are limited to ${formatFileSize(MAX_THREAD_ATTACHMENT_BYTES)}.`,
      );
      return;
    }
    if (!title.trim()) {
      Alert.alert("Title Required", "Please give this resource a title.");
      return;
    }
    if (!summary.trim()) {
      Alert.alert("Summary Required", "Please provide a 1-2 sentence summary of what learners will get.");
      return;
    }

    buzz();
    setPublishing(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");

      // 1. Upload file (text resources can publish from the summary alone)
      let storageUrl = "";
      const isImg =
        !!fileUri &&
        (mimeType.startsWith("image/") ||
          resourceType === "image" ||
          resourceType === "handwritten");
      if (fileUri) {
        if (isImg) {
          try {
            storageUrl = await uploadImage(fileUri, getToken, { endpoint: "/api/community/thread-uploads/image" });
          } catch {
            storageUrl = await uploadFile(
              fileUri,
              fileName || "resource.jpg",
              mimeType,
              getToken,
              { endpoint: "/api/community/thread-uploads" },
            );
          }
        } else {
          storageUrl = await uploadFile(
            fileUri,
            fileName || (resourceType === "audio" ? "lecture.m4a" : "resource.pdf"),
            mimeType,
            getToken,
            { endpoint: "/api/community/thread-uploads" },
          );
        }
      }

      // 2. Generate challenge if not already generated
      let challengeData = challengePreview;
      if (!challengeData) {
        try {
          challengeData = await api.community.resources.generateChallenge(
            {
              title: title.trim(),
              summary: summary.trim(),
              resourceType,
            },
            token,
          );
        } catch {
          challengeData = {
            hook: hook.trim() || `Master ${title.trim()}`,
            hookTone: "curious",
            challengeType: "multiple-choice",
            challengePrompt: "What is the key insight of this resource?",
            challengeOptions: ["Core conceptual pattern", "Passive memorization", "Trial and error"],
            correctChoiceIndex: 0,
            revealText: summary.trim() || "Studying peer insights reinforces memory retention.",
            shareCopy: `Discovered a great study resource on Yuinx: ${title.trim()}!`,
            xpReward: 20,
          };
        }
      }

      // 3. Post to community
      const payload = {
        title: title.trim(),
        summary: summary.trim(),
        hook: hook.trim() || challengeData?.hook || `Master ${title.trim()}`,
        challengeType: challengeData?.challengeType || "multiple-choice",
        challengePrompt: challengeData?.challengePrompt || "What is the core takeaway?",
        challengeOptions: challengeData?.challengeOptions || ["Focus on principles", "Memorize raw answers"],
        correctChoiceIndex: challengeData?.correctChoiceIndex ?? 0,
        revealText: challengeData?.revealText || summary.trim(),
        shareCopy: challengeData?.shareCopy || `Check out ${title.trim()} on Yuinx!`,
        resourceType,
        fileName: fileName || (isTextResource ? "text-note" : "resource"),
        fileSizeBytes: fileSize,
        mimeType: isTextResource && !fileUri ? "text/plain" : mimeType,
        storageUrl,
        previewUrl: isImg && storageUrl ? storageUrl : undefined,
        previewText: summary.trim(),
        tags: [resourceType, "peer-resource"],
        difficulty: "All Levels",
      };

      const res = await api.community.resources.create(payload, token);
      buzz();
      Alert.alert("Published!", "Your resource is now live on the Threads feed.", [
        {
          text: "View in Threads",
          onPress: () => {
            onSuccess(res.post);
            handleClose();
          },
        },
      ]);
    } catch (err: any) {
      console.error("[ResourceUpload] Publish failed:", err);
      Alert.alert("Upload Failed", err.message || "Failed to publish resource. Please try again.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalOverlay}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={[styles.sheetContainer, { backgroundColor: theme.surface }]}>
          <View style={[styles.handleBar, { backgroundColor: theme.border }]} />

          {/* Header */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>Share Resource</Text>
              <Text style={[styles.sheetSubtitle, { color: theme.textSecondary }]}>
                Publish notes, PDFs & challenges to Threads
              </Text>
            </View>
            <Pressable onPress={handleClose} hitSlop={12} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={theme.textMuted} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Step 1: Resource Type */}
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Resource Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeRow}>
              {resourceTypes.map((item) => {
                const isSelected = resourceType === item.type;
                return (
                  <Pressable
                    key={item.type}
                    onPress={() => {
                      buzz();
                      selectResourceType(item.type);
                    }}
                    style={[
                      styles.typeChip,
                      {
                        backgroundColor: isSelected ? theme.primary + "22" : theme.surfaceAlt,
                        borderColor: isSelected ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={item.icon as any}
                      size={18}
                      color={isSelected ? theme.primary : theme.textMuted}
                    />
                    <Text
                      style={[
                        styles.typeLabel,
                        { color: isSelected ? theme.primary : theme.text, fontWeight: isSelected ? "700" : "500" },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Step 2: File Picker */}
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
              {resourceType === "text"
                ? `Optional File (< ${formatFileSize(MAX_THREAD_ATTACHMENT_BYTES)})`
                : `Upload File (< ${formatFileSize(MAX_THREAD_ATTACHMENT_BYTES)})`}
            </Text>
            <Text style={[styles.helperText, { color: theme.textMuted }]}>
              Attachments are limited to 5 MB. Audio lectures require Pro.
            </Text>
            {fileUri ? (
              <View style={[styles.fileCard, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
                <View style={[styles.fileIconWrap, { backgroundColor: theme.primary + "18" }]}>
                  <MaterialCommunityIcons
                    name={
                      resourceType === "pdf"
                        ? "file-pdf-box"
                        : resourceType === "image" || resourceType === "handwritten"
                          ? "image"
                          : resourceType === "audio"
                            ? "file-music"
                            : "file-document"
                    }
                    size={28}
                    color={theme.primary}
                  />
                </View>
                <View style={styles.fileMeta}>
                  <Text style={[styles.fileName, { color: theme.text }]} numberOfLines={1}>
                    {fileName}
                  </Text>
                  <Text style={[styles.fileSub, { color: theme.textMuted }]}>
                    {formatFileSize(fileSize)} · {mimeType.split("/")[1] || "file"}
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    buzz();
                    clearFile();
                  }}
                  hitSlop={10}
                  style={styles.removeFileBtn}
                >
                  <Ionicons name="trash-outline" size={18} color="#FF5252" />
                </Pressable>
              </View>
            ) : (
              <View style={styles.pickButtonRow}>
                <Pressable
                  onPress={resourceType === "image" || resourceType === "handwritten" ? handlePickImage : handlePickDocument}
                  style={[styles.pickerActionBtn, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
                >
                  <Ionicons
                    name={
                      resourceType === "image" || resourceType === "handwritten"
                        ? "images-outline"
                        : "document-attach-outline"
                    }
                    size={22}
                    color={theme.primary}
                  />
                  <Text style={[styles.pickerActionText, { color: theme.text }]}>
                    {resourceType === "image" || resourceType === "handwritten"
                      ? "Choose Photo or Note"
                      : resourceType === "audio"
                        ? "Choose Audio File"
                        : "Choose Document / PDF"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handlePickDocument}
                  style={[styles.pickerSecondaryBtn, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
                >
                  <Ionicons name="folder-outline" size={18} color={theme.textMuted} />
                  <Text style={[styles.pickerSecondaryText, { color: theme.textSecondary }]}>Browse Files</Text>
                </Pressable>
              </View>
            )}

            {/* Step 3: Title and Summary */}
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Resource Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Master Calculus in 10 Formulas"
              placeholderTextColor={theme.textMuted}
              style={[
                styles.input,
                { backgroundColor: theme.surfaceAlt, color: theme.text, borderColor: theme.border },
              ]}
              maxLength={120}
            />

            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Brief Summary</Text>
            <TextInput
              value={summary}
              onChangeText={setSummary}
              placeholder="What makes this resource helpful? (2-3 sentences)"
              placeholderTextColor={theme.textMuted}
              style={[
                styles.textArea,
                { backgroundColor: theme.surfaceAlt, color: theme.text, borderColor: theme.border },
              ]}
              multiline
              numberOfLines={3}
              maxLength={300}
            />

            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
              Curiosity Hook (Optional)
            </Text>
            <TextInput
              value={hook}
              onChangeText={setHook}
              placeholder="e.g. The 1 theorem everyone forgets on finals"
              placeholderTextColor={theme.textMuted}
              style={[
                styles.input,
                { backgroundColor: theme.surfaceAlt, color: theme.text, borderColor: theme.border },
              ]}
              maxLength={140}
            />

            {/* Step 4: AI Challenge Generator */}
            <View style={styles.challengeActionRow}>
              <Pressable
                onPress={handleGenerateChallenge}
                disabled={generatingChallenge || !title.trim() || !summary.trim()}
                style={[
                  styles.challengeGenBtn,
                  {
                    backgroundColor: theme.surfaceAlt,
                    borderColor: theme.primary,
                    opacity: !title.trim() || !summary.trim() ? 0.4 : 1,
                  },
                ]}
              >
                {generatingChallenge ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <MaterialCommunityIcons name="lightning-bolt" size={18} color={theme.primary} />
                )}
                <Text style={[styles.challengeGenText, { color: theme.primary }]}>
                  {generatingChallenge ? "Generating Challenge..." : "Preview AI Retention Challenge"}
                </Text>
              </Pressable>
            </View>

            {challengePreview && (
              <View style={[styles.previewCard, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
                <View style={styles.previewHeader}>
                  <Text style={[styles.previewBadge, { color: theme.primary }]}>AI CHALLENGE PAYOFF</Text>
                  <Text style={[styles.previewTone, { color: theme.textMuted }]}>
                    {challengePreview.hookTone?.toUpperCase() || "CURIOUS"}
                  </Text>
                </View>
                <Text style={[styles.previewPrompt, { color: theme.text }]}>
                  {challengePreview.challengePrompt}
                </Text>
                <View style={styles.previewOptions}>
                  {challengePreview.challengeOptions?.map((opt, i) => (
                    <View
                      key={opt}
                      style={[
                        styles.previewOptionChip,
                        {
                          backgroundColor:
                            i === challengePreview.correctChoiceIndex
                              ? theme.primary + "18"
                              : "rgba(255,255,255,0.03)",
                          borderColor:
                            i === challengePreview.correctChoiceIndex ? theme.primary : theme.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.previewOptionText,
                          {
                            color:
                              i === challengePreview.correctChoiceIndex ? theme.primary : theme.textSecondary,
                          },
                        ]}
                      >
                        {opt} {i === challengePreview.correctChoiceIndex ? "✓ (Correct)" : ""}
                      </Text>
                    </View>
                  ))}
                </View>
                {challengePreview.revealText && (
                  <Text style={[styles.previewReveal, { color: theme.textMuted }]}>
                    Insight: {challengePreview.revealText}
                  </Text>
                )}
              </View>
            )}

            {/* Step 5: Publish Action Button */}
            <Pressable
              onPress={handlePublish}
              disabled={
                publishing ||
                (!fileUri && resourceType !== "text") ||
                !title.trim() ||
                !summary.trim()
              }
              style={[
                styles.publishBtn,
                {
                  backgroundColor: theme.primary,
                  opacity:
                    publishing ||
                    (!fileUri && resourceType !== "text") ||
                    !title.trim() ||
                    !summary.trim()
                      ? 0.5
                      : 1,
                },
              ]}
            >
              {publishing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <MaterialCommunityIcons name="send" size={18} color="#FFFFFF" />
              )}
              <Text style={styles.publishBtnText}>
                {publishing ? "Uploading & Publishing..." : "Publish to Threads (+20 XP)"}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "90%",
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: safeFont,
    fontSize: 20,
    fontWeight: "800",
  },
  sheetSubtitle: {
    fontFamily: safeFont,
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  sectionLabel: {
    fontFamily: safeFont,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 14,
    marginBottom: 8,
  },
  helperText: {
    fontFamily: safeFont,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "500",
    marginTop: -4,
    marginBottom: 8,
  },
  typeRow: {
    gap: 8,
    paddingBottom: 4,
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  typeLabel: {
    fontFamily: safeFont,
    fontSize: 12,
  },
  fileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  fileIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  fileMeta: {
    flex: 1,
  },
  fileName: {
    fontFamily: safeFont,
    fontSize: 14,
    fontWeight: "600",
  },
  fileSub: {
    fontFamily: safeFont,
    fontSize: 11,
    marginTop: 2,
  },
  removeFileBtn: {
    padding: 8,
  },
  pickButtonRow: {
    flexDirection: "row",
    gap: 10,
  },
  pickerActionBtn: {
    flex: 1.4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  pickerActionText: {
    fontFamily: safeFont,
    fontSize: 13,
    fontWeight: "600",
  },
  pickerSecondaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  pickerSecondaryText: {
    fontFamily: safeFont,
    fontSize: 12,
    fontWeight: "600",
  },
  input: {
    fontFamily: safeFont,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  textArea: {
    fontFamily: safeFont,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    textAlignVertical: "top",
    minHeight: 76,
  },
  challengeActionRow: {
    marginTop: 14,
    marginBottom: 4,
  },
  challengeGenBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  challengeGenText: {
    fontFamily: safeFont,
    fontSize: 13,
    fontWeight: "700",
  },
  previewCard: {
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  previewBadge: {
    fontFamily: safeFont,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  previewTone: {
    fontFamily: safeFont,
    fontSize: 10,
    fontWeight: "700",
  },
  previewPrompt: {
    fontFamily: safeFont,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  previewOptions: {
    gap: 6,
    marginBottom: 8,
  },
  previewOptionChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  previewOptionText: {
    fontFamily: safeFont,
    fontSize: 12,
  },
  previewReveal: {
    fontFamily: safeFont,
    fontSize: 11,
    lineHeight: 16,
    fontStyle: "italic",
  },
  publishBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 18,
    marginTop: 20,
    marginBottom: 10,
  },
  publishBtnText: {
    fontFamily: safeFont,
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});

