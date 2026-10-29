import React, { useEffect, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { landingColors, landingFonts } from "../../constants/landing";

const OTP_LENGTH = 6;
const GAP = 8;

interface OtpInputProps {
  code: string;
  setCode: (value: string) => void;
  onComplete?: () => void;
  error?: string;
  autoFocus?: boolean;
  editable?: boolean;
}

export default function OtpInput({
  code,
  setCode,
  onComplete,
  error,
  autoFocus = true,
  editable = true,
}: OtpInputProps) {
  const inputRef = useRef<TextInput>(null);
  const lastCompletedRef = useRef("");
  const [rowWidth, setRowWidth] = useState(0);

  const boxWidth = rowWidth
    ? Math.min(48, Math.max(34, Math.floor((rowWidth - GAP * (OTP_LENGTH - 1)) / OTP_LENGTH)))
    : 42;
  const digits = code.split("").concat(Array(OTP_LENGTH - code.length).fill(""));

  useEffect(() => {
    if (code.length === OTP_LENGTH && lastCompletedRef.current !== code) {
      lastCompletedRef.current = code;
      onComplete?.();
    } else if (code.length < OTP_LENGTH) {
      lastCompletedRef.current = "";
    }
  }, [code, onComplete]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const next = Math.floor(event.nativeEvent.layout.width);
    setRowWidth((current) => (current === next ? current : next));
  };

  return (
    <View style={styles.group}>
      <Pressable
        onPress={() => inputRef.current?.focus()}
        onLayout={handleLayout}
        style={styles.row}
        accessibilityRole="none"
      >
        {digits.map((digit, index) => {
          const active = editable && code.length === index;
          return (
            <View
              key={index}
              style={[
                styles.box,
                {
                  width: boxWidth,
                  height: boxWidth + 8,
                  borderRadius: Math.max(10, Math.round(boxWidth * 0.28)),
                },
                digit ? styles.boxFilled : null,
                active ? styles.boxActive : null,
                error ? styles.boxError : null,
              ]}
            >
              <Text style={styles.digit}>{digit || ""}</Text>
            </View>
          );
        })}
        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={(value) =>
            setCode(value.replace(/[^0-9]/g, "").slice(0, OTP_LENGTH))
          }
          style={styles.hiddenInput}
          keyboardType="number-pad"
          inputMode="numeric"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          maxLength={OTP_LENGTH}
          editable={editable}
          autoFocus={autoFocus}
          accessibilityLabel="Verification code"
          accessibilityHint="Enter the 6-digit code sent to your email."
        />
      </Pressable>
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
    gap: 8,
  },
  row: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    gap: GAP,
  },
  box: {
    backgroundColor: "rgba(255,255,255,0.045)",
    borderWidth: 1,
    borderColor: landingColors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  boxFilled: {
    backgroundColor: "rgba(47,124,255,0.14)",
    borderColor: "rgba(47,124,255,0.65)",
  },
  boxActive: {
    borderColor: landingColors.blueSoft,
    backgroundColor: "rgba(47,124,255,0.09)",
  },
  boxError: {
    borderColor: "rgba(255,92,92,0.75)",
  },
  digit: {
    color: landingColors.text,
    fontFamily: landingFonts.heading,
    fontSize: 21,
    lineHeight: 26,
  },
  hiddenInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
  },
  error: {
    color: landingColors.danger,
    fontFamily: landingFonts.body,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
  },
});
