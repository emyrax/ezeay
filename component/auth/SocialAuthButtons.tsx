import { AntDesign, FontAwesome } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { landingColors, landingFonts } from "../../constants/landing";

export type OAuthProvider = "google" | "apple" | null;

interface SocialAuthButtonsProps {
  onGoogle: () => void;
  onApple: () => void;
  showApple: boolean;
  loading: OAuthProvider;
  disabled?: boolean;
}

function providerContent(
  provider: "google" | "apple",
  loading: OAuthProvider,
): React.ReactNode {
  if (loading === provider) {
    return <ActivityIndicator size="small" color={landingColors.text} />;
  }
  return (
    <>
      {provider === "google" ? (
        <AntDesign name="google" size={17} color={landingColors.text} />
      ) : (
        <FontAwesome name="apple" size={19} color={landingColors.text} />
      )}
      <Text style={styles.label}>
        {provider === "google" ? "Google" : "Apple"}
      </Text>
    </>
  );
}

export default function SocialAuthButtons({
  onGoogle,
  onApple,
  showApple,
  loading,
  disabled = false,
}: SocialAuthButtonsProps) {
  const busy = loading !== null;
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onGoogle}
        disabled={disabled || busy}
        style={({ pressed }) => [
          styles.button,
          showApple ? styles.buttonHalf : styles.buttonFull,
          pressed ? styles.pressed : null,
          disabled || busy ? styles.disabled : null,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
        accessibilityState={{ disabled: disabled || busy, busy: loading === "google" }}
      >
        {providerContent("google", loading)}
      </Pressable>
      {showApple ? (
        <Pressable
          onPress={onApple}
          disabled={disabled || busy}
          style={({ pressed }) => [
            styles.button,
            styles.buttonHalf,
            pressed ? styles.pressed : null,
            disabled || busy ? styles.disabled : null,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Continue with Apple"
          accessibilityState={{ disabled: disabled || busy, busy: loading === "apple" }}
        >
          {providerContent("apple", loading)}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
  },
  button: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: landingColors.border,
    backgroundColor: "rgba(255,255,255,0.045)",
  },
  buttonHalf: {
    flex: 1,
  },
  buttonFull: {
    width: "100%",
  },
  pressed: {
    backgroundColor: "rgba(255,255,255,0.09)",
  },
  disabled: {
    opacity: 0.55,
  },
  label: {
    color: landingColors.text,
    fontFamily: landingFonts.bodySemiBold,
    fontSize: 14,
  },
});
