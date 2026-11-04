import React, { useState } from "react";
import { ImageStyle, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Image, type ImageProps } from "expo-image";
import { appTheme } from "../constants/themes";
import { images } from "../constants/images";
import {
  gamificationImages,
  type GamificationAction,
} from "../constants/gamificationImages";
import {
  MASCOT_LABELS,
  MASCOT_META,
} from "../lib/mascot/actions";

interface MascotAnimationProps {
  action: GamificationAction;
  width?: number;
  height?: number;
  framed?: boolean;
  contentFit?: ImageProps["contentFit"];
  contentPosition?: ImageProps["contentPosition"];
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
}

export default function MascotAnimation({
  action,
  width,
  height,
  framed,
  contentFit = "contain",
  contentPosition,
  style,
  imageStyle,
  accessibilityLabel,
}: MascotAnimationProps) {
  const [failed, setFailed] = useState(false);
  const meta = MASCOT_META[action];
  const resolvedWidth = width ?? (height ? height * meta.aspectRatio : 120);
  const resolvedHeight = height ?? resolvedWidth / meta.aspectRatio;
  const showFrame = framed ?? meta.opaque;

  return (
    <View
      style={[
        styles.container,
        showFrame && styles.frame,
        { width: resolvedWidth, height: resolvedHeight },
        style,
      ]}
    >
      <Image
        source={failed ? images.yuinxLogoTrans : gamificationImages[action]}
        style={[styles.image, imageStyle]}
        contentFit={contentFit}
        contentPosition={contentPosition}
        autoplay
        useAppleWebpCodec={false}
        recyclingKey={action}
        onError={() => setFailed(true)}
        accessibilityLabel={accessibilityLabel ?? MASCOT_LABELS[action]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  frame: {
    backgroundColor: appTheme.bg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: appTheme.border,
    borderRadius: 20,
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
