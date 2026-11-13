import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { coachColors, coachFont } from "../../constants/coachTheme";
import EnergyScoreGauge from "./EnergyScoreGauge";
import HealthCheckInButton from "./HealthCheckInButton";
import LiquidBattery from "./LiquidBattery";
import MetricCard from "./MetricCard";

interface HealthOverviewBoardProps {
  score: number;
  progress: number;
  heart?: string;
  sleep?: string;
  stress?: string;
  onOpen?: () => void;
  onCheckIn?: () => void;
  checkedInToday?: boolean;
  streak?: number;
  checkInAccentColor?: string;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function HealthOverviewBoard({
  score,
  progress,
  heart = "72 bpm",
  sleep = "7h 45m",
  stress = "28 low",
  onOpen,
  onCheckIn,
  checkedInToday = false,
  streak = 0,
  checkInAccentColor,
  compact = false,
  style,
}: HealthOverviewBoardProps) {
  return (
    <LinearGradient
      colors={["#FFFFFF", "#FBFDFF", "#F7FBF8"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, compact && styles.cardCompact, style]}
    >
      <View style={styles.glow} pointerEvents="none" />

      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <View style={styles.kickerRow}>
            <View style={styles.liveDot} />
            <Text style={styles.kicker}>DAILY</Text>
          </View>
          <Text style={styles.title}>Today's health</Text>
        </View>
        <View style={styles.headerActions}>
          {onCheckIn ? (
            <HealthCheckInButton
              onPress={onCheckIn}
              checkedInToday={checkedInToday}
              streak={streak}
              accentColor={checkInAccentColor}
            />
          ) : null}
          {onOpen ? (
            <Pressable
              onPress={onOpen}
              style={styles.arrowButton}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Open health overview"
            >
              <MaterialCommunityIcons
                name="arrow-top-right"
                size={16}
                color={coachColors.white}
              />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.gaugeWrap}>
        <EnergyScoreGauge score={score} />
      </View>

      <View style={styles.metrics}>
        <MetricCard
          label="Heart rate"
          value={heart}
          icon="heart-outline"
          tint={coachColors.heartTint}
          iconColor={coachColors.heartIcon}
          visual={<LiquidBattery progress={progress} />}
        />
        <MetricCard
          label="Sleep"
          value={sleep}
          icon="weather-night"
          tint={coachColors.sleepTint}
          iconColor={coachColors.sleepIcon}
        />
        <MetricCard
          label="Stress"
          value={stress}
          icon="heart-pulse"
          tint={coachColors.stressTint}
          iconColor={coachColors.stressIcon}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    overflow: "hidden",
    shadowColor: coachColors.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 26,
    elevation: 6,
  },
  cardCompact: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
  },
  glow: {
    position: "absolute",
    top: -70,
    right: -50,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(139,126,248,0.10)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  kickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#5BB98C",
  },
  kicker: {
    fontFamily: coachFont.semibold,
    fontSize: 8,
    letterSpacing: 0.9,
    color: coachColors.textMuted,
  },
  title: {
    fontFamily: coachFont.semibold,
    fontSize: 16,
    letterSpacing: -0.25,
    color: coachColors.text,
  },
  arrowButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: coachColors.dark,
    alignItems: "center",
    justifyContent: "center",
  },
  gaugeWrap: {
    alignItems: "center",
    marginTop: 2,
  },
  metrics: {
    flexDirection: "row",
    gap: 7,
    marginTop: 6,
  },
});
