import { MAX_SUBJECTS, getSchoolTypeOption } from "../../data/onboarding";
import type { OnboardingAnswers } from "../../types/onboarding";
import type { UserProfile } from "../../types/user";
import { uniqueStrings } from "./steps";

export function answersToProfileUpdates(
  answers: OnboardingAnswers,
): Partial<UserProfile> {
  const subjects = uniqueStrings(answers.subjects).slice(0, MAX_SUBJECTS);
  const school = answers.school.trim();
  const grade = answers.grade.trim();
  const degree = answers.degree.trim();
  const majorCourse = answers.majorCourse.trim() || subjects[0] || "";
  const schoolType = getSchoolTypeOption(answers.schoolType);

  return {
    displayName: answers.displayName.trim() || undefined,
    birthday: answers.birthday.trim() || undefined,
    country: answers.country || undefined,
    region: answers.region.trim() || undefined,
    schoolType: answers.schoolType || undefined,
    school: school || undefined,
    grade: grade || undefined,
    degree: degree || undefined,
    majorCourse: majorCourse || undefined,
    subjects,
    interests: subjects,
    learningGoals: uniqueStrings(answers.learningGoals),
    educationLevel: degree || schoolType?.educationLevel || undefined,
    level: grade || undefined,
    university:
      answers.schoolType === "university" ? school || undefined : undefined,
    onBoarded: true,
  };
}

export function mergeOnboardingIntoProfile(
  current: UserProfile,
  answers: OnboardingAnswers,
): UserProfile {
  const updates = answersToProfileUpdates(answers);
  const subjects = uniqueStrings([
    ...(current.subjects ?? []),
    ...(updates.subjects ?? []),
  ]);
  const interests = uniqueStrings([
    ...(current.interests ?? []),
    ...(updates.interests ?? []),
  ]);
  const school = updates.school ?? current.school;
  const university =
    updates.schoolType === "university" && updates.school
      ? updates.school
      : current.university;

  return {
    ...current,
    ...updates,
    displayName: updates.displayName ?? current.displayName,
    birthday: updates.birthday ?? current.birthday,
    country: updates.country ?? current.country,
    region: updates.region ?? current.region,
    schoolType: updates.schoolType ?? current.schoolType,
    school,
    grade: updates.grade ?? current.grade,
    degree: updates.degree ?? current.degree,
    majorCourse: updates.majorCourse ?? current.majorCourse,
    subjects,
    interests,
    learningGoals:
      updates.learningGoals && updates.learningGoals.length > 0
        ? updates.learningGoals
        : current.learningGoals,
    educationLevel: updates.educationLevel ?? current.educationLevel,
    level: updates.level ?? current.level,
    university,
    onBoarded: true,
  };
}
