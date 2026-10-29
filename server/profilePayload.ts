import { users } from "../db/schema";

type UserInsert = typeof users.$inferInsert;

export class ProfilePayloadError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "ProfilePayloadError";
    this.code = code;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function has(body: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(body, key);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function nullableText(value: unknown): string | null {
  return text(value) || null;
}

function parseJson(value: string, field: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    throw new ProfilePayloadError(
      `${field} must contain valid JSON.`,
      `invalid_${field}`,
    );
  }
}

function stringArray(value: unknown, field: string): string[] {
  if (value === undefined || value === null) return [];

  let parsed = value;
  if (typeof parsed === "string") {
    const trimmed = parsed.trim();
    if (!trimmed) return [];
    parsed = parseJson(trimmed, field);
  }

  if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== "string")) {
    throw new ProfilePayloadError(
      `${field} must be an array of strings.`,
      `invalid_${field}`,
    );
  }

  return Array.from(
    new Set(
      parsed
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean),
    ),
  );
}

function objectArray(value: unknown, field: string): Record<string, unknown>[] {
  if (value === undefined || value === null) return [];

  let parsed = value;
  if (typeof parsed === "string") {
    const trimmed = parsed.trim();
    if (!trimmed) return [];
    parsed = parseJson(trimmed, field);
  }

  if (
    !Array.isArray(parsed) ||
    parsed.some(
      (item) =>
        item === null || typeof item !== "object" || Array.isArray(item),
    )
  ) {
    throw new ProfilePayloadError(
      `${field} must be an array of objects.`,
      `invalid_${field}`,
    );
  }

  return parsed as Record<string, unknown>[];
}

function modelRatings(value: unknown): Record<string, number> {
  if (value === undefined || value === null) return {};

  let parsed = value;
  if (typeof parsed === "string") {
    const trimmed = parsed.trim();
    if (!trimmed) return {};
    parsed = parseJson(trimmed, "modelRatings");
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new ProfilePayloadError(
      "modelRatings must be an object.",
      "invalid_modelRatings",
    );
  }

  const ratings: Record<string, number> = {};
  for (const [key, rating] of Object.entries(parsed)) {
    if (typeof rating !== "number" || !Number.isFinite(rating)) {
      throw new ProfilePayloadError(
        "modelRatings values must be numbers.",
        "invalid_modelRatings",
      );
    }
    ratings[key] = rating;
  }
  return ratings;
}

function booleanOrDefault(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function integerOrUndefined(value: unknown, field: string): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed)) {
    throw new ProfilePayloadError(
      `${field} must be an integer.`,
      `invalid_${field}`,
    );
  }
  return parsed;
}

