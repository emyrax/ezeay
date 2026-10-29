import { useOAuth } from "@clerk/expo";
import { useSignIn, useSignUp } from "@clerk/expo/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import { resolveAuthError, resolveOAuthError } from "../lib/auth/errors";
import {
  hasFieldErrors,
  normalizeEmail,
  validateCodeOnly,
  validateEmailForm,
  validateEmailOnly,
  validateNewPassword,
  validateVerificationCode,
  type AuthFieldErrors,
  type AuthFieldName,
} from "../lib/auth/validation";

export type AuthView =
  | "signin"
  | "signup"
  | "verify-email"
  | "second-factor"
  | "forgot-email"
  | "forgot-code"
  | "forgot-password"
  | "forgot-success";

export type AuthBusyAction =
  | "email"
  | "google"
  | "apple"
  | "verify"
  | "second-factor"
  | "resend"
  | "reset-request"
  | "reset-verify"
  | "reset-submit"
  | "reset-continue"
  | null;

type SecondFactorStrategy = "email_code" | "totp" | null;

const CODE_COOLDOWN_SECONDS = 30;

export function useLoginFlow() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; from?: string }>();
  const fromOnboarding = params.from === "onboarding";
  const showApple = Platform.OS === "ios" || Platform.OS === "web";

  const {
    isLoaded: signInLoaded,
    signIn,
    setActive: setSignInActive,
  } = useSignIn();
  const {
    isLoaded: signUpLoaded,
    signUp,
    setActive: setSignUpActive,
  } = useSignUp();
  const { startOAuthFlow: startGoogleFlow } = useOAuth({ strategy: "oauth_google" });
  const { startOAuthFlow: startAppleFlow } = useOAuth({ strategy: "oauth_apple" });

  const [view, setView] = useState<AuthView>(
    params.mode === "signup" ? "signup" : "signin",
  );
  const viewRef = useRef<AuthView>(view);
  viewRef.current = view;

  const [email, setEmailState] = useState("");
  const [password, setPasswordState] = useState("");
  const [confirmPassword, setConfirmPasswordState] = useState("");
  const [code, setCodeState] = useState("");
  const [errors, setErrors] = useState<AuthFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<AuthBusyAction>(null);
  const [authReady, setAuthReady] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [secondFactorStrategy, setSecondFactorStrategy] =
    useState<SecondFactorStrategy>(null);
  const [resetSessionId, setResetSessionId] = useState<string | null>(null);

  const isSignUp = view === "signup";

  const clearFieldError = useCallback((field: AuthFieldName) => {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }, []);

  const setEmail = useCallback(
    (value: string) => {
      setEmailState(value);
      clearFieldError("email");
    },
    [clearFieldError],
  );

  const setPassword = useCallback(
    (value: string) => {
      setPasswordState(value);
      clearFieldError("password");
    },
    [clearFieldError],
  );

  const setConfirmPassword = useCallback(
    (value: string) => {
      setConfirmPasswordState(value);
      clearFieldError("confirmPassword");
    },
    [clearFieldError],
  );

  const setCode = useCallback(
    (value: string) => {
      setCodeState(value);
      clearFieldError("code");
    },
    [clearFieldError],
  );

  const resetFeedback = useCallback(() => {
    setErrors({});
    setFormError(null);
    setNotice(null);
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((current) => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    const current = viewRef.current;
    if (current !== "signin" && current !== "signup") return;
    const next: AuthView = params.mode === "signup" ? "signup" : "signin";
    if (next !== current) setView(next);
  }, [params.mode]);

  const applyAuthError = useCallback(
    (error: unknown, fallback: string) => {
      const info = resolveAuthError(error, fallback);
      if (info.canceled) return;
      const field = info.field;
      if (field) {
        setErrors((current) => ({ ...current, [field]: info.message }));
      } else {
        setFormError(info.message);
      }
    },
    [],
  );

  const applyOAuthError = useCallback(
    (provider: "Google" | "Apple", error: unknown) => {
      const info = resolveOAuthError(provider, error);
      if (info.canceled) return;
      setFormError(info.message);
    },
    [],
  );

  const completeSignIn = useCallback(
    async (sessionId: string, setActive: typeof setSignInActive) => {
      if (!setActive) throw new Error("Sign in is still loading. Try again.");
      await setActive({ session: sessionId });
      setAuthReady(true);
    },
    [],
  );

  const startSecondFactor = useCallback(
    async (resource: NonNullable<typeof signIn>) => {
      const factors = resource.supportedSecondFactors ?? [];
      const hasEmailCode = factors.some((factor) => factor.strategy === "email_code");
      const hasTotp = factors.some((factor) => factor.strategy === "totp");

      if (hasEmailCode) {
        await resource.prepareSecondFactor({ strategy: "email_code" });
        setSecondFactorStrategy("email_code");
        setView("second-factor");
        setCodeState("");
        setCooldown(CODE_COOLDOWN_SECONDS);
        setNotice("We sent a 6-digit code to your email.");
        return;
      }

      if (hasTotp) {
        setSecondFactorStrategy("totp");
        setView("second-factor");
        setCodeState("");
        setNotice("Enter the 6-digit code from your authenticator app.");
        return;
      }

      setFormError(
        "This account needs a second verification step that is not available here. Reset your password or contact support.",
      );
    },
    [],
  );

  const handleSignInStatus = useCallback(
    async (resource: NonNullable<typeof signIn>) => {
      const status = resource.status;

      if (status === "complete") {
        if (!resource.createdSessionId) {
          setFormError("Sign in finished without a session. Please try again.");
          return;
        }
        await completeSignIn(resource.createdSessionId, setSignInActive);
        return;
      }

      if (status === "needs_second_factor") {
        await startSecondFactor(resource);
        return;
      }

      if (status === "needs_new_password") {
        setFormError(
          "This account needs a new password. Use Forgot password below to reset it.",
        );
        return;
      }

      setFormError(`Sign in needs another step (${status ?? "unknown"}). Try again.`);
    },
    [completeSignIn, setSignInActive, startSecondFactor],
  );

  const submitSignUp = useCallback(async () => {
    if (!signUpLoaded || !signUp) {
      setFormError("Sign up is still loading. Try again in a moment.");
      return;
    }

    const created = await signUp.create({
      emailAddress: normalizeEmail(email),
      password,
    });

    if (created.status === "complete") {
      if (!created.createdSessionId) {
        setFormError("Your account was created but the session is missing. Sign in.");
        return;
      }
      await completeSignIn(created.createdSessionId, setSignUpActive);
      return;
    }

    await created.prepareEmailAddressVerification({ strategy: "email_code" });
    setView("verify-email");
    setCodeState("");
    setCooldown(CODE_COOLDOWN_SECONDS);
    setNotice(`We sent a 6-digit code to ${normalizeEmail(email)}.`);
  }, [completeSignIn, email, password, setSignUpActive, signUp, signUpLoaded]);

  const submitSignIn = useCallback(async () => {
    if (!signInLoaded || !signIn) {
      setFormError("Sign in is still loading. Try again in a moment.");
      return;
    }

    const attempt = await signIn.create({
      identifier: normalizeEmail(email),
      password,
    });
    await handleSignInStatus(attempt);
  }, [email, handleSignInStatus, password, signIn, signInLoaded]);

  const submitEmail = useCallback(async () => {
    if (busy) return;
    resetFeedback();

    const nextErrors = validateEmailForm(email, password);
    if (hasFieldErrors(nextErrors)) {
      setErrors(nextErrors);
      return;
    }

    setBusy("email");
    try {
      if (view === "signup") {
        await submitSignUp();
      } else {
        await submitSignIn();
      }
    } catch (error) {
      applyAuthError(
        error,
        isSignUp
          ? "We could not create your account. Please try again."
          : "We could not sign you in. Please try again.",
      );
    } finally {
      setBusy(null);
    }
  }, [
    applyAuthError,
    busy,
    email,
    isSignUp,
    password,
    resetFeedback,
    submitSignIn,
    submitSignUp,
    view,
  ]);

  const verifyEmail = useCallback(async () => {
    if (busy || !signUpLoaded || !signUp) return;
    resetFeedback();

    const nextErrors = validateCodeOnly(code);
    if (hasFieldErrors(nextErrors)) {
      setErrors(nextErrors);
      return;
    }

    setBusy("verify");
    try {
      const verified = await signUp.attemptEmailAddressVerification({
        code: code.trim(),
      });
      if (verified.status === "complete") {
        if (!verified.createdSessionId) {
          setFormError("Verification finished without a session. Sign in.");
          return;
        }
        await completeSignIn(verified.createdSessionId, setSignUpActive);
      } else {
        setFormError(
          "That code did not finish verification. Check it and try again.",
        );
      }
    } catch (error) {
      applyAuthError(error, "We could not verify that code. Try again.");
    } finally {
      setBusy(null);
    }
  }, [
    applyAuthError,
    busy,
    code,
    completeSignIn,
    resetFeedback,
    setSignUpActive,
    signUp,
    signUpLoaded,
  ]);

  const resendVerification = useCallback(async () => {
    if (busy || cooldown > 0 || !signUpLoaded || !signUp) return;
    resetFeedback();
    setBusy("resend");
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setCodeState("");
      setCooldown(CODE_COOLDOWN_SECONDS);
      setNotice(`A new code was sent to ${normalizeEmail(email)}.`);
    } catch (error) {
      applyAuthError(error, "We could not send another code. Try again.");
    } finally {
      setBusy(null);
    }
  }, [
    applyAuthError,
    busy,
    cooldown,
    email,
    resetFeedback,
    signUp,
    signUpLoaded,
  ]);

  const editVerificationEmail = useCallback(() => {
    setView("signup");
    setCodeState("");
    resetFeedback();
  }, [resetFeedback]);

  const verifySecondFactor = useCallback(async () => {
    if (busy || !signInLoaded || !signIn || !secondFactorStrategy) return;
    resetFeedback();

    const nextErrors = validateCodeOnly(code);
    if (hasFieldErrors(nextErrors)) {
      setErrors(nextErrors);
      return;
    }

    setBusy("second-factor");
    try {
      const attempt = await signIn.attemptSecondFactor({
        strategy: secondFactorStrategy,
        code: code.trim(),
      });
      if (attempt.status === "complete") {
        if (!attempt.createdSessionId) {
          setFormError("Verification finished without a session. Sign in again.");
          return;
        }
        await completeSignIn(attempt.createdSessionId, setSignInActive);
      } else {
        await handleSignInStatus(attempt);
      }
    } catch (error) {
      applyAuthError(error, "We could not verify that code. Try again.");
    } finally {
      setBusy(null);
    }
  }, [
    applyAuthError,
    busy,
    code,
    completeSignIn,
    handleSignInStatus,
    resetFeedback,
    secondFactorStrategy,
    setSignInActive,
    signIn,
    signInLoaded,
  ]);

  const resendSecondFactor = useCallback(async () => {
    if (
      busy ||
      cooldown > 0 ||
      !signInLoaded ||
      !signIn ||
      secondFactorStrategy !== "email_code"
    ) {
      return;
    }
    resetFeedback();
    setBusy("resend");
    try {
      await signIn.prepareSecondFactor({ strategy: "email_code" });
      setCodeState("");
      setCooldown(CODE_COOLDOWN_SECONDS);
      setNotice("A new verification code was sent to your email.");
    } catch (error) {
      applyAuthError(error, "We could not send another code. Try again.");
    } finally {
      setBusy(null);
    }
  }, [
    applyAuthError,
    busy,
    cooldown,
    resetFeedback,
    secondFactorStrategy,
    signIn,
    signInLoaded,
  ]);

  const startForgotPassword = useCallback(() => {
    setView("forgot-email");
    setCodeState("");
    setConfirmPasswordState("");
    setResetSessionId(null);
    resetFeedback();
  }, [resetFeedback]);

  const requestResetCode = useCallback(async () => {
    if (busy) return;
    resetFeedback();

    const nextErrors = validateEmailOnly(email);
    if (hasFieldErrors(nextErrors)) {
      setErrors(nextErrors);
      return;
    }

    if (!signInLoaded || !signIn) {
      setFormError("Password reset is still loading. Try again in a moment.");
      return;
    }

    setBusy("reset-request");
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: normalizeEmail(email),
      });
      setView("forgot-code");
      setCodeState("");
      setCooldown(CODE_COOLDOWN_SECONDS);
      setNotice(`We sent a reset code to ${normalizeEmail(email)}.`);
    } catch (error) {
      applyAuthError(error, "We could not send a reset code. Try again.");
    } finally {
      setBusy(null);
    }
  }, [applyAuthError, busy, email, resetFeedback, signIn, signInLoaded]);

  const verifyResetCode = useCallback(async () => {
    if (busy || !signInLoaded || !signIn) return;
    resetFeedback();

    const nextErrors = validateCodeOnly(code);
    if (hasFieldErrors(nextErrors)) {
      setErrors(nextErrors);
      return;
    }

    setBusy("reset-verify");
    try {
      const verified = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: code.trim(),
      });
      if (verified.status === "needs_new_password") {
        setView("forgot-password");
        setPasswordState("");
        setConfirmPasswordState("");
        setNotice("Code verified. Choose a new password.");
      } else {
        setFormError("That reset code did not work. Send a new code and try again.");
      }
    } catch (error) {
      applyAuthError(error, "We could not verify that reset code. Try again.");
    } finally {
      setBusy(null);
    }
  }, [applyAuthError, busy, code, resetFeedback, signIn, signInLoaded]);

  const submitNewPassword = useCallback(async () => {
    if (busy || !signInLoaded || !signIn) return;
    resetFeedback();

    const nextErrors = validateNewPassword(password, confirmPassword);
    if (hasFieldErrors(nextErrors)) {
      setErrors(nextErrors);
      return;
    }

    setBusy("reset-submit");
    try {
      const reset = await signIn.resetPassword({ password });
      if (reset.status === "complete" && reset.createdSessionId) {
        setResetSessionId(reset.createdSessionId);
        setView("forgot-success");
        setNotice("Your password is updated. Continue to your account.");
      } else {
        setFormError("The password reset did not finish. Try again.");
      }
    } catch (error) {
      applyAuthError(error, "We could not update your password. Try again.");
    } finally {
      setBusy(null);
    }
  }, [
    applyAuthError,
    busy,
    confirmPassword,
    password,
    resetFeedback,
    signIn,
    signInLoaded,
  ]);

  const resendResetCode = useCallback(async () => {
    if (busy || cooldown > 0 || !signInLoaded || !signIn) return;
    resetFeedback();
    setBusy("reset-request");
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: normalizeEmail(email),
      });
      setCodeState("");
      setCooldown(CODE_COOLDOWN_SECONDS);
      setNotice(`A new reset code was sent to ${normalizeEmail(email)}.`);
    } catch (error) {
      applyAuthError(error, "We could not send another reset code. Try again.");
    } finally {
      setBusy(null);
    }
  }, [
    applyAuthError,
    busy,
    cooldown,
    email,
    resetFeedback,
    signIn,
    signInLoaded,
  ]);

  const continueAfterReset = useCallback(async () => {
    if (busy || !resetSessionId) return;
    setFormError(null);
    setBusy("reset-continue");
    try {
      await completeSignIn(resetSessionId, setSignInActive);
    } catch (error) {
      applyAuthError(error, "We could not start your session. Sign in again.");
      setBusy(null);
    }
  }, [applyAuthError, busy, completeSignIn, resetSessionId, setSignInActive]);

  const backToSignIn = useCallback(
    (message?: string) => {
      setView("signin");
      setCodeState("");
      setConfirmPasswordState("");
      setSecondFactorStrategy(null);
      setResetSessionId(null);
      setErrors({});
      setFormError(null);
      setNotice(message ?? null);
    },
    [],
  );

  const backToEmail = useCallback(() => {
    setView("forgot-email");
    setCodeState("");
    resetFeedback();
  }, [resetFeedback]);

  const switchMode = useCallback(() => {
    const next: AuthView = view === "signup" ? "signin" : "signup";
    setView(next);
    setPasswordState("");
    setConfirmPasswordState("");
    setCodeState("");
    setSecondFactorStrategy(null);
    resetFeedback();
    router.setParams({ mode: next });
  }, [resetFeedback, router, view]);

  const runOAuth = useCallback(
    async (
      provider: "Google" | "Apple",
      startFlow: typeof startGoogleFlow,
      fallback: string,
    ) => {
      if (busy) return;
      resetFeedback();
      setBusy(provider === "Google" ? "google" : "apple");
      try {
        const result = await startFlow();
        if (result.createdSessionId && result.setActive) {
          await result.setActive({ session: result.createdSessionId });
          setAuthReady(true);
        } else {
          setFormError(fallback);
        }
      } catch (error) {
        applyOAuthError(provider, error);
      } finally {
        setBusy(null);
      }
    },
    [applyOAuthError, busy, resetFeedback],
  );

  const handleGoogle = useCallback(() => {
    void runOAuth(
      "Google",
      startGoogleFlow,
      "We could not finish Google sign in. Please try again.",
    );
  }, [runOAuth, startGoogleFlow]);

  const handleApple = useCallback(() => {
    void runOAuth(
      "Apple",
      startAppleFlow,
      "We could not finish Apple sign in. Please try again.",
    );
  }, [runOAuth, startAppleFlow]);

  const goBackToAnswers = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/onboarding");
    }
  }, [router]);

  const resendLabel = useMemo(() => {
    if (cooldown > 0) return `Resend in ${cooldown}s`;
    return "Resend code";
  }, [cooldown]);

  return {
    view,
    isSignUp,
    fromOnboarding,
    showApple,
    email,
    password,
    confirmPassword,
    code,
    errors,
    formError,
    notice,
    busy,
    authReady,
    cooldown,
    resendLabel,
    secondFactorStrategy,
    setEmail,
    setPassword,
    setConfirmPassword,
    setCode,
    submitEmail,
    verifyEmail,
    resendVerification,
    editVerificationEmail,
    verifySecondFactor,
    resendSecondFactor,
    startForgotPassword,
    requestResetCode,
    verifyResetCode,
    submitNewPassword,
    resendResetCode,
    continueAfterReset,
    backToSignIn,
    backToEmail,
    switchMode,
    handleGoogle,
    handleApple,
    goBackToAnswers,
  };
}
