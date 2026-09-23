import * as ImagePicker from "expo-image-picker";
import { Alert, Linking } from "react-native";

export type StudyAccessKind = "camera" | "gallery";

const PERMISSION_MESSAGES: Record<StudyAccessKind, string> = {
  camera:
    "Yuinx uses your camera so you can photograph pages of your notes and turn them into study bites. Photos are only used to create your study material.",
  gallery:
    "Yuinx needs access to your photo library so you can scan pages of your notes into study bites. They are only used to create your study material.",
};

export async function requestStudyAccess(kind: StudyAccessKind): Promise<boolean> {
  const permission =
    kind === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (permission.granted) return true;

  await new Promise<void>((resolve) => {
    Alert.alert(
      permission.canAskAgain ? "Permission Needed" : "Access Required",
      PERMISSION_MESSAGES[kind],
      [
        { text: "Not Now", style: "cancel", onPress: () => resolve() },
        {
          text: "Open Settings",
          onPress: () => {
            Linking.openSettings().catch(() => {});
            resolve();
          },
        },
      ],
      { cancelable: true, onDismiss: resolve },
    );
  });

  return false;
}