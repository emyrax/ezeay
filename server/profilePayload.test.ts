import assert from "node:assert/strict";
import test from "node:test";
import {
  buildUserCreateValues,
  buildUserUpdateValues,
  ProfilePayloadError,
} from "./profilePayload";

const now = new Date("2026-01-01T00:00:00.000Z");

test("create payload fills non-null defaults", () => {
  const values = buildUserCreateValues("user_123", {}, now);

  assert.equal(values.id, "user_123");
  assert.equal(values.displayName, "Scholar");
  assert.equal(values.email, "");
  assert.equal(values.level, "");
  assert.equal(values.majorCourse, "");
  assert.equal(values.subjects, "[]");
  assert.equal(values.learningGoals, "[]");
  assert.equal(values.onBoarded, false);
  assert.equal(values.professionalInfoEnabled, true);
  assert.equal(values.courses, "[]");
  assert.equal(values.createdAt, now);
});

test("create payload keeps all onboarding fields", () => {
  const values = buildUserCreateValues(
    "user_123",
    {
      displayName: " Ama ",
      email: "ama@example.com",
      photoURL: "https://example.com/ama.png",
      country: "Ghana",
      region: "Kumasi",
      schoolType: "university",
      school: "KNUST",
      grade: "",
      degree: "BSc",
      majorCourse: "Physics",
      subjects: ["Physics", "Math", "Physics"],
      professionalInfoEnabled: false,
      locationLat: 6.67,
      locationLng: -1.62,
      university: "KNUST",
      xp: 25,
      coins: 4,
      gamingLevel: 2,
      rank: "Spark",
      nextLevelXp: 200,
      courses: [{ id: "course_1" }],
      earnedTrophies: ["first-step"],
      learningGoals: ["Pass exams", "Build projects"],
      onBoarded: true,
      modelRatings: { "gemini::gemini-2.5-flash": 4 },
      isPro: true,
      headline: "Student",
      bio: "Learning physics",
      skills: ["Physics"],
      languages: ["English"],
      interests: ["Physics"],
      education: [{ id: "edu_1", institution: "KNUST" }],
      workExperience: [],
      tradeSkills: [],
      certifications: [],
      birthday: "",
      yearsOfTradeExperience: 2,
      availability: "open_to_learn",
      collarType: "white",
    },
    now,
  );

  assert.equal(values.displayName, "Ama");
  assert.equal(values.email, "ama@example.com");
  assert.equal(values.photoUrl, "https://example.com/ama.png");
  assert.equal(values.country, "Ghana");
  assert.equal(values.region, "Kumasi");
  assert.equal(values.schoolType, "university");
  assert.equal(values.school, "KNUST");
  assert.equal(values.grade, null);
  assert.equal(values.degree, "BSc");
  assert.equal(values.majorCourse, "Physics");
  assert.equal(values.subjects, '["Physics","Math"]');
  assert.equal(values.professionalInfoEnabled, false);
  assert.equal(values.locationLat, 6.67);
  assert.equal(values.locationLng, -1.62);
  assert.equal(values.university, "KNUST");
  assert.equal(values.xp, 25);
  assert.equal(values.coins, 4);
  assert.equal(values.gamingLevel, 2);
  assert.equal(values.nextLevelXp, 200);
  assert.equal(values.courses, '[{"id":"course_1"}]');
  assert.equal(values.earnedTrophies, '["first-step"]');
  assert.equal(values.learningGoals, '["Pass exams","Build projects"]');
  assert.equal(values.onBoarded, true);
  assert.equal(values.modelRatings, '{"gemini::gemini-2.5-flash":4}');
  assert.equal(values.isPro, true);
  assert.equal(values.headline, "Student");
  assert.equal(values.bio, "Learning physics");
  assert.equal(values.skills, '["Physics"]');
  assert.equal(values.languages, '["English"]');
  assert.equal(values.interests, '["Physics"]');
  assert.equal(values.education, '[{"id":"edu_1","institution":"KNUST"}]');
  assert.equal(values.workExperience, "[]");
  assert.equal(values.tradeSkills, "[]");
  assert.equal(values.certifications, "[]");
  assert.equal(values.birthday, null);
  assert.equal(values.yearsOfTradeExperience, 2);
  assert.equal(values.availability, "open_to_learn");
  assert.equal(values.collarType, "white");
});

