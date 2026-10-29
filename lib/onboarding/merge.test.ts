import assert from "node:assert/strict";
import { test } from "node:test";
import { EMPTY_ONBOARDING_ANSWERS, MAX_SUBJECTS } from "../../data/onboarding";
import type { OnboardingAnswers } from "../../types/onboarding";
import type { UserProfile } from "../../types/user";
import { answersToProfileUpdates, mergeOnboardingIntoProfile } from "./merge";

function answers(overrides: Partial<OnboardingAnswers> = {}): OnboardingAnswers {
  return { ...EMPTY_ONBOARDING_ANSWERS, ...overrides };
}

function profile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    uid: "user-1",
    displayName: "Old Name",
    email: "old@example.com",
    photoURL: null,
    status: "active",
    createdAt: new Date("2025-01-01T00:00:00Z"),
    xp: 0,
    coins: 0,
    gamingLevel: 1,
    rank: "Explorer",
    nextLevelXp: 100,
    courses: [],
    earnedTrophies: [],
    subjects: ["Mathematics"],
    interests: ["Art"],
    learningGoals: ["Old goal"],
    school: "Old School",
    university: "Old University",
    ...overrides,
  };
}

test("answersToProfileUpdates maps onboarding fields", () => {
  const updates = answersToProfileUpdates(
    answers({
      displayName: "  Ama  ",
      birthday: "2004-04-12",
      country: "Ghana",
      region: "Greater Accra",
      schoolType: "university",
      school: "Ashesi University",
      grade: "Year 2",
      degree: "Bachelor's",
      subjects: [" Physics ", "Physics", "Chemistry"],
      learningGoals: ["Career growth", "Career growth", "Build a side project"],
    }),
  );

  assert.equal(updates.displayName, "Ama");
  assert.equal(updates.country, "Ghana");
  assert.equal(updates.region, "Greater Accra");
  assert.equal(updates.school, "Ashesi University");
  assert.equal(updates.grade, "Year 2");
  assert.equal(updates.degree, "Bachelor's");
  assert.equal(updates.majorCourse, "Physics");
  assert.deepEqual(updates.subjects, ["Physics", "Chemistry"]);
  assert.deepEqual(updates.interests, ["Physics", "Chemistry"]);
  assert.deepEqual(updates.learningGoals, ["Career growth", "Build a side project"]);
  assert.equal(updates.educationLevel, "Bachelor's");
  assert.equal(updates.level, "Year 2");
  assert.equal(updates.university, "Ashesi University");
  assert.equal(updates.onBoarded, true);
});

test("answersToProfileUpdates caps subjects", () => {
  const subjects = Array.from({ length: MAX_SUBJECTS + 2 }, (_, i) => `Subject ${i}`);
  const updates = answersToProfileUpdates(answers({ subjects }));
  assert.equal(updates.subjects?.length, MAX_SUBJECTS);
});

test("mergeOnboardingIntoProfile preserves and unions existing data", () => {
  const merged = mergeOnboardingIntoProfile(
    profile(),
    answers({
      displayName: "Ama",
      country: "Ghana",
      schoolType: "university",
      school: "Ashesi University",
      subjects: ["Physics"],
      learningGoals: ["Career growth"],
    }),
  );

  assert.equal(merged.displayName, "Ama");
  assert.equal(merged.school, "Ashesi University");
  assert.equal(merged.university, "Ashesi University");
  assert.deepEqual(merged.subjects, ["Mathematics", "Physics"]);
  assert.deepEqual(merged.interests, ["Art", "Physics"]);
  assert.deepEqual(merged.learningGoals, ["Career growth"]);
  assert.equal(merged.onBoarded, true);
  assert.equal(merged.email, "old@example.com");
});

test("mergeOnboardingIntoProfile keeps optional fields when skipped", () => {
  const merged = mergeOnboardingIntoProfile(
    profile({ region: "Kumasi", birthday: "2000-01-01" }),
    answers({
      displayName: "Ama",
      country: "Ghana",
      schoolType: "high_school",
      school: "",
      grade: "Grade 10",
      subjects: ["Biology"],
      learningGoals: ["Pass my exams"],
    }),
  );

  assert.equal(merged.region, "Kumasi");
  assert.equal(merged.birthday, "2000-01-01");
  assert.equal(merged.school, "Old School");
  assert.equal(merged.university, "Old University");
  assert.equal(merged.educationLevel, "High School");
  assert.equal(merged.level, "Grade 10");
});

test("university selection without a school name does not overwrite university", () => {
  const merged = mergeOnboardingIntoProfile(
    profile(),
    answers({
      displayName: "Ama",
      country: "Ghana",
      schoolType: "university",
      school: "",
      subjects: ["Physics"],
      learningGoals: ["Academic study"],
    }),
  );

  assert.equal(merged.university, "Old University");
});
