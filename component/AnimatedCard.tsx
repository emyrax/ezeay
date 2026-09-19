import React, { useRef } from "react";
import { Animated, type StyleProp, StyleSheet, type ViewStyle } from "react-native";
import { useThemeColors } from "../hooks/useTheme";

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  index?: number;
  staggerDelay?: number;
  glass?: boolean;
  gradientBorder?: boolean;
}

export default function AnimatedCard({
  children,
  style,
  index = 0,
  staggerDelay = 100,
  glass,
  gradientBorder,
}: Props) {
  const theme = useThemeColors();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const scaleAnim = useRef(new Animated.Value(0.96)).current;

  React.useEffect(() => {
    const delay = index * staggerDelay;
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 450,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 450,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 60,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, scaleAnim, index, staggerDelay]);

  return (
    <Animated.View
      style={[
        glass && {
          backgroundColor: theme.glass,
          borderWidth: 1,
          borderColor: theme.border,
          shadowColor: theme.shadow,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 16,
          elevation: 4,
        },
        gradientBorder && {
          borderWidth: 1.5,
          borderColor: theme.primary,
          shadowColor: theme.primary,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.2,
          shadowRadius: 6,
        },
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
          borderRadius: 20,
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}
