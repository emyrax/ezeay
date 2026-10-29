import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { images } from "../../constants/images";
import {
  landingColors,
  landingFonts,
  landingRadii,
} from "../../constants/landing";

export default function HeroVisual({ compact = false }: { compact?: boolean }) {
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 3600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 3600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [float]);

  const translate = float.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  const width = compact ? 310 : 430;
  const height = compact ? 390 : 470;

  return (
    <View style={[styles.wrap, { width, height }]}>
      <View style={styles.glow} />
      <Animated.View
        style={[
          styles.frame,
          compact && styles.frameCompact,
          { transform: [{ translateY: translate }] },
        ]}
      >
        <View style={styles.frameTop}>
          <View style={styles.avatar}>
            <Image
              source={images.gradientQMark}
              style={styles.avatarImage}
              contentFit="contain"
            />
          </View>
          <View style={styles.frameTopText}>
            <Text style={styles.frameEyebrow}>YOUR CAMP</Text>
            <Text style={styles.frameName}>Level 6 · Scholar</Text>
          </View>
          <View style={styles.onlineDot} />
        </View>

        <View style={styles.xpCard}>
          <View style={styles.xpTop}>
            <Text style={styles.xpLabel}>Next level</Text>
            <Text style={styles.xpValue}>720 / 1,750 XP</Text>
          </View>
          <View style={styles.xpTrack}>
            <View style={styles.xpFill} />
          </View>
        </View>

        <View style={styles.statsRow}>
          <MiniStat icon="fire" value="7" label="day streak" tone="amber" />
          <MiniStat icon="trophy" value="12" label="trophies" tone="violet" />
          <MiniStat icon="diamond-stone" value="840" label="coins" tone="green" />
        </View>

        <View style={styles.questCard}>
          <View style={styles.questIcon}>
            <MaterialCommunityIcons
              name="rocket-launch-outline"
              size={19}
              color={landingColors.blueSoft}
            />
          </View>
          <View style={styles.questText}>
            <Text style={styles.questEyebrow}>TODAY&apos;S QUEST</Text>
            <Text style={styles.questTitle} numberOfLines={1}>
              Continue: Intro to Python
            </Text>
            <View style={styles.questTrack}>
              <View style={styles.questFill} />
            </View>
          </View>
          <Text style={styles.questPercent}>62%</Text>
        </View>

        <View style={styles.mascotWrap}>
          <Image
            source={images.researching}
            style={styles.mascot}
            contentFit="contain"
          />
        </View>
      </Animated.View>

      <Animated.View
        style={[
          styles.floatCard,
          styles.floatStreak,
          { transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, 8] }) }] },
        ]}
      >
        <MaterialCommunityIcons
          name="fire"
          size={18}
          color={landingColors.amber}
        />
        <Text style={styles.floatText}>Keep the streak alive</Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.floatCard,
          styles.floatXp,
          { transform: [{ translateY: translate }] },
        ]}
      >
        <MaterialCommunityIcons
          name="star-four-points"
          size={17}
          color={landingColors.violet}
        />
        <Text style={styles.floatText}>+120 XP earned</Text>
      </Animated.View>
    </View>
  );
}

function MiniStat({
  icon,
  value,
  label,
  tone,
}: {
  icon: string;
  value: string;
  label: string;
  tone: "amber" | "violet" | "green";
}) {
  const color =
    tone === "amber"
      ? landingColors.amber
      : tone === "violet"
        ? landingColors.violet
        : landingColors.green;
  return (
    <View style={styles.miniStat}>
      <MaterialCommunityIcons name={icon as never} size={16} color={color} />
      <Text style={styles.miniStatValue}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    width: "86%",
    height: "86%",
    borderRadius: 999,
    backgroundColor: "rgba(47,124,255,0.14)",
  },
  frame: {
    width: 330,
    height: 430,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: landingColors.borderStrong,
    backgroundColor: landingColors.panel,
    padding: 18,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.45,
    shadowRadius: 48,
    elevation: 16,
  },
  frameCompact: {
    width: 290,
    height: 390,
    padding: 15,
  },
  frameTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: "hidden",
    backgroundColor: "rgba(47,124,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(47,124,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 28,
    height: 28,
  },
  frameTopText: {
    flex: 1,
    gap: 2,
  },
  frameEyebrow: {
    color: landingColors.textSubtle,
    fontFamily: landingFonts.bodySemiBold,
    fontSize: 8,
    letterSpacing: 1.5,
  },
  frameName: {
    color: landingColors.text,
    fontFamily: landingFonts.heading,
    fontSize: 14,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: landingColors.green,
  },
  xpCard: {
    marginTop: 18,
    padding: 12,
    borderRadius: landingRadii.md,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: landingColors.border,
    gap: 8,
  },
  xpTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  xpLabel: {
    color: landingColors.textMuted,
    fontFamily: landingFonts.body,
    fontSize: 10,
  },
  xpValue: {
    color: landingColors.text,
    fontFamily: landingFonts.bodySemiBold,
    fontSize: 10,
  },
  xpTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  xpFill: {
    width: "62%",
    height: "100%",
    borderRadius: 3,
    backgroundColor: landingColors.blue,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  miniStat: {
    flex: 1,
    borderRadius: landingRadii.md,
    borderWidth: 1,
    borderColor: landingColors.border,
    backgroundColor: "rgba(255,255,255,0.03)",
    paddingVertical: 9,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 1,
  },
  miniStatValue: {
    color: landingColors.text,
    fontFamily: landingFonts.heading,
    fontSize: 14,
  },
  miniStatLabel: {
    color: landingColors.textSubtle,
    fontFamily: landingFonts.body,
    fontSize: 8,
  },
  questCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 10,
    padding: 11,
    borderRadius: landingRadii.md,
    borderWidth: 1,
    borderColor: "rgba(47,124,255,0.28)",
    backgroundColor: "rgba(47,124,255,0.08)",
  },
  questIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "rgba(47,124,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  questText: {
    flex: 1,
    gap: 3,
  },
  questEyebrow: {
    color: landingColors.blueSoft,
    fontFamily: landingFonts.bodySemiBold,
    fontSize: 8,
    letterSpacing: 1.2,
  },
  questTitle: {
    color: landingColors.text,
    fontFamily: landingFonts.bodyMedium,
    fontSize: 11,
  },
  questTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    marginTop: 2,
  },
  questFill: {
    width: "62%",
    height: "100%",
    borderRadius: 2,
    backgroundColor: landingColors.blueSoft,
  },
  questPercent: {
    color: landingColors.blueSoft,
    fontFamily: landingFonts.bodySemiBold,
    fontSize: 10,
  },
  mascotWrap: {
    position: "absolute",
    right: -12,
    bottom: -20,
    width: 150,
    height: 130,
    opacity: 0.95,
  },
  mascot: {
    width: "100%",
    height: "100%",
  },
  floatCard: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: landingRadii.pill,
    borderWidth: 1,
    borderColor: landingColors.borderStrong,
    backgroundColor: landingColors.panelRaised,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  floatStreak: {
    left: 0,
    bottom: 70,
  },
  floatXp: {
    right: 4,
    top: 58,
  },
  floatText: {
    color: landingColors.text,
    fontFamily: landingFonts.bodyMedium,
    fontSize: 11,
  },
});
