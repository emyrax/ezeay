import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "../hooks/useTheme";

interface Props {
  visible: boolean;
  title: string;
  xp: number;
  coins: number;
  onDismiss: () => void;
}

export default function GlassmorphismToast({ visible, title, xp, coins, onDismiss }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useThemeColors();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-80)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      if (timer.current) clearTimeout(timer.current);

      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, damping: 12, stiffness: 150, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, damping: 10, stiffness: 180, useNativeDriver: true }),
      ]).start();

      timer.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: -80, duration: 250, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 0.8, duration: 250, useNativeDriver: true }),
        ]).start(() => onDismiss());
      }, 3000);

      return () => {
        if (timer.current) clearTimeout(timer.current);
      };
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 8,
          backgroundColor: theme.glass,
          borderColor: theme.borderLight,
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: theme.success + "25" }]}>
        <Ionicons name="trophy" size={22} color={theme.success} />
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        {xp > 0 || coins > 0 ? (
          <Text style={[styles.reward, { color: theme.warning }]}>
            +{xp} XP & {coins} Coin{coins !== 1 ? "s" : ""}
          </Text>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    elevation: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    zIndex: 9999,
    backdropFilter: "blur(12px)",
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  reward: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 3,
  },
});
