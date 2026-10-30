import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isValidProfileUrl,
  parseBirthday,
  toYmd,
  trimmedOrNull,
  trimmedOrUndefined,
  validateProfileDraft,
} from "./validation";

const validDraft = {
  displayName: "Ada Lovelace",
  website: "https://example.com",
  linkedInUrl: "linkedin.com/in/ada",
  birthday: "1990-12-10",
  yearsOfTradeExperience: "4",
};

describe("profile validation", () => {
  it("trims or clears text fields", () => {
    assert.equal(trimmedOrNull("  Lagos  "), "Lagos");
    assert.equal(trimmedOrNull("   "), null);
    assert.equal(trimmedOrUndefined("  Lagos  "), "Lagos");
    assert.equal(trimmedOrUndefined("   "), undefined);
  });

  it("accepts urls with or without a protocol", () => {
    assert.equal(isValidProfileUrl("https://example.com/path"), true);
    assert.equal(isValidProfileUrl("www.example.com"), true);
    assert.equal(isValidProfileUrl("example"), false);
    assert.equal(isValidProfileUrl(""), true);
  });

  it("parses and formats birthdays", () => {
    assert.equal(toYmd(new Date(1990, 11, 10)), "1990-12-10");
    assert.equal(parseBirthday("1990-12-10")?.getFullYear(), 1990);
    assert.equal(parseBirthday("1990-02-30"), undefined);
    assert.equal(parseBirthday("not-a-date"), undefined);
  });

  it("accepts a valid draft", () => {
    assert.equal(
      validateProfileDraft(validDraft, new Date(2026, 9, 30)),
      null,
    );
  });

  it("requires a display name", () => {
    assert.equal(
      validateProfileDraft(
        { ...validDraft, displayName: "   " },
        new Date(2026, 9, 30),
      ),
      "Display name is required.",
    );
  });

  it("rejects invalid urls", () => {
    assert.equal(
      validateProfileDraft(
        { ...validDraft, website: "not a url" },
        new Date(2026, 9, 30),
      ),
      "Enter a valid website URL.",
    );
    assert.equal(
      validateProfileDraft(
        { ...validDraft, linkedInUrl: "not a url" },
        new Date(2026, 9, 30),
      ),
      "Enter a valid LinkedIn URL.",
    );
  });

  it("rejects invalid and future birthdays", () => {
    assert.equal(
      validateProfileDraft(
        { ...validDraft, birthday: "10/12/1990" },
        new Date(2026, 9, 30),
      ),
      "Birthday must be a valid date.",
    );
    assert.equal(
      validateProfileDraft(
        { ...validDraft, birthday: "2030-01-01" },
        new Date(2026, 9, 30),
      ),
      "Birthday cannot be in the future.",
    );
  });

  it("rejects invalid trade experience", () => {
    assert.equal(
      validateProfileDraft(
        { ...validDraft, yearsOfTradeExperience: "4.5" },
        new Date(2026, 9, 30),
      ),
      "Years of experience must be a whole number between 0 and 80.",
    );
    assert.equal(
      validateProfileDraft(
        { ...validDraft, yearsOfTradeExperience: "81" },
        new Date(2026, 9, 30),
      ),
      "Years of experience must be a whole number between 0 and 80.",
    );
  });
});
