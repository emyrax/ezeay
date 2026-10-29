export type AuthFieldName = "email" | "password" | "confirmPassword" | "code";

export type AuthFieldErrors = Partial<Record<AuthFieldName, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateEmail(email: string): string | undefined {
  const normalized = normalizeEmail(email);
  if (!normalized) return "Enter your email address.";
  if (!EMAIL_PATTERN.test(normalized)) return "Enter a valid email address.";
  return undefined;
}

export function validatePassword(password: string): string | undefined {
  if (!password) return "Enter your password.";
  if (!password.trim()) return "Enter your password.";
  return undefined;
}

export function validateNewPassword(
  password: string,
  confirmPassword: string,
): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  if (!password) {
    errors.password = "Choose a new password.";
  } else if (!password.trim()) {
    errors.password = "Choose a new password.";
  }

  if (!confirmPassword) {
    errors.confirmPassword = "Confirm your new password.";
  } else if (password !== confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}

export function validateVerificationCode(code: string): string | undefined {
  if (!code.trim()) return "Enter the verification code.";
  if (!/^\d{6}$/.test(code.trim())) return "Enter the 6-digit code.";
  return undefined;
}

export function validateEmailForm(email: string, password: string): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  const emailError = validateEmail(email);
  const passwordError = validatePassword(password);

  if (emailError) errors.email = emailError;
  if (passwordError) errors.password = passwordError;
  return errors;
}

export function validateEmailOnly(email: string): AuthFieldErrors {
  const error = validateEmail(email);
  return error ? { email: error } : {};
}

export function validateCodeOnly(code: string): AuthFieldErrors {
  const error = validateVerificationCode(code);
  return error ? { code: error } : {};
}

export function hasFieldErrors(errors: AuthFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}
