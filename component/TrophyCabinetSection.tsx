import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../hooks/useTheme";

const TROPHY_ITEMS: {
  icon: keyof typeof Ionicons.glyphMap;
  name: string;
  unlocked: boolean;
}[] = [
  { icon: "flame", name: "7-Day Streak", unlocked: true },
  { icon: "star", name: "First Quiz", unlocked: true },
  { icon: "trophy", name: "Top Scorer", unlocked: true },
  { icon: "diamond", name: "All Stars", unlocked: false },
  { icon: "rocket", name: "Speed Demon", unlocked: false },
  { icon: "shield", name: "Iron Will", unlocked: false },
  { icon: "map", name: "Explorer", unlocked: false },
  { icon: "layers", name: "Master", unlocked: false },
];

export default function TrophyCabinetSection() {
  const theme = useThemeColors();

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Trophy Cabinet</Text>
      <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
        Your achievements & milestones
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {TROPHY_ITEMS.map((item) => {
          const IconComponent = Ionicons;
          return (
            <View key={item.name} style={styles.trophyCard}>
              <IconComponent
                name={item.icon}
                size={32}
                color={item.unlocked ? theme.primary : theme.textMuted}
              />
              <Text
                style={[
                  styles.trophyTitle,
                  !item.unlocked && { color: theme.textMuted },
                ]}
              >
                {item.name}
              </Text>
              <Text style={[styles.trophySubtitle, { color: theme.textMuted }]}>
                {item.unlocked ? "Unlocked" : "Locked"}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginBottom: 16,
  },
  scroll: {
    paddingRight: 16,
    gap: 12,
  },
  trophyCard: {
    width: 100,
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
  },
  trophyTitle: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  trophySubtitle: {
    fontSize: 10,
    fontWeight: "500",
  },
});
