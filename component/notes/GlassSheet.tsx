import React, { ReactNode } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "../../hooks/useTheme";

function isLightColor(color: string): boolean {
  const hex = color.replace("#", "");
  if (hex.length !== 6) return false;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

interface GlassSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  footer?: ReactNode;
  cornerRadius?: number;
  children?: ReactNode;
}

export default function GlassSheet({
  visible,
  onClose,
  title,
  subtitle,
  icon,
  footer,
  cornerRadius = 28,
  children,
}: GlassSheetProps) {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const light = isLightColor(theme.bg);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable
          style={[styles.backdrop, { backgroundColor: light ? "rgba(0,0,0,0.22)" : "rgba(0,0,0,0.5)" }]}
          onPress={onClose}
        />
        <View
          style={[
            styles.sheetOuter,
            {
              borderTopLeftRadius: cornerRadius,
              borderTopRightRadius: cornerRadius,
              paddingBottom: Platform.OS === "ios" ? insets.bottom : 0,
            },
          ]}
        >
          <BlurView
            intensity={light ? 40 : 60}
            tint={light ? "systemMaterialLight" : "systemMaterialDark"}
            style={[
              styles.blur,
              {
                borderColor: theme.borderLight,
                borderTopLeftRadius: cornerRadius,
                borderTopRightRadius: cornerRadius,
              },
            ]}
          >
            <View
              style={[
                styles.tint,
                {
                  backgroundColor: theme.glass,
                  borderTopLeftRadius: cornerRadius,
                  borderTopRightRadius: cornerRadius,
                },
              ]}
            >
              <View style={styles.handleRow}>
                <View style={[styles.handle, { backgroundColor: theme.textMuted }]} />
              </View>
              {(title || icon) && (
                <View style={styles.header}>
                  {icon}
                  <View style={styles.headerText}>
                    {title && <Text style={[styles.title, { color: theme.text }]}>{title}</Text>}
                    {subtitle && (
                      <Text style={[styles.subtitle, { color: theme.textMuted }]}>{subtitle}</Text>
                    )}
                  </View>
                </View>
              )}
              <View style={styles.body}>{children}</View>
              {footer && <View style={styles.footer}>{footer}</View>}
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
    justifyContent: "flex-end",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetOuter: {
    overflow: "hidden",
  },
  blur: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  tint: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    overflow: "hidden",
  },
  handleRow: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 6,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 4,
    paddingBottom: 10,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "SpaceGrotesk",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
    fontFamily: "SpaceGrotesk",
  },
  body: {
    paddingBottom: 8,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(128,128,128,0.25)",
    paddingTop: 12,
  },
});