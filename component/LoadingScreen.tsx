import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { images } from "../constants/images";
import { useThemeColors } from "../hooks/useTheme";
import { safeFont } from "../constants/themes";

interface Props {
  message?: string;
  fullScreen?: boolean;
}

export default function LoadingScreen({ message, fullScreen = true }: Props) {
  const theme = useThemeColors();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [scaleAnim]);

  const content = (
    <View style={styles.content}>
      <Animated.Image
        source={images.yuinxLogoTrans}
        style={[styles.logo, { transform: [{ scale: scaleAnim }] }]}
        resizeMode="contain"
      />
      {message && <Text style={[styles.text, { color: theme.text }]}>{message}</Text>}
    </View>
  );

  if (fullScreen) {
    return <View style={[styles.fullScreen, { backgroundColor: theme.bg }]}>{content}</View>;
  }

  return content;
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  logo: {
    width: 120,
    height: 120,
  },
  text: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: "600",
    fontFamily: safeFont,
  },
});
