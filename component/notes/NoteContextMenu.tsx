import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { useThemeColors } from "../../hooks/useTheme";
import ThemeIcon from "./ThemeIcon";

interface NoteContextMenuProps {
  visible: boolean;
  isPinned: boolean;
  onClose: () => void;
  onEdit: () => void;
  onPin: () => void;
  onDelete: () => void;
}

function MenuRow({
  sf,
  material,
  label,
  color,
  pressedBg,
  onPress,
}: {
  sf: string;
  material: Parameters<typeof ThemeIcon>[0]["material"];
  label: string;
  color: string;
  pressedBg: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: pressedBg }]}
    >
      <ThemeIcon sf={sf} material={material} size={18} color={color} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

export default function NoteContextMenu({
  visible,
  isPinned,
  onClose,
  onEdit,
  onPin,
  onDelete,
}: NoteContextMenuProps) {
  const theme = useThemeColors();

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={[styles.backdrop, { backgroundColor: "rgba(0,0,0,0.35)" }]} onPress={onClose} />
        <View style={styles.center}>
          <BlurView
            intensity={80}
            tint={theme.bg === "#F5F5F5" ? "systemMaterialLight" : "systemMaterialDark"}
            style={[styles.card, { borderColor: theme.borderLight }]}
          >
            <View style={[styles.tint, { backgroundColor: theme.glass }]}>
              <MenuRow
                sf={isPinned ? "pin.slash" : "pin"}
                material={isPinned ? "pin-off-outline" : "pin-outline"}
                label={isPinned ? "Unpin" : "Pin"}
                color={theme.text}
                pressedBg={theme.surfaceAlt}
                onPress={() => {
                  onClose();
                  onPin();
                }}
              />
              <View style={[styles.separator, { backgroundColor: theme.borderLight }]} />
              <MenuRow
                sf="square.and.pencil"
                material="pencil-outline"
                label="Edit"
                color={theme.text}
                pressedBg={theme.surfaceAlt}
                onPress={() => {
                  onClose();
                  onEdit();
                }}
              />
              <View style={[styles.separator, { backgroundColor: theme.borderLight }]} />
              <MenuRow
                sf="trash"
                material="trash-can-outline"
                label="Delete"
                color={theme.danger}
                pressedBg={theme.surfaceAlt}
                onPress={() => {
                  onClose();
                  onDelete();
                }}
              />
            </View>
          </BlurView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    width: 240,
  },
  tint: {
    borderRadius: 16,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  label: {
    fontSize: 15,
    fontWeight: "500",
    fontFamily: "SpaceGrotesk",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 46,
  },
});