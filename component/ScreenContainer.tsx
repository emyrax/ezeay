import React from "react";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ContentWidth } from "../constants/layout";
import { useThemeColors } from "../hooks/useTheme";
import ContentColumn from "./ContentColumn";
import GridBackground from "./GridBackground";

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  noGrid?: boolean;
  edges?: ("top" | "bottom" | "left" | "right")[];
  width?: ContentWidth;
}

export default function ScreenContainer({
  children,
  style,
  noGrid,
  edges,
  width = "wide",
}: Props) {
  const theme = useThemeColors();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.bg }]}
      edges={edges ?? ["top"]}
    >
      {!noGrid && <GridBackground />}
      <View style={[styles.content, style]}>
        <ContentColumn width={width}>{children}</ContentColumn>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
