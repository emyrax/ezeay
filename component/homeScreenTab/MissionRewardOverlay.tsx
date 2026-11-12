import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "../../hooks/useTheme";
import { ConfettiLayer } from "../ConfettiLayer";
import MascotAnimation from "../MascotAnimation";
import ProgressBar from "../ProgressBar";
import type { MissionDef } from "../../store/missionStore";

const MISSION_ACCENTS: Record<MissionDef["key"], string> = {
  checkin: "#27D436",
  bounty: "#F59E0B",
  spin: "#FFD700",
  share: "#38BDF8",
};

interface MissionRewardOverlayProps {
  visible: boolean;
  reward: MissionDef | null;
  doneCount: number;
  total: number;
  cycleBonusClaimed: boolean;
  cycleBonusXp: number;
  onKeepGoing: () => void;
  onNextMission: () => void;
}

export default function MissionRewardOverlay({
  visible,
  reward,
  doneCount,
  total,
  cycleBonusClaimed,
  cycleBonusXp,
  onKeepGoing,
  onNextMission,
}: MissionRewardOverlayProps) {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const accent = reward ? MISSION_ACCENTS[reward.key] : theme.primary;

  const iconScale = useRef(new Animated.Value(0.3)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const rings = useRef([new Animated.Value(0), new Animated.Value(0)]).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible || !reward) return;
    if (Platform.OS !== "web") {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // haptics are best-effort
      }
    }
    backdropOpacity.setValue(0);
    Animated.timing(backdropOpacity, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start();
    iconScale.setValue(0.3);
    Animated.spring(iconScale, {
      toValue: 1,
      friction: 4,
      tension: 120,
      useNativeDriver: true,
    }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();
    rings.forEach((ring, i) => {
      ring.setValue(0);
      Animated.loop(
        Animated.timing(ring, {
          toValue: 1,
          duration: 2400,
          delay: i * 950,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ).start();
    });
  }, [visible, reward, backdropOpacity, iconScale, floatAnim, rings]);

  const ringStyle = (ring: Animated.Value) => ({
    transform: [
      {
        scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.9] }),
      },
    ],
    opacity: ring.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.55, 0.35, 0] }),
  });

  const remaining = Math.max(0, total - doneCount);
  const hasReward = !!reward && (reward.xp > 0 || reward.coins > 0);
  const allDone = doneCount >= total && total > 0;
  const mascotAction = allDone ? "mascot_celebrating" : "mascot_jumping";

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onKeepGoing}>
      <Animated.View style={[styles.backdropWrap, { opacity: backdropOpacity }]}>
        <ConfettiLayer />

        <TouchableOpacity
          style={[
            styles.closeButton,
            { top: insets.top + 12, backgroundColor: theme.surfaceAlt },
          ]}
          onPress={onKeepGoing}
          activeOpacity={0.8}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Close reward celebration"
        >
          <MaterialCommunityIcons name="close" size={22} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.stage}>
            {rings.map((ring, i) => (
              <Animated.View
                key={i}
                style={[styles.ring, { borderColor: accent }, ringStyle(ring)]}
              />
            ))}
            <Animated.View
              style={[
                styles.mascotWrap,
                {
                  transform: [
                    {
                      translateY: floatAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -7],
                      }),
                    },
                    { scale: iconScale },
                  ],
                },
              ]}
            >
              <MascotAnimation
                action={mascotAction}
                height={180}
                style={styles.mascot}
              />
              {reward && (
                <View
                  style={[
                    styles.rewardBadge,
                    { backgroundColor: theme.surface, borderColor: accent },
                  ]}
                >
                  <MaterialCommunityIcons name={reward.icon} size={22} color={accent} />
                </View>
              )}
            </Animated.View>
          </View>

          <Text style={[styles.title, { color: accent }]}>
            {allDone ? "Cycle complete!" : "Mission complete!"}
          </Text>
          {reward && <Text style={[styles.subtitle, { color: theme.text }]}>{reward.title}</Text>}
          {reward && reward.description ? (
            <Text style={[styles.description, { color: theme.textMuted }]}>
              {reward.description}
            </Text>
          ) : null}
          {hasReward && (
            <View
              style={[
                styles.rewardLine,
                { backgroundColor: accent + "1A", borderColor: accent },
              ]}
            >
              <MaterialCommunityIcons name="star" size={18} color={accent} />
              <Text style={[styles.rewardText, { color: accent }]}>
                +{reward!.xp} XP{reward!.coins > 0 ? ` · +${reward!.coins} Coins` : ""}
              </Text>
            </View>
          )}

          <View style={[styles.progressCard, { backgroundColor: theme.surfaceAlt }]}>
            <View style={styles.progressRow}>
              <Text style={[styles.progressLabel, { color: theme.text }]}>
                {doneCount} of {total} missions done
              </Text>
              <Text style={[styles.progressHint, { color: accent }]}>
                {allDone
                  ? cycleBonusClaimed
                    ? `Bonus +${cycleBonusXp} XP claimed`
                    : "Bonus ready!"
                  : `${remaining} to go`}
              </Text>
            </View>
            <ProgressBar
              progress={total > 0 ? doneCount / total : 0}
              trackColor={theme.border}
              filledColors={[accent, theme.accent] as [string, string]}
              height={10}
              borderRadius={5}
            />
            {!allDone && (
              <Text style={[styles.motivation, { color: theme.textMuted }]}>
                Finish everything for a bonus cycle reward.
              </Text>
            )}
          </View>

          <View style={styles.actions}>
            {!allDone && (
              <TouchableOpacity
                style={[styles.secondaryBtn, { backgroundColor: theme.surfaceAlt }]}
                onPress={onNextMission}
                activeOpacity={0.8}
              >
                <Text style={[styles.secondaryLabel, { color: theme.textSecondary }]}>
                  Next mission
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: accent }]}
              onPress={onKeepGoing}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryLabel}>{allDone ? "Awesome" : "Keep going"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdropWrap: {
    flex: 1,
    backgroundColor: "rgba(6, 10, 18, 0.94)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  closeButton: {
    position: "absolute",
    right: 20,
    zIndex: 2,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
  },
  stage: {
    width: 180,
    height: 210,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  ring: {
    position: "absolute",
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 3,
  },
  mascotWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  mascot: {
    borderRadius: 24,
  },
  rewardBadge: {
    position: "absolute",
    right: -8,
    bottom: -8,
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 4,
  },
  description: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 2,
    paddingHorizontal: 4,
  },
  rewardLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 14,
  },
  rewardText: {
    fontSize: 15,
    fontWeight: "800",
  },
  progressCard: {
    width: "100%",
    borderRadius: 16,
    padding: 14,
    marginTop: 20,
    gap: 10,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: "700",
    flexShrink: 1,
  },
  progressHint: {
    fontSize: 12,
    fontWeight: "700",
  },
  motivation: {
    fontSize: 12,
    fontWeight: "500",
  },
  actions: {
    width: "100%",
    marginTop: 20,
    gap: 10,
  },
  primaryBtn: {
    width: "100%",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
  },
  primaryLabel: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryBtn: {
    width: "100%",
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
  },
  secondaryLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
});