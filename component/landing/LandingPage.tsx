import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Head from "expo-router/head";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { images } from "../../constants/images";
import {
  landingColors,
  landingFonts,
  landingRadii,
} from "../../constants/landing";
import { AFRICAN_COUNTRIES } from "../../data/countries";
import { LANDING_NAV, LANDING_SUBJECTS } from "../../data/landing";
import {
  AfricaSection,
  FaqSection,
  FeaturesSection,
  FinalCta,
  HowItWorksSection,
  MetricStrip,
} from "./LandingSections";
import HeroVisual from "./HeroVisual";
import CountryFlag from "../onboarding/CountryFlag";

function scrollToSection(id: string) {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export default function LandingPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 980;
  const isCompact = width < 720;
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(22)).current;
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 650,
        useNativeDriver: true,
      }),
      Animated.spring(rise, {
        toValue: 0,
        friction: 9,
        tension: 45,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, rise]);

  const start = () => router.push("/onboarding");
  const signIn = () => router.push("/login");

  return (
    <View style={styles.page}>
      <Head>
        <title>Yuinx — A learning path built around your curiosity</title>
        <meta
          name="description"
          content="Yuinx is a gamified learning companion that builds personalized quests around your curiosity, with streaks, trophies, AI study tools, and offline learning."
        />
        <meta name="theme-color" content="#070A10" />
        <meta property="og:title" content="Yuinx — Learn with momentum" />
        <meta
          property="og:description"
          content="Personalized quests, visible progress, and a learning path that fits your stage."
        />
        <meta property="og:type" content="website" />
      </Head>

      <LinearGradient
        colors={["#07111F", landingColors.bg, "#05070C"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.heroGlowOne} />
      <View style={styles.heroGlowTwo} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.navWrap, { opacity: fade }]}>
          <View style={styles.nav}>
            <Pressable
              onPress={() => scrollToSection("top")}
              style={styles.brand}
              accessibilityRole="button"
              accessibilityLabel="Yuinx home"
            >
              <Image
                source={images.gradientQMark}
                style={styles.brandMark}
                contentFit="contain"
              />
              <Text style={styles.brandText}>Yuinx</Text>
            </Pressable>

            {!isCompact ? (
              <View style={styles.navLinks}>
                {LANDING_NAV.map((item) => (
                  <Pressable
                    key={item.label}
                    onPress={() => scrollToSection(item.href.replace("#", ""))}
                    onHoverIn={() => setHovered(item.label)}
                    onHoverOut={() => setHovered(null)}
                    style={styles.navLink}
                  >
                    <Text
                      style={[
                        styles.navLinkText,
                        hovered === item.label && styles.navLinkTextHover,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <View style={styles.navActions}>
              {!isCompact ? (
                <Pressable onPress={signIn} style={styles.signInButton}>
                  <Text style={styles.signInText}>Sign in</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={start}
                style={({ pressed }) => [
                  styles.navCta,
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Text style={styles.navCtaText}>Get started</Text>
                <MaterialCommunityIcons
                  name="arrow-right"
                  size={16}
                  color="#FFFFFF"
                />
              </Pressable>
            </View>
          </View>
        </Animated.View>

        <View style={styles.hero} nativeID="top">
          <Animated.View
            style={[
              styles.heroInner,
              isWide && styles.heroInnerWide,
              {
                opacity: fade,
                transform: [{ translateY: rise }],
              },
            ]}
          >
            <View style={[styles.heroCopy, isWide && styles.heroCopyWide]}>
              <View style={styles.heroPill}>
                <View style={styles.heroPillDots}>
                  {[AFRICAN_COUNTRIES[25], AFRICAN_COUNTRIES[38], AFRICAN_COUNTRIES[45]].map(
                    (country) =>
                      country ? (
                        <CountryFlag key={country.code} country={country} size={16} />
                      ) : null,
                  )}
                </View>
                <Text style={styles.heroPillText}>
                  Now onboarding across all 54 African countries
                </Text>
              </View>

              <Text style={[styles.heroTitle, isWide && styles.heroTitleWide]}>
                Turn your curiosity into a{" "}
                <Text style={styles.heroHighlight}>path you finish.</Text>
              </Text>

              <Text style={styles.heroSub}>
                Yuinx is a gamified learning companion that builds a path around
                what you want to learn — then helps you show up long enough to
                master it.
              </Text>

              <View style={styles.heroActions}>
                <Pressable
                  onPress={start}
                  style={({ pressed }) => [
                    styles.heroPrimary,
                    pressed && { opacity: 0.9 },
                  ]}
                  accessibilityRole="button"
                >
                  <Text style={styles.heroPrimaryText}>Start your path</Text>
                  <MaterialCommunityIcons
                    name="arrow-right"
                    size={18}
                    color="#FFFFFF"
                  />
                </Pressable>
                <Pressable
                  onPress={signIn}
                  style={({ pressed }) => [
                    styles.heroSecondary,
                    pressed && { opacity: 0.8 },
                  ]}
                  accessibilityRole="button"
                >
                  <Text style={styles.heroSecondaryText}>
                    I already have an account
                  </Text>
                </Pressable>
              </View>

              <View style={styles.trustRow}>
                <TrustItem icon="check-circle" text="Free to start" />
                <TrustItem icon="devices" text="Mobile + web" />
                <TrustItem icon="wifi-off" text="Offline study tools" />
              </View>
            </View>

            <View style={styles.heroVisualWrap}>
              <HeroVisual compact={!isWide} />
            </View>
          </Animated.View>

          <Animated.View style={[styles.subjectWrap, { opacity: fade }]}>
            {LANDING_SUBJECTS.map((subject) => (
              <View key={subject} style={styles.subjectChip}>
                <Text style={styles.subjectText}>{subject}</Text>
              </View>
            ))}
          </Animated.View>
        </View>

        <MetricStrip />
        <FeaturesSection />
        <HowItWorksSection />
        <AfricaSection />
        <FaqSection />
        <FinalCta onStart={start} onSignIn={signIn} />

        <View style={styles.footer}>
          <View style={styles.footerInner}>
            <View style={styles.footerBrand}>
              <View style={styles.footerBrandRow}>
                <Image
                  source={images.gradientQMark}
                  style={styles.footerMark}
                  contentFit="contain"
                />
                <Text style={styles.footerBrandText}>Yuinx</Text>
              </View>
              <Text style={styles.footerTagline}>
                A gamified learning companion built around your curiosity.
              </Text>
              <View style={styles.footerAfrica}>
                <MaterialCommunityIcons
                  name="earth"
                  size={14}
                  color={landingColors.textSubtle}
                />
                <Text style={styles.footerNote}>
                  Built for learners across Africa
                </Text>
              </View>
            </View>

            <View style={styles.footerColumns}>
              <FooterColumn
                title="Product"
                links={[
                  { label: "Features", action: () => scrollToSection("features") },
                  {
                    label: "How it works",
                    action: () => scrollToSection("how-it-works"),
                  },
                  { label: "FAQ", action: () => scrollToSection("faq") },
                ]}
              />
              <FooterColumn
                title="Start"
                links={[
                  { label: "Create an account", action: start },
                  { label: "Sign in", action: signIn },
                ]}
              />
              <FooterColumn
                title="Explore"
                links={[
                  { label: "Subjects", action: () => scrollToSection("features") },
                  { label: "Across Africa", action: () => scrollToSection("africa") },
                ]}
              />
            </View>
          </View>
          <View style={styles.footerBottom}>
            <Text style={styles.footerCopyright}>
              © 2026 Yuinx. Learn with intent.
            </Text>
            <Text style={styles.footerCopyright}>
              Made for curious minds.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function TrustItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.trustItem}>
      <MaterialCommunityIcons
        name={icon as never}
        size={14}
        color={landingColors.green}
      />
      <Text style={styles.trustText}>{text}</Text>
    </View>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; action: () => void }[];
}) {
  return (
    <View style={styles.footerColumn}>
      <Text style={styles.footerColumnTitle}>{title}</Text>
      {links.map((link) => (
        <Pressable
          key={link.label}
          onPress={link.action}
          style={({ pressed }) => pressed && { opacity: 0.7 }}
        >
          <Text style={styles.footerLink}>{link.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: landingColors.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 0,
  },
  heroGlowOne: {
    position: "absolute",
    top: -220,
    right: -160,
    width: 620,
    height: 620,
    borderRadius: 310,
    backgroundColor: "rgba(47,124,255,0.13)",
  },
  heroGlowTwo: {
    position: "absolute",
    top: 520,
    left: -220,
    width: 520,
    height: 520,
    borderRadius: 260,
    backgroundColor: "rgba(124,108,255,0.08)",
  },
  navWrap: {
    paddingHorizontal: 24,
    paddingTop: 18,
    alignItems: "center",
    zIndex: 10,
  },
  nav: {
    width: "100%",
    maxWidth: 1180,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 18,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  brandMark: {
    width: 32,
    height: 32,
  },
  brandText: {
    color: landingColors.text,
    fontFamily: landingFonts.heading,
    fontSize: 20,
    letterSpacing: -0.4,
  },
  navLinks: {
    flexDirection: "row",
    alignItems: "center",
    gap: 26,
  },
  navLink: {
    paddingVertical: 8,
  },
  navLinkText: {
    color: landingColors.textMuted,
    fontFamily: landingFonts.bodyMedium,
    fontSize: 13,
  },
  navLinkTextHover: {
    color: landingColors.text,
  },
  navActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  signInButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  signInText: {
    color: landingColors.textMuted,
    fontFamily: landingFonts.bodyMedium,
    fontSize: 13,
  },
  navCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    height: 40,
    borderRadius: landingRadii.pill,
    backgroundColor: landingColors.blue,
  },
  navCtaText: {
    color: "#FFFFFF",
    fontFamily: landingFonts.bodySemiBold,
    fontSize: 13,
  },
  hero: {
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 26,
    alignItems: "center",
  },
  heroInner: {
    width: "100%",
    maxWidth: 1180,
    alignItems: "center",
    gap: 42,
  },
  heroInnerWide: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 54,
    paddingTop: 24,
  },
  heroCopy: {
    alignItems: "center",
    maxWidth: 650,
    gap: 20,
  },
  heroCopyWide: {
    flex: 1,
    alignItems: "flex-start",
    maxWidth: 600,
  },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: landingRadii.pill,
    borderWidth: 1,
    borderColor: landingColors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  heroPillDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  heroPillText: {
    color: landingColors.textMuted,
    fontFamily: landingFonts.bodyMedium,
    fontSize: 11,
  },
  heroTitle: {
    color: landingColors.text,
    fontFamily: landingFonts.display,
    fontSize: 46,
    lineHeight: 52,
    letterSpacing: -1.8,
    textAlign: "center",
  },
  heroTitleWide: {
    fontSize: 62,
    lineHeight: 66,
    letterSpacing: -2.6,
    textAlign: "left",
  },
  heroHighlight: {
    color: landingColors.blueSoft,
  },
  heroSub: {
    color: landingColors.textMuted,
    fontFamily: landingFonts.body,
    fontSize: 16,
    lineHeight: 25,
    textAlign: "center",
    maxWidth: 560,
  },
  heroActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 2,
  },
  heroPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    height: 52,
    borderRadius: landingRadii.pill,
    backgroundColor: landingColors.blue,
    shadowColor: landingColors.blue,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 22,
    elevation: 8,
  },
  heroPrimaryText: {
    color: "#FFFFFF",
    fontFamily: landingFonts.bodySemiBold,
    fontSize: 15,
  },
  heroSecondary: {
    paddingHorizontal: 18,
    height: 52,
    justifyContent: "center",
    borderRadius: landingRadii.pill,
    borderWidth: 1,
    borderColor: landingColors.borderStrong,
  },
  heroSecondaryText: {
    color: landingColors.textMuted,
    fontFamily: landingFonts.bodyMedium,
    fontSize: 13,
  },
  trustRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    marginTop: 4,
  },
  trustItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  trustText: {
    color: landingColors.textSubtle,
    fontFamily: landingFonts.body,
    fontSize: 11,
  },
  heroVisualWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  subjectWrap: {
    width: "100%",
    maxWidth: 1040,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 58,
  },
  subjectChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: landingRadii.pill,
    borderWidth: 1,
    borderColor: landingColors.border,
    backgroundColor: "rgba(255,255,255,0.025)",
  },
  subjectText: {
    color: landingColors.textSubtle,
    fontFamily: landingFonts.body,
    fontSize: 11,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: landingColors.border,
    backgroundColor: "rgba(5,8,14,0.8)",
    paddingHorizontal: 24,
    paddingTop: 54,
  },
  footerInner: {
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 36,
  },
  footerBrand: {
    maxWidth: 350,
    gap: 12,
  },
  footerBrandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  footerMark: {
    width: 26,
    height: 26,
  },
  footerBrandText: {
    color: landingColors.text,
    fontFamily: landingFonts.heading,
    fontSize: 18,
  },
  footerTagline: {
    color: landingColors.textSubtle,
    fontFamily: landingFonts.body,
    fontSize: 12,
    lineHeight: 19,
  },
  footerAfrica: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  footerNote: {
    color: landingColors.textSubtle,
    fontFamily: landingFonts.body,
    fontSize: 10,
  },
  footerColumns: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 54,
  },
  footerColumn: {
    gap: 9,
  },
  footerColumnTitle: {
    color: landingColors.textMuted,
    fontFamily: landingFonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  footerLink: {
    color: landingColors.textSubtle,
    fontFamily: landingFonts.body,
    fontSize: 12,
  },
  footerBottom: {
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 22,
    marginTop: 34,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  footerCopyright: {
    color: landingColors.textSubtle,
    fontFamily: landingFonts.body,
    fontSize: 10,
  },
});
