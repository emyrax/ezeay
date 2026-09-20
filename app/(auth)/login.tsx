import { useOAuth } from "@clerk/expo";
import { useSignIn, useSignUp } from "@clerk/expo/legacy";
import {
  AntDesign,
  FontAwesome,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LoadingScreen from "../../component/LoadingScreen";
import { hero, safeFont } from "../../constants/themes";
// Required for Clerk OAuth Web Browser redirects
WebBrowser.maybeCompleteAuthSession();

const brandName = "Yuinx";

function OTPInput({
  code,
  setCode,
}: {
  code: string;
  setCode: (v: string) => void;
}) {
  const inputRef = useRef<TextInput>(null);
  const digits = code.split("").concat(Array(6 - code.length).fill(""));

  return (
    <Pressable onPress={() => inputRef.current?.focus()} style={styles.otpRow}>
      {digits.map((d, i) => (
        <View
          key={i}
          style={[
            styles.otpBox,
            d ? styles.otpBoxFilled : null,
            code.length === i && styles.otpBoxActive,
          ]}
        >
          <Text style={[styles.otpDigit, d ? { color: "#fff" } : null]}>
            {d || ""}
          </Text>
        </View>
      ))}
      <TextInput
        ref={inputRef}
        style={styles.otpHiddenInput}
        value={code}
        onChangeText={(v) => setCode(v.replace(/[^0-9]/g, "").slice(0, 6))}
        keyboardType="number-pad"
        autoCapitalize="none"
        maxLength={6}
      />
    </Pressable>
  );
}

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isExchanging, setIsExchanging] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  // Clerk Authentication hooks
  const {
    signIn,
    setActive: setSignInActive,
    isLoaded: isSignInLoaded,
  } = useSignIn() as any;
  const {
    signUp,
    setActive: setSignUpActive,
    isLoaded: isSignUpLoaded,
  } = useSignUp() as any;

  // Custom Verification Code (OTP) state for Sign Up flow
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  // Clerk useOAuth for Google and Apple social sign ins
  const { startOAuthFlow: startGoogleFlow } = useOAuth({
    strategy: "oauth_google",
  });
  const { startOAuthFlow: startAppleFlow } = useOAuth({
    strategy: "oauth_apple",
  });

  // Mount animation
  const cardSlide = useRef(new Animated.Value(1)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(cardSlide, {
        toValue: 0,
        friction: 8,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [cardSlide, cardOpacity]);

  // Mounted state for animated crossfade between mode switches
  const formFade = useRef(new Animated.Value(1)).current;

  const switchMode = (fn: () => void) => {
    Animated.timing(formFade, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      fn();
      Animated.timing(formFade, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter both email and password.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters.");
      return;
    }

    setIsExchanging(true);
    try {
      if (isSignUp) {
        if (!isSignUpLoaded) {
          Alert.alert("Error", "Sign up is not loaded yet. Please try again.");
          return;
        }

        // Step 1: Start Clerk registration
        await signUp.create({
          emailAddress: email.trim(),
          password,
        });

        // Step 2: Trigger OTP email code verification
        await signUp.verifications.sendEmailCode();
        setPendingVerification(true);
        Alert.alert(
          "Verification Sent",
          "A 6-digit verification code was sent to your email.",
        );
      } else {
        if (!isSignInLoaded) {
          Alert.alert("Error", "Sign in is not loaded yet. Please try again.");
          return;
        }

        const signInAttempt = await signIn.create({
          identifier: email.trim(),
          password,
        });

        if (signInAttempt.status === "complete") {
          await setSignInActive({ session: signInAttempt.createdSessionId });
          setAuthReady(true);
        } else {
          Alert.alert("Sign In Incomplete", `Status: ${signInAttempt.status}`);
        }
      }
    } catch (error: any) {
      console.error("Clerk Email Auth Error:", error);
      const message =
        error.errors?.[0]?.message ||
        error.message ||
        "An authentication error occurred.";
      Alert.alert(isSignUp ? "Registration Failed" : "Login Failed", message);
    } finally {
      setIsExchanging(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      Alert.alert("Error", "Please enter the verification code.");
      return;
    }

    setIsExchanging(true);
    try {
      if (!isSignUpLoaded || !signUp) {
        Alert.alert(
          "Error",
          "Verification service is not ready. Please try again.",
        );
        return;
      }

      const completeSignUp = await signUp.verifications.verifyEmailCode({
        code: verificationCode.trim(),
      });

      if (completeSignUp.status === "complete") {
        await setSignUpActive({ session: completeSignUp.createdSessionId });
        setAuthReady(true);
      } else {
        Alert.alert("Verification Failed", `Status: ${completeSignUp.status}`);
      }
    } catch (error: any) {
      console.error("Clerk OTP Verification Error:", error);
      const message =
        error.errors?.[0]?.message ||
        error.message ||
        "Invalid or expired verification code.";
      Alert.alert("Verification Failed", message);
    } finally {
      setIsExchanging(false);
    }
  };

const handleGoogleLogin = async () => {
    try {
      setIsExchanging(true);
      setAuthReady(false);
      const { createdSessionId, setActive } = await startGoogleFlow();
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        setAuthReady(true);
      } else {
        Alert.alert(
          "Google Login Incomplete",
          "We couldn't finish signing you in. Please try again.",
        );
      }
    } catch (error: any) {
      console.error("Google OAuth Error:", error);
      if (error.code !== "ERR_CANCELED") {
        const message =
          error.errors?.[0]?.message ||
          error.message ||
          "Failed to sign in with Google.";
        Alert.alert("Google Login Failed", message);
      }
    } finally {
      setIsExchanging(false);
    }
  };

  const handleAppleLogin = async () => {
    try {
      setIsExchanging(true);
      setAuthReady(false); // Reset before starting
      const { createdSessionId, setActive } = await startAppleFlow();
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        setAuthReady(true);
      } else {
        Alert.alert(
          "Apple Login Incomplete",
          "We couldn't finish signing you in. Please try again.",
        );
      }
    } catch (error: any) {
      console.error("Apple OAuth Error:", error);
      if (error.code !== "ERR_CANCELED") {
        const message =
          error.errors?.[0]?.message ||
          error.message ||
          "Failed to sign in with Apple.";
        Alert.alert("Apple Login Failed", message);
      }
    } finally {
      setIsExchanging(false);
    }
  };

  return (
    <View style={styles.container}>
      {authReady ? (
        <LoadingScreen message="Signing in..." />
      ) : (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            bounces={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Brand header */}
            <View style={styles.header}>
              <View style={styles.brandWrapper}>
                <View style={styles.brandIconRing}>
                  <MaterialCommunityIcons name="infinity" size={28} color={hero.primary} />
                </View>
                <Text style={styles.brandText}>{brandName}</Text>
              </View>
            </View>

            {/* Card area */}
            <View style={styles.cardContainer}>
              <Animated.View
                style={{
                  transform: [
                    {
                      translateY: cardSlide.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 80],
                      }),
                    },
                  ],
                  opacity: cardOpacity,
                }}
              >
                <View style={styles.gradientBorder}>
                  <LinearGradient
                    colors={[hero.gradientStart, hero.gradientMid, hero.gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradientBorderFill}
                  >
                    <View style={styles.cardInner}>
                      <Animated.View style={{ opacity: formFade }}>
                        {/* Card header */}
                        <View style={styles.cardHeader}>
                          <View>
                            <Text style={styles.title}>
                              {pendingVerification
                                ? "Verify Email"
                                : isSignUp
                                  ? "Create Account"
                                  : "Welcome Back"}
                            </Text>
                            <Text style={styles.subtitle}>
                              {pendingVerification
                                ? "We emailed a 6-digit code"
                                : isSignUp
                                  ? "Enter your details to start"
                                  : "Sign in to continue your progress"}
                            </Text>
                          </View>
                        </View>

                        {isExchanging ? (
                          <LoadingScreen
                            message={
                              pendingVerification
                                ? "Verifying Code..."
                                : isSignUp
                                  ? "Creating Account..."
                                  : "Signing In..."
                            }
                            fullScreen={false}
                          />
                        ) : pendingVerification ? (
                          <>
                            <View style={styles.inputGroup}>
                              <OTPInput
                                code={verificationCode}
                                setCode={setVerificationCode}
                              />
                            </View>

                            <Pressable
                              style={styles.primaryButton}
                              onPress={handleVerifyCode}
                            >
                              <Text style={styles.primaryButtonText}>Verify Email</Text>
                            </Pressable>

                            <Pressable
                              style={styles.toggleAuth}
                              onPress={() => {
                                switchMode(() => setPendingVerification(false));
                              }}
                            >
                              <Text style={styles.toggleText}>
                                Wrong email?{" "}
                                <Text style={styles.toggleAction}>Go Back</Text>
                              </Text>
                            </Pressable>
                          </>
                        ) : (
                          <>
                            <View style={styles.inputGroup}>
                              <View style={styles.inputWrapper}>
                                <MaterialCommunityIcons
                                  name="email-outline"
                                  size={20}
                                  color={hero.textMuted}
                                />
                                <TextInput
                                  style={styles.input}
                                  placeholder="Email Address"
                                  placeholderTextColor={hero.textMuted}
                                  value={email}
                                  onChangeText={setEmail}
                                  autoCapitalize="none"
                                  keyboardType="email-address"
                                />
                              </View>
                            </View>

                            <View style={styles.inputGroup}>
                              <View style={styles.inputWrapper}>
                                <MaterialCommunityIcons
                                  name="lock-outline"
                                  size={20}
                                  color={hero.textMuted}
                                />
                                <TextInput
                                  style={styles.input}
                                  placeholder="Password"
                                  placeholderTextColor={hero.textMuted}
                                  value={password}
                                  onChangeText={setPassword}
                                  secureTextEntry
                                />
                              </View>
                            </View>

                            <Pressable
                              style={styles.primaryButton}
                              onPress={handleEmailAuth}
                            >
                              <Text style={styles.primaryButtonText}>
                                {isSignUp ? "Sign Up" : "Login"}
                              </Text>
                            </Pressable>

                            <Pressable
                              style={styles.toggleAuth}
                              onPress={() => {
                                switchMode(() => setIsSignUp(!isSignUp));
                              }}
                            >
                              <Text style={styles.toggleText}>
                                {isSignUp
                                  ? "Already have an account? "
                                  : "Don't have an account? "}
                                <Text style={styles.toggleAction}>
                                  {isSignUp ? "Login" : "Sign Up"}
                                </Text>
                              </Text>
                            </Pressable>

                            <View style={styles.divider}>
                              <View style={styles.dividerLine} />
                              <Text style={styles.dividerText}>or continue with</Text>
                              <View style={styles.dividerLine} />
                            </View>

                            <View style={styles.socialRow}>
                              <Pressable
                                style={styles.socialButton}
                                onPress={handleGoogleLogin}
                              >
                                <AntDesign name="google" size={18} color="#fff" />
                                <Text style={styles.socialButtonText}>Google</Text>
                              </Pressable>
                              <Pressable
                                style={styles.socialButton}
                                onPress={handleAppleLogin}
                              >
                                <FontAwesome name="apple" size={18} color="#fff" />
                                <Text style={styles.socialButtonText}>Apple</Text>
                              </Pressable>
                            </View>
                          </>
                        )}
                      </Animated.View>

                      <Text style={styles.disclaimer}>
                        By continuing, you agree to our Terms & Conditions and Privacy Policy.
                      </Text>
                    </View>
                  </LinearGradient>
                </View>
              </Animated.View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  brandWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  brandIconRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: hero.primary + "15",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: hero.primary + "30",
  },
  brandText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    fontFamily: safeFont,
  },
  cardContainer: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  gradientBorder: {
    borderRadius: 32,
    overflow: "hidden",
  },
  gradientBorderFill: {
    padding: 1.5,
  },
  cardInner: {
    backgroundColor: "rgba(20, 20, 42, 0.92)",
    borderRadius: 30.5,
    padding: 24,
  },
  cardHeader: {
    paddingBottom: 20,
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    fontFamily: safeFont,
    lineHeight: 36,
    marginBottom: 8,
  },
  subtitle: {
    color: hero.textMuted,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: safeFont,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#fff",
    fontFamily: safeFont,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: hero.primary,
    marginTop: 8,
    marginBottom: 16,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
    fontFamily: safeFont,
  },
  toggleAuth: {
    alignItems: "center",
    marginBottom: 20,
  },
  toggleText: {
    fontSize: 14,
    color: hero.textMuted,
    fontFamily: safeFont,
  },
  toggleAction: {
    color: hero.primary,
    fontWeight: "700",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: hero.textMuted,
    fontFamily: safeFont,
  },
  socialRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
    marginBottom: 18,
  },
  socialButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  socialButtonText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: safeFont,
    fontWeight: "700",
  },
  disclaimer: {
    color: hero.textMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 8,
    fontFamily: safeFont,
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
  },
  otpBox: {
    width: 48,
    height: 56,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  otpBoxFilled: {
    backgroundColor: hero.primary + "20",
    borderColor: hero.primary,
  },
  otpBoxActive: {
    borderColor: hero.primary,
    shadowColor: hero.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  otpDigit: {
    fontSize: 22,
    fontWeight: "700",
    color: hero.textMuted,
    fontFamily: safeFont,
  },
  otpHiddenInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
  },
});