test("update payload clears text and arrays explicitly", () => {
  const values = buildUserUpdateValues(
    {
      headline: "   ",
      bio: "",
      location: "",
      birthday: "",
      skills: [],
      languages: [],
      interests: [],
      tradeSkills: [],
      education: [],
      workExperience: [],
      certifications: [],
      subjects: [],
      learningGoals: [],
      educationLevel: "",
      country: "",
      region: "",
      school: "",
      grade: "",
      degree: "",
      university: "",
      website: "",
      linkedInUrl: "",
      department: "",
      industry: "",
      jobTitle: "",
      company: "",
      collarType: "",
      availability: "",
      locationLat: "",
      locationLng: "",
      yearsOfTradeExperience: "",
    },
    now,
  );

  assert.equal(values.headline, null);
  assert.equal(values.bio, null);
  assert.equal(values.location, null);
  assert.equal(values.birthday, null);
  assert.equal(values.skills, "[]");
  assert.equal(values.languages, "[]");
  assert.equal(values.interests, "[]");
  assert.equal(values.tradeSkills, "[]");
  assert.equal(values.education, "[]");
  assert.equal(values.workExperience, "[]");
  assert.equal(values.certifications, "[]");
  assert.equal(values.subjects, "[]");
  assert.equal(values.learningGoals, "[]");
  assert.equal(values.educationLevel, null);
  assert.equal(values.country, null);
  assert.equal(values.region, null);
  assert.equal(values.school, null);
  assert.equal(values.grade, null);
  assert.equal(values.degree, null);
  assert.equal(values.university, null);
  assert.equal(values.website, null);
  assert.equal(values.linkedInUrl, null);
  assert.equal(values.department, null);
  assert.equal(values.industry, null);
  assert.equal(values.jobTitle, null);
  assert.equal(values.company, null);
  assert.equal(values.collarType, null);
  assert.equal(values.availability, null);
  assert.equal(values.locationLat, null);
  assert.equal(values.locationLng, null);
  assert.equal(values.yearsOfTradeExperience, null);
});

test("update payload rejects an empty display name", () => {
  assert.throws(
    () => buildUserUpdateValues({ displayName: "  " }),
    ProfilePayloadError,
  );
});

test("update payload preserves empty required text fields", () => {
  const values = buildUserUpdateValues(
    { level: "", majorCourse: "", email: "" },
    now,
  );

  assert.equal(values.level, "");
  assert.equal(values.majorCourse, "");
  assert.equal(values.email, "");
});

test("update payload accepts JSON strings for backwards compatibility", () => {
  const values = buildUserUpdateValues({
    skills: '["React Native"]',
    education: '[{"id":"edu_1"}]',
    modelRatings: '{"gemini::gemini-2.5-flash":5}',
  });

  assert.equal(values.skills, '["React Native"]');
  assert.equal(values.education, '[{"id":"edu_1"}]');
  assert.equal(values.modelRatings, '{"gemini::gemini-2.5-flash":5}');
});

test("update payload rejects invalid arrays and enums", () => {
  assert.throws(
    () => buildUserUpdateValues({ subjects: ["Physics", 42] }),
    ProfilePayloadError,
  );
  assert.throws(
    () => buildUserUpdateValues({ education: [{ id: "valid" }, "nope"] }),
    ProfilePayloadError,
  );
  assert.throws(
    () => buildUserUpdateValues({ availability: "always" }),
    ProfilePayloadError,
  );
});

test("update payload handles numeric fields", () => {
  const values = buildUserUpdateValues(
    {
      xp: "12",
      coins: 3,
      locationLat: "6.67",
      locationLng: "not-a-number",
      yearsOfTradeExperience: "4",
    },
    now,
  );

  assert.equal(values.xp, 12);
  assert.equal(values.coins, 3);
  assert.equal(values.locationLat, 6.67);
  assert.equal(values.locationLng, null);
  assert.equal(values.yearsOfTradeExperience, 4);
});
