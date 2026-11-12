import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TOAST_MAX_WIDTH } from "../constants/layout";
import { eventBus } from "../lib/eventBus";
import { useThemeColors } from "../hooks/useTheme";
import { createShadow } from "@/lib/shadow";

interface ToastMessage {
  id: number;
  title: string;
  xp?: number;
  coins?: number;
  type?: "success" | "error" | "info";
}

let toastId = 0;

export default function Toast() {
  const insets = useSafeAreaInsets();
  const theme = useThemeColors();
  const [currentToast, setCurrentToast] = useState<ToastMessage | null>(null);
  const [queue, setQueue] = useState<ToastMessage[]>([]);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-100)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNext = useCallback(() => {
    setQueue((prev) => {
      if (prev.length === 0) return prev;
      const next = prev[0];
      setCurrentToast(next);
      return prev.slice(1);
    });
  }, []);

  const dismissCurrent = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentToast(null);
      showNext();
    });
  }, [opacity, translateY, showNext]);

  useEffect(() => {
    if (currentToast) {
      opacity.setValue(0);
      translateY.setValue(-100);

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      timer.current = setTimeout(dismissCurrent, 4000);

      return () => {
        if (timer.current) clearTimeout(timer.current);
      };
    }
  }, [currentToast, opacity, translateY, dismissCurrent]);

  useEffect(() => {
    const enqueue = (data: Omit<ToastMessage, "id" | "type">, type: ToastMessage["type"]) => {
      setQueue((prev) => {
        const newItem: ToastMessage = { ...data, id: ++toastId, type };
        if (prev.length === 0 && !currentToast) {
          setCurrentToast(newItem);
          return prev;
        }
        return [...prev, newItem];
      });
    };

    const unsubClaim = eventBus.on("bounty:claimed", (data: Omit<ToastMessage, "id" | "type">) =>
      enqueue(data, "success"),
    );
    const unsubSuccess = eventBus.on("toast:success", (data: Omit<ToastMessage, "id" | "type">) =>
      enqueue(data, "success"),
    );
    const unsubError = eventBus.on("toast:error", (data: { title: string }) =>
      enqueue(data, "error"),
    );
    const unsubInfo = eventBus.on("toast:info", (data: { title: string }) =>
      enqueue(data, "info"),
    );

    return () => {
      unsubClaim();
      unsubSuccess();
      unsubError();
      unsubInfo();
    };
  }, [currentToast]);

  if (!currentToast) return null;

  const tone =
    currentToast.type === "error"
      ? theme.danger
      : currentToast.type === "info"
        ? theme.info
        : "#FFD700";
  const icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"] =
    currentToast.type === "error"
      ? "alert-circle"
      : currentToast.type === "info"
        ? "information"
        : "trophy";

  return (
    <Animated.View
      style={[styles.wrap, { top: insets.top + 8, opacity, transform: [{ translateY }] }]}
      pointerEvents="none"
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.surface,
            borderLeftColor: tone,
          },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: tone + "20" }]}>
          <MaterialCommunityIcons name={icon} size={20} color={tone} />
        </View>
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: theme.text }]}>{currentToast.title}</Text>
          {currentToast.xp !== undefined && currentToast.coins !== undefined && (
            <Text style={[styles.reward, { color: "#FFD700" }]}>
              +{currentToast.xp} XP & {currentToast.coins}
            </Text>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 16,
    zIndex: 9999,
  },
  container: {
    width: "100%",
    maxWidth: TOAST_MAX_WIDTH,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 14,
    borderLeftWidth: 3,
    elevation: 12,
    ...createShadow("#000", 0, 6, 8, 0.35),
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
  },
  reward: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
});
