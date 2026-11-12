import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DIALOG_WIDTHS } from "../constants/layout";
import { useResponsive } from "../hooks/useResponsive";
import { useThemeColors } from "../hooks/useTheme";

export interface DropdownOption {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface Props {
  options: DropdownOption[];
  selected: string;
  onSelect: (value: string) => void;
  placeholder?: string;
  title?: string;
}

export default function DropdownSelect({
  options,
  selected,
  onSelect,
  placeholder,
  title,
}: Props) {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const { isWeb, breakpoint } = useResponsive();
  const [open, setOpen] = useState(false);
  const centered = isWeb && breakpoint !== "phone";

  const selectedOption = options.find((o) => o.value === selected);
  const selectedLabel = selectedOption?.label ?? placeholder ?? "Select";
  const sheetTitle = title ?? placeholder ?? "Select an option";

  const openSheet = () => {
    Keyboard.dismiss();
    setOpen(true);
  };

  const closeSheet = () => setOpen(false);

  const handleSelect = (opt: DropdownOption) => {
    setOpen(false);
    onSelect(opt.value);
  };

  return (
    <>
      <Pressable
        style={[
          styles.trigger,
          {
            backgroundColor: theme.surfaceAlt,
            borderColor: theme.borderLight,
          },
        ]}
        onPress={openSheet}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${selectedLabel}. Open ${sheetTitle}`}
      >
        <Text
          style={[styles.triggerText, { color: theme.text }]}
          numberOfLines={1}
        >
          {selectedLabel}
        </Text>
        {selectedOption?.icon ? (
          <Ionicons
            name={selectedOption.icon}
            size={16}
            color={theme.textMuted}
            style={styles.triggerIcon}
          />
        ) : null}
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={16}
          color={theme.textMuted}
        />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={closeSheet}
      >
        <View
          style={[
            styles.overlay,
            centered ? styles.overlayCenter : styles.overlaySheet,
          ]}
        >
          <Pressable
            style={styles.backdrop}
            onPress={closeSheet}
            accessibilityRole="button"
            accessibilityLabel="Close options"
          />
          <View
            style={[
              styles.sheet,
              centered ? styles.sheetCenter : styles.sheetBottom,
              {
                backgroundColor: theme.surface,
                borderColor: theme.borderLight,
              },
              !centered && {
                paddingBottom: Math.max(insets.bottom, 16) + 8,
              },
            ]}
          >
            {!centered ? (
              <View
                style={[styles.handle, { backgroundColor: theme.borderLight }]}
              />
            ) : null}
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>
                {sheetTitle}
              </Text>
              <Pressable
                onPress={closeSheet}
                hitSlop={8}
                style={[
                  styles.closeButton,
                  { backgroundColor: theme.surfaceAlt },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={18} color={theme.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            >
              {options.map((opt) => {
                const isSelected = opt.value === selected;
                return (
                  <Pressable
                    key={opt.value}
                    style={[
                      styles.option,
                      centered && [
                        styles.optionCenter,
                        { backgroundColor: theme.surfaceAlt },
                      ],
                      isSelected &&
                        (centered
                          ? { borderColor: theme.primary }
                          : { backgroundColor: theme.primaryLight }),
                    ]}
                    onPress={() => handleSelect(opt)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={opt.label}
                  >
                    {opt.icon ? (
                      <Ionicons
                        name={opt.icon}
                        size={18}
                        color={isSelected ? theme.primary : theme.textMuted}
                        style={styles.optionIcon}
                      />
                    ) : null}
                    <Text
                      style={[
                        styles.optionText,
                        {
                          color: isSelected
                            ? theme.text
                            : theme.textSecondary,
                        },
                        isSelected && styles.optionTextSelected,
                      ]}
                      numberOfLines={2}
                    >
                      {opt.label}
                    </Text>
                    {isSelected ? (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color={theme.primary}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  triggerText: {
    fontSize: 13,
    flex: 1,
  },
  triggerIcon: {
    marginLeft: 6,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  overlaySheet: {
    justifyContent: "flex-end",
  },
  overlayCenter: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  sheet: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  sheetBottom: {
    maxHeight: "80%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  sheetCenter: {
    width: "100%",
    maxWidth: DIALOG_WIDTHS.picker,
    maxHeight: "85%",
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    overflow: "hidden",
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 10,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingBottom: 8,
  },
  sheetTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    flexGrow: 0,
    flexShrink: 1,
    maxHeight: 420,
  },
  listContent: {
    paddingBottom: 8,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 4,
  },
  optionCenter: {
    borderWidth: 1,
    borderColor: "transparent",
    paddingVertical: 12,
    marginBottom: 8,
  },
  optionIcon: {
    marginRight: 10,
  },
  optionText: {
    flex: 1,
    fontSize: 15,
  },
  optionTextSelected: {
    fontWeight: "700",
  },
});
