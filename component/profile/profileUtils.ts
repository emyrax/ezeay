import type { Availability, UserProfile } from "../../types/user";
import type { ProfileIconName } from "./types";

export const AVAILABILITY_CONFIG: Record<
  Availability,
  { label: string; color: string; icon: ProfileIconName }
> = {
  open_to_work: { label: "Open to Work", color: "#22C55E", icon: "briefcase" },
  open_to_learn: { label: "Open to Learn", color: "#3B82F6", icon: "school" },
  open_to_mentor: {
    label: "Open to Mentor",
    color: "#8B5CF6",
    icon: "account-tie",
  },
  not_looking: { label: "Not Looking", color: "#6B7280", icon: "eye-off" },
};

interface CompletionField {
  label: string;
  done: (profile: UserProfile) => boolean;
}

export const PROFILE_COMPLETION_FIELDS: CompletionField[] = [
  { label: "Display name", done: (p) => !!p.displayName },
  { label: "Headline", done: (p) => !!p.headline },
  { label: "Bio", done: (p) => !!p.bio },
  { label: "Location", done: (p) => !!p.location },
  { label: "Industry", done: (p) => !!p.industry },
  { label: "Department", done: (p) => !!p.department },
  { label: "Job title", done: (p) => !!p.jobTitle },
  { label: "Company", done: (p) => !!p.company },
  { label: "Birthday", done: (p) => !!p.birthday },
  { label: "Education level", done: (p) => !!p.educationLevel },
  { label: "Collar type", done: (p) => !!p.collarType },
  { label: "Availability", done: (p) => !!p.availability },
  { label: "Website", done: (p) => !!p.website },
  { label: "LinkedIn", done: (p) => !!p.linkedInUrl },
  { label: "Photo", done: (p) => !!p.photoURL },
  { label: "Skills", done: (p) => !!(p.skills && p.skills.length > 0) },
  {
    label: "Trade skills",
    done: (p) => !!(p.tradeSkills && p.tradeSkills.length > 0),
  },
  {
    label: "Work experience",
    done: (p) => !!(p.workExperience && p.workExperience.length > 0),
  },
  {
    label: "Education",
    done: (p) => !!(p.education && p.education.length > 0),
  },
  {
    label: "Certifications",
    done: (p) => !!(p.certifications && p.certifications.length > 0),
  },
  { label: "Languages", done: (p) => !!(p.languages && p.languages.length > 0) },
  { label: "Interests", done: (p) => !!(p.interests && p.interests.length > 0) },
];

const SUGGESTION_FIELDS: CompletionField[] = [
  { label: "Add a headline", done: (p) => !!p.headline },
  { label: "Write a bio", done: (p) => !!p.bio },
  { label: "Add your location", done: (p) => !!p.location },
  { label: "List your skills", done: (p) => !!(p.skills && p.skills.length > 0) },
  {
    label: "Add work experience",
    done: (p) => !!(p.workExperience && p.workExperience.length > 0),
  },
  {
    label: "Add education",
    done: (p) => !!(p.education && p.education.length > 0),
  },
  {
    label: "Add certifications",
    done: (p) => !!(p.certifications && p.certifications.length > 0),
  },
  {
    label: "Add languages",
    done: (p) => !!(p.languages && p.languages.length > 0),
  },
  {
    label: "Add interests",
    done: (p) => !!(p.interests && p.interests.length > 0),
  },
  { label: "Add your website", done: (p) => !!p.website },
  { label: "Add LinkedIn", done: (p) => !!p.linkedInUrl },
];

export function getProfileCompletion(profile: UserProfile | null) {
  const total = PROFILE_COMPLETION_FIELDS.length;
  if (!profile) {
    return { filled: 0, total, pct: 0, missing: [] as string[] };
  }
  const filled = PROFILE_COMPLETION_FIELDS.filter((field) =>
    field.done(profile),
  ).length;
  const pct = Math.min(20 + Math.round((filled / total) * 80), 100);
  const missing = SUGGESTION_FIELDS.filter((field) => !field.done(profile))
    .map((field) => field.label)
    .slice(0, 3);
  return { filled, total, pct, missing };
}

export function formatProfileDate(
  dateStr?: string | Date | null,
  fallback = "Present",
): string {
  if (!dateStr) return fallback;
  const date = dateStr instanceof Date ? dateStr : new Date(dateStr);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function getSkillLevel(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return 2 + (Math.abs(hash) % 4);
}

export function getInitials(name?: string | null): string {
  if (!name) return "Y";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "Y";
}
