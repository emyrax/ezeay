import { AntDesign, MaterialIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { fontFamily } from "../../constants/themes";
import { useThemeColors } from "../../hooks/useTheme";
import { withAlpha } from "../../lib/color";

interface Props {
  onSignOut: () => void;
  version?: string;
}

export default function ProfileSignOutCard({
  onSignOut,
  version = "1.0.0",
}: Props) {
  const theme = useThemeColors();

  return (
    <View>
      <View
        style={[
          styles.card,
          { backgroundColor: theme.surface, borderColor: theme.borderLight },
        ]}
      >
        <Pressable
          onPress={onSignOut}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          <View
            style={[
              styles.icon,
              { backgroundColor: withAlpha(theme.danger, 0.12) },
            ]}
          >
            <MaterialIcons name="logout" size={19} color={theme.danger} />
          </View>
          <View style={styles.textWrap}>
            <Text style={[styles.title, { color: theme.text }]}>Sign out</Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              Securely end your session on this device
            </Text>
          </View>
          <AntDesign name="right" size={15} color={theme.textMuted} />
        </Pressable>
      </View>
      <Text style={[styles.version, { color: theme.textMuted }]}>
        Yuinx · Version {version}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    gap: 12,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 14,
    fontWeight: "800",
    fontFamily,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: "500",
    fontFamily,
    marginTop: 2,
  },
  version: {
    textAlign: "center",
    fontSize: 11,
    fontWeight: "500",
    fontFamily,
    marginTop: 14,
  },
  pressed: {
    opacity: 0.8,
  },
});
