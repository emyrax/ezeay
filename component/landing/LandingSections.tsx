import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AFRICAN_COUNTRIES } from "../../data/countries";
import {
  LANDING_FAQS,
  LANDING_FEATURES,
  LANDING_STEPS,
} from "../../data/landing";
import { MAX_LEVEL } from "../../data/levels";
import { SUBJECTS } from "../../data/onboarding";
import { trophyData } from "../../data/trophies";
import {
  landingColors,
  landingFonts,
  landingRadii,
} from "../../constants/landing";
import CountryFlag from "../onboarding/CountryFlag";

const ACCENTS: Record<string, string> = {
  blue: landingColors.blue,
  violet: landingColors.violet,
  green: landingColors.green,
  amber: landingColors.amber,
  pink: landingColors.pink,
};

function contentWidth(width: number) {
  return Math.max(280, Math.min(width - 48, 1180));
}

function columnsFor(width: number, narrow: number, mid: number, wide: number) {
  if (width >= 1080) return wide;
  if (width >= 760) return mid;
  return narrow;
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
}) {
  return (
    <View style={[styles.heading, align === "left" && styles.headingLeft]}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={[styles.headingTitle, align === "left" && styles.headingTitleLeft]}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={[styles.headingSub, align === "left" && styles.headingSubLeft]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

export function MetricStrip() {
  const { width } = useWindowDimensions();
  const columns = columnsFor(width, 2, 4, 4);
  const gap = 12;
  const inner = contentWidth(width);
  const cardWidth = (inner - gap * (columns - 1)) / columns;

  const metrics = [
    { value: `${AFRICAN_COUNTRIES.length}`, label: "African countries" },
    { value: `${SUBJECTS.length}`, label: "subjects to explore" },
    { value: `${MAX_LEVEL}`, label: "levels to climb" },
    { value: `${trophyData.length}`, label: "trophies to unlock" },
  ];

  return (
    <View style={styles.metricSection} nativeID="metrics">
      <View style={[styles.metricRow, { width: inner, gap }]}>
        {metrics.map((metric) => (
          <View key={metric.label} style={[styles.metricCard, { width: cardWidth }]}>
            <Text style={styles.metricValue}>{metric.value}</Text>
            <Text style={styles.metricLabel}>{metric.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function FeaturesSection() {
  const { width } = useWindowDimensions();
  const columns = columnsFor(width, 1, 2, 3);
  const gap = 16;
  const inner = contentWidth(width);
  const cardWidth = (inner - gap * (columns - 1)) / columns;

  return (
    <View style={styles.section} nativeID="features">
      <SectionHeading
        eyebrow="WHY YUINX"
        title="Not another course library. A path with momentum."
        subtitle="Every part of the app is designed to turn a curious moment into a habit you can keep."
      />
      <View style={[styles.grid, { width: inner, gap }]}>
        {LANDING_FEATURES.map((feature) => {
          const accent = ACCENTS[feature.accent] ?? landingColors.blue;
          return (
            <View key={feature.title} style={[styles.featureCard, { width: cardWidth }]}>
              <View style={[styles.featureIcon, { backgroundColor: `${accent}1F` }]}>
                <MaterialCommunityIcons
                  name={feature.icon as never}
                  size={22}
                  color={accent}
                />
              </View>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export function HowItWorksSection() {
  const { width } = useWindowDimensions();
  const columns = columnsFor(width, 1, 3, 3);
  const gap = 16;
  const inner = contentWidth(width);
  const cardWidth = (inner - gap * (columns - 1)) / columns;

  return (
    <View style={styles.section} nativeID="how-it-works">
      <SectionHeading
        eyebrow="HOW IT WORKS"
        title="Three steps from curiosity to momentum."
        subtitle="No placement exam. No overwhelming catalogue. Just a clear starting point."
      />
      <View style={[styles.grid, { width: inner, gap }]}>
        {LANDING_STEPS.map((step, index) => (
          <View key={step.number} style={[styles.stepCard, { width: cardWidth }]}>
            <View style={styles.stepTop}>
              <Text style={styles.stepNumber}>{step.number}</Text>
              {index < LANDING_STEPS.length - 1 ? (
                <MaterialCommunityIcons
                  name="arrow-right"
                  size={18}
                  color={landingColors.textSubtle}
                />
              ) : (
                <MaterialCommunityIcons
                  name="check-circle-outline"
                  size={18}
                  color={landingColors.green}
                />
              )}
            </View>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepDescription}>{step.description}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function AfricaSection() {
  const { width } = useWindowDimensions();
  const columns = columnsFor(width, 2, 4, 6);
  const gap = 10;
  const inner = contentWidth(width);
  const cardWidth = (inner - gap * (columns - 1)) / columns;

  return (
    <View style={styles.africaSection} nativeID="africa">
      <View style={[styles.africaInner, { width: inner }]}>
        <SectionHeading
          eyebrow="BUILT ACROSS AFRICA"
          title="All 54 countries. One place to start."
          subtitle="Country selection is live for every African country, each with its flag. Your context should shape your path."
        />
        <View style={[styles.africaGrid, { gap }]}>
          {AFRICAN_COUNTRIES.map((country) => (
            <View key={country.code} style={[styles.countryChip, { width: cardWidth }]}>
              <CountryFlag country={country} size={28} />
              <Text style={styles.countryName} numberOfLines={1}>
                {country.name}
              </Text>
            </View>
          ))}
        </View>
        <Text style={styles.africaNote}>
          Missing your country? The list is intentionally focused on Africa for
          now. More regions can be added without losing your profile.
        </Text>
      </View>
    </View>
  );
}

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  return (
    <View style={styles.section} nativeID="faq">
      <SectionHeading
        eyebrow="QUESTIONS"
        title="A few things worth knowing."
        subtitle="Straight answers, no fine-print theatre."
      />
      <View style={styles.faqList}>
        {LANDING_FAQS.map((faq, index) => {
          const open = openIndex === index;
          return (
            <Pressable
              key={faq.question}
              onPress={() => setOpenIndex(open ? null : index)}
              style={({ pressed }) => [
                styles.faqItem,
                open && styles.faqItemOpen,
                pressed && { opacity: 0.85 },
              ]}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
            >
              <View style={styles.faqQuestionRow}>
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                <MaterialCommunityIcons
                  name={open ? "minus" : "plus"}
                  size={20}
                  color={open ? landingColors.blueSoft : landingColors.textSubtle}
                />
              </View>
              {open ? <Text style={styles.faqAnswer}>{faq.answer}</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function FinalCta({
  onStart,
  onSignIn,
}: {
  onStart: () => void;
  onSignIn: () => void;
}) {
  return (
    <View style={styles.finalSection}>
      <View style={styles.finalCard}>
        <View style={styles.finalGlow} />
        <Text style={styles.finalEyebrow}>YOUR NEXT LEVEL</Text>
        <Text style={styles.finalTitle}>
          Start with one subject.{"\n"}Keep going with a path.
        </Text>
        <Text style={styles.finalSub}>
          Build a learning habit that knows where you are and where you want to
          go.
        </Text>
        <View style={styles.finalActions}>
          <Pressable
            onPress={onStart}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && { opacity: 0.9 },
            ]}
            accessibilityRole="button"
          >
            <Text style={styles.primaryButtonText}>Start your path</Text>
            <MaterialCommunityIcons
              name="arrow-right"
              size={18}
              color="#FFFFFF"
            />
          </Pressable>
          <Pressable
            onPress={onSignIn}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && { opacity: 0.8 },
            ]}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryButtonText}>I have an account</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingVertical: 86,
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 36,
  },
  heading: {
    alignItems: "center",
    gap: 12,
    maxWidth: 780,
  },
  headingLeft: {
    alignItems: "flex-start",
  },
  eyebrow: {
    color: landingColors.blueSoft,
    fontFamily: landingFonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 2.4,
  },
  headingTitle: {
    color: landingColors.text,
    fontFamily: landingFonts.display,
    fontSize: 40,
    lineHeight: 47,
    letterSpacing: -1.4,
    textAlign: "center",
  },
  headingTitleLeft: {
    textAlign: "left",
  },
  headingSub: {
    color: landingColors.textMuted,
    fontFamily: landingFonts.body,
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
    maxWidth: 620,
  },
  headingSubLeft: {
    textAlign: "left",
  },
  metricSection: {
    paddingHorizontal: 24,
    paddingBottom: 22,
    alignItems: "center",
  },
  metricRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  metricCard: {
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: landingRadii.md,
    borderWidth: 1,
    borderColor: landingColors.border,
    backgroundColor: "rgba(255,255,255,0.03)",
    alignItems: "center",
    gap: 2,
  },
  metricValue: {
    color: landingColors.text,
    fontFamily: landingFonts.heading,
    fontSize: 22,
    letterSpacing: -0.5,
  },
  metricLabel: {
    color: landingColors.textSubtle,
    fontFamily: landingFonts.body,
    fontSize: 10,
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  featureCard: {
    minHeight: 190,
    padding: 22,
    borderRadius: landingRadii.lg,
    borderWidth: 1,
    borderColor: landingColors.border,
    backgroundColor: "rgba(14,21,36,0.72)",
    gap: 13,
  },
  featureIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  featureTitle: {
    color: landingColors.text,
    fontFamily: landingFonts.heading,
    fontSize: 18,
    lineHeight: 23,
  },
  featureDescription: {
    color: landingColors.textMuted,
    fontFamily: landingFonts.body,
    fontSize: 13,
    lineHeight: 20,
  },
  stepCard: {
    padding: 22,
    borderRadius: landingRadii.lg,
    borderWidth: 1,
    borderColor: landingColors.border,
    backgroundColor: "rgba(255,255,255,0.025)",
    gap: 12,
  },
  stepTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepNumber: {
    color: landingColors.blueSoft,
    fontFamily: landingFonts.display,
    fontSize: 30,
    letterSpacing: -1,
  },
  stepTitle: {
    color: landingColors.text,
    fontFamily: landingFonts.heading,
    fontSize: 19,
  },
  stepDescription: {
    color: landingColors.textMuted,
    fontFamily: landingFonts.body,
    fontSize: 13,
    lineHeight: 20,
  },
  africaSection: {
    paddingVertical: 86,
    paddingHorizontal: 24,
    alignItems: "center",
    backgroundColor: "rgba(13,20,34,0.6)",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: landingColors.border,
  },
  africaInner: {
    alignItems: "center",
    gap: 32,
  },
  africaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  countryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: landingRadii.sm,
    borderWidth: 1,
    borderColor: landingColors.border,
    backgroundColor: landingColors.panel,
  },
  countryName: {
    flex: 1,
    color: landingColors.textMuted,
    fontFamily: landingFonts.body,
    fontSize: 10,
  },
  africaNote: {
    color: landingColors.textSubtle,
    fontFamily: landingFonts.body,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
    maxWidth: 520,
  },
  faqList: {
    width: "100%",
    maxWidth: 820,
    gap: 9,
  },
  faqItem: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: landingRadii.md,
    borderWidth: 1,
    borderColor: landingColors.border,
    backgroundColor: "rgba(255,255,255,0.025)",
    gap: 10,
  },
  faqItemOpen: {
    borderColor: "rgba(47,124,255,0.3)",
    backgroundColor: "rgba(47,124,255,0.06)",
  },
  faqQuestionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  faqQuestion: {
    flex: 1,
    color: landingColors.text,
    fontFamily: landingFonts.bodyMedium,
    fontSize: 15,
    lineHeight: 21,
  },
  faqAnswer: {
    color: landingColors.textMuted,
    fontFamily: landingFonts.body,
    fontSize: 13,
    lineHeight: 21,
    maxWidth: 700,
  },
  finalSection: {
    paddingHorizontal: 24,
    paddingVertical: 90,
    alignItems: "center",
  },
  finalCard: {
    width: "100%",
    maxWidth: 1100,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(47,124,255,0.28)",
    backgroundColor: landingColors.panel,
    paddingHorizontal: 28,
    paddingVertical: 54,
    alignItems: "center",
    overflow: "hidden",
    gap: 14,
  },
  finalGlow: {
    position: "absolute",
    top: -180,
    width: 520,
    height: 380,
    borderRadius: 260,
    backgroundColor: "rgba(47,124,255,0.18)",
  },
  finalEyebrow: {
    color: landingColors.blueSoft,
    fontFamily: landingFonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 2.2,
  },
  finalTitle: {
    color: landingColors.text,
    fontFamily: landingFonts.display,
    fontSize: 38,
    lineHeight: 44,
    letterSpacing: -1.2,
    textAlign: "center",
  },
  finalSub: {
    color: landingColors.textMuted,
    fontFamily: landingFonts.body,
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
    maxWidth: 560,
  },
  finalActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    height: 52,
    borderRadius: landingRadii.pill,
    backgroundColor: landingColors.blue,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontFamily: landingFonts.bodySemiBold,
    fontSize: 15,
  },
  secondaryButton: {
    paddingHorizontal: 20,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: landingRadii.pill,
    borderWidth: 1,
    borderColor: landingColors.borderStrong,
  },
  secondaryButtonText: {
    color: landingColors.textMuted,
    fontFamily: landingFonts.bodyMedium,
    fontSize: 14,
  },
});
