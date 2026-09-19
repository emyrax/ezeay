import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useThemeColors } from "../../hooks/useTheme";
import ThemeIcon from "./ThemeIcon";

export type NotesLayout = "list" | "grid";

interface ListGridToggleProps {
  value: NotesLayout;
  onChange: (value: NotesLayout) => void;
}

export default function ListGridToggle({ value, onChange }: ListGridToggleProps) {
  const theme = useThemeColors();

  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: theme.surfaceAlt, borderColor: theme.borderLight },
      ]}
    >
      <Pressable
        hitSlop={4}
        onPress={() => onChange("list")}
        style={[
          styles.option,
          value === "list" && { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <ThemeIcon
          sf="list.bullet"
          material="format-list-bulleted"
          size={16}
          color={value === "list" ? theme.primary : theme.textMuted}
        />
      </Pressable>
      <Pressable
        hitSlop={4}
        onPress={() => onChange("grid")}
        style={[
          styles.option,
          value === "grid" && { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <ThemeIcon
          sf="square.grid.2x2"
          material="view-grid-outline"
          size={16}
          color={value === "grid" ? theme.primary : theme.textMuted}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 2,
  },
  option: {
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "transparent",
  },
});