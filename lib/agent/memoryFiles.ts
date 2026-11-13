import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";
import { api } from "../api";
import { readFileAsBase64 } from "../fileAccess";
import { requestStudyAccess } from "../studyPermissions";
import {
  exceedsThreadAttachmentLimit,
  formatFileSize,
} from "../uploadLimits";
import type { AgentMemoryRecord } from "../../types/agent";

const MEMORY_FILE_TYPES = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/json",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/*",
  "audio/*",
];

export interface MemoryFileAsset {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
}

export async function pickMemoryFile(): Promise<MemoryFileAsset | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: MEMORY_FILE_TYPES,
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  const size = asset.size ?? 0;
  if (exceedsThreadAttachmentLimit(size)) {
    throw new Error(
      `That file is too large. Choose one under ${formatFileSize(5 * 1024 * 1024)}.`,
    );
  }

  return {
    uri: asset.uri,
    name: asset.name || "Attachment",
    mimeType: asset.mimeType || "application/octet-stream",
    size,
  };
}

export type MemoryImageSource = "camera" | "gallery";

export async function pickMemoryImage(
  source: MemoryImageSource,
): Promise<MemoryFileAsset | null> {
  const useCamera = source === "camera" && Platform.OS !== "web";
  const granted = await requestStudyAccess(useCamera ? "camera" : "gallery");
  if (!granted) return null;

  const result = useCamera
    ? await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.8,
      })
    : await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.8,
      });
  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  const size = asset.fileSize ?? 0;
  if (exceedsThreadAttachmentLimit(size)) {
    throw new Error(
      `That photo is too large. Choose one under ${formatFileSize(5 * 1024 * 1024)}.`,
    );
  }

  const extension = asset.mimeType?.split("/")[1] ?? "jpg";
  return {
    uri: asset.uri,
    name: asset.fileName || `photo-${Date.now()}.${extension}`,
    mimeType: asset.mimeType || "image/jpeg",
    size,
  };
}

export async function uploadMemoryFile(
  file: MemoryFileAsset,
  token: string,
  annotation = "",
  kind: "file" | "photo" = "file",
): Promise<{ memory: AgentMemoryRecord; extractionFailed: boolean }> {
  const base64 = await readFileAsBase64(file.uri);
  return api.agent.memories.upload(
    {
      base64,
      filename: file.name,
      mimeType: file.mimeType,
      content: annotation,
      kind,
    },
    token,
  );
}

export function memoryFileLabel(memory: AgentMemoryRecord): string {
  return memory.fileName || memory.content || memory.kind;
}

export function memoryFileMeta(memory: AgentMemoryRecord): string {
  const parts: string[] = [];
  if (memory.sizeBytes) parts.push(formatFileSize(memory.sizeBytes));
  if (memory.mimeType) {
    const type = memory.mimeType.split("/").pop();
    if (type) parts.push(type.toUpperCase());
  }
  return parts.join(" · ");
}
