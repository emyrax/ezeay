import React, { useRef } from "react";
import { Animated, type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import { useThemeColors } from "../hooks/useTheme";

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  animateOnMount?: boolean;
  delay?: number;
  gradientBorder?: boolean;
}

export default function GlassCard({ children, style, animateOnMount, delay = 0, gradientBorder }: Props) {
  const theme = useThemeColors();
  const fadeAnim = useRef(new Animated.Value(animateOnMount ? 0 : 1)).current;
  const slideAnim = useRef(new Animated.Value(animateOnMount ? 20 : 0)).current;

  React.useEffect(() => {
    if (animateOnMount) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          delay,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [animateOnMount, delay, fadeAnim, slideAnim]);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: theme.glass,
          borderColor: theme.border,
          shadowColor: theme.shadow,
        },
        animateOnMount && {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
        style,
      ]}
    >
      {gradientBorder && (
        <View
          style={[
            styles.gradientBorder,
            {
              borderColor: theme.primary,
              shadowColor: theme.primary,
            },
          ]}
          pointerEvents="none"
        />
      )}
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  gradientBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    opacity: 0.6,
  },
});
