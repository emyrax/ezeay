import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from "react-native";
import Svg, { Line } from "react-native-svg";
import { useThemeColors } from "../hooks/useTheme";

const GRID_SPACING = 40;

interface Props {
  opacity?: number;
}

export default function GridBackground({ opacity = 0.03 }: Props) {
  const theme = useThemeColors();
  const windowSize = useWindowDimensions();
  const [size, setSize] = useState({
    width: windowSize.width,
    height: windowSize.height,
  });

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((prev) =>
      prev.width === width && prev.height === height ? prev : { width, height },
    );
  };

  const lines = useMemo(() => {
    const next: React.ReactNode[] = [];
    const strokeColor = theme.text;

    for (let x = 0; x <= size.width; x += GRID_SPACING) {
      next.push(
        <Line
          key={`v${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={size.height}
          stroke={strokeColor}
          strokeOpacity={opacity}
          strokeWidth={1}
        />,
      );
    }

    for (let y = 0; y <= size.height; y += GRID_SPACING) {
      next.push(
        <Line
          key={`h${y}`}
          x1={0}
          y1={y}
          x2={size.width}
          y2={y}
          stroke={strokeColor}
          strokeOpacity={opacity}
          strokeWidth={1}
        />,
      );
    }

    return next;
  }, [size.width, size.height, theme.text, opacity]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={handleLayout}>
      <Svg width={size.width} height={size.height}>
        {lines}
      </Svg>
    </View>
  );
}
