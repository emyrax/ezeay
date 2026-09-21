import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "../hooks/useTheme";
import { useCheckInStore } from "../store/checkInStore";
import { useUserStore } from "../store/userStore";

interface CheckInDialogProps {
  visible: boolean;
  onClose: () => void;
  getToken: () => Promise<string | null>;
}

function getRewardPreview(streak: number): { xp: number; coins: number } {
  const nextStreak = streak + 1;
  if (nextStreak <= 3) return { xp: 10, coins: 5 };
  if (nextStreak <= 7) return { xp: 25, coins: 10 };
  if (nextStreak <= 14) return { xp: 50, coins: 20 };
  return { xp: 100, coins: 50 };
}

export default function CheckInDialog({ visible, onClose, getToken }: CheckInDialogProps) {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const profile = useUserStore((s) => s.profile);
  const lastCheckInDate = useCheckInStore((s) => s.lastCheckInDate);
  const currentStreak = useCheckInStore((s) => s.currentStreak);
  const longestStreak = useCheckInStore((s) => s.longestStreak);
  const checkIn = useCheckInStore((s) => s.checkIn);

  const [checkingIn, setCheckingIn] = useState(false);
  const [justCheckedIn, setJustCheckedIn] = useState(false);
  const [reward, setReward] = useState({ xp: 0, coins: 0 });

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      setJustCheckedIn(false);
      Animated.spring(scaleAnim, { toValue: 1, damping: 12, useNativeDriver: true }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [visible]);

  const today = new Date().toISOString().slice(0, 10);
  const alreadyCheckedIn = lastCheckInDate === today;
  const nextReward = getRewardPreview(currentStreak);

  const miniCalendar = useCallback(() => {
    const days: { date: string; checked: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
      days.push({ date: dateStr, checked: dateStr === lastCheckInDate || false });
    }
    return days;
  }, [lastCheckInDate]);

  const handleCheckIn = useCallback(async () => {
    if (!profile) return;
    setCheckingIn(true);
    const result = await checkIn(profile.uid, getToken);
    setCheckingIn(false);
    if (result.success) {
      setJustCheckedIn(true);
      setReward({ xp: result.xpReward, coins: result.coinReward });
    }
  }, [profile, checkIn, getToken]);

  const weekDays = miniCalendar();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View
          style={[styles.dialog, { backgroundColor: theme.surface, transform: [{ scale: scaleAnim }], paddingTop: insets.top + 20 }]}
        >
          <Pressable onPress={() => {}}>
            <View style={styles.header}>
              <View style={[styles.fireCircle, { backgroundColor: theme.primary + "20" }]}>
                <MaterialCommunityIcons name="fire" size={36} color={theme.primary} />
              </View>
              <Text style={[styles.title, { color: theme.text }]}>Daily Check-In</Text>
            </View>

            <View style={styles.streakRow}>
              <Animated.View style={alreadyCheckedIn ? undefined : { transform: [{ scale: pulseAnim }] }}>
                <Text style={[styles.streakNumber, { color: theme.primary }]}>
                  {justCheckedIn ? currentStreak : currentStreak || 0}
                </Text>
              </Animated.View>
              <Text style={[styles.streakLabel, { color: theme.textSecondary }]}>day streak</Text>
            </View>

            {longestStreak > 0 && (
              <Text style={[styles.longest, { color: theme.textMuted }]}>
                Best: {longestStreak} days
              </Text>
            )}

            {justCheckedIn ? (
              <View style={[styles.rewardBanner, { backgroundColor: theme.success + "20", borderColor: theme.success }]}>
                <MaterialCommunityIcons name="check-circle" size={20} color={theme.success} />
                <Text style={[styles.rewardText, { color: theme.success }]}>
                  +{reward.xp} XP & +{reward.coins} Coins
                </Text>
              </View>
            ) : alreadyCheckedIn ? (
              <View style={[styles.statusBanner, { backgroundColor: theme.primary + "15", borderColor: theme.primary }]}>
                <MaterialCommunityIcons name="check" size={18} color={theme.primary} />
                <Text style={[styles.statusText, { color: theme.primary }]}>Checked in today</Text>
              </View>
            ) : (
              <>
                <Pressable
                  style={[styles.checkInBtn, { backgroundColor: theme.primary, opacity: checkingIn ? 0.6 : 1 }]}
                  onPress={handleCheckIn}
                  disabled={checkingIn}
                >
                  <MaterialCommunityIcons name="fire" size={22} color="#FFFFFF" />
                  <Text style={styles.checkInBtnText}>
                    {checkingIn ? "Checking in..." : "Check In"}
                  </Text>
                </Pressable>

                <View style={[styles.previewCard, { backgroundColor: theme.surfaceAlt }]}>
                  <Text style={[styles.previewLabel, { color: theme.textMuted }]}>Tomorrow’s reward</Text>
                  <View style={styles.previewRow}>
                    <View style={styles.previewItem}>
                      <MaterialCommunityIcons name="star" size={16} color={theme.warning} />
                      <Text style={[styles.previewValue, { color: theme.text }]}>+{nextReward.xp} XP</Text>
                    </View>
                    <View style={styles.previewItem}>
                      <MaterialCommunityIcons name="gold" size={16} color={theme.warning} />
                      <Text style={[styles.previewValue, { color: theme.text }]}>+{nextReward.coins} Coins</Text>
                    </View>
                  </View>
                </View>
              </>
            )}

            <View style={styles.calendarSection}>
              <Text style={[styles.calendarTitle, { color: theme.textMuted }]}>Last 7 days</Text>
              <View style={styles.calendarRow}>
                {weekDays.map((day, i) => (
                  <View key={i} style={styles.calendarDay}>
                    <View
                      style={[
                        styles.calendarDot,
                        { backgroundColor: day.checked ? theme.primary : theme.border },
                      ]}
                    />
                  </View>
                ))}
              </View>
            </View>

            {alreadyCheckedIn && (
              <View style={styles.nextRewardSection}>
                <Text style={[styles.nextRewardText, { color: theme.textMuted }]}>
                  Check in tomorrow for +{nextReward.xp} XP & +{nextReward.coins} Coins
                </Text>
              </View>
            )}

            <Pressable style={[styles.closeBtn, { borderColor: theme.border }]} onPress={onClose}>
              <Text style={[styles.closeBtnText, { color: theme.textSecondary }]}>Close</Text>
            </Pressable>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  dialog: {
    width: "85%",
    maxWidth: 340,
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  fireCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginBottom: 4,
  },
  streakNumber: {
    fontSize: 48,
    fontWeight: "900",
  },
  streakLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  longest: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 16,
  },
  rewardBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 12,
    alignSelf: "stretch",
  },
  rewardText: {
    fontSize: 14,
    fontWeight: "700",
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 12,
    alignSelf: "stretch",
  },
  statusText: {
    fontSize: 14,
    fontWeight: "700",
  },
  checkInBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginBottom: 12,
    alignSelf: "stretch",
  },
  checkInBtnText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
  previewCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    alignSelf: "stretch",
    gap: 8,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  previewRow: {
    flexDirection: "row",
    gap: 20,
  },
  previewItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  previewValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  calendarSection: {
    alignSelf: "stretch",
    marginBottom: 16,
  },
  calendarTitle: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  calendarRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  calendarDay: {
    alignItems: "center",
  },
  calendarDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  nextRewardSection: {
    alignSelf: "stretch",
    alignItems: "center",
    marginBottom: 12,
  },
  nextRewardText: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  closeBtn: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 24,
    alignSelf: "stretch",
    alignItems: "center",
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
