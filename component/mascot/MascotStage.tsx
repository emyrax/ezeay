import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { ImageProps } from "expo-image";
import { useThemeColors } from "../../hooks/useTheme";
import type { GamificationAction } from "../../constants/gamificationImages";
import { MASCOT_META, MASCOT_STAGE_COLORS } from "../../lib/mascot/actions";
import MascotAnimation from "../MascotAnimation";

export type MascotStageVariant = "mark" | "inline" | "stage" | "art";

interface MascotStageProps {
  action: GamificationAction;
  width?: number;
  height?: number;
  stageColor?: string;
  fadeColor?: string;
  fadeSize?: number;
  glow?: boolean;
  variant?: MascotStageVariant;
  contentPosition?: ImageProps["contentPosition"];
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

function transparent(color: string): string {
  return /^#[0-9a-f]{6}$/i.test(color) ? `${color}00` : "transparent";
}

export default function MascotStage({
  action,
  width,
  height,
  stageColor,
  fadeColor: fadeColorProp,
  fadeSize,
  glow = false,
  variant = "stage",
  contentPosition,
  style,
  accessibilityLabel,
}: MascotStageProps) {
  const theme = useThemeColors();
  const meta = MASCOT_META[action];
  const resolvedWidth = width ?? (height ? height * meta.aspectRatio : 120);
  const resolvedHeight = height ?? resolvedWidth / meta.aspectRatio;
  const radius = variant === "mark" ? 14 : variant === "inline" ? 18 : 26;
  const edge = fadeSize ?? (variant === "mark" ? 6 : variant === "inline" ? 18 : 28);
  const fadeColor = fadeColorProp ?? theme.bg;
  const background = stageColor ?? MASCOT_STAGE_COLORS[action] ?? theme.surface;
  const clear = transparent(fadeColor);

  return (
    <View
      style={[
        styles.wrap,
        { width: resolvedWidth, height: resolvedHeight },
        style,
      ]}
      accessibilityLabel={accessibilityLabel}
    >
      {glow ? (
        <View
          pointerEvents="none"
          style={[
            styles.glow,
            {
              width: resolvedWidth * 1.16,
              height: resolvedHeight * 1.16,
              borderRadius: Math.max(resolvedWidth, resolvedHeight) * 0.58,
              backgroundColor: background,
            },
          ]}
        />
      ) : null}

      <View
        style={[
          styles.stage,
          {
            width: resolvedWidth,
            height: resolvedHeight,
            borderRadius: radius,
            backgroundColor: background,
          },
        ]}
      >
        <MascotAnimation
          action={action}
          width={resolvedWidth}
          height={resolvedHeight}
          framed={false}
          contentFit="cover"
          contentPosition={contentPosition}
          accessibilityLabel={accessibilityLabel}
        />

        <LinearGradient
          pointerEvents="none"
          colors={[fadeColor, clear]}
          style={[styles.edge, styles.top, { height: edge }]}
        />
        <LinearGradient
          pointerEvents="none"
          colors={[clear, fadeColor]}
          style={[styles.edge, styles.bottom, { height: edge }]}
        />
        <LinearGradient
          pointerEvents="none"
          colors={[fadeColor, clear]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.edge, styles.left, { width: edge }]}
        />
        <LinearGradient
          pointerEvents="none"
          colors={[clear, fadeColor]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.edge, styles.right, { width: edge }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    opacity: 0.18,
  },
  stage: {
    overflow: "hidden",
  },
  edge: {
    position: "absolute",
  },
  top: {
    top: 0,
    left: 0,
    right: 0,
  },
  bottom: {
    bottom: 0,
    left: 0,
    right: 0,
  },
  left: {
    top: 0,
    bottom: 0,
    left: 0,
  },
  right: {
    top: 0,
    bottom: 0,
    right: 0,
  },
});
