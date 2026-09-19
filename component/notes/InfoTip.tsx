import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useThemeColors } from "../../hooks/useTheme";
import { bodyFont } from "../../constants/themes";

interface InfoTipProps {
  lines: string[];
  open: boolean;
  onToggle: () => void;
  anchor?: "left" | "right";
  closeSignal?: boolean;
  wrapStyle?: object;
}

export default function InfoTip({
  lines,
  open,
  onToggle,
  anchor = "right",
  closeSignal = false,
  wrapStyle,
}: InfoTipProps) {
  const theme = useThemeColors();
  const anim = useRef(new Animated.Value(0)).current;
  const prevCloseSignal = useRef(closeSignal);

  useEffect(() => {
    if (closeSignal && open && !prevCloseSignal.current) {
      onToggle();
    }
    prevCloseSignal.current = closeSignal;
  }, [closeSignal, open, onToggle]);

  useEffect(() => {
    Animated.spring(anim, {
      toValue: open ? 1 : 0,
      useNativeDriver: true,
      damping: 20,
      stiffness: 280,
      mass: 0.7,
    }).start();
  }, [open, anim]);

  return (
    <View style={[styles.wrap, anchor === "right" ? styles.anchorRight : styles.anchorLeft, wrapStyle]}>
      <Pressable
        onPress={onToggle}
        accessibilityLabel="Help"
        hitSlop={8}
        style={({ pressed }) => [
          styles.iconBtn,
          { backgroundColor: theme.surfaceAlt, borderColor: theme.borderLight },
          pressed && styles.pressed,
        ]}
      >
        <Text style={[styles.iconText, { color: theme.textSecondary }]}>i</Text>
      </Pressable>
      {open && (
        <Animated.View
          style={[
            styles.card,
            anchor === "right" ? styles.cardRight : styles.cardLeft,
            {
              backgroundColor: theme.surface,
              borderColor: theme.borderLight,
              opacity: anim,
              transform: [
                { scale: anim },
                { translateY: Animated.multiply(anim, -3) },
              ],
            },
          ]}
        >
          {lines.map((line, i) => (
            <View key={i} style={styles.row}>
              <View style={[styles.dot, { backgroundColor: theme.primary }]} />
              <Text style={[styles.line, { color: theme.text }]}>{line}</Text>
            </View>
          ))}
        </Animated.View>
      )}
    </View>
  );
}

const CARD_WIDTH = 244;

const styles = StyleSheet.create({
  wrap: {
    zIndex: 30,
  },
  anchorRight: {
    alignItems: "flex-end",
  },
  anchorLeft: {
    alignItems: "flex-start",
  },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: 13,
    fontWeight: "800",
    fontStyle: "italic",
    fontFamily: bodyFont,
  },
  pressed: { opacity: 0.6 },
  card: {
    position: "absolute",
    top: 34,
    width: CARD_WIDTH,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
  },
  cardRight: { right: 0 },
  cardLeft: { left: 0 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  line: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 17,
    fontFamily: bodyFont,
  },
});