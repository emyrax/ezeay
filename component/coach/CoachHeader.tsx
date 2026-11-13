import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { images } from "../../constants/images";
import { coachColors, coachFont } from "../../constants/coachTheme";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

interface CoachHeaderProps {
  variant?: "home" | "page";
  title?: string;
  avatarUrl?: string | null;
  onMenu?: () => void;
  onBell?: () => void;
  onAvatar?: () => void;
  onBack?: () => void;
  onMore?: () => void;
}

function CircleButton({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.circle}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <MaterialCommunityIcons
        name={icon}
        size={20}
        color={coachColors.text}
      />
    </Pressable>
  );
}

export default function CoachHeader({
  variant = "page",
  title,
  avatarUrl,
  onMenu,
  onBell,
  onAvatar,
  onBack,
  onMore,
}: CoachHeaderProps) {
  if (variant === "home") {
    return (
      <View style={styles.homeRow}>
        <CircleButton icon="menu" label="Open menu" onPress={onMenu} />
        <View style={styles.homeRight}>
          <CircleButton
            icon="bell-outline"
            label="Open notifications"
            onPress={onBell}
          />
          <Pressable
            onPress={onAvatar}
            style={styles.avatarButton}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
          >
            <Image
              source={avatarUrl ? { uri: avatarUrl } : images.userProfilePhoto}
              style={styles.avatar}
              contentFit="cover"
            />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.pageRow}>
      <CircleButton icon="chevron-left" label="Go back" onPress={onBack} />
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <CircleButton
        icon="dots-vertical"
        label="More options"
        onPress={onMore}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  homeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  homeRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pageRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: coachColors.surface,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: coachColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    padding: 2,
    backgroundColor: coachColors.surface,
    shadowColor: coachColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontFamily: coachFont.semibold,
    fontSize: 17,
    color: coachColors.text,
    paddingHorizontal: 8,
  },
});
