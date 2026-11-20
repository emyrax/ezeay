import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Linking from "expo-linking";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
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
  buildXIntentUrl,
  deriveResourceContent,
  inferResourceType,
} from "../lib/community/resourceComposer";
import { eventBus } from "../lib/eventBus";
import {
  MAX_THREAD_ATTACHMENT_BYTES,
  exceedsThreadAttachmentLimit,
  formatFileSize,
} from "../lib/uploadLimits";
import { uploadFile } from "../lib/uploadFile";
import type { ExploreResourcePost } from "../types/community";
import CommunityAvatar from "./CommunityAvatar";

interface ResourceUploadSheetProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (post: ExploreResourcePost) => void;
  onStartSpace?: () => void;
}

interface Attachment {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
}

const APP_URL = (
  process.env.EXPO_PUBLIC_APP_URL || "https://yuinx.app"
).replace(/\/$/, "");

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function ResourceUploadSheet({
  visible,
  onClose,
  onSuccess,
  onStartSpace,
}: ResourceUploadSheetProps) {
  const theme = useThemeColors();
  const { getToken, profile } = useAuth();
  const isPro = profile?.isPro ?? false;
  const inputRef = useRef<TextInput>(null);

  const [caption, setCaption] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [noteOnly, setNoteOnly] = useState(false);
  const [shareToX, setShareToX] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const buzz = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, []);

  const resetForm = useCallback(() => {
    setCaption("");
    setAttachment(null);
    setNoteOnly(false);
    setShareToX(false);
    setPublishing(false);
  }, []);

  const handleClose = useCallback(() => {
    if (publishing) return;
    resetForm();
    onClose();
  }, [onClose, publishing, resetForm]);

  const validateSize = (size: number | undefined) => {
    if (!size) return true;
    if (size === 0) {
      Alert.alert("Empty File", "That file is empty. Pick a different file.");
      return false;
    }
    if (exceedsThreadAttachmentLimit(size)) {
      Alert.alert(
        "File Too Large",
        `Attachments are limited to ${formatFileSize(MAX_THREAD_ATTACHMENT_BYTES)}.`,
      );
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    buzz();
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.85,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      if (!validateSize(asset.fileSize)) return;
      setAttachment({
        uri: asset.uri,
        name: asset.fileName || `image_${Date.now()}.jpg`,
        size: asset.fileSize || 100_000,
        mimeType: asset.mimeType || "image/jpeg",
      });
      setNoteOnly(false);
    } catch (error) {
      console.error("[ResourceComposer] Image picker failed:", error);
      Alert.alert("Photo Error", "Couldn't open your photo library.");
    }
  };

  const pickDocument = async (kind: "document" | "audio" = "document") => {
    if (kind === "audio" && !isPro) {
      Alert.alert(
        "Audio is a Pro feature",
        "Upgrade to share recorded lectures and audio notes.",
      );
      return;
    }
    buzz();
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: kind === "audio" ? ["audio/*"] : ["*/*"],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      if (!validateSize(asset.size)) return;
      setAttachment({
        uri: asset.uri,
        name: asset.name || (kind === "audio" ? "audio.m4a" : "resource.pdf"),
        size: asset.size || 1024,
        mimeType:
          asset.mimeType ||
          (kind === "audio" ? "audio/mpeg" : "application/octet-stream"),
      });
      setNoteOnly(false);
    } catch (error) {
      console.error("[ResourceComposer] Document picker failed:", error);
      Alert.alert("File Error", "Couldn't open the file picker.");
    }
  };

  const startNote = () => {
    buzz();
    setAttachment(null);
    setNoteOnly(true);
    inputRef.current?.focus();
  };

  const clearAttachment = () => {
    buzz();
    setAttachment(null);
    setNoteOnly(false);
  };

  const handlePublish = async () => {
    const cleanCaption = caption.trim();
    if (!cleanCaption && !attachment) {
      Alert.alert(
        "Nothing to share",
        "Write a caption or attach a file before publishing.",
      );
      return;
    }
    if (attachment && exceedsThreadAttachmentLimit(attachment.size)) {
      Alert.alert(
        "File Too Large",
        `Attachments are limited to ${formatFileSize(MAX_THREAD_ATTACHMENT_BYTES)}.`,
      );
      return;
    }

    const resourceType = inferResourceType({
      hasFile: !!attachment,
      fileName: attachment?.name,
      mimeType: attachment?.mimeType,
      noteOnly,
    });
    const content = deriveResourceContent(cleanCaption, attachment?.name);

    buzz();
    setPublishing(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");

      let storageUrl = "";
      const isImage = !!attachment && resourceType === "image";
      if (attachment) {
        if (isImage) {
          try {
            storageUrl = await uploadImage(attachment.uri, getToken, {
              endpoint: "/api/community/thread-uploads/image",
            });
          } catch {
            storageUrl = await uploadFile(
              attachment.uri,
              attachment.name,
              attachment.mimeType,
              getToken,
              { endpoint: "/api/community/thread-uploads" },
            );
          }
        } else {
          storageUrl = await uploadFile(
            attachment.uri,
            attachment.name,
            attachment.mimeType,
            getToken,
            { endpoint: "/api/community/thread-uploads" },
          );
        }
      }

      let challengeData;
      try {
        challengeData = await api.community.resources.generateChallenge(
          {
            title: content.title,
            summary: content.summary,
            resourceType,
          },
          token,
        );
      } catch {
        challengeData = {
          hook: content.hook || `Master ${content.title}`,
          hookTone: "curious" as const,
          challengeType: "multiple-choice" as const,
          challengePrompt: "What is the key insight of this resource?",
          challengeOptions: [
            "Core conceptual pattern",
            "Passive memorization",
            "Trial and error",
          ],
          correctChoiceIndex: 0,
          revealText:
            content.summary || "Peer insights make studying stickier.",
          shareCopy: `Discovered a great study resource on Yuinx: ${content.title}!`,
          xpReward: 20,
        };
      }

      const result = await api.community.resources.create(
        {
          title: content.title,
          summary: content.summary,
          hook: content.hook || challengeData.hook || `Master ${content.title}`,
          challengeType: challengeData.challengeType || "multiple-choice",
          challengePrompt:
            challengeData.challengePrompt || "What is the core takeaway?",
          challengeOptions: challengeData.challengeOptions || [
            "Focus on principles",
            "Memorize raw answers",
          ],
          correctChoiceIndex: challengeData.correctChoiceIndex ?? 0,
          revealText: challengeData.revealText || content.summary,
          shareCopy:
            challengeData.shareCopy || `Check out ${content.title} on Yuinx!`,
          resourceType,
          fileName: attachment?.name || "text-note",
          fileSizeBytes: attachment?.size ?? 0,
          mimeType: attachment?.mimeType || "text/plain",
          storageUrl,
          previewUrl: isImage && storageUrl ? storageUrl : undefined,
          previewText: content.summary,
          tags: [resourceType, "peer-resource"],
          difficulty: "All Levels",
        },
        token,
      );

      const finish = () => {
        onSuccess(result.post);
        handleClose();
      };

      if (shareToX) {
        const xUrl = buildXIntentUrl(
          cleanCaption || content.summary,
          `${APP_URL}/threads/${result.post.id}`,
        );
        Alert.alert(
          "Published!",
          "Your post is live on Uinx. Open X to share it with your followers.",
          [
            { text: "Not now", onPress: finish },
            {
              text: "Share to X",
              onPress: () => {
                Linking.openURL(xUrl).catch(() => {
                  eventBus.emit("toast:error", {
                    title: "Couldn't open X",
                    message: "Open x.com to share your post.",
                  });
                });
                finish();
              },
            },
          ],
        );
      } else {
        eventBus.emit("toast:success", {
          title: "Published to Uinx",
          message: "Your resource is live. +20 XP",
        });
        finish();
      }
    } catch (error) {
      console.error("[ResourceComposer] Publish failed:", error);
      Alert.alert(
        "Couldn't publish",
        errorMessage(error, "Something went wrong. Please try again."),
      );
    } finally {
      setPublishing(false);
    }
  };

  const canPublish =
    !publishing && (caption.trim().length > 0 || attachment !== null);
  const attachmentIcon = attachment
    ? inferResourceType({
        hasFile: true,
        fileName: attachment.name,
        mimeType: attachment.mimeType,
      })
    : "text";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
          <View style={[styles.handle, { backgroundColor: theme.border }]} />

          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={[styles.title, { color: theme.text }]}>Create post</Text>
              <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                Share a resource with your learning community
              </Text>
            </View>
            <Pressable
              onPress={handleClose}
              hitSlop={12}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close composer"
            >
              <Ionicons name="close" size={22} color={theme.textMuted} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scroll}
          >
            <View style={styles.authorRow}>
              <CommunityAvatar
                uid={profile?.uid ?? "me"}
                photoURL={profile?.photoURL}
                size={46}
              />
              <View style={styles.authorCopy}>
                <Text style={[styles.authorName, { color: theme.text }]}>
                  {profile?.displayName || "Learner"}
                </Text>
                <Text style={[styles.authorMeta, { color: theme.textMuted }]}>
                  Posting to Uinx · Everyone
                </Text>
              </View>
            </View>

            <TextInput
              ref={inputRef}
              value={caption}
              onChangeText={setCaption}
              placeholder="Share something you're learning, a useful note, or a resource worth discussing..."
              placeholderTextColor={theme.textMuted}
              style={[styles.captionInput, { color: theme.text }]}
              multiline
              maxLength={800}
              textAlignVertical="top"
            />

            {attachment ? (
              <View
                style={[
                  styles.attachmentCard,
                  { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
                ]}
              >
                {attachmentIcon === "image" ? (
                  <Image
                    source={{ uri: attachment.uri }}
                    style={styles.attachmentImage}
                    contentFit="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.attachmentIcon,
                      { backgroundColor: theme.primary + "18" },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={
                        attachmentIcon === "audio"
                          ? "file-music"
                          : attachmentIcon === "pdf"
                            ? "file-pdf-box"
                            : "file-document-outline"
                      }
                      size={28}
                      color={theme.primary}
                    />
                  </View>
                )}
                <View style={styles.attachmentCopy}>
                  <Text
                    style={[styles.attachmentName, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {attachment.name}
                  </Text>
                  <Text style={[styles.attachmentMeta, { color: theme.textMuted }]}>
                    {formatFileSize(attachment.size)} ·{" "}
                    {attachment.mimeType.split("/")[1] || "file"}
                  </Text>
                </View>
                <Pressable
                  onPress={clearAttachment}
                  hitSlop={10}
                  style={styles.removeBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Remove attachment"
                >
                  <Ionicons name="close-circle" size={22} color={theme.textMuted} />
                </Pressable>
              </View>
            ) : null}

            {noteOnly && !attachment ? (
              <View
                style={[
                  styles.noteBadge,
                  { backgroundColor: theme.primary + "14" },
                ]}
              >
                <MaterialCommunityIcons
                  name="text-box-outline"
                  size={15}
                  color={theme.primary}
                />
                <Text style={[styles.noteBadgeText, { color: theme.primary }]}>
                  Text note
                </Text>
              </View>
            ) : null}

            <View
              style={[styles.xRow, { borderColor: theme.border }]}
            >
              <View style={[styles.xIcon, { backgroundColor: theme.surfaceAlt }]}>
                <Text style={[styles.xGlyph, { color: theme.text }]}>𝕏</Text>
              </View>
              <View style={styles.xCopy}>
                <Text style={[styles.xTitle, { color: theme.text }]}>
                  Also share to X
                </Text>
                <Text style={[styles.xMeta, { color: theme.textMuted }]}>
                  Opens a pre-filled post after publishing. You can edit it first.
                </Text>
              </View>
              <Switch
                value={shareToX}
                onValueChange={(value) => {
                  buzz();
                  setShareToX(value);
                }}
                trackColor={{
                  false: theme.border,
                  true: theme.primary + "80",
                }}
                thumbColor={shareToX ? theme.primary : theme.textMuted}
              />
            </View>

            <View style={[styles.toolbar, { borderColor: theme.border }]}>
              <ToolAction
                icon="image-outline"
                label="Photo"
                color={theme.text}
                iconColor="#4ADE80"
                onPress={pickImage}
              />
              <ToolAction
                icon="document-text-outline"
                label="Document"
                color={theme.text}
                iconColor="#60A5FA"
                onPress={() => pickDocument("document")}
              />
              <ToolAction
                icon={isPro ? "musical-notes-outline" : "lock-closed-outline"}
                label="Audio"
                color={isPro ? theme.text : theme.textMuted}
                iconColor={isPro ? "#F59E0B" : theme.textMuted}
                onPress={() => pickDocument("audio")}
              />
              <ToolAction
                icon="create-outline"
                label="Note"
                color={noteOnly ? theme.primary : theme.text}
                iconColor={noteOnly ? theme.primary : "#A78BFA"}
                onPress={startNote}
              />
              <ToolAction
                icon="radio-outline"
                label="Space"
                color={theme.text}
                iconColor="#FB7185"
                onPress={() => {
                  buzz();
                  if (onStartSpace) {
                    onStartSpace();
                    return;
                  }
                  eventBus.emit("toast:info", {
                    title: "Live Spaces",
                    message: "Audio Spaces are available in the dev build.",
                  });
                }}
              />
            </View>

            <View style={styles.footer}>
              <Text style={[styles.footerHint, { color: theme.textMuted }]}>
                {caption.length > 0 ? `${caption.length}/800` : "Publishing adds +20 XP"}
              </Text>
              <Pressable
                onPress={handlePublish}
                disabled={!canPublish}
                style={[
                  styles.publishBtn,
                  {
                    backgroundColor: theme.primary,
                    opacity: canPublish ? 1 : 0.45,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Publish post"
                accessibilityState={{ disabled: !canPublish }}
              >
                {publishing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : null}
                <Text style={styles.publishText}>
                  {publishing ? "Publishing..." : "Post"}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ToolAction({
  icon,
  label,
  color,
  iconColor,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  iconColor: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.toolAction}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={21} color={iconColor} />
      <Text style={[styles.toolLabel, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.68)",
  },
  sheet: {
    width: "100%",
    maxWidth: 680,
    maxHeight: "92%",
    alignSelf: "center",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 30 : 18,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: safeFont,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: safeFont,
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  scroll: {
    paddingBottom: 10,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  authorCopy: {
    flex: 1,
    minWidth: 0,
  },
  authorName: {
    fontFamily: safeFont,
    fontSize: 15,
    fontWeight: "800",
  },
  authorMeta: {
    fontFamily: safeFont,
    fontSize: 11,
    marginTop: 1,
  },
  captionInput: {
    fontFamily: safeFont,
    fontSize: 17,
    lineHeight: 24,
    minHeight: 128,
    maxHeight: 230,
    paddingTop: 16,
    paddingBottom: 12,
  },
  attachmentCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 11,
    borderRadius: 16,
    borderWidth: 1,
  },
  attachmentImage: {
    width: 58,
    height: 58,
    borderRadius: 12,
  },
  attachmentIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  attachmentCopy: {
    flex: 1,
    minWidth: 0,
  },
  attachmentName: {
    fontFamily: safeFont,
    fontSize: 14,
    fontWeight: "700",
  },
  attachmentMeta: {
    fontFamily: safeFont,
    fontSize: 11,
    marginTop: 3,
  },
  removeBtn: {
    padding: 6,
  },
  noteBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginTop: 4,
  },
  noteBadgeText: {
    fontFamily: safeFont,
    fontSize: 11,
    fontWeight: "700",
  },
  xRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 11,
    marginTop: 12,
  },
  xIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  xGlyph: {
    fontFamily: safeFont,
    fontSize: 16,
    fontWeight: "800",
  },
  xCopy: {
    flex: 1,
    minWidth: 0,
  },
  xTitle: {
    fontFamily: safeFont,
    fontSize: 13,
    fontWeight: "700",
  },
  xMeta: {
    fontFamily: safeFont,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 1,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  toolAction: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 6,
    borderRadius: 10,
  },
  toolLabel: {
    fontFamily: safeFont,
    fontSize: 10,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 14,
  },
  footerHint: {
    flex: 1,
    fontFamily: safeFont,
    fontSize: 11,
  },
  publishBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    minWidth: 92,
    minHeight: 44,
    paddingHorizontal: 22,
    borderRadius: 22,
  },
  publishText: {
    color: "#FFFFFF",
    fontFamily: safeFont,
    fontSize: 14,
    fontWeight: "800",
  },
});
