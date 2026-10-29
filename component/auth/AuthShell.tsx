import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { images } from "../../constants/images";
import {
  landingColors,
  landingFonts,
  landingRadii,
  landingShadows,
} from "../../constants/landing";

interface AuthShellProps {
  children: React.ReactNode;
  backLabel?: string;
  onBack?: () => void;
}

const PERKS = [
  { icon: "compass-outline", label: "A path built around what you want to learn" },
  { icon: "lightning-bolt-outline", label: "Quests and streaks that keep momentum" },
  { icon: "chart-line", label: "Progress you can actually see" },
] as const;

function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <View style={styles.brand}>
      <Image
        source={images.gradientQMark}
        style={{ width: size, height: size }}
        contentFit="contain"
      />
      <Text style={[styles.brandText, size < 30 ? styles.brandTextSmall : null]}>
        Yuinx
      </Text>
    </View>
  );
}

export default function AuthShell({ children, backLabel, onBack }: AuthShellProps) {
  const { width, height } = useWindowDimensions();
  const wide = width >= 1100;
  const tablet = width >= 768;
  const compact = width < 380;
  const short = height < 700;
  const horizontalPadding = compact ? 14 : tablet ? 28 : 20;

  return (
    <View style={styles.page}>
      <View style={styles.orbBlue} pointerEvents="none" />
      <View style={styles.orbViolet} pointerEvents="none" />
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingHorizontal: horizontalPadding, paddingVertical: short ? 20 : 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.layout, wide ? styles.layoutWide : null]}>
            {wide ? (
              <View style={styles.brandPanel}>
                <BrandMark />
                <Text style={styles.headline}>
                  Built around{"\n"}
                  <Text style={styles.headlineAccent}>your curiosity.</Text>
                </Text>
                <Text style={styles.subhead}>
                  Yuinx turns what you want to learn into quests you can finish,
                  with progress that stays visible.
                </Text>
                <View style={styles.perks}>
                  {PERKS.map((perk) => (
                    <View key={perk.label} style={styles.perk}>
                      <View style={styles.perkIcon}>
                        <MaterialCommunityIcons
                          name={perk.icon}
                          size={18}
                          color={landingColors.blueSoft}
                        />
                      </View>
                      <Text style={styles.perkText}>{perk.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <View style={[styles.compactBrand, tablet ? styles.compactBrandTablet : null]}>
                <BrandMark size={tablet ? 34 : 30} />
                {tablet ? (
                  <Text style={styles.compactTagline}>
                    Learn with momentum. Build a path around your curiosity.
                  </Text>
                ) : null}
              </View>
            )}

            <View
              style={[
                styles.card,
                wide ? styles.cardWide : styles.cardNarrow,
                { padding: compact ? 18 : tablet ? 26 : 22 },
              ]}
            >
              {onBack && backLabel ? (
                <Pressable
                  onPress={onBack}
                  style={({ pressed }) => [
                    styles.backLink,
                    pressed ? styles.backLinkPressed : null,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={backLabel}
                >
                  <MaterialCommunityIcons
                    name="arrow-left"
                    size={16}
                    color={landingColors.textMuted}
                  />
                  <Text style={styles.backText}>{backLabel}</Text>
                </Pressable>
              ) : null}
              {children}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: landingColors.bg,
    overflow: "hidden",
  },
  safeArea: {
    flex: 1,
  },
  orbBlue: {
    position: "absolute",
    width: 520,
    height: 520,
    borderRadius: 260,
    backgroundColor: "rgba(47,124,255,0.14)",
    top: -220,
    right: -140,
  },
  orbViolet: {
    position: "absolute",
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: "rgba(124,108,255,0.10)",
    bottom: -220,
    left: -160,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
  },
  layout: {
    width: "100%",
    maxWidth: 460,
    alignSelf: "center",
    alignItems: "stretch",
    gap: 26,
  },
  layoutWide: {
    maxWidth: 1180,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 48,
  },
  brandPanel: {
    flex: 1,
    minWidth: 0,
    maxWidth: 520,
    gap: 20,
  },
  headline: {
    color: landingColors.text,
    fontFamily: landingFonts.display,
    fontSize: 44,
    lineHeight: 50,
    letterSpacing: -1.4,
  },
  headlineAccent: {
    color: landingColors.blueSoft,
  },
  subhead: {
    maxWidth: 430,
    color: landingColors.textMuted,
    fontFamily: landingFonts.body,
    fontSize: 15,
    lineHeight: 23,
  },
  perks: {
    gap: 13,
    marginTop: 6,
  },
  perk: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  perkIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: landingColors.border,
    backgroundColor: "rgba(255,255,255,0.045)",
  },
  perkText: {
    flex: 1,
    color: "rgba(248,250,252,0.82)",
    fontFamily: landingFonts.bodyMedium,
    fontSize: 13,
    lineHeight: 19,
  },
  compactBrand: {
    alignItems: "center",
    gap: 10,
  },
  compactBrandTablet: {
    gap: 12,
  },
  compactTagline: {
    maxWidth: 380,
    color: landingColors.textMuted,
    fontFamily: landingFonts.body,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  brandText: {
    color: landingColors.text,
    fontFamily: landingFonts.heading,
    fontSize: 22,
    letterSpacing: -0.4,
  },
  brandTextSmall: {
    fontSize: 20,
  },
  card: {
    borderRadius: landingRadii.xl,
    borderWidth: 1,
    borderColor: landingColors.border,
    backgroundColor: "rgba(14,21,36,0.96)",
    ...landingShadows.card,
  },
  cardWide: {
    width: 440,
    flexShrink: 0,
  },
  cardNarrow: {
    width: "100%",
    maxWidth: 460,
    alignSelf: "center",
  },
  backLink: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 4,
    marginBottom: 14,
  },
  backLinkPressed: {
    opacity: 0.65,
  },
  backText: {
    color: landingColors.textMuted,
    fontFamily: landingFonts.bodyMedium,
    fontSize: 12,
  },
});
