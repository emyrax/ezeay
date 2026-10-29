import assert from "node:assert/strict";
import test from "node:test";
import type { PendingOnboarding } from "../../types/onboarding";
import { buildSignupProfile } from "./signup";

const base = {
  displayName: "Clerk Name",
  email: "clerk@example.com",
  photoURL: "https://example.com/avatar.png",
};

function pendingWithAnswers(
  answers: Partial<PendingOnboarding["answers"]>,
): PendingOnboarding {
  return {
    version: 1,
    savedAt: "2026-01-01T00:00:00.000Z",
    answers: {
      displayName: "",
      birthday: "",
      country: "",
      region: "",
      schoolType: "",
      school: "",
      grade: "",
      degree: "",
      majorCourse: "",
      subjects: [],
      learningGoals: [],
      ...answers,
    },
  };
}

test("new signup without onboarding stays unonboarded", () => {
  const profile = buildSignupProfile(base, null, null);

  assert.equal(profile.displayName, "Clerk Name");
  assert.equal(profile.email, "clerk@example.com");
  assert.equal(profile.photoURL, "https://example.com/avatar.png");
  assert.equal(profile.onBoarded, undefined);
  assert.equal(profile.learningGoals, undefined);
});

test("pending onboarding is merged into the create payload", () => {
  const profile = buildSignupProfile(
    base,
    pendingWithAnswers({
      displayName: "Yuinx Name",
      country: "Ghana",
      region: "Kumasi",
      schoolType: "university",
      school: "KNUST",
      majorCourse: "Physics",
      subjects: ["Physics", "Physics", "Math"],
      learningGoals: ["Pass exams", "Build projects"],
    }),
    null,
  );

  assert.equal(profile.displayName, "Yuinx Name");
  assert.equal(profile.country, "Ghana");
  assert.equal(profile.region, "Kumasi");
  assert.equal(profile.schoolType, "university");
  assert.equal(profile.school, "KNUST");
  assert.equal(profile.university, "KNUST");
  assert.equal(profile.majorCourse, "Physics");
  assert.deepEqual(profile.subjects, ["Physics", "Math"]);
  assert.deepEqual(profile.interests, ["Physics", "Math"]);
  assert.deepEqual(profile.learningGoals, ["Pass exams", "Build projects"]);
  assert.equal(profile.onBoarded, true);
});

test("legacy pending goals complete onboarding when no pending answers exist", () => {
  const profile = buildSignupProfile(base, null, ["Learn design", "Learn design"]);

  assert.deepEqual(profile.learningGoals, ["Learn design"]);
  assert.equal(profile.onBoarded, true);
  assert.equal(profile.displayName, "Clerk Name");
});

test("pending onboarding wins over legacy goals", () => {
  const profile = buildSignupProfile(
    base,
    pendingWithAnswers({ learningGoals: ["New goal"] }),
    ["Old goal"],
  );

  assert.deepEqual(profile.learningGoals, ["New goal"]);
  assert.equal(profile.onBoarded, true);
});
