import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { landingColors, landingFonts } from "../../constants/landing";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

interface AuthFieldProps {
  label: string;
  icon: IconName;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  error?: string;
  secure?: boolean;
  editable?: boolean;
  autoFocus?: boolean;
  autoCapitalize?: TextInputProps["autoCapitalize"];
  autoComplete?: TextInputProps["autoComplete"];
  textContentType?: TextInputProps["textContentType"];
  keyboardType?: TextInputProps["keyboardType"];
  returnKeyType?: TextInputProps["returnKeyType"];
  maxLength?: number;
  onSubmitEditing?: () => void;
  accessibilityHint?: string;
}

export default function AuthField({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  error,
  secure = false,
  editable = true,
  autoFocus = false,
  autoCapitalize = "none",
  autoComplete,
  textContentType,
  keyboardType,
  returnKeyType,
  maxLength,
  onSubmitEditing,
  accessibilityHint,
}: AuthFieldProps) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.wrapper,
          focused && styles.wrapperFocused,
          error ? styles.wrapperError : null,
          !editable ? styles.wrapperDisabled : null,
        ]}
      >
        <MaterialCommunityIcons
          name={icon}
          size={19}
          color={focused ? landingColors.blueSoft : landingColors.textSubtle}
        />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={landingColors.textSubtle}
          style={styles.input}
          secureTextEntry={secure && !revealed}
          editable={editable}
          autoFocus={autoFocus}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          textContentType={textContentType}
          keyboardType={keyboardType}
          returnKeyType={returnKeyType}
          maxLength={maxLength}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={onSubmitEditing}
          accessibilityLabel={label}
          accessibilityHint={accessibilityHint}
          accessibilityState={{ disabled: !editable }}
        />
        {secure ? (
          <Pressable
            onPress={() => setRevealed((current) => !current)}
            hitSlop={10}
            style={styles.revealButton}
            accessibilityRole="button"
            accessibilityLabel={revealed ? "Hide password" : "Show password"}
          >
            <MaterialCommunityIcons
              name={revealed ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={landingColors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 7,
  },
  label: {
    color: landingColors.textMuted,
    fontFamily: landingFonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  wrapper: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: landingColors.border,
    backgroundColor: "rgba(255,255,255,0.045)",
  },
  wrapperFocused: {
    borderColor: "rgba(47,124,255,0.75)",
    backgroundColor: "rgba(47,124,255,0.07)",
  },
  wrapperError: {
    borderColor: "rgba(255,92,92,0.75)",
  },
  wrapperDisabled: {
    opacity: 0.6,
  },
  input: {
    flex: 1,
    minHeight: 52,
    paddingVertical: 14,
    color: landingColors.text,
    fontFamily: landingFonts.body,
    fontSize: 16,
  },
  revealButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  error: {
    color: landingColors.danger,
    fontFamily: landingFonts.body,
    fontSize: 12,
    lineHeight: 17,
  },
});