function numberOrNull(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const COLLAR_TYPES = new Set(["white", "yellow", "both"]);
const AVAILABILITY_VALUES = new Set([
  "open_to_work",
  "open_to_learn",
  "open_to_mentor",
  "not_looking",
]);

function enumOrNull(
  value: unknown,
  field: string,
  allowed: Set<string>,
): string | null {
  const parsed = text(value);
  if (!parsed) return null;
  if (!allowed.has(parsed)) {
    throw new ProfilePayloadError(
      `${field} is not a supported value.`,
      `invalid_${field}`,
    );
  }
  return parsed;
}

function commonUpdateValues(
  rawBody: unknown,
  now: Date,
): Partial<UserInsert> {
  const body = asRecord(rawBody);
  const values: Partial<UserInsert> = {};

  if (has(body, "displayName")) {
    const displayName = text(body.displayName);
    if (!displayName) {
      throw new ProfilePayloadError(
        "Display name is required.",
        "invalid_displayName",
      );
    }
    values.displayName = displayName;
  }
  if (has(body, "email")) values.email = text(body.email);
  if (has(body, "photoURL")) values.photoUrl = nullableText(body.photoURL);
  if (has(body, "level")) values.level = text(body.level);
  if (has(body, "majorCourse")) values.majorCourse = text(body.majorCourse);
  if (has(body, "birthday")) values.birthday = nullableText(body.birthday);
  if (has(body, "educationLevel")) {
    values.educationLevel = nullableText(body.educationLevel);
  }
  if (has(body, "country")) values.country = nullableText(body.country);
  if (has(body, "region")) values.region = nullableText(body.region);
  if (has(body, "schoolType")) values.schoolType = nullableText(body.schoolType);
  if (has(body, "school")) values.school = nullableText(body.school);
  if (has(body, "grade")) values.grade = nullableText(body.grade);
  if (has(body, "degree")) values.degree = nullableText(body.degree);
  if (has(body, "subjects")) {
    values.subjects = JSON.stringify(stringArray(body.subjects, "subjects"));
  }
  if (has(body, "professionalInfoEnabled")) {
    values.professionalInfoEnabled = booleanOrDefault(
      body.professionalInfoEnabled,
      true,
    );
  }
  if (has(body, "status")) values.status = text(body.status) || "active";
  if (has(body, "xp")) values.xp = integerOrUndefined(body.xp, "xp") ?? 0;
  if (has(body, "coins")) {
    values.coins = integerOrUndefined(body.coins, "coins") ?? 0;
  }
  if (has(body, "gamingLevel")) {
    values.gamingLevel =
      integerOrUndefined(body.gamingLevel, "gamingLevel") ?? 1;
  }
  if (has(body, "rank")) values.rank = text(body.rank) || "Spark";
  if (has(body, "nextLevelXp")) {
    values.nextLevelXp =
      integerOrUndefined(body.nextLevelXp, "nextLevelXp") ?? 100;
  }
  if (has(body, "courses")) {
    values.courses = JSON.stringify(objectArray(body.courses, "courses"));
  }
  if (has(body, "earnedTrophies")) {
    values.earnedTrophies = JSON.stringify(
      stringArray(body.earnedTrophies, "earnedTrophies"),
    );
  }
  if (has(body, "lastCheckInDate")) {
    values.lastCheckInDate = nullableText(body.lastCheckInDate);
  }
  if (has(body, "currentStreak")) {
    values.currentStreak =
      integerOrUndefined(body.currentStreak, "currentStreak") ?? 0;
  }
  if (has(body, "longestStreak")) {
    values.longestStreak =
      integerOrUndefined(body.longestStreak, "longestStreak") ?? 0;
  }
  if (has(body, "learningGoals")) {
    values.learningGoals = JSON.stringify(
      stringArray(body.learningGoals, "learningGoals"),
    );
  }
  if (has(body, "onBoarded")) {
    values.onBoarded = booleanOrDefault(body.onBoarded, false);
  }
  if (has(body, "modelRatings")) {
    values.modelRatings = JSON.stringify(modelRatings(body.modelRatings));
  }
  if (has(body, "isPro")) {
    values.isPro = booleanOrDefault(body.isPro, false);
  }
  if (has(body, "headline")) values.headline = nullableText(body.headline);
  if (has(body, "bio")) values.bio = nullableText(body.bio);
  if (has(body, "location")) values.location = nullableText(body.location);
  if (has(body, "locationLat")) {
    values.locationLat = numberOrNull(body.locationLat);
  }
  if (has(body, "locationLng")) {
    values.locationLng = numberOrNull(body.locationLng);
  }
  if (has(body, "university")) values.university = nullableText(body.university);
  if (has(body, "website")) values.website = nullableText(body.website);
  if (has(body, "linkedInUrl")) {
    values.linkedInUrl = nullableText(body.linkedInUrl);
  }
  if (has(body, "department")) {
    values.department = nullableText(body.department);
  }
  if (has(body, "collarType")) {
    values.collarType = enumOrNull(
      body.collarType,
      "collarType",
      COLLAR_TYPES,
    );
  }
  if (has(body, "availability")) {
    values.availability = enumOrNull(
      body.availability,
      "availability",
      AVAILABILITY_VALUES,
    );
  }
  if (has(body, "industry")) values.industry = nullableText(body.industry);
  if (has(body, "jobTitle")) values.jobTitle = nullableText(body.jobTitle);
  if (has(body, "company")) values.company = nullableText(body.company);
  if (has(body, "yearsOfTradeExperience")) {
    values.yearsOfTradeExperience =
      integerOrUndefined(
        body.yearsOfTradeExperience,
        "yearsOfTradeExperience",
      ) ?? null;
  }
  if (has(body, "skills")) {
    values.skills = JSON.stringify(stringArray(body.skills, "skills"));
  }
  if (has(body, "languages")) {
    values.languages = JSON.stringify(stringArray(body.languages, "languages"));
  }
  if (has(body, "interests")) {
    values.interests = JSON.stringify(stringArray(body.interests, "interests"));
  }
  if (has(body, "tradeSkills")) {
    values.tradeSkills = JSON.stringify(
      stringArray(body.tradeSkills, "tradeSkills"),
    );
  }
  if (has(body, "education")) {
    values.education = JSON.stringify(objectArray(body.education, "education"));
  }
  if (has(body, "workExperience")) {
    values.workExperience = JSON.stringify(
      objectArray(body.workExperience, "workExperience"),
    );
  }
  if (has(body, "certifications")) {
    values.certifications = JSON.stringify(
      objectArray(body.certifications, "certifications"),
    );
  }

  values.updatedAt = now;
  return values;
}

export function buildUserCreateValues(
  uid: string,
  rawBody: unknown,
  now = new Date(),
): UserInsert {
  const body = asRecord(rawBody);
  const values: UserInsert = {
    id: uid,
    displayName: text(body.displayName) || "Scholar",
    email: text(body.email),
    photoUrl: null,
    level: "",
    majorCourse: "",
    birthday: null,
    educationLevel: null,
    country: null,
    region: null,
    schoolType: null,
    school: null,
    grade: null,
    degree: null,
    subjects: "[]",
    professionalInfoEnabled: true,
    status: "active",
    xp: 0,
    coins: 0,
    gamingLevel: 1,
    rank: "Spark",
    nextLevelXp: 100,
    courses: "[]",
    earnedTrophies: "[]",
    currentStreak: 0,
    longestStreak: 0,
    learningGoals: "[]",
    onBoarded: false,
    modelRatings: "{}",
    isPro: false,
    education: "[]",
    workExperience: "[]",
    tradeSkills: "[]",
    certifications: "[]",
    skills: "[]",
    languages: "[]",
    interests: "[]",
    createdAt: now,
    ...commonUpdateValues(
      {
        ...body,
        displayName: text(body.displayName) || "Scholar",
      },
      now,
    ),
  };

  return values;
}

export function buildUserUpdateValues(
  rawBody: unknown,
  now = new Date(),
): Partial<UserInsert> {
  return commonUpdateValues(rawBody, now);
}
