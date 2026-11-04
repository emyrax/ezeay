import React from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { appTheme, safeFont } from "../constants/themes";
import MascotAnimation from "./MascotAnimation";

interface Props {
  message?: string;
  fullScreen?: boolean;
}

export default function LoadingScreen({ message, fullScreen = true }: Props) {
  const { width } = useWindowDimensions();
  const content = (
    <View style={styles.content}>
      <MascotAnimation
        action="mascot_loading"
        width={Math.min(width * 0.58, 250)}
        style={styles.mascot}
      />
      {message ? <Text style={styles.text}>{message}</Text> : null}
    </View>
  );

  if (fullScreen) {
    return <View style={styles.fullScreen}>{content}</View>;
  }

  return content;
}

const styles = StyleSheet.create({
  fullScreen: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: appTheme.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    width: "100%",
  },
  mascot: {
    marginBottom: 4,
  },
  text: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: "600",
    fontFamily: safeFont,
    color: appTheme.text,
    textAlign: "center",
  },
});
