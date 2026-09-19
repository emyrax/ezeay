import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { StyleSheet, Text, View } from "react-native";
import { bodyFont } from "../../constants/themes";
import { useThemeColors } from "../../hooks/useTheme";

export default function NotesLocalOnlyBanner() {
  const theme = useThemeColors();
  return (
    <View
      style={[
        styles.banner,
        { borderColor: theme.primary + "40", backgroundColor: theme.primary + "14" },
      ]}
    >
      <MaterialCommunityIcons name="cellphone-lock" size={17} color={theme.primary} />
      <Text style={[styles.bannerText, { color: theme.textSecondary }]}>
        Notes are stored on this device only — they don't sync to the cloud.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  bannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
    fontFamily: bodyFont,
    lineHeight: 16,
  },
});
