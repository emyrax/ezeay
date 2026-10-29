import assert from "node:assert/strict";
import { test } from "node:test";
import { isOAuthCanceled, resolveAuthError, resolveOAuthError } from "./errors";

test("resolveAuthError maps Clerk error codes and fields", () => {
  const existing = resolveAuthError({
    errors: [{ code: "form_identifier_exists", message: "exists" }],
  });
  assert.equal(existing.field, "email");
  assert.match(existing.message, /already exists/);

  const code = resolveAuthError({
    errors: [{ code: "form_code_incorrect", message: "bad code" }],
  });
  assert.equal(code.field, "code");
  assert.match(code.message, /not correct/);
});

test("unknown credentials share one safe message", () => {
  const missing = resolveAuthError({
    errors: [{ code: "form_identifier_not_found", message: "not found" }],
  });
  const incorrect = resolveAuthError({
    errors: [{ code: "form_password_incorrect", message: "incorrect" }],
  });
  assert.equal(missing.message, incorrect.message);
  assert.doesNotMatch(missing.message, /not found/i);
});

test("resolveAuthError falls back for unknown errors", () => {
  assert.equal(
    resolveAuthError(new Error("Network down"), "Fallback").message,
    "Network down",
  );
  assert.equal(resolveAuthError(null, "Fallback").message, "Fallback");
});

test("canceled OAuth attempts are not surfaced as errors", () => {
  assert.equal(isOAuthCanceled({ code: "ERR_CANCELED" }), true);
  assert.equal(isOAuthCanceled({ message: "User cancelled" }), true);
  assert.equal(isOAuthCanceled(new Error("boom")), false);

  const canceled = resolveOAuthError("Google", { code: "ERR_CANCELED" });
  assert.equal(canceled.canceled, true);
  assert.equal(canceled.message, "");
});

test("OAuth errors keep a provider-specific fallback", () => {
  const resolved = resolveOAuthError("Apple", {});
  assert.match(resolved.message, /Apple/);
  assert.equal(resolved.canceled, undefined);
});
