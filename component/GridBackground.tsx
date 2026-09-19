import React from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Svg, { Line } from "react-native-svg";
import { useThemeColors } from "../hooks/useTheme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const GRID_SPACING = 40;

interface Props {
  opacity?: number;
}

export default function GridBackground({ opacity = 0.03 }: Props) {
  const theme = useThemeColors();

  const lines: React.ReactNode[] = [];
  const strokeColor = theme.text;

  for (let x = 0; x <= SCREEN_WIDTH; x += GRID_SPACING) {
    lines.push(
      <Line
        key={`v${x}`}
        x1={x}
        y1={0}
        x2={x}
        y2={SCREEN_HEIGHT}
        stroke={strokeColor}
        strokeOpacity={opacity}
        strokeWidth={1}
      />,
    );
  }

  for (let y = 0; y <= SCREEN_HEIGHT; y += GRID_SPACING) {
    lines.push(
      <Line
        key={`h${y}`}
        x1={0}
        y1={y}
        x2={SCREEN_WIDTH}
        y2={y}
        stroke={strokeColor}
        strokeOpacity={opacity}
        strokeWidth={1}
      />,
    );
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT}>
        {lines}
      </Svg>
    </View>
  );
}
