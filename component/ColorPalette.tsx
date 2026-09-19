import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ThemeColors } from "../constants/themes";

const COLORS = [
  "#EF4444", "#F97316", "#F59E0B", "#EAB308",
  "#84CC16", "#22C55E", "#10B981", "#14B8A6",
  "#06B6D4", "#0EA5E9", "#3B82F6", "#6366F1",
  "#8B5CF6", "#A855F7", "#D946EF", "#EC4899",
  "#F43F5E", "#78716C", "#64748B", "#1E293B",
];

interface Props {
  onSelect: (color: string) => void;
  selectedColor?: string;
  theme: ThemeColors;
}

function ColorPalette({ onSelect, selectedColor, theme }: Props) {
  return (
    <View style={styles.grid}>
      {COLORS.map((color) => {
        const isSelected = selectedColor === color;
        return (
          <TouchableOpacity
            key={color}
            style={[
              styles.swatch,
              { backgroundColor: color },
              isSelected && { borderColor: theme.text, borderWidth: 2 },
            ]}
            onPress={() => onSelect(color)}
            accessibilityLabel={color}
          >
            {isSelected && (
              <MaterialCommunityIcons name="check" size={14} color="#FFF" />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 8,
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default ColorPalette;
export { COLORS };
