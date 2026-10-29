import assert from "node:assert/strict";
import { test } from "node:test";
import {
  hasFieldErrors,
  normalizeEmail,
  validateEmail,
  validateEmailForm,
  validateNewPassword,
  validatePassword,
  validateVerificationCode,
} from "./validation";

test("normalizeEmail trims and lowercases", () => {
  assert.equal(normalizeEmail("  Ama@Example.COM "), "ama@example.com");
});

test("validateEmail rejects empty and malformed addresses", () => {
  assert.equal(validateEmail(""), "Enter your email address.");
  assert.equal(validateEmail("ama"), "Enter a valid email address.");
  assert.equal(validateEmail("ama@example"), "Enter a valid email address.");
  assert.equal(validateEmail("ama@example.com"), undefined);
});

test("validatePassword only requires a non-empty value", () => {
  assert.equal(validatePassword(""), "Enter your password.");
  assert.equal(validatePassword("   "), "Enter your password.");
  assert.equal(validatePassword("abc"), undefined);
});

test("validateNewPassword checks confirmation", () => {
  assert.deepEqual(validateNewPassword("", ""), {
    password: "Choose a new password.",
    confirmPassword: "Confirm your new password.",
  });
  assert.equal(
    validateNewPassword("StrongPass1", "Different1").confirmPassword,
    "Passwords do not match.",
  );
  assert.deepEqual(validateNewPassword("StrongPass1", "StrongPass1"), {});
});

test("validateVerificationCode requires six digits", () => {
  assert.equal(validateVerificationCode(""), "Enter the verification code.");
  assert.equal(validateVerificationCode("123"), "Enter the 6-digit code.");
  assert.equal(validateVerificationCode("12a456"), "Enter the 6-digit code.");
  assert.equal(validateVerificationCode("123456"), undefined);
});

test("validateEmailForm aggregates field errors", () => {
  const errors = validateEmailForm("bad", "");
  assert.equal(errors.email, "Enter a valid email address.");
  assert.equal(errors.password, "Enter your password.");
  assert.equal(hasFieldErrors(errors), true);
  assert.deepEqual(validateEmailForm("ama@example.com", "secret"), {});
});
