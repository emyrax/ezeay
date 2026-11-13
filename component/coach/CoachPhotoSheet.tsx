import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { coachColors, coachFont } from "../../constants/coachTheme";
import CoachSheet from "./CoachSheet";

interface CoachPhotoSheetProps {
  visible: boolean;
  onCamera: () => void;
  onGallery: () => void;
  onClose: () => void;
}

const OPTIONS = [
  {
    key: "camera",
    icon: "camera-outline",
    label: "Take a photo",
    hint: "Snap a page, whiteboard, or notes.",
  },
  {
    key: "gallery",
    icon: "image-multiple-outline",
    label: "Choose from gallery",
    hint: "Pick an existing photo from your library.",
  },
] as const;

export default function CoachPhotoSheet({
  visible,
  onCamera,
  onGallery,
  onClose,
}: CoachPhotoSheetProps) {
  return (
    <CoachSheet
      visible={visible}
      title="Add a photo"
      subtitle="Attach it to your next message."
      onClose={onClose}
    >
      {OPTIONS.filter(
        (option) => option.key !== "camera" || Platform.OS !== "web",
      ).map((option) => (
        <Pressable
          key={option.key}
          onPress={option.key === "camera" ? onCamera : onGallery}
          style={styles.option}
          accessibilityRole="button"
          accessibilityLabel={option.label}
        >
          <View style={styles.icon}>
            <MaterialCommunityIcons
              name={option.icon}
              size={20}
              color={coachColors.accent}
            />
          </View>
          <View style={styles.copy}>
            <Text style={styles.label}>{option.label}</Text>
            <Text style={styles.hint}>{option.hint}</Text>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color={coachColors.textMuted}
          />
        </Pressable>
      ))}
    </CoachSheet>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: coachColors.border,
    backgroundColor: coachColors.background,
    padding: 12,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: coachColors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  label: {
    fontFamily: coachFont.semibold,
    fontSize: 13,
    color: coachColors.text,
  },
  hint: {
    fontFamily: coachFont.regular,
    fontSize: 11,
    lineHeight: 16,
    color: coachColors.textMuted,
  },
});
