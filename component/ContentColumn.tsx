import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { CONTENT_WIDTHS, type ContentWidth } from "../constants/layout";
import { useResponsive } from "../hooks/useResponsive";

interface Props {
  children: React.ReactNode;
  width?: ContentWidth;
  style?: StyleProp<ViewStyle>;
}

export default function ContentColumn({ children, width = "wide", style }: Props) {
  const { isWeb } = useResponsive();
  const maxWidth = isWeb && CONTENT_WIDTHS[width] > 0 ? CONTENT_WIDTHS[width] : undefined;

  return (
    <View
      style={[
        styles.base,
        maxWidth !== undefined && { width: "100%", maxWidth, alignSelf: "center" },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
  },
});
