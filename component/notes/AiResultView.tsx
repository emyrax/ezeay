import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useThemeColors } from "../../hooks/useTheme";
import ThemeIcon from "./ThemeIcon";

export type AiResultKind = "summary" | "polish" | "cheatsheet";

interface AiResultViewProps {
  kind: AiResultKind;
  text: string;
  onReplace: (text: string) => void;
  onAppend: (text: string) => void;
  onDiscard: () => void;
}

const KINDS: Record<AiResultKind, { label: string; material: Parameters<typeof ThemeIcon>[0]["material"]; sf: string }> = {
  summary: { label: "Summary", material: "text-box-outline", sf: "doc.text.magnifyingglass" },
  polish: { label: "Polished text", material: "creation-outline", sf: "wand.and.stars" },
  cheatsheet: { label: "Cheat sheet", material: "notebook-outline", sf: "text.book.closed" },
};

export default function AiResultView({ kind, text, onReplace, onAppend, onDiscard }: AiResultViewProps) {
  const theme = useThemeColors();
  const meta = KINDS[kind];

  return (
    <View>
      <View style={[styles.headerRow, { borderBottomColor: theme.borderLight }]}>
        <View style={styles.headerLeft}>
          <ThemeIcon sf={meta.sf} material={meta.material} size={16} color={theme.primary} />
          <Text style={[styles.kindLabel, { color: theme.primary }]}>{meta.label}</Text>
        </View>
        <Pressable onPress={onDiscard} hitSlop={8}>
          <ThemeIcon sf="xmark.circle.fill" material="close-circle-outline" size={18} color={theme.textMuted} />
        </Pressable>
      </View>
      <View style={[styles.preview, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
        <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
          <Text style={[styles.text, { color: theme.text }]}>{text}</Text>
        </ScrollView>
      </View>
      <View style={styles.actions}>
        {kind === "summary" || kind === "polish" ? (
          <Pressable
            onPress={() => onReplace(text)}
            style={[styles.actionBtn, styles.primaryBtn, { backgroundColor: theme.primary }]}
          >
            <Text style={styles.primaryLabel}>Replace</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => onAppend(text)}
            style={[styles.actionBtn, styles.primaryBtn, { backgroundColor: theme.primary }]}
          >
            <Text style={styles.primaryLabel}>Append to note</Text>
          </Pressable>
        )}
        <Pressable
          onPress={onDiscard}
          style={[styles.actionBtn, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}
        >
          <Text style={[styles.secondaryLabel, { color: theme.text }]}>Discard</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  kindLabel: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "SpaceGrotesk",
  },
  preview: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  text: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "SpaceGrotesk",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 13,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  primaryBtn: {
    borderColor: "transparent",
  },
  primaryLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "SpaceGrotesk",
  },
  secondaryLabel: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "SpaceGrotesk",
  },
});