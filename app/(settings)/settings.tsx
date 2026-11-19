import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLanguageStore } from "../../store/languageStore";
import { isAppLanguage } from "../../lib/i18n/languages";
import { useThemeStore, type ThemeMode } from "../../store/themeStore";
import { useThemeColors } from "../../hooks/useTheme";
import { router } from "expo-router";

const APPEARANCE_OPTIONS: {
  value: ThemeMode;
  label: string;
  icon: "weather-night" | "white-balance-sunny" | "theme-light-dark";
}[] = [
  { value: "light", label: "Light", icon: "white-balance-sunny" },
  { value: "dark", label: "Dark", icon: "weather-night" },
  { value: "system", label: "System", icon: "theme-light-dark" },
];

export default function SettingsScreen() {
  const { appLanguage, setAppLanguage, hasExplicitChoice } = useLanguageStore();
  const { mode, setMode } = useThemeStore();
  const theme = useThemeColors();

  const languageOptions = [
    { value: "en", label: "English" },
    { value: "fr", label: "French" },
    { value: "pt", label: "Portuguese" },
    { value: "sw", label: "Swahili" },
    { value: "ar", label: "Arabic" },
  ];

  const handleLanguageChange = (newLang: string) => {
    setAppLanguage(newLang, { explicit: !hasExplicitChoice });
    if (isAppLanguage(newLang) && Platform.OS !== "web") {
      Alert.alert(
        "Restart needed",
        "Close and reopen Yuinx to apply the new text direction.",
        [{ text: "Got it", onPress: () => router.back() }],
        { cancelable: false }
      );
    } else {
      router.back();
    }
  };

  const sectionStyle = {
    borderBottomColor: theme.border,
  };
  const itemStyle = {
    backgroundColor: theme.surface,
    borderColor: theme.border,
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.section, sectionStyle]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Appearance
        </Text>
        <View style={styles.appearanceRow}>
          {APPEARANCE_OPTIONS.map((opt) => {
            const selected = mode === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setMode(opt.value)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${opt.label} appearance`}
                style={[
                  styles.appearanceItem,
                  itemStyle,
                  selected && {
                    backgroundColor: theme.primaryLight,
                    borderColor: theme.primary,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={opt.icon}
                  size={22}
                  color={selected ? theme.primary : theme.textMuted}
                />
                <Text
                  style={[
                    styles.appearanceLabel,
                    { color: selected ? theme.primary : theme.textSecondary },
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={[styles.section, sectionStyle]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          App language
        </Text>
        <View style={styles.languageList}>
          {languageOptions.map((opt) => (
            <Pressable
              key={opt.value}
              style={[
                styles.languageItem,
                itemStyle,
                appLanguage === opt.value && {
                  borderColor: theme.primary,
                },
              ]}
              onPress={() => handleLanguageChange(opt.value)}
            >
              <Text style={[styles.languageLabel, { color: theme.textSecondary }]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Learning language
        </Text>
        <View style={styles.languageList}>
          {languageOptions.map((opt) => (
            <Pressable
              key={opt.value}
              style={[
                styles.languageItem,
                itemStyle,
                appLanguage === opt.value && {
                  borderColor: theme.primary,
                },
              ]}
              onPress={() => handleLanguageChange(opt.value)}
            >
              <Text style={[styles.languageLabel, { color: theme.textSecondary }]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    padding: 24,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  appearanceRow: {
    flexDirection: "row",
    gap: 10,
  },
  appearanceItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  appearanceLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  languageList: {
    gap: 8,
  },
  languageItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  languageLabel: {
    fontSize: 14,
  },
});
