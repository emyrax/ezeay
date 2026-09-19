import React from "react";
import { Platform } from "react-native";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type MaterialName = keyof typeof MaterialCommunityIcons.glyphMap;
type SfWeight =
  | "ultraLight"
  | "thin"
  | "light"
  | "regular"
  | "medium"
  | "semibold"
  | "bold"
  | "heavy"
  | "black";

interface ThemeIconProps {
  sf: string;
  material: MaterialName;
  size?: number;
  color?: string;
  weight?: SfWeight;
}

export default function ThemeIcon({
  sf,
  material,
  size = 18,
  color = "#000000",
  weight = "regular",
}: ThemeIconProps) {
  if (Platform.OS === "ios") {
    return (
      <SymbolView
        name={sf as SymbolViewProps["name"]}
        size={size}
        weight={weight as SymbolViewProps["weight"]}
        tintColor={color}
      />
    );
  }
  return <MaterialCommunityIcons name={material} size={size} color={color} />;
}