import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Head from "expo-router/head";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AuthField from "../../component/auth/AuthField";
import AuthShell from "../../component/auth/AuthShell";
import OtpInput from "../../component/auth/OtpInput";
import SocialAuthButtons from "../../component/auth/SocialAuthButtons";
import LoadingScreen from "../../component/LoadingScreen";
import {
  landingColors,
  landingFonts,
} from "../../constants/landing";
import { useLoginFlow } from "../../hooks/useLoginFlow";

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
}: PrimaryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={({ pressed }) => [
        styles.primary,
        pressed ? styles.primaryPressed : null,
        disabled || loading ? styles.disabled : null,
      ]}
    >
      <LinearGradient
        colors={["#3B86FF", landingColors.blue, landingColors.violet]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.primaryFill}
      >
        {loading ? (
          <ActivityIndicator size="small" color={landingColors.white} />
        ) : (
          <Text style={styles.primaryText}>{label}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

function TextAction({
  label,
  onPress,
  disabled = false,
  centered = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  centered?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        centered ? styles.textActionCentered : styles.textAction,
        pressed ? styles.textActionPressed : null,
        disabled ? styles.disabledText : null,
      ]}
    >
      <Text style={[styles.textActionLabel, disabled ? styles.disabledText : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

function CardHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

function Banner({
  message,
  tone,
}: {
  message: string;
  tone: "error" | "info";
}) {
  const isError = tone === "error";
  return (
    <View
      style={[styles.banner, isError ? styles.bannerError : styles.bannerInfo]}
      accessibilityRole={isError ? "alert" : "text"}
    >
      <MaterialCommunityIcons
        name={isError ? "alert-circle-outline" : "information-outline"}
        size={17}
        color={isError ? landingColors.danger : landingColors.blueSoft}
      />
      <Text style={[styles.bannerText, isError ? styles.bannerTextError : null]}>
        {message}
      </Text>
    </View>
  );
}

function OnboardingCallout() {
  return (
    <View style={styles.callout}>
      <View style={styles.calloutIcon}>
        <MaterialCommunityIcons
          name="bookmark-check-outline"
          size={17}
          color={landingColors.green}
        />
      </View>
      <Text style={styles.calloutText}>
        Your answers are saved. Create an account to keep your learning path.
      </Text>
    </View>
  );
}

function Divider() {
  return (
    <View style={styles.divider}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>or continue with</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

function Disclaimer() {
  return (
    <Text style={styles.disclaimer}>
      By continuing, you agree to our Terms & Conditions and Privacy Policy.
    </Text>
  );
}

function SuccessView({
  onContinue,
  onSignIn,
  loading,
}: {
  onContinue: () => void;
  onSignIn: () => void;
  loading: boolean;
}) {
  return (
    <View style={styles.success}>
      <View style={styles.successIcon}>
        <MaterialCommunityIcons
          name="check"
          size={30}
          color={landingColors.black}
        />
      </View>
      <Text style={styles.successTitle}>Password updated</Text>
      <Text style={styles.successText}>
        Your new password is ready. Continue to pick up where you left off.
      </Text>
      <PrimaryButton
        label="Continue to Yuinx"
        onPress={onContinue}
        loading={loading}
      />
      <TextAction label="Back to sign in" onPress={onSignIn} centered />
    </View>
  );
}

export default function Login() {
  const flow = useLoginFlow();
  const isBusy = flow.busy !== null;

  if (flow.authReady) {
    return <LoadingScreen message="Signing in..." />;
  }

  const pageTitle =
    flow.view === "signup"
      ? "Create your account"
      : flow.view === "signin"
        ? "Sign in"
        : "Account access";

  const renderForm = () => (
    <>
      <CardHeader
        title={flow.isSignUp ? "Create your account" : "Welcome back"}
        subtitle={
          flow.isSignUp
            ? "Start with an email and password."
            : "Sign in to continue your progress."
        }
      />

      {flow.fromOnboarding ? <OnboardingCallout /> : null}
      {flow.formError ? <Banner message={flow.formError} tone="error" /> : null}
      {flow.notice ? <Banner message={flow.notice} tone="info" /> : null}

      <View style={styles.form}>
        <AuthField
          label="Email"
          icon="email-outline"
          value={flow.email}
          onChangeText={flow.setEmail}
          placeholder="you@example.com"
          error={flow.errors.email}
          autoComplete="email"
          textContentType="emailAddress"
          keyboardType="email-address"
          returnKeyType="next"
          editable={!isBusy}
        />

        <AuthField
          label="Password"
          icon="lock-outline"
          value={flow.password}
          onChangeText={flow.setPassword}
          placeholder={flow.isSignUp ? "Choose a password" : "Enter your password"}
          error={flow.errors.password}
          secure
          autoComplete={flow.isSignUp ? "new-password" : "current-password"}
          textContentType={flow.isSignUp ? "newPassword" : "password"}
          returnKeyType="go"
          onSubmitEditing={flow.submitEmail}
          editable={!isBusy}
        />

        {!flow.isSignUp ? (
          <View style={styles.forgotRow}>
            <TextAction label="Forgot password?" onPress={flow.startForgotPassword} />
          </View>
        ) : null}

        <PrimaryButton
          label={flow.isSignUp ? "Create account" : "Sign in"}
          onPress={flow.submitEmail}
          loading={flow.busy === "email"}
          disabled={isBusy && flow.busy !== "email"}
        />
      </View>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleText}>
          {flow.isSignUp
            ? "Already have an account?"
            : "Don't have an account?"}
        </Text>
        <TextAction
          label={flow.isSignUp ? "Sign in" : "Create one"}
          onPress={flow.switchMode}
          disabled={isBusy}
        />
      </View>

      <Divider />
      <SocialAuthButtons
        onGoogle={flow.handleGoogle}
        onApple={flow.handleApple}
        showApple={flow.showApple}
        loading={
          flow.busy === "google"
            ? "google"
            : flow.busy === "apple"
              ? "apple"
              : null
        }
        disabled={isBusy}
      />
      <Disclaimer />
    </>
  );

  const renderVerifyEmail = () => (
    <>
      <CardHeader
        title="Check your email"
        subtitle={`We sent a 6-digit code to ${flow.email || "your email"}.`}
      />
      {flow.notice ? <Banner message={flow.notice} tone="info" /> : null}
      {flow.formError ? <Banner message={flow.formError} tone="error" /> : null}

      <View style={styles.form}>
        <OtpInput
          code={flow.code}
          setCode={flow.setCode}
          onComplete={flow.verifyEmail}
          error={flow.errors.code}
          editable={!isBusy}
        />
        <PrimaryButton
          label="Verify email"
          onPress={flow.verifyEmail}
          loading={flow.busy === "verify"}
          disabled={isBusy && flow.busy !== "verify"}
        />
      </View>

      <View style={styles.verifyActions}>
        <TextAction
          label={flow.resendLabel}
          onPress={flow.resendVerification}
          disabled={isBusy || flow.cooldown > 0}
          centered
        />
        <TextAction
          label="Use a different email"
          onPress={flow.editVerificationEmail}
          disabled={isBusy}
          centered
        />
      </View>
    </>
  );

  const renderSecondFactor = () => (
    <>
      <CardHeader
        title="One more step"
        subtitle={
          flow.secondFactorStrategy === "email_code"
            ? `Enter the 6-digit code sent to ${flow.email || "your email"}.`
            : "Enter the 6-digit code from your authenticator app."
        }
      />
      {flow.notice ? <Banner message={flow.notice} tone="info" /> : null}
      {flow.formError ? <Banner message={flow.formError} tone="error" /> : null}

      <View style={styles.form}>
        <OtpInput
          code={flow.code}
          setCode={flow.setCode}
          onComplete={flow.verifySecondFactor}
          error={flow.errors.code}
          editable={!isBusy}
        />
        <PrimaryButton
          label="Verify and sign in"
          onPress={flow.verifySecondFactor}
          loading={flow.busy === "second-factor"}
          disabled={isBusy && flow.busy !== "second-factor"}
        />
      </View>

      {flow.secondFactorStrategy === "email_code" ? (
        <TextAction
          label={flow.resendLabel}
          onPress={flow.resendSecondFactor}
          disabled={isBusy || flow.cooldown > 0}
          centered
        />
      ) : null}
      <TextAction
        label="Back to sign in"
        onPress={() => flow.backToSignIn()}
        disabled={isBusy}
        centered
      />
    </>
  );

  const renderForgotEmail = () => (
    <>
      <CardHeader
        title="Reset your password"
        subtitle="Enter the email you use for Yuinx and we will send a reset code."
      />
      {flow.formError ? <Banner message={flow.formError} tone="error" /> : null}
      {flow.notice ? <Banner message={flow.notice} tone="info" /> : null}

      <View style={styles.form}>
        <AuthField
          label="Email"
          icon="email-outline"
          value={flow.email}
          onChangeText={flow.setEmail}
          placeholder="you@example.com"
          error={flow.errors.email}
          autoComplete="email"
          textContentType="emailAddress"
          keyboardType="email-address"
          returnKeyType="go"
          onSubmitEditing={flow.requestResetCode}
          editable={!isBusy}
        />
        <PrimaryButton
          label="Send reset code"
          onPress={flow.requestResetCode}
          loading={flow.busy === "reset-request"}
          disabled={isBusy && flow.busy !== "reset-request"}
        />
      </View>

      <TextAction
        label="Back to sign in"
        onPress={() => flow.backToSignIn()}
        disabled={isBusy}
        centered
      />
    </>
  );

  const renderForgotCode = () => (
    <>
      <CardHeader
        title="Enter your reset code"
        subtitle={`We sent a code to ${flow.email || "your email"}.`}
      />
      {flow.notice ? <Banner message={flow.notice} tone="info" /> : null}
      {flow.formError ? <Banner message={flow.formError} tone="error" /> : null}

      <View style={styles.form}>
        <OtpInput
          code={flow.code}
          setCode={flow.setCode}
          onComplete={flow.verifyResetCode}
          error={flow.errors.code}
          editable={!isBusy}
        />
        <PrimaryButton
          label="Verify code"
          onPress={flow.verifyResetCode}
          loading={flow.busy === "reset-verify"}
          disabled={isBusy && flow.busy !== "reset-verify"}
        />
      </View>

      <View style={styles.verifyActions}>
        <TextAction
          label={flow.resendLabel}
          onPress={flow.resendResetCode}
          disabled={isBusy || flow.cooldown > 0}
          centered
        />
        <TextAction
          label="Use a different email"
          onPress={flow.backToEmail}
          disabled={isBusy}
          centered
        />
      </View>
    </>
  );

  const renderForgotPassword = () => (
    <>
      <CardHeader
        title="Choose a new password"
        subtitle="Use a password you have not used on Yuinx before."
      />
      {flow.formError ? <Banner message={flow.formError} tone="error" /> : null}
      {flow.notice ? <Banner message={flow.notice} tone="info" /> : null}

      <View style={styles.form}>
        <AuthField
          label="New password"
          icon="lock-outline"
          value={flow.password}
          onChangeText={flow.setPassword}
          placeholder="New password"
          error={flow.errors.password}
          secure
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
          editable={!isBusy}
        />
        <AuthField
          label="Confirm new password"
          icon="lock-check-outline"
          value={flow.confirmPassword}
          onChangeText={flow.setConfirmPassword}
          placeholder="Repeat your new password"
          error={flow.errors.confirmPassword}
          secure
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={flow.submitNewPassword}
          editable={!isBusy}
        />
        <PrimaryButton
          label="Update password"
          onPress={flow.submitNewPassword}
          loading={flow.busy === "reset-submit"}
          disabled={isBusy && flow.busy !== "reset-submit"}
        />
      </View>

      <TextAction
        label="Back to sign in"
        onPress={() => flow.backToSignIn()}
        disabled={isBusy}
        centered
      />
    </>
  );

  return (
    <AuthShell
      onBack={flow.fromOnboarding ? flow.goBackToAnswers : undefined}
      backLabel="Back to your answers"
    >
      <Head>
        <title>{`${pageTitle} - Yuinx`}</title>
        <meta
          name="description"
          content="Sign in to Yuinx to continue your learning path, quests, and progress."
        />
        <meta name="theme-color" content="#070A10" />
      </Head>

      {flow.view === "signup" || flow.view === "signin" ? renderForm() : null}
      {flow.view === "verify-email" ? renderVerifyEmail() : null}
      {flow.view === "second-factor" ? renderSecondFactor() : null}
      {flow.view === "forgot-email" ? renderForgotEmail() : null}
      {flow.view === "forgot-code" ? renderForgotCode() : null}
      {flow.view === "forgot-password" ? renderForgotPassword() : null}
      {flow.view === "forgot-success" ? (
        <SuccessView
          onContinue={flow.continueAfterReset}
          onSignIn={() => flow.backToSignIn("Your password was updated. Sign in below.")}
          loading={flow.busy === "reset-continue"}
        />
      ) : null}
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 7,
    marginBottom: 22,
  },
  title: {
    color: landingColors.text,
    fontFamily: landingFonts.display,
    fontSize: 29,
    lineHeight: 35,
    letterSpacing: -0.9,
  },
  subtitle: {
    color: landingColors.textMuted,
    fontFamily: landingFonts.body,
    fontSize: 14,
    lineHeight: 21,
  },
  callout: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(56,217,150,0.24)",
    backgroundColor: "rgba(56,217,150,0.08)",
    marginBottom: 14,
  },
  calloutIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(56,217,150,0.12)",
  },
  calloutText: {
    flex: 1,
    color: "rgba(248,250,252,0.82)",
    fontFamily: landingFonts.body,
    fontSize: 12,
    lineHeight: 18,
  },
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  bannerError: {
    borderColor: "rgba(255,92,92,0.28)",
    backgroundColor: "rgba(255,92,92,0.08)",
  },
  bannerInfo: {
    borderColor: "rgba(47,124,255,0.28)",
    backgroundColor: "rgba(47,124,255,0.08)",
  },
  bannerText: {
    flex: 1,
    color: landingColors.textMuted,
    fontFamily: landingFonts.body,
    fontSize: 12,
    lineHeight: 18,
  },
  bannerTextError: {
    color: "#FFB4B4",
  },
  form: {
    gap: 14,
  },
  forgotRow: {
    alignItems: "flex-end",
    marginTop: -4,
  },
  primary: {
    minHeight: 52,
    borderRadius: 15,
    overflow: "hidden",
    marginTop: 2,
  },
  primaryPressed: {
    opacity: 0.9,
  },
  primaryFill: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  primaryText: {
    color: landingColors.white,
    fontFamily: landingFonts.bodySemiBold,
    fontSize: 16,
  },
  disabled: {
    opacity: 0.55,
  },
  disabledText: {
    opacity: 0.45,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 16,
    marginBottom: 20,
  },
  toggleText: {
    color: landingColors.textMuted,
    fontFamily: landingFonts.body,
    fontSize: 13,
  },
  textAction: {
    alignSelf: "flex-start",
  },
  textActionCentered: {
    alignSelf: "center",
  },
  textActionPressed: {
    opacity: 0.7,
  },
  textActionLabel: {
    color: landingColors.blueSoft,
    fontFamily: landingFonts.bodySemiBold,
    fontSize: 13,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: landingColors.border,
  },
  dividerText: {
    color: landingColors.textSubtle,
    fontFamily: landingFonts.body,
    fontSize: 11,
  },
  disclaimer: {
    color: landingColors.textSubtle,
    fontFamily: landingFonts.body,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 18,
  },
  verifyActions: {
    alignItems: "center",
    gap: 12,
    marginTop: 18,
  },
  success: {
    alignItems: "center",
    paddingTop: 8,
  },
  successIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: landingColors.green,
    marginBottom: 18,
  },
  successTitle: {
    color: landingColors.text,
    fontFamily: landingFonts.display,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.7,
    textAlign: "center",
  },
  successText: {
    color: landingColors.textMuted,
    fontFamily: landingFonts.body,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 22,
    maxWidth: 310,
  },
});
