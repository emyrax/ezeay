import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { trophyData } from "../data/trophies";
import { useThemeColors } from "../hooks/useTheme";
import { useUserTrophyStore } from "../store/userTrophyStore";

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  rocket: "rocket",
  book: "book",
  trophy: "trophy",
  star: "star",
  map: "map",
  crown: "flash",
  fire: "bonfire",
  lightning: "thunderstorm",
  target: "locate",
  shield: "shield",
  layers: "layers",
  gem: "diamond",
};

export default function TrophyGridSection() {
  const theme = useThemeColors();
  const trophies = useUserTrophyStore((s) => s.trophies);
  const earnedIds = trophies.map((t) => t.trophyId);

  return (
    <View style={styles.section}>
      <Text style={[styles.title, { color: theme.text }]}>TROPHY CABINET</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        All Achievements
      </Text>

      <View style={styles.grid}>
        {trophyData.map((item) => {
          const unlocked = earnedIds.includes(item.id);
          const iconName = ICON_MAP[item.icon] || "star";
          return (
            <View
              key={item.id}
              style={[styles.item, !unlocked && styles.itemLocked]}
            >
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: unlocked
                      ? theme.surface
                      : theme.surfaceAlt,
                    borderColor: unlocked ? theme.primary : theme.border,
                  },
                ]}
              >
                <Ionicons
                  name={iconName}
                  size={22}
                  color={unlocked ? "#FFFFFF" : theme.textMuted}
                />
                {!unlocked && (
                  <View
                    style={[
                      styles.lockBadge,
                      { backgroundColor: theme.surfaceAlt },
                    ]}
                  >
                    <Ionicons
                      name="lock-closed"
                      size={10}
                      color={theme.textMuted}
                    />
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.itemTitle,
                  { color: theme.text },
                  !unlocked && { color: theme.textMuted },
                ]}
              >
                {item.name}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    marginBottom: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  item: {
    width: "22%",
    alignItems: "center",
  },
  itemLocked: {
    opacity: 0.3,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 2,
  },
  lockBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    borderRadius: 10,
    padding: 3,
    overflow: "hidden",
  },
  itemTitle: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
});
