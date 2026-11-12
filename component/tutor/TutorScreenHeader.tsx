import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { fontFamily } from "../../constants/themes";
import { useThemeColors } from "../../hooks/useTheme";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

export interface TutorHeaderAction {
  label: string;
  icon: IconName;
  onPress: () => void;
  accessibilityLabel?: string;
}

interface TutorScreenHeaderProps {
  title: string;
  subtitle?: string;
  leftAction?: TutorHeaderAction;
  rightActions?: TutorHeaderAction[];
}

export function TutorScreenHeader({
  title,
  subtitle,
  leftAction,
  rightActions = [],
}: TutorScreenHeaderProps) {
  const theme = useThemeColors();

  return (
    <View style={[styles.wrap, { borderBottomColor: theme.borderLight }]}>
      <View style={styles.row}>
        {leftAction ? (
          <Pressable
            onPress={leftAction.onPress}
            style={styles.button}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={leftAction.accessibilityLabel ?? leftAction.label}
          >
            <MaterialCommunityIcons
              name={leftAction.icon}
              size={22}
              color={theme.text}
            />
          </Pressable>
        ) : (
          <View style={styles.button} />
        )}

        <View style={styles.copy}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[styles.subtitle, { color: theme.textMuted }]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          {rightActions.map((action) => (
            <Pressable
              key={`${action.label}_${action.icon}`}
              onPress={action.onPress}
              style={styles.button}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={action.accessibilityLabel ?? action.label}
            >
              <MaterialCommunityIcons
                name={action.icon}
                size={20}
                color={theme.textMuted}
              />
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

export default TutorScreenHeader;

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 4,
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    paddingHorizontal: 4,
  },
  title: {
    fontFamily,
    fontSize: 19,
    fontWeight: "700",
  },
  subtitle: {
    fontFamily,
    fontSize: 12,
    marginTop: 1,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
  },
});
