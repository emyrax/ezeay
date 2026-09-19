import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useThemeColors } from "../hooks/useTheme";

export interface DropdownOption {
  label: string;
  value: string;
  locked?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface Props {
  options: DropdownOption[];
  selected: string;
  onSelect: (value: string) => void;
  placeholder?: string;
}

export default function DropdownSelect({ options, selected, onSelect, placeholder }: Props) {
  const theme = useThemeColors();
  const [open, setOpen] = useState(false);

  const selectedOption = options.find((o) => o.value === selected);
  const selectedLabel = selectedOption?.label ?? placeholder ?? "Select";

  const handleSelect = (opt: DropdownOption) => {
    setOpen(false);
    if (opt.locked) {
      Alert.alert("Premium Feature", "Upgrade to Premium to unlock Advanced difficulty.");
    }
    onSelect(opt.value);
  };

  return (
    <View style={styles.wrapper}>
      <Pressable style={styles.trigger} onPress={() => setOpen(!open)}>
        <Text style={styles.triggerText}>{selectedLabel}</Text>
        {selectedOption?.icon ? (
          <Ionicons name={selectedOption.icon} size={16} color="#64748B" style={{ marginLeft: 6 }} />
        ) : null}
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color="#FFFFFF" />
      </Pressable>
      {open && (
        <View style={styles.dropdown}>
          <ScrollView bounces={false}>
            {options.map((opt) => {
              const isSelected = opt.value === selected;
              return (
                <Pressable
                  key={opt.value}
                  style={[styles.option, isSelected && styles.optionSelected]}
                  onPress={() => handleSelect(opt)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      isSelected && [styles.optionTextSelected, { color: theme.textSecondary }],
                      opt.locked && styles.optionLocked,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {opt.locked && (
                    <Ionicons name="lock-closed" size={14} color="#64748B" style={{ marginLeft: 6 }} />
                  )}
                  {opt.icon && (
                    <Ionicons name={opt.icon} size={14} color="#64748B" style={{ marginLeft: 6 }} />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    zIndex: 100,
  },
  trigger: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  triggerText: {
    color: "#FFFFFF",
    fontSize: 13,
    flex: 1,
  },
  dropdown: {
    position: "absolute",
    top: 40,
    left: 0,
    right: 0,
    backgroundColor: "#1A1D2E",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2A2D3E",
    maxHeight: 150,
    zIndex: 200,
    elevation: 10,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 36,
  },
  optionSelected: {
    backgroundColor: "rgba(6, 182, 212, 0.15)",
  },
  optionText: {
    color: "#FFFFFF",
    fontSize: 13,
    flex: 1,
  },
  optionTextSelected: {
    fontWeight: "700",
  },
  optionLocked: {
    color: "#64748B",
  },
});
