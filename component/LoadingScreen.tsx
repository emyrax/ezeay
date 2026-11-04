import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { images } from "../constants/images";
import { appTheme, safeFont } from "../constants/themes";

interface Props {
  message?: string;
  fullScreen?: boolean;
}

export default function LoadingScreen({ message, fullScreen = true }: Props) {
  const content = (
    <View style={styles.content}>
      <Image
        source={images.loadingMascot}
        style={styles.mascot}
        contentFit="contain"
        accessibilityLabel="Yuinx mascot loading"
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
    width: "78%",
    maxWidth: 360,
    aspectRatio: 424 / 239,
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
