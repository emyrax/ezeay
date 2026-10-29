import type { AuthFieldName } from "./validation";

interface ClerkErrorShape {
  code?: string;
  message?: string;
  longMessage?: string;
  errors?: Array<{
    code?: string;
    message?: string;
    longMessage?: string;
    meta?: { paramName?: string };
  }>;
}

export interface AuthErrorInfo {
  message: string;
  code?: string;
  field?: AuthFieldName;
  canceled?: boolean;
}

const GENERIC_CREDENTIALS_ERROR = "Email or password is incorrect. Try again.";
const GENERIC_CODE_ERROR = "That code is not correct. Check it and try again.";

const FIELD_BY_CODE: Record<string, AuthFieldName> = {
  form_identifier_exists: "email",
  form_identifier_not_found: "email",
  form_password_incorrect: "password",
  form_password_length_too_short: "password",
  form_password_pwned: "password",
  form_password_validation_failed: "password",
  form_param_format_invalid: "email",
  form_code_incorrect: "code",
  verification_expired: "code",
  verification_failed: "code",
};

const MESSAGE_BY_CODE: Record<string, string> = {
  form_identifier_exists:
    "An account with this email already exists. Sign in instead.",
  form_identifier_not_found: GENERIC_CREDENTIALS_ERROR,
  form_password_incorrect: GENERIC_CREDENTIALS_ERROR,
  form_password_length_too_short:
    "That password is too short. Try a longer password.",
  form_password_pwned:
    "This password has appeared in a data breach. Choose a different one.",
  form_password_validation_failed: "That password does not meet the requirements.",
  form_param_format_invalid: "Enter a valid email address.",
  form_code_incorrect: GENERIC_CODE_ERROR,
  verification_expired: "That code expired. Send a new code and try again.",
  verification_failed: GENERIC_CODE_ERROR,
  too_many_requests: "Too many attempts. Wait a moment, then try again.",
  captcha_invalid: "We could not verify this browser. Refresh and try again.",
  session_exists: "You are already signed in. Refresh the page to continue.",
  strategy_for_user_invalid:
    "This account uses a different sign-in method. Continue with Google or reset your password.",
  not_allowed_access:
    "This account cannot sign in right now. Contact support if this continues.",
};

function readClerkError(error: unknown): ClerkErrorShape | null {
  if (!error || typeof error !== "object") return null;
  const candidate = error as ClerkErrorShape;
  if (candidate.errors?.length) {
    return candidate.errors[0] as ClerkErrorShape;
  }
  if (candidate.code || candidate.message || candidate.longMessage) {
    return candidate;
  }
  return null;
}

export function isOAuthCanceled(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; name?: string; message?: string };
  return (
    candidate.code === "ERR_CANCELED" ||
    candidate.name === "ClerkRuntimeError" && candidate.message === "User cancelled" ||
    candidate.message === "User cancelled" ||
    candidate.message === "User canceled"
  );
}

export function resolveAuthError(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): AuthErrorInfo {
  if (isOAuthCanceled(error)) {
    return { message: "", canceled: true };
  }

  const clerkError = readClerkError(error);
  const code = clerkError?.code;
  const message =
    (code ? MESSAGE_BY_CODE[code] : undefined) ||
    clerkError?.longMessage ||
    clerkError?.message ||
    (error instanceof Error ? error.message : undefined) ||
    fallback;

  return {
    message,
    code,
    field: code ? FIELD_BY_CODE[code] : undefined,
  };
}

export function resolveOAuthError(
  provider: "Google" | "Apple",
  error: unknown,
): AuthErrorInfo {
  const resolved = resolveAuthError(
    error,
    `We could not continue with ${provider}. Please try again.`,
  );
  if (resolved.canceled) return resolved;
  return {
    ...resolved,
    message: resolved.message || `We could not continue with ${provider}.`,
  };
}
