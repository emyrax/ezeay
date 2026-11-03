import {
  AntDesign,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { fontFamily } from "../../constants/themes";
import { useThemeColors } from "../../hooks/useTheme";
import { withAlpha } from "../../lib/color";
import type { UserProfile } from "../../types/user";
import { AVAILABILITY_CONFIG, formatProfileDate, getInitials } from "./profileUtils";

interface Props {
  profile: UserProfile | null;
  avatarUri: string;
  avatarError: boolean;
  uploading: boolean;
  variant?: "stacked" | "row";
  onPickImage: () => void;
  onEdit: () => void;
  onSettings: () => void;
  onShare: () => void;
  onAvatarError?: () => void;
}

export default function ProfileHeroCard({
  profile,
  avatarUri,
  avatarError,
  uploading,
  variant = "stacked",
  onPickImage,
  onEdit,
  onSettings,
  onShare,
  onAvatarError,
}: Props) {
  const theme = useThemeColors();
  const isRow = variant === "row";
  const displayName = profile?.displayName || "Scholar";
  const availability = profile?.availability
    ? AVAILABILITY_CONFIG[profile.availability]
    : null;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.borderLight },
      ]}
    >
      <View style={[styles.banner, isRow && styles.bannerRow]}>
        <LinearGradient
          colors={[theme.gradientStart, theme.gradientMid, theme.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            styles.orb,
            styles.orbLarge,
            { backgroundColor: withAlpha("#FFFFFF", 0.12) },
          ]}
        />
        <View
          style={[
            styles.orb,
            styles.orbSmall,
            { backgroundColor: withAlpha("#FFFFFF", 0.16) },
          ]}
        />
        <View
          style={[
            styles.bannerFade,
            { backgroundColor: withAlpha(theme.bg, 0.18) },
          ]}
        />
        <Pressable
          onPress={onSettings}
          style={({ pressed }) => [
            styles.settingsBtn,
            {
              backgroundColor: withAlpha(theme.bg, 0.35),
              borderColor: withAlpha("#FFFFFF", 0.28),
            },
            pressed && styles.pressed,
          ]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Open settings"
        >
          <MaterialCommunityIcons name="cog-outline" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      <View style={[styles.body, isRow && styles.bodyRow]}>
        <View style={[styles.avatarWrap, isRow && styles.avatarWrapRow]}>
          <View
            style={[
              styles.avatarGlow,
              { backgroundColor: withAlpha(theme.primary, 0.28) },
            ]}
          />
          <View
            style={[
              styles.avatarRing,
              {
                borderColor: theme.surface,
                backgroundColor: theme.surface,
                shadowColor: theme.shadow,
              },
            ]}
          >
            <Pressable
              onPress={onPickImage}
              style={styles.avatarPress}
              accessibilityRole="button"
              accessibilityLabel="Change profile photo"
            >
              {avatarError ? (
                <View
                  style={[
                    styles.avatar,
                    styles.avatarPlaceholder,
                    { backgroundColor: theme.surfaceAlt },
                  ]}
                >
                  {profile?.displayName ? (
                    <Text style={[styles.initials, { color: theme.primary }]}>
                      {getInitials(profile.displayName)}
                    </Text>
                  ) : (
                    <AntDesign name="user" size={38} color={theme.textMuted} />
                  )}
                </View>
              ) : (
                <Image
                  source={{ uri: avatarUri }}
                  style={[styles.avatar, { backgroundColor: theme.surfaceAlt }]}
                  contentFit="cover"
                  transition={150}
                  onError={onAvatarError}
                />
              )}
              <View
                style={[
                  styles.cameraBadge,
                  {
                    backgroundColor: theme.primary,
                    borderColor: theme.surface,
                  },
                ]}
              >
                {uploading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <MaterialIcons name="camera-alt" size={14} color="#fff" />
                )}
              </View>
              {availability ? (
                <View
                  style={[
                    styles.availDot,
                    {
                      backgroundColor: availability.color,
                      borderColor: theme.surface,
                    },
                  ]}
                />
              ) : null}
            </Pressable>
          </View>
        </View>

        <View style={[styles.identity, isRow && styles.identityRow]}>
          <View style={[styles.nameRow, isRow && styles.nameRowRow]}>
            <Text
              style={[
                styles.name,
                isRow && styles.textLeft,
                { color: theme.text },
              ]}
              numberOfLines={2}
            >
              {displayName}
            </Text>
            {profile?.isPro ? (
              <View
                style={[
                  styles.proBadge,
                  { backgroundColor: withAlpha(theme.warning, 0.16) },
                ]}
              >
                <MaterialCommunityIcons
                  name="crown"
                  size={11}
                  color={theme.warning}
                />
                <Text style={[styles.proText, { color: theme.warning }]}>
                  PRO
                </Text>
              </View>
            ) : null}
          </View>

          {profile?.headline ? (
            <Text
              style={[
                styles.headline,
                isRow && styles.textLeft,
                { color: theme.textSecondary },
              ]}
              numberOfLines={2}
            >
              {profile.headline}
            </Text>
          ) : (
            <Text
              style={[
                styles.headline,
                isRow && styles.textLeft,
                { color: theme.textMuted },
              ]}
            >
              Add a headline so people know what you are learning.
            </Text>
          )}

          {profile?.bio ? (
            <Text
              style={[
                styles.bio,
                isRow && styles.textLeft,
                { color: theme.textSecondary },
              ]}
              numberOfLines={isRow ? 3 : 4}
            >
              {profile.bio}
            </Text>
          ) : null}

          <View style={[styles.metaRow, isRow && styles.metaRowRow]}>
            {profile?.location ? (
              <View style={styles.metaChip}>
                <Ionicons
                  name="location-outline"
                  size={13}
                  color={theme.textMuted}
                />
                <Text
                  style={[styles.metaText, { color: theme.textMuted }]}
                  numberOfLines={1}
                >
                  {profile.location}
                </Text>
              </View>
            ) : null}
            {profile?.createdAt ? (
              <View style={styles.metaChip}>
                <Ionicons
                  name="sparkles-outline"
                  size={13}
                  color={theme.textMuted}
                />
                <Text style={[styles.metaText, { color: theme.textMuted }]}>
                  Joined {formatProfileDate(profile.createdAt, "recently")}
                </Text>
              </View>
            ) : null}
          </View>

          {availability ? (
            <View
              style={[
                styles.availBadge,
                {
                  backgroundColor: withAlpha(availability.color, 0.12),
                  borderColor: withAlpha(availability.color, 0.32),
                },
              ]}
            >
              <MaterialCommunityIcons
                name={availability.icon}
                size={12}
                color={availability.color}
              />
              <Text style={[styles.availLabel, { color: availability.color }]}>
                {availability.label}
              </Text>
            </View>
          ) : null}

          <View style={[styles.actions, isRow && styles.actionsRow]}>
            <Pressable
              onPress={onEdit}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Edit profile"
            >
              <LinearGradient
                colors={[theme.primary, theme.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryBtnGradient}
              >
                <MaterialCommunityIcons
                  name="account-edit-outline"
                  size={16}
                  color="#FFFFFF"
                />
                <Text style={styles.primaryBtnText}>Edit profile</Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={onShare}
              style={({ pressed }) => [
                styles.secondaryBtn,
                {
                  backgroundColor: theme.surfaceAlt,
                  borderColor: theme.borderLight,
                },
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Share profile"
            >
              <MaterialCommunityIcons
                name="share-variant-outline"
                size={16}
                color={theme.text}
              />
              <Text style={[styles.secondaryBtnText, { color: theme.text }]}>
                Share
              </Text>
            </Pressable>

            <Pressable
              onPress={onSettings}
              style={({ pressed }) => [
                styles.secondaryBtn,
                {
                  backgroundColor: theme.surfaceAlt,
                  borderColor: theme.borderLight,
                },
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Open settings"
            >
              <MaterialCommunityIcons
                name="cog-outline"
                size={16}
                color={theme.text}
              />
              <Text style={[styles.secondaryBtnText, { color: theme.text }]}>
                Settings
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const AVATAR_SIZE = 104;
const RING_SIZE = AVATAR_SIZE + 14;

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 10,
  },
  banner: {
    height: 124,
    overflow: "hidden",
    position: "relative",
  },
  bannerRow: {
    height: 148,
  },
  orb: {
    position: "absolute",
    borderRadius: 999,
  },
  orbLarge: {
    width: 210,
    height: 210,
    top: -110,
    right: -40,
  },
  orbSmall: {
    width: 130,
    height: 130,
    bottom: -80,
    left: -20,
  },
  bannerFade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  settingsBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    paddingHorizontal: 22,
    paddingBottom: 22,
    alignItems: "center",
  },
  bodyRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 24,
    gap: 20,
  },
  avatarWrap: {
    marginTop: -RING_SIZE / 2 - 6,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarWrapRow: {
    marginTop: -54,
    marginBottom: 4,
  },
  avatarGlow: {
    position: "absolute",
    width: RING_SIZE + 26,
    height: RING_SIZE + 26,
    borderRadius: (RING_SIZE + 26) / 2,
    opacity: 0.55,
  },
  avatarRing: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 8,
  },
  avatarPress: {
    position: "relative",
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontSize: 34,
    fontWeight: "800",
    fontFamily,
  },
  cameraBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  availDot: {
    position: "absolute",
    left: 2,
    bottom: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  identity: {
    width: "100%",
    alignItems: "center",
    marginTop: 12,
  },
  identityRow: {
    flex: 1,
    alignItems: "flex-start",
    marginTop: 0,
    paddingTop: 16,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  nameRowRow: {
    justifyContent: "flex-start",
  },
  textLeft: {
    textAlign: "left",
  },
  name: {
    fontSize: 24,
    fontWeight: "800",
    fontFamily,
    letterSpacing: -0.3,
    textAlign: "center",
  },
  proBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  proText: {
    fontSize: 9,
    fontWeight: "800",
    fontFamily,
    letterSpacing: 0.6,
  },
  headline: {
    fontSize: 14,
    fontWeight: "500",
    fontFamily,
    textAlign: "center",
    marginTop: 4,
  },
  bio: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily,
    textAlign: "center",
    marginTop: 10,
    maxWidth: 520,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    marginTop: 12,
  },
  metaRowRow: {
    justifyContent: "flex-start",
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    maxWidth: 260,
  },
  metaText: {
    fontSize: 12,
    fontWeight: "500",
    fontFamily,
  },
  availBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 12,
  },
  availLabel: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 18,
    width: "100%",
  },
  actionsRow: {
    justifyContent: "flex-start",
  },
  primaryBtn: {
    borderRadius: 999,
    overflow: "hidden",
  },
  primaryBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    fontFamily,
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});
