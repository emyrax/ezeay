import React from "react";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
} from "react-native";
import {
  getWordRevealDelay,
  splitMotionWords,
  type LessonMotionPreset,
} from "../../lib/lesson/motion";
import MotionReveal from "./MotionReveal";

interface Props {
  text: string;
  preset: LessonMotionPreset;
  enabled: boolean;
  replayKey?: string | number;
  delay?: number;
  align?: "center" | "left";
  textStyle?: StyleProp<TextStyle>;
}

export default function AnimatedWords({
  text,
  preset,
  enabled,
  replayKey,
  delay = 0,
  align = "center",
  textStyle,
}: Props) {
  const animate = enabled && preset.wordReveal;
  const words = splitMotionWords(text);

  if (!animate || words.length === 0) {
    return <Text style={textStyle}>{text}</Text>;
  }

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={text}
      style={[
        styles.row,
        align === "center" ? styles.rowCenter : styles.rowLeft,
      ]}
    >
      {words.map((word, index) => (
        <MotionReveal
          key={`${index}-${word}`}
          preset={preset}
          enabled
          replayKey={replayKey}
          delay={delay + getWordRevealDelay(index, preset.stagger)}
          direction="up"
          distance={preset.distance * 0.55}
          scaleFrom={Math.max(0.9, preset.scaleFrom)}
        >
          <Text style={textStyle}>{word}</Text>
        </MotionReveal>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 8,
  },
  rowCenter: {
    justifyContent: "center",
  },
  rowLeft: {
    justifyContent: "flex-start",
  },
});
