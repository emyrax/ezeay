import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ScreenContainer from "../../component/ScreenContainer";
import { BREAKPOINTS } from "../../constants/layout";
import { fontFamily } from "../../constants/themes";
import { useThemeColors } from "../../hooks/useTheme";
import { withAlpha } from "../../lib/color";
import { isAppLanguage } from "../../lib/i18n/languages";
import { useLanguageStore } from "../../store/languageStore";
import { useThemeStore, type ThemeMode } from "../../store/themeStore";
import { createShadow } from "@/lib/shadow";

type MdiName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English", code: "EN" },
  { value: "fr", label: "French", code: "FR" },
  { value: "pt", label: "Portuguese", code: "PT" },
  { value: "sw", label: "Swahili", code: "SW" },
  { value: "ar", label: "Arabic", code: "AR" },
] as const;

const APPEARANCE_OPTIONS: {
  value: ThemeMode;
  label: string;
  icon: MdiName;
  hint: string;
}[] = [
  { value: "light", label: "Light", icon: "white-balance-sunny", hint: "Azure" },
  { value: "dark", label: "Dark", icon: "weather-night", hint: "Midnight" },
  { value: "system", label: "System", icon: "theme-light-dark", hint: "Auto" },
];

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { appLanguage, setAppLanguage, hasExplicitChoice } = useLanguageStore();
  const { mode, setMode } = useThemeStore();

  const isTablet = width >= BREAKPOINTS.tablet;
  const isDesktop = width >= BREAKPOINTS.laptop;
  const contentMax = isDesktop ? 1180 : isTablet ? 900 : undefined;
  const currentMode = APPEARANCE_OPTIONS.find((o) => o.value === mode);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/profile");
    }
  };

  const handleLanguageChange = (newLang: string) => {
    setAppLanguage(newLang, { explicit: !hasExplicitChoice });
    if (isAppLanguage(newLang) && Platform.OS !== "web") {
      Alert.alert(
        "Restart recommended",
        "Close and reopen Yuinx to fully apply the new text direction.",
        [{ text: "Got it" }],
        { cancelable: true },
      );
    }
  };

  const renderLanguageCard = (
    eyebrow: string,
    title: string,
    icon: MdiName,
    description: string,
  ) => (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.borderLight },
      ]}
    >
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.cardIcon,
            { backgroundColor: withAlpha(theme.primary, 0.12) },
          ]}
        >
          <MaterialCommunityIcons name={icon} size={18} color={theme.primary} />
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={[styles.eyebrow, { color: theme.textMuted }]}>
            {eyebrow}
          </Text>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{title}</Text>
        </View>
      </View>

      <Text style={[styles.cardDescription, { color: theme.textMuted }]}>
        {description}
      </Text>

      <View style={styles.pillGrid}>
        {LANGUAGE_OPTIONS.map((opt) => {
          const selected = appLanguage === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => handleLanguageChange(opt.value)}
              style={({ pressed }) => [
                styles.languagePill,
                {
                  backgroundColor: selected ? theme.primary : theme.surfaceAlt,
                  borderColor: selected
                    ? theme.primary
                    : theme.borderLight,
                },
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Set ${title.toLowerCase()} to ${opt.label}`}
            >
              <View
                style={[
                  styles.langCodeBadge,
                  {
                    backgroundColor: selected
                      ? withAlpha("#FFFFFF", 0.22)
                      : withAlpha(theme.primary, 0.12),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.langCode,
                    { color: selected ? "#FFFFFF" : theme.primary },
                  ]}
                >
                  {opt.code}
                </Text>
              </View>
              <Text
                style={[
                  styles.languagePillText,
                  { color: selected ? "#FFFFFF" : theme.textSecondary },
                ]}
                numberOfLines={1}
              >
                {opt.label}
              </Text>
              {selected ? (
                <MaterialCommunityIcons
                  name="check-circle"
                  size={14}
                  color="#FFFFFF"
                />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <ScreenContainer edges={["top"]} width="full">
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.page, { maxWidth: contentMax }]}>
          <View
            style={[
              styles.hero,
              { borderColor: theme.borderLight, backgroundColor: theme.surface },
            ]}
          >
            <LinearGradient
              colors={[theme.accent, theme.primary, theme.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View
              style={[
                styles.orb,
                styles.orbLarge,
                { backgroundColor: withAlpha("#FFFFFF", 0.14) },
              ]}
            />
            <View
              style={[
                styles.orb,
                styles.orbSmall,
                { backgroundColor: withAlpha("#FFFFFF", 0.18) },
              ]}
            />

            <Pressable
              onPress={handleBack}
              style={({ pressed }) => [
                styles.backBtn,
                pressed && styles.pressed,
              ]}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <MaterialCommunityIcons
                name="arrow-left"
                size={20}
                color="#FFFFFF"
              />
            </Pressable>

            <View style={styles.heroBody}>
              <Text style={styles.heroEyebrow}>PREFERENCES</Text>
              <Text style={styles.heroTitle}>Settings</Text>
              <Text style={styles.heroSubtitle}>
                Personalize how Yuinx looks and speaks to you.
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: theme.surface, borderColor: theme.borderLight },
            ]}
          >
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.cardIcon,
                  { backgroundColor: withAlpha(theme.primary, 0.12) },
                ]}
              >
                <MaterialCommunityIcons
                  name="palette-outline"
                  size={18}
                  color={theme.primary}
                />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={[styles.eyebrow, { color: theme.textMuted }]}>
                  APPEARANCE
                </Text>
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  Theme
                </Text>
              </View>
              {currentMode ? (
                <View
                  style={[
                    styles.pill,
                    {
                      backgroundColor: withAlpha(theme.primary, 0.14),
                      borderColor: withAlpha(theme.primary, 0.3),
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={currentMode.icon}
                    size={11}
                    color={theme.primary}
                  />
                  <Text style={[styles.pillText, { color: theme.primary }]}>
                    {currentMode.hint}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.appearanceGrid}>
              {APPEARANCE_OPTIONS.map((opt) => {
                const selected = mode === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setMode(opt.value)}
                    style={({ pressed }) => [
                      styles.appearanceTile,
                      {
                        backgroundColor: selected
                          ? theme.primaryLight
                          : theme.surfaceAlt,
                        borderColor: selected
                          ? theme.primary
                          : theme.borderLight,
                      },
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${opt.label} appearance`}
                  >
                    <View
                      style={[
                        styles.appearanceIcon,
                        {
                          backgroundColor: selected
                            ? theme.primary
                            : withAlpha(theme.textMuted, 0.14),
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={opt.icon}
                        size={20}
                        color={selected ? "#FFFFFF" : theme.textMuted}
                      />
                    </View>
                    <Text
                      style={[
                        styles.appearanceLabel,
                        {
                          color: selected ? theme.primary : theme.textSecondary,
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {selected ? (
                      <View
                        style={[
                          styles.checkBadge,
                          {
                            backgroundColor: theme.primary,
                            borderColor: theme.surface,
                          },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name="check"
                          size={10}
                          color="#FFFFFF"
                        />
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View
            style={[styles.languageGrid, isTablet && styles.languageGridWide]}
          >
            <View style={isTablet ? styles.languageCol : undefined}>
              {renderLanguageCard(
                "INTERFACE",
                "App language",
                "translate",
                "The language used across menus and navigation.",
              )}
            </View>
            <View style={isTablet ? styles.languageCol : undefined}>
              {renderLanguageCard(
                "CONTENT",
                "Learning language",
                "school-outline",
                "Preferred language for lessons and study material.",
              )}
            </View>
          </View>

          <View
            style={[
              styles.footer,
              { backgroundColor: theme.surface, borderColor: theme.borderLight },
            ]}
          >
            <View
              style={[
                styles.footerIcon,
                { backgroundColor: withAlpha(theme.textMuted, 0.12) },
              ]}
            >
              <MaterialCommunityIcons
                name="shield-check-outline"
                size={18}
                color={theme.textMuted}
              />
            </View>
            <View style={styles.footerText}>
              <Text style={[styles.footerTitle, { color: theme.text }]}>
                Yuinx
              </Text>
              <Text style={[styles.footerSubtitle, { color: theme.textMuted }]}>
                Your preferences are saved on this device.
              </Text>
            </View>
            <Text style={[styles.version, { color: theme.textMuted }]}>
              v1.0.0
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
  },
  page: {
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  hero: {
    borderRadius: 28,
    borderWidth: 1,
    overflow: "hidden",
    minHeight: 168,
    justifyContent: "flex-end",
    ...createShadow("#000", 0, 18, 28, 0.18),
    elevation: 10,
  },
  orb: {
    position: "absolute",
    borderRadius: 999,
  },
  orbLarge: {
    width: 220,
    height: 220,
    top: -120,
    right: -40,
  },
  orbSmall: {
    width: 150,
    height: 150,
    bottom: -90,
    left: -30,
  },
  backBtn: {
    position: "absolute",
    top: 14,
    left: 14,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: withAlpha("#000000", 0.22),
    borderWidth: 1,
    borderColor: withAlpha("#FFFFFF", 0.28),
  },
  heroBody: {
    padding: 22,
    gap: 4,
  },
  heroEyebrow: {
    color: withAlpha("#FFFFFF", 0.82),
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.4,
    fontFamily,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.5,
    fontFamily,
  },
  heroSubtitle: {
    color: withAlpha("#FFFFFF", 0.9),
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 19,
    fontFamily,
    maxWidth: 440,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    ...createShadow("#000", 0, 14, 24, 0.12),
    elevation: 8,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  cardHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.1,
    fontFamily,
    marginBottom: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.2,
    fontFamily,
  },
  cardDescription: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
    fontFamily,
    marginTop: 12,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  pillText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
    fontFamily,
  },
  appearanceGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  appearanceTile: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 6,
    borderRadius: 18,
    borderWidth: 1,
    position: "relative",
  },
  appearanceIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  appearanceLabel: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily,
  },
  checkBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  languageGrid: {
    gap: 16,
  },
  languageGridWide: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  languageCol: {
    flex: 1,
    minWidth: 0,
  },
  pillGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  languagePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 40,
  },
  langCodeBadge: {
    minWidth: 24,
    height: 20,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  langCode: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.4,
    fontFamily,
  },
  languagePillText: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    ...createShadow("#000", 0, 8, 16, 0.08),
    elevation: 4,
  },
  footerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  footerText: {
    flex: 1,
    minWidth: 0,
  },
  footerTitle: {
    fontSize: 14,
    fontWeight: "800",
    fontFamily,
  },
  footerSubtitle: {
    fontSize: 11,
    fontWeight: "500",
    fontFamily,
    marginTop: 2,
  },
  version: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
