import React from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useThemeColors } from "../../hooks/useTheme";
import { bodyFont } from "../../constants/themes";
import ThemeIcon from "./ThemeIcon";
import { FormatTool } from "../../lib/notes/formatting";

interface FormatToolbarProps {
  anim: Animated.Value;
  activeTools: Record<FormatTool, boolean> | null;
  hasSelection: boolean;
  onFormat: (tool: FormatTool) => void;
  style?: object;
}

const MONO_FONT = "monospace";

export default function FormatToolbar({
  anim,
  activeTools,
  hasSelection,
  onFormat,
  style,
}: FormatToolbarProps) {
  const theme = useThemeColors();

  const formatBtn = (tool: FormatTool, char: string) => {
    const active = activeTools?.[tool] ?? false;
    return (
      <Pressable
        key={tool}
        onPress={() => onFormat(tool)}
        accessibilityLabel={tool}
        style={({ pressed }) => [
          styles.tool,
          active && { backgroundColor: theme.primary + "22" },
          !hasSelection && styles.toolDim,
          pressed && styles.toolPressed,
        ]}
      >
        <Text
          style={[
            styles.toolChar,
            { color: active ? theme.primary : theme.text },
            tool === "bold" && styles.charBold,
            tool === "italic" && styles.charItalic,
            tool === "underline" && styles.charUnderline,
            tool === "code" && styles.charCode,
          ]}
        >
          {char}
        </Text>
      </Pressable>
    );
  };

  return (
    <Animated.View
      style={[
        styles.bar,
        style,
        {
          backgroundColor: theme.glass,
          borderColor: theme.borderLight,
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }),
            },
          ],
        },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        {formatBtn("bold", "B")}
        {formatBtn("italic", "I")}
        {formatBtn("underline", "U")}
        {formatBtn("code", "</>")}
        <Pressable
          onPress={() => onFormat("highlight")}
          accessibilityLabel="Highlight"
          style={({ pressed }) => [
            styles.tool,
            !hasSelection && styles.toolDim,
            activeTools?.highlight && styles.highlightBtn,
            pressed && styles.toolPressed,
          ]}
        >
          <ThemeIcon
            sf="highlighter"
            material="marker"
            size={22}
            color={activeTools?.highlight ? "#FACC15" : theme.text}
          />
        </Pressable>

        <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />

        {formatBtn("heading1", "H1")}
        {formatBtn("heading2", "H2")}
        {formatBtn("bullet", "•")}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 16,
    right: 16,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
    overflow: "hidden",
    paddingVertical: 6,
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 8,
  },
  divider: {
    width: 1,
    height: 24,
    marginHorizontal: 4,
  },
  tool: {
    minWidth: 40,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    paddingHorizontal: 5,
  },
  toolDim: { opacity: 0.35 },
  toolPressed: { opacity: 0.5 },
  toolChar: {
    fontSize: 17,
    fontWeight: "700",
    fontFamily: bodyFont,
  },
  charBold: { fontWeight: "800" },
  charItalic: { fontStyle: "italic" },
  charUnderline: { textDecorationLine: "underline" },
  charCode: { fontFamily: MONO_FONT, fontSize: 14 },
  highlightBtn: {
    backgroundColor: "rgba(255, 213, 0, 0.2)",
  },
});