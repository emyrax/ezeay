import React from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { images } from "../../constants/images";
import {
  landingColors,
  landingFonts,
  landingRadii,
} from "../../constants/landing";
import { findAfricanCountry } from "../../data/countries";
import { getProgress } from "../../lib/onboarding/steps";
import type {
  OnboardingAnswers,
  OnboardingStep,
} from "../../types/onboarding";
import { InlineError } from "./primitives";
import CountryFlag from "./CountryFlag";

export default function OnboardingShell({
  step,
  answers,
  children,
  onBack,
  onNext,
  onSkip,
  onExit,
  saving,
  error,
}: {
  step: OnboardingStep;
  answers: OnboardingAnswers;
  children: React.ReactNode;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  onExit: () => void;
  saving: boolean;
  error?: string | null;
}) {
  const { width } = useWindowDimensions();
  const isWide = width >= 1020;
  const progress = getProgress(step.id, answers);
  const country = findAfricanCountry(answers.country);
  const isFirst = step.id === "welcome";
  const isLast = step.id === "ready";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <LinearGradient
        colors={["#07101D", landingColors.bg, "#05070C"]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glowOne} />
      <View style={styles.glowTwo} />

      <View style={styles.topBar}>
        <Pressable
          onPress={onExit}
          style={styles.brand}
          accessibilityRole="button"
          accessibilityLabel="Exit onboarding"
        >
          <Image
            source={images.gradientQMark}
            style={styles.brandMark}
            contentFit="contain"
          />
          <Text style={styles.brandText}>Yuinx</Text>
        </Pressable>

        <View style={styles.topMeta}>
          <Text style={styles.stepCounter}>
            {progress.current} / {progress.total}
          </Text>
          <Pressable
            onPress={onExit}
            style={styles.exitButton}
            accessibilityRole="button"
            accessibilityLabel="Save and exit"
          >
            <Text style={styles.exitText}>Save & exit</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.track}>
        <View style={[styles.trackFill, { width: `${progress.ratio * 100}%` }]} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.body, isWide && styles.bodyWide]}>
          {isWide ? (
            <SidePanel step={step} answers={answers} progress={progress} country={country} />
          ) : null}

          <View style={styles.main}>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={[
                styles.scrollContent,
                isWide && styles.scrollContentWide,
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.contentCard}>{children}</View>
            </ScrollView>

            <View style={styles.footer}>
              <InlineError message={error} />
              <View style={styles.footerRow}>
                <Pressable
                  onPress={onBack}
                  disabled={isFirst}
                  style={({ pressed }) => [
                    styles.backButton,
                    isFirst && styles.backButtonDisabled,
                    pressed && !isFirst && { opacity: 0.7 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                >
                  <MaterialCommunityIcons
                    name="arrow-left"
                    size={19}
                    color={isFirst ? "transparent" : landingColors.textMuted}
                  />
                  <Text
                    style={[
                      styles.backText,
                      isFirst && { color: "transparent" },
                    ]}
                  >
                    Back
                  </Text>
                </Pressable>

                <View style={styles.footerActions}>
                  {step.optional && !isLast ? (
                    <Pressable
                      onPress={onSkip}
                      style={({ pressed }) => [
                        styles.skipButton,
                        pressed && { opacity: 0.7 },
                      ]}
                      accessibilityRole="button"
                    >
                      <Text style={styles.skipText}>Skip</Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    onPress={onNext}
                    disabled={saving}
                    style={({ pressed }) => [
                      styles.nextButton,
                      saving && { opacity: 0.7 },
                      pressed && !saving && { opacity: 0.9 },
                    ]}
                    accessibilityRole="button"
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={styles.nextText}>
                          {isLast ? "Create my account" : "Continue"}
                        </Text>
                        <MaterialCommunityIcons
                          name={isLast ? "arrow-right-circle" : "arrow-right"}
                          size={19}
                          color="#FFFFFF"
                        />
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SidePanel({
  step,
  answers,
  progress,
  country,
}: {
  step: OnboardingStep;
  answers: OnboardingAnswers;
  progress: { current: number; total: number; ratio: number };
  country: ReturnType<typeof findAfricanCountry>;
}) {
  return (
    <View style={styles.side}>
      <View style={styles.sideCard}>
        <View style={styles.sideTop}>
          <View style={styles.sideProgressRing}>
            <Text style={styles.sideProgressValue}>
              {Math.round(progress.ratio * 100)}%
            </Text>
          </View>
          <View style={styles.sideTopText}>
            <Text style={styles.sideEyebrow}>YOUR PATH</Text>
            <Text style={styles.sideTitle}>{step.title}</Text>
          </View>
        </View>

        <View style={styles.sideDivider} />

        <SideRow
          icon="map-marker-outline"
          label="Country"
          value={country?.name ?? "Not chosen"}
        />
        <SideRow
          icon="book-open-page-variant-outline"
          label="Subjects"
          value={
            answers.subjects.length
              ? `${answers.subjects.length} selected`
              : "Not chosen"
          }
        />
        <SideRow
          icon="target"
          label="Goals"
          value={
            answers.learningGoals.length
              ? `${answers.learningGoals.length} selected`
              : "Not chosen"
          }
        />

        {country ? (
          <View style={styles.countryCard}>
            <CountryFlag country={country} size={34} />
            <View style={styles.countryCardText}>
              <Text style={styles.countryCardLabel}>LEARNING FROM</Text>
              <Text style={styles.countryCardValue}>{country.name}</Text>
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.sideNote}>
        <MaterialCommunityIcons
          name="shield-check-outline"
          size={18}
          color={landingColors.green}
        />
        <Text style={styles.sideNoteText}>
          Your answers shape your quests, levels, and course recommendations.
        </Text>
      </View>
    </View>
  );
}

function SideRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.sideRow}>
      <MaterialCommunityIcons
        name={icon as never}
        size={17}
        color={landingColors.textSubtle}
      />
      <Text style={styles.sideLabel}>{label}</Text>
      <Text style={styles.sideValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: landingColors.bg,
  },
  flex: {
    flex: 1,
  },
  glowOne: {
    position: "absolute",
    top: -160,
    right: -120,
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: "rgba(47,124,255,0.16)",
  },
  glowTwo: {
    position: "absolute",
    bottom: -180,
    left: -140,
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: "rgba(124,108,255,0.10)",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 14,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  brandMark: {
    width: 28,
    height: 28,
  },
  brandText: {
    color: landingColors.text,
    fontFamily: landingFonts.heading,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  topMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  stepCounter: {
    color: landingColors.textSubtle,
    fontFamily: landingFonts.bodySemiBold,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  exitButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: landingRadii.pill,
    borderWidth: 1,
    borderColor: landingColors.border,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  exitText: {
    color: landingColors.textMuted,
    fontFamily: landingFonts.bodyMedium,
    fontSize: 12,
  },
  track: {
    height: 2,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginHorizontal: 22,
    borderRadius: 1,
    overflow: "hidden",
  },
  trackFill: {
    height: 2,
    borderRadius: 1,
    backgroundColor: landingColors.blue,
  },
  body: {
    flex: 1,
  },
  bodyWide: {
    flexDirection: "row",
    gap: 54,
    paddingHorizontal: 48,
    paddingTop: 32,
    width: "100%",
    maxWidth: 1280,
    alignSelf: "center",
  },
  side: {
    width: 320,
    paddingTop: 28,
    gap: 18,
  },
  sideCard: {
    borderRadius: landingRadii.lg,
    borderWidth: 1,
    borderColor: landingColors.border,
    backgroundColor: "rgba(14,21,36,0.72)",
    padding: 20,
    gap: 14,
  },
  sideTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  sideProgressRing: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: "rgba(47,124,255,0.5)",
    backgroundColor: "rgba(47,124,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  sideProgressValue: {
    color: landingColors.blueSoft,
    fontFamily: landingFonts.heading,
    fontSize: 14,
  },
  sideTopText: {
    flex: 1,
    gap: 3,
  },
  sideEyebrow: {
    color: landingColors.textSubtle,
    fontFamily: landingFonts.bodySemiBold,
    fontSize: 9,
    letterSpacing: 1.6,
  },
  sideTitle: {
    color: landingColors.text,
    fontFamily: landingFonts.heading,
    fontSize: 15,
    lineHeight: 19,
  },
  sideDivider: {
    height: 1,
    backgroundColor: landingColors.border,
  },
  sideRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  sideLabel: {
    flex: 1,
    color: landingColors.textMuted,
    fontFamily: landingFonts.body,
    fontSize: 12,
  },
  sideValue: {
    maxWidth: 130,
    color: landingColors.textSubtle,
    fontFamily: landingFonts.bodyMedium,
    fontSize: 12,
    textAlign: "right",
  },
  countryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 2,
    padding: 10,
    borderRadius: landingRadii.md,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: landingColors.border,
  },
  countryCardText: {
    flex: 1,
    gap: 2,
  },
  countryCardLabel: {
    color: landingColors.textSubtle,
    fontFamily: landingFonts.bodySemiBold,
    fontSize: 8,
    letterSpacing: 1.2,
  },
  countryCardValue: {
    color: landingColors.text,
    fontFamily: landingFonts.bodyMedium,
    fontSize: 13,
  },
  sideNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    paddingHorizontal: 4,
  },
  sideNoteText: {
    flex: 1,
    color: landingColors.textSubtle,
    fontFamily: landingFonts.body,
    fontSize: 11,
    lineHeight: 16,
  },
  main: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 30,
    paddingBottom: 24,
  },
  scrollContentWide: {
    paddingHorizontal: 0,
    paddingTop: 22,
  },
  contentCard: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },
  footer: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.07)",
    backgroundColor: "rgba(7,10,16,0.86)",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    gap: 12,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingRight: 12,
  },
  backButtonDisabled: {
    opacity: 0,
  },
  backText: {
    color: landingColors.textMuted,
    fontFamily: landingFonts.bodyMedium,
    fontSize: 14,
  },
  footerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  skipButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: landingRadii.pill,
  },
  skipText: {
    color: landingColors.textSubtle,
    fontFamily: landingFonts.bodyMedium,
    fontSize: 14,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minWidth: 154,
    height: 50,
    paddingHorizontal: 22,
    borderRadius: landingRadii.pill,
    backgroundColor: landingColors.blue,
  },
  nextText: {
    color: "#FFFFFF",
    fontFamily: landingFonts.bodySemiBold,
    fontSize: 15,
  },
});
