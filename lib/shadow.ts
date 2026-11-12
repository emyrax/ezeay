import { Platform, type TextStyle, type ViewStyle } from "react-native";
import { withAlpha } from "./color";

type WebTextShadow = { textShadow?: string };

export function createShadow(
  color: string,
  offsetX: number,
  offsetY: number,
  radius: number,
  opacity: number,
): ViewStyle {
  if (Platform.OS === "web") {
    return { boxShadow: `${offsetX}px ${offsetY}px ${radius}px ${withAlpha(color, opacity)}` };
  }

  return {
    shadowColor: color,
    shadowOffset: { width: offsetX, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: radius,
  };
}

export function createTextShadow(
  color: string,
  offsetX: number,
  offsetY: number,
  radius: number,
): TextStyle {
  if (Platform.OS === "web") {
    const webStyle: WebTextShadow = {
      textShadow: `${offsetX}px ${offsetY}px ${radius}px ${color}`,
    };
    return webStyle as TextStyle;
  }

  return {
    textShadowColor: color,
    textShadowOffset: { width: offsetX, height: offsetY },
    textShadowRadius: radius,
  };
}
