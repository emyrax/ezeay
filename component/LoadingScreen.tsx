import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { appTheme, safeFont } from "../constants/themes";
import MascotAnimation from "./MascotAnimation";

interface Props {
  message?: string;
  fullScreen?: boolean;
}

const SCRIM_COLORS = [
  "rgba(4, 16, 34, 0)",
  "rgba(4, 16, 34, 0.12)",
  "rgba(4, 16, 34, 0.78)",
] as const;

export default function LoadingScreen({ message, fullScreen = true }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const messageOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.58, 1],
  });
  const ruleScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.72, 1],
  });

  if (!fullScreen) {
    return (
      <View style={styles.inline}>
        <MascotAnimation
          action="mascot_loading"
          width={90}
          framed={false}
          contentFit="cover"
          style={styles.inlineMascot}
        />
        {message ? <Text style={styles.inlineText}>{message}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.fullScreen}>
      <StatusBar style="light" hidden />
      <MascotAnimation
        action="mascot_loading"
        width={width}
        height={height}
        framed={false}
        contentFit="cover"
        style={styles.bleed}
        accessibilityLabel="Yuinx is loading"
      />
      <LinearGradient
        colors={SCRIM_COLORS}
        locations={[0.42, 0.68, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, 20) + 24 },
        ]}
      >
        <Text style={styles.brand}>YUINX</Text>
        <Animated.View
          style={[styles.rule, { transform: [{ scaleX: ruleScale }] }]}
        />
        {message ? (
          <Animated.Text style={[styles.text, { opacity: messageOpacity }]}>
            {message}
          </Animated.Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    flex: 1,
    backgroundColor: "#041022",
  },
  bleed: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  footer: {
    position: "absolute",
    right: 28,
    bottom: 0,
    left: 28,
    alignItems: "center",
  },
  brand: {
    fontFamily: safeFont,
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: 12,
    color: appTheme.text,
    textAlign: "center",
  },
  rule: {
    width: 54,
    height: 2,
    marginTop: 14,
    marginBottom: 18,
    borderRadius: 1,
    backgroundColor: appTheme.accent,
  },
  text: {
    fontFamily: safeFont,
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.6,
    color: "rgba(255, 255, 255, 0.78)",
    textAlign: "center",
  },
  inline: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  inlineMascot: {
    marginBottom: 12,
    borderRadius: 16,
  },
  inlineText: {
    fontFamily: safeFont,
    fontSize: 14,
    fontWeight: "600",
    color: appTheme.text,
    textAlign: "center",
  },
});
