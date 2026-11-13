import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";
import { gamificationImages } from "../../constants/gamificationImages";
import { coachColors } from "../../constants/coachTheme";

interface CoachMascotProps {
  size?: number;
  halo?: boolean;
  accessibilityLabel?: string;
}

export default function CoachMascot({
  size = 88,
  halo = false,
  accessibilityLabel = "Yuinx AI coach",
}: CoachMascotProps) {
  const outer = halo ? Math.round(size * 1.34) : size;

  return (
    <View style={[styles.wrap, { width: outer, height: outer }]}>
      {halo ? <View style={styles.halo} /> : null}
      <Image
        source={gamificationImages.mascot_posing}
        style={[
          styles.image,
          {
            width: size,
            height: size,
            borderRadius: size <= 32 ? size / 2 : 0,
          },
        ]}
        contentFit="contain"
        accessibilityLabel={accessibilityLabel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  halo: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 999,
    backgroundColor: coachColors.dark,
    borderWidth: 1,
    borderColor: "rgba(139, 126, 248, 0.45)",
    shadowColor: coachColors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 8,
  },
  image: {
    backgroundColor: "transparent",
  },
});
