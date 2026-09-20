import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { eventBus } from "../lib/eventBus";
import { useThemeColors } from "../hooks/useTheme";

interface ToastMessage {
  id: number;
  title: string;
  xp?: number;
  coins?: number;
  type?: "success" | "error";
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
    const enqueueSuccess = (data: Omit<ToastMessage, "id">) => {
      setQueue((prev) => {
        const newItem: ToastMessage = { ...data, id: ++toastId, type: "success" };
        if (prev.length === 0 && !currentToast) {
          setCurrentToast(newItem);
          return prev;
        }
        return [...prev, newItem];
      });
    };

    const unsubClaim = eventBus.on("bounty:claimed", enqueueSuccess);

    const unsubSuccess = eventBus.on("toast:success", enqueueSuccess);

    const unsubError = eventBus.on("toast:error", (data: { title: string }) => {
      setQueue((prev) => {
        const newItem: ToastMessage = { id: ++toastId, title: data.title, type: "error" };
        if (prev.length === 0 && !currentToast) {
          setCurrentToast(newItem);
          return prev;
        }
        return [...prev, newItem];
      });
    });

    return () => {
      unsubClaim();
      unsubSuccess();
      unsubError();
    };
  }, [currentToast]);

  if (!currentToast) return null;

  const isError = currentToast.type === "error";

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: theme.surface, top: insets.top + 8, borderLeftColor: isError ? theme.danger : "#FFD700", borderLeftWidth: 3 },
        { opacity, transform: [{ translateY }] },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: isError ? (theme.danger + "20") : (theme.primary + "20") }]}>
        <MaterialCommunityIcons
          name={isError ? "alert-circle" : "trophy"}
          size={20}
          color={isError ? theme.danger : "#FFD700"}
        />
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: theme.text }]}>{currentToast.title}</Text>
        {currentToast.xp !== undefined && currentToast.coins !== undefined && (
          <Text style={[styles.reward, { color: "#FFD700" }]}>
            +{currentToast.xp} XP & {currentToast.coins}
          </Text>
        )}
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
    borderRadius: 16,
    padding: 14,
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    zIndex: 9999,
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
