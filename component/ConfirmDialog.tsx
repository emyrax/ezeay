import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useThemeColors } from "../hooks/useTheme";
import { DIALOG_WIDTHS } from "../constants/layout";

interface Props {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive,
  loading,
  onConfirm,
  onCancel,
}: Props) {
  const theme = useThemeColors();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.backdrop} onPress={loading ? undefined : onCancel}>
        <Pressable
          style={[
            styles.card,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
          onPress={() => {}}
        >
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          {message ? (
            <Text style={[styles.message, { color: theme.textSecondary }]}>
              {message}
            </Text>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              style={[styles.button, { backgroundColor: theme.surfaceAlt }]}
              onPress={onCancel}
              disabled={loading}
            >
              <Text style={[styles.buttonLabel, { color: theme.textSecondary }]}>
                {cancelLabel}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.button,
                { backgroundColor: destructive ? theme.danger : theme.primary },
                loading && styles.buttonDisabled,
              ]}
              onPress={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={[styles.buttonLabel, styles.confirmLabel]}>
                  {confirmLabel}
                </Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: DIALOG_WIDTHS.compact,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 24,
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 22,
  },
  button: {
    minWidth: 104,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  confirmLabel: {
    color: "#FFFFFF",
  },
});
