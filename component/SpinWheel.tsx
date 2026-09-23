import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  Easing,
} from "react-native";
import Svg, { Path, Circle, G, Line, Polygon } from "react-native-svg";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SPIN_SEGMENTS, getRandomOutcome, type SpinOutcome } from "../data/spinOutcomes";
import { useSpinStore } from "../store/spinStore";
import { useUserStore } from "../store/userStore";
import { useMissionStore } from "../store/missionStore";
import { useAuth } from "../contexts/AuthContext";
import { useThemeColors } from "../hooks/useTheme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const WHEEL_SIZE = SCREEN_WIDTH * 0.75;
const WHEEL_RADIUS = WHEEL_SIZE / 2;
const SEGMENT_COUNT = SPIN_SEGMENTS.length;
const SEGMENT_ANGLE = (2 * Math.PI) / SEGMENT_COUNT;

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? "1" : "0";
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

function getSegmentColor(index: number): string {
  return SPIN_SEGMENTS[index].color;
}

type WheelMode = "wheel" | "slots";

export default function SpinWheel() {
  const theme = useThemeColors();
  const router = useRouter();
  const { getToken } = useAuth();
  const { canSpin, useSpin: decrementSpin, wheelVisible, openWheel, closeWheel } = useSpinStore();

  const [mode, setMode] = useState<WheelMode>("wheel");
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SpinOutcome | null>(null);
  const [showResult, setShowResult] = useState(false);

  const spinValue = useRef(new Animated.Value(0)).current;
  const burstScale = useRef(new Animated.Value(0)).current;
  const burstOpacity = useRef(new Animated.Value(0)).current;

  const slotAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  const open = () => {
    setMode(Math.random() < 0.5 ? "wheel" : "slots");
    setResult(null);
    setShowResult(false);
    setSpinning(false);
    spinValue.setValue(0);
    burstScale.setValue(0);
    slotAnims.forEach((a) => a.setValue(0));
    openWheel();
  };

  const close = () => {
    closeWheel();
    setResult(null);
    setShowResult(false);
  };

  const triggerSpin = () => {
    if (spinning || !canSpin()) return;
    const outcome = getRandomOutcome();
    setResult(outcome);
    setSpinning(true);
    decrementSpin();

    if (mode === "wheel") {
      const targetAngle = Math.random() * 360 + 1800;
      Animated.timing(spinValue, {
        toValue: targetAngle,
        duration: 3500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setShowResult(true);
        setSpinning(false);
        playBurst();
      });
    } else {
      const outcomeIndex = SPIN_SEGMENTS.findIndex((s) => s.id === outcome.id);
      const targetPos = outcomeIndex * 60 + 120;
      const reelSpins = 360 + targetPos;
      Animated.sequence([
        Animated.timing(slotAnims[0], {
          toValue: reelSpins,
          duration: 2500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(slotAnims[1], {
          toValue: reelSpins + 30,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(slotAnims[2], {
          toValue: reelSpins + 60,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowResult(true);
        setSpinning(false);
        playBurst();
      });
    }
  };

  const playBurst = () => {
    Animated.parallel([
      Animated.spring(burstScale, { toValue: 1, damping: 8, stiffness: 200, useNativeDriver: true }),
      Animated.timing(burstOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const handleResultAction = async () => {
    if (!result) return;
    useMissionStore
      .getState()
      .markCompleted(
        {
          key: "spin",
          title: "Take a spin",
          icon: "rotate-right",
          description: "You spun the wheel today.",
          xp: 5,
          coins: 0,
        },
        { grant: true, getToken, silent: result.type === "navigate" },
      )
      .catch(() => {});
    if (result.type === "free_spin") {
      setResult(null);
      setShowResult(false);
      burstScale.setValue(0);
      setTimeout(() => triggerSpin(), 300);
      return;
    }
    if (result.type === "reward") {
      const token = await getToken();
      if (token && (result.rewardXp || result.rewardCoins)) {
        useUserStore.getState().addRewards(result.rewardXp ?? 0, result.rewardCoins ?? 0, token);
      }
      close();
      return;
    }
    if (result.type === "navigate") {
      close();
      setTimeout(() => {
        switch (result.navigateTo) {
          case "continue_course":
            router.push("/(tabs)" as any);
            break;
          case "course_plan":
            router.push("/(tabs)" as any);
            break;
          case "review":
            router.push("/(tabs)/stats" as any);
            break;
          case "bounties":
            router.push("/(tabs)/quests" as any);
            break;
          default:
            break;
        }
      }, 200);
    }
  };

  const spinsRemaining = useSpinStore((s) => s.spinsRemaining);

  const segmentPaths = useMemo(() => {
    return SPIN_SEGMENTS.map((_, i) => {
      const startAngle = i * SEGMENT_ANGLE - Math.PI / 2;
      const endAngle = startAngle + SEGMENT_ANGLE;
      return describeArc(WHEEL_RADIUS, WHEEL_RADIUS, WHEEL_RADIUS - 4, startAngle, endAngle);
    });
  }, []);

  const wheelRotate = spinValue.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "360deg"],
  });

  const slotLabel = (index: number) => {
    const seg = SPIN_SEGMENTS[index];
    return (
      <View key={seg.id} style={[slotStyles.reelItem, { backgroundColor: seg.color + "30" }]}>
        <MaterialCommunityIcons name={seg.icon} size={28} color={seg.color} />
        <Text style={[slotStyles.reelLabel, { color: seg.color }]} numberOfLines={1}>
          {seg.label.replace("\n", " ")}
        </Text>
      </View>
    );
  };

  const renderSlotReel = (reelIndex: number) => {
    const items = [...SPIN_SEGMENTS, ...SPIN_SEGMENTS, ...SPIN_SEGMENTS, ...SPIN_SEGMENTS];
    const animatedStyle = {
      transform: [{ translateY: slotAnims[reelIndex] }],
    };
    return (
      <Animated.View style={[slotStyles.reel, animatedStyle]}>
        {items.map((seg, i) => (
          <View key={`${reelIndex}_${i}`} style={[slotStyles.reelItem, { backgroundColor: seg.color + "25" }]}>
            <MaterialCommunityIcons name={seg.icon} size={26} color={seg.color} />
          </View>
        ))}
      </Animated.View>
    );
  };

  return (
    <>
      <Modal visible={wheelVisible} animationType="fade" transparent onRequestClose={close}>
        <View style={[styles.backdrop, { backgroundColor: "rgba(0,0,0,0.85)" }]}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Lucky Spin</Text>
            <Text style={styles.headerSub}>
              {spinsRemaining} spin{spinsRemaining !== 1 ? "s" : ""} remaining today
            </Text>
          </View>

          <View style={styles.wheelContainer}>
            {mode === "wheel" ? (
              <View style={styles.wheelWrap}>
                <View style={styles.pointer}>
                  <MaterialCommunityIcons name="triangle" size={24} color="#FFD700" />
                </View>
                <Animated.View style={{ transform: [{ rotate: wheelRotate }] }}>
                  <Svg width={WHEEL_SIZE} height={WHEEL_SIZE}>
                    {segmentPaths.map((d, i) => (
                      <Path
                        key={i}
                        d={d}
                        fill={getSegmentColor(i)}
                        stroke="rgba(0,0,0,0.3)"
                        strokeWidth={1}
                      />
                    ))}
                    <Circle
                      cx={WHEEL_RADIUS}
                      cy={WHEEL_RADIUS}
                      r={18}
                      fill="#1A1A2E"
                      stroke="#FFD700"
                      strokeWidth={2}
                    />
                  </Svg>
                </Animated.View>
              </View>
            ) : (
              <View style={slotStyles.container}>
                <View style={slotStyles.machine}>
                  <View style={slotStyles.window}>
                    {[0, 1, 2].map((i) => (
                      <View key={i} style={slotStyles.reelCol}>
                        {renderSlotReel(i)}
                      </View>
                    ))}
                    <View style={slotStyles.windowOverlay} />
                  </View>
                  <View style={slotStyles.handle} />
                </View>
              </View>
            )}
          </View>

          {!spinning && !showResult && (
            <TouchableOpacity
              style={[styles.spinBtn, !canSpin() && styles.spinBtnDisabled]}
              onPress={triggerSpin}
              disabled={!canSpin()}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="rotate-right" size={22} color="#FFFFFF" />
              <Text style={styles.spinBtnText}>SPIN</Text>
            </TouchableOpacity>
          )}

          {spinning && (
            <View style={styles.spinningHint}>
              <Text style={styles.spinningText}>Spinning...</Text>
            </View>
          )}

          {showResult && result && (
            <Animated.View
              style={[
                styles.resultCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.borderLight,
                  opacity: burstOpacity,
                  transform: [{ scale: burstScale }],
                },
              ]}
            >
              <View style={[styles.resultIconWrap, { backgroundColor: result.color + "30" }]}>
                <MaterialCommunityIcons name={result.icon} size={40} color={result.color} />
              </View>
              <Text style={[styles.resultLabel, { color: theme.text }]}>{result.label.replace("\n", " ")}</Text>
              {result.type === "reward" && (
                <Text style={[styles.resultDesc, { color: result.color }]}>
                  {result.rewardXp ? `+${result.rewardXp} XP` : `+${result.rewardCoins} Coins`}
                </Text>
              )}
              {result.type === "free_spin" && (
                <Text style={[styles.resultDesc, { color: result.color }]}>Spin Again!</Text>
              )}
              {result.type === "navigate" && (
                <Text style={[styles.resultDesc, { color: theme.textSecondary }]}>
                  Ready to {result.label.replace("\n", " ").toLowerCase()}?
                </Text>
              )}
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: result.color }]}
                onPress={handleResultAction}
                activeOpacity={0.7}
              >
                <Text style={styles.actionBtnText}>
                  {result.type === "free_spin" ? "SPIN AGAIN" : result.type === "reward" ? "CLAIM" : "GO"}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {!spinning && !showResult && (
            <TouchableOpacity style={styles.skipBtn} onPress={close} activeOpacity={0.7}>
              <Text style={[styles.skipText, { color: theme.textMuted }]}>Maybe later</Text>
            </TouchableOpacity>
          )}
        </View>
      </Modal>
      <SpinWheelTrigger open={open} />
    </>
  );
}

function SpinWheelTrigger({ open }: { open: () => void }) {
  const { maybeTrigger, hasSessionTriggered, markSessionTriggered } = useSpinStore();
  const { profile } = useAuth();
  const prevVersion = useRef(useUserStore.getState().xpVersion);

  useEffect(() => {
    useSpinStore.getState().load();
  }, []);

  useEffect(() => {
    const unsub = useUserStore.subscribe((state) => {
      if (state.xpVersion > prevVersion.current) {
        prevVersion.current = state.xpVersion;
      }
    });
    return unsub;
  }, []);

  return null;
}

export function useSpinWheel() {
  return useSpinStore((s) => ({
    canSpin: s.canSpin,
    useSpin: s.useSpin,
    spinsRemaining: s.spinsRemaining,
    maybeTrigger: s.maybeTrigger,
  }));
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: {
    color: "#FFD700",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  headerSub: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },
  wheelContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  wheelWrap: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  pointer: {
    position: "absolute",
    top: -12,
    zIndex: 10,
    transform: [{ rotate: "180deg" }],
  },
  spinBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFD700",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 16,
    elevation: 8,
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  spinBtnDisabled: {
    opacity: 0.4,
  },
  spinBtnText: {
    color: "#1A1A2E",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 2,
  },
  spinningHint: {
    alignItems: "center",
    paddingVertical: 14,
  },
  spinningText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    fontWeight: "600",
  },
  resultCard: {
    width: "100%",
    maxWidth: 300,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
  },
  resultIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  resultLabel: {
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 4,
  },
  resultDesc: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 16,
  },
  actionBtn: {
    width: "100%",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1,
  },
  skipBtn: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  skipText: {
    fontSize: 14,
    fontWeight: "600",
  },
});

const slotStyles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  machine: {
    alignItems: "center",
  },
  window: {
    flexDirection: "row",
    backgroundColor: "#0A0A14",
    borderRadius: 16,
    borderWidth: 3,
    borderColor: "#FFD700",
    padding: 8,
    gap: 4,
    overflow: "hidden",
    position: "relative",
  },
  windowOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: "rgba(255,215,0,0.3)",
    borderRadius: 14,
    pointerEvents: "none",
  },
  reelCol: {
    width: 80,
    height: 140,
    overflow: "hidden",
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  reel: {
    alignItems: "center",
  },
  reelItem: {
    width: 80,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  reelLabel: {
    fontSize: 8,
    fontWeight: "700",
    marginTop: 2,
    textAlign: "center",
  },
  handle: {
    width: 20,
    height: 40,
    backgroundColor: "#FFD700",
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    marginTop: -4,
  },
});
