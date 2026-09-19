import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import React from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useThemeColors } from "../hooks/useTheme";

interface Props {
  visible: boolean;
  onClose: () => void;
  onCamera: () => void;
  onGallery: () => void;
  onFile: (result: DocumentPicker.DocumentPickerResult) => void;
}

export default function StudyUploadSheet({ visible, onClose, onCamera, onGallery, onFile }: Props) {
  const theme = useThemeColors();

  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "text/plain",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "image/*",
          "audio/*",
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.length > 0) {
        onFile(result);
        onClose();
      }
    } catch (err) {
      Alert.alert("Error", "Failed to pick file.");
    }
  };

  const handleCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Needed", "Camera permission is required to take a photo.");
      return;
    }
    onCamera();
    onClose();
  };

  const handleGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Needed", "Gallery permission is required.");
      return;
    }
    onGallery();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.surface }]}>
          <View style={[styles.handle, { backgroundColor: theme.border }]} />
          <Text style={[styles.sheetTitle, { color: theme.text }]}>Add Study Material</Text>

          <Pressable style={[styles.option, { backgroundColor: theme.surfaceAlt }]} onPress={handleCamera}>
            <View style={[styles.optionIcon, { backgroundColor: "#38BDF8" + "20" }]}>
              <Ionicons name="camera-outline" size={24} color="#38BDF8" />
            </View>
            <View style={styles.optionTextWrap}>
              <Text style={[styles.optionTitle, { color: theme.text }]}>Take a Photo</Text>
              <Text style={[styles.optionSubtitle, { color: theme.textSecondary }]}>
                Snap a document, timetable, or notes
              </Text>
            </View>
          </Pressable>

          <Pressable style={[styles.option, { backgroundColor: theme.surfaceAlt }]} onPress={handleGallery}>
            <View style={[styles.optionIcon, { backgroundColor: "#A855F7" + "20" }]}>
              <Ionicons name="images-outline" size={24} color="#A855F7" />
            </View>
            <View style={styles.optionTextWrap}>
              <Text style={[styles.optionTitle, { color: theme.text }]}>Choose from Gallery</Text>
              <Text style={[styles.optionSubtitle, { color: theme.textSecondary }]}>
                Select an image of study material
              </Text>
            </View>
          </Pressable>

          <Pressable style={[styles.option, { backgroundColor: theme.surfaceAlt }]} onPress={handleFilePick}>
            <View style={[styles.optionIcon, { backgroundColor: "#22C55E" + "20" }]}>
              <Ionicons name="document-outline" size={24} color="#22C55E" />
            </View>
            <View style={styles.optionTextWrap}>
              <Text style={[styles.optionTitle, { color: theme.text }]}>Upload File</Text>
              <Text style={[styles.optionSubtitle, { color: theme.textSecondary }]}>
                PDF, DOC, TXT or an audio lecture / recording
              </Text>
            </View>
          </Pressable>

          <Pressable onPress={onClose} style={[styles.cancelBtn, { borderColor: theme.border }]}>
            <Text style={[styles.cancelText, { color: theme.textSecondary }]}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  optionTextWrap: {
    flex: 1,
    marginLeft: 12,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  optionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  cancelBtn: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    marginTop: 4,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
