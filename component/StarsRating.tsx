import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import ThemeIcon from "./notes/ThemeIcon";

interface StarsRatingProps {
  value: number | null;
  onChange: (value: number) => void;
  size?: number;
  color: string;
  emptyColor: string;
  disabled?: boolean;
}

export default function StarsRating({
  value,
  onChange,
  size = 16,
  color,
  emptyColor,
  disabled = false,
}: StarsRatingProps) {
  const handlePress = (star: number) => {
    if (disabled) return;
    onChange(star === value ? 0 : star);
  };

  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (value ?? 0);
        return (
          <Pressable
            key={star}
            onPress={() => handlePress(star)}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={`Rate ${star} out of 5`}
          >
            <ThemeIcon
              sf={filled ? "star.fill" : "star"}
              material={filled ? "star" : "star-outline"}
              size={size}
              color={filled ? color : emptyColor}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
});