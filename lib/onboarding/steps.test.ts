import assert from "node:assert/strict";
import { test } from "node:test";
import {
  EMPTY_ONBOARDING_ANSWERS,
  MAX_SUBJECTS,
  MIN_AGE,
} from "../../data/onboarding";
import type { OnboardingAnswers } from "../../types/onboarding";
import {
  getFirstIncompleteStepId,
  getNextStepId,
  getPreviousStepId,
  getProgress,
  getVisibleSteps,
  isOnboardingStepId,
  parseBirthdayDate,
  resolveStepParam,
  uniqueStrings,
  validateStep,
} from "./steps";

function answers(overrides: Partial<OnboardingAnswers> = {}): OnboardingAnswers {
  return { ...EMPTY_ONBOARDING_ANSWERS, ...overrides };
}

function dateString(year: number, month: number, day: number): string {
  return [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}

function birthdayYearsAgo(years: number): string {
  const now = new Date();
  const date = new Date(now.getFullYear() - years, now.getMonth(), now.getDate());
  return dateString(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

test("isOnboardingStepId accepts known steps only", () => {
  assert.equal(isOnboardingStepId("country"), true);
  assert.equal(isOnboardingStepId("not-a-step"), false);
});

test("visibility hides degree outside university and grade for other", () => {
  const highSchool = getVisibleSteps(answers({ schoolType: "high_school" }));
  const university = getVisibleSteps(answers({ schoolType: "university" }));
  const other = getVisibleSteps(answers({ schoolType: "other" }));

  assert.equal(highSchool.some((step) => step.id === "degree"), false);
  assert.equal(highSchool.some((step) => step.id === "grade"), true);
  assert.equal(university.some((step) => step.id === "degree"), true);
  assert.equal(other.some((step) => step.id === "grade"), false);
  assert.equal(other.some((step) => step.id === "degree"), false);
});

test("navigation skips hidden steps", () => {
  const highSchool = answers({ schoolType: "high_school" });
  assert.equal(getNextStepId("school", highSchool), "grade");
  assert.equal(getNextStepId("grade", highSchool), "subjects");
  assert.equal(getPreviousStepId("subjects", highSchool), "grade");

  const other = answers({ schoolType: "other" });
  assert.equal(getNextStepId("school", other), "subjects");
  assert.equal(getPreviousStepId("subjects", other), "school");
});

test("progress uses the visible step count", () => {
  assert.deepEqual(getProgress("welcome", answers({ schoolType: "university" })), {
    current: 1,
    total: 12,
    ratio: 1 / 12,
  });
  assert.equal(getProgress("ready", answers({ schoolType: "other" })).total, 10);
});

test("parseBirthdayDate rejects malformed and impossible dates", () => {
  assert.equal(parseBirthdayDate("2001-05-12")?.getDate(), 12);
  assert.equal(parseBirthdayDate("12/05/2001"), null);
  assert.equal(parseBirthdayDate("2001-13-01"), null);
  assert.equal(parseBirthdayDate("2001-02-29"), null);
  assert.equal(parseBirthdayDate("2000-02-29")?.getMonth(), 1);
});

test("name validation requires 2 to 40 characters", () => {
  assert.equal(
    validateStep("name", answers({ displayName: "A" })).displayName,
    "Enter at least 2 characters.",
  );
  assert.equal(validateStep("name", answers({ displayName: "Ama" })).displayName, undefined);
  assert.equal(
    validateStep("name", answers({ displayName: "a".repeat(41) })).displayName,
    "Keep your name under 40 characters.",
  );
});

test("birthday is optional and enforces the age floor", () => {
  assert.deepEqual(validateStep("birthday", answers()), {});
  assert.equal(
    validateStep("birthday", answers({ birthday: "not-a-date" })).birthday,
    "Use the format YYYY-MM-DD.",
  );
  assert.equal(
    validateStep("birthday", answers({ birthday: birthdayYearsAgo(MIN_AGE - 1) })).birthday,
    `Yuinx is for learners ${MIN_AGE} and older.`,
  );
  assert.equal(
    validateStep("birthday", answers({ birthday: birthdayYearsAgo(MIN_AGE) })).birthday,
    undefined,
  );
  assert.equal(
    validateStep("birthday", answers({ birthday: "1900-01-01" })).birthday,
    "Please check your date of birth.",
  );
});

test("country must be one of the supported African countries", () => {
  assert.equal(
    validateStep("country", answers()).country,
    "Choose your country.",
  );
  assert.equal(
    validateStep("country", answers({ country: "Atlantis" })).country,
    "Choose a country from the list.",
  );
  assert.equal(validateStep("country", answers({ country: "Ghana" })).country, undefined);
});

test("subjects and goals require a non-empty capped selection", () => {
  assert.equal(
    validateStep("subjects", answers()).subjects,
    "Pick at least one subject.",
  );
  assert.equal(
    validateStep("subjects", answers({ subjects: [" ", ""] })).subjects,
    "Pick at least one subject.",
  );
  assert.equal(
    validateStep(
      "subjects",
      answers({ subjects: Array.from({ length: MAX_SUBJECTS + 1 }, (_, i) => `S${i}`) }),
    ).subjects,
    `Pick up to ${MAX_SUBJECTS} subjects.`,
  );
  assert.equal(validateStep("subjects", answers({ subjects: ["Mathematics"] })).subjects, undefined);
  assert.equal(
    validateStep("goals", answers()).learningGoals,
    "Pick at least one goal.",
  );
});

test("uniqueStrings trims and removes duplicates", () => {
  assert.deepEqual(uniqueStrings([" Math ", "Math", "", "Art"]), ["Math", "Art"]);
});

test("first incomplete step starts at name and completes at ready", () => {
  assert.equal(getFirstIncompleteStepId(answers()), "name");

  const complete = answers({
    displayName: "Ama",
    country: "Ghana",
    schoolType: "high_school",
    subjects: ["Mathematics"],
    learningGoals: ["Pass my exams"],
  });
  assert.equal(getFirstIncompleteStepId(complete), "ready");
});

test("resolveStepParam ignores hidden steps", () => {
  assert.equal(
    resolveStepParam("degree", answers({ schoolType: "high_school" })),
    "name",
  );
  assert.equal(
    resolveStepParam("degree", answers({ schoolType: "university" })),
    "degree",
  );
  assert.equal(resolveStepParam("bogus", answers()), "name");
});
