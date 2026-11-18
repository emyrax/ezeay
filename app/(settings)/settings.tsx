import React from "react";
import { View, Text, StyleSheet, Pressable, Alert, Platform } from "react-native";
import { useLanguageStore } from "../../store/languageStore";
import { isAppLanguage } from "../../lib/i18n/languages";
import { router } from "expo-router";

export default function SettingsScreen() {
  const { appLanguage, setAppLanguage, hasExplicitChoice } = useLanguageStore();

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

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App language</Text>
        <View style={styles.languageList}>
          {languageOptions.map((opt) => (
            <Pressable
              key={opt.value}
              style={[
                styles.languageItem,
                appLanguage === opt.value && styles.languageItemSelected,
              ]}
              onPress={() => handleLanguageChange(opt.value)}
            >
              <Text style={styles.languageLabel}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Learning language</Text>
        <View style={styles.languageList}>
          {languageOptions.map((opt) => (
            <Pressable
              key={opt.value}
              style={[
                styles.languageItem,
                appLanguage === opt.value && styles.languageItemSelected,
              ]}
              onPress={() => handleLanguageChange(opt.value)}
            >
              <Text style={styles.languageLabel}>{opt.label}</Text>
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
    backgroundColor: "#152A4D",
  },
  section: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#1F293D",
  },
  sectionTitle: {
    color: "#95D0FD",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
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
    backgroundColor: "#121826",
  },
  languageItemSelected: {
    borderWidth: 1,
    borderColor: "#38BDF8",
  },
  languageLabel: {
    color: "#B7C7DB",
    fontSize: 14,
  },
});