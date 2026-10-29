import type {
  OnboardingAnswers,
  OnboardingStep,
  OnboardingStepId,
} from "../types/onboarding";

export const MAX_SUBJECTS = 6;
export const MAX_GOALS = 6;
export const MIN_AGE = 13;

export const EMPTY_ONBOARDING_ANSWERS: OnboardingAnswers = {
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
};

export const SUBJECTS = [
  "Mathematics",
  "Biology",
  "Chemistry",
  "Physics",
  "English",
  "French",
  "Portuguese",
  "Arabic",
  "Swahili",
  "History",
  "Geography",
  "Economics",
  "Business",
  "Computer Science",
  "AI & Data",
  "Engineering",
  "Psychology",
  "Art & Design",
  "Music",
  "Health & Medicine",
  "Law & Politics",
  "Agriculture",
  "Environment",
  "Other",
] as const;

export const GOALS = [
  "Pass my exams",
  "Learn a new language",
  "Career growth",
  "Academic study",
  "Build a side project",
  "Creative skills",
  "AI & technology",
  "Health & wellness",
  "Start a business",
  "General curiosity",
] as const;

export interface SchoolTypeOption {
  value: string;
  label: string;
  description: string;
  educationLevel: string;
  icon: string;
}

export const SCHOOL_TYPES: SchoolTypeOption[] = [
  {
    value: "middle_school",
    label: "Middle school",
    description: "Lower secondary or junior high",
    educationLevel: "Middle School",
    icon: "book-open-variant",
  },
  {
    value: "high_school",
    label: "High school",
    description: "Secondary school or senior high",
    educationLevel: "High School",
    icon: "school",
  },
  {
    value: "university",
    label: "University",
    description: "Undergraduate or postgraduate study",
    educationLevel: "Bachelor",
    icon: "town-hall",
  },
  {
    value: "vocational",
    label: "Vocational / Trade",
    description: "Technical, craft, or professional training",
    educationLevel: "Diploma",
    icon: "hammer-wrench",
  },
  {
    value: "self_taught",
    label: "Self-taught",
    description: "Learning independently, outside a school",
    educationLevel: "Self-taught",
    icon: "compass-outline",
  },
  {
    value: "other",
    label: "Other",
    description: "A different learning path",
    educationLevel: "Other",
    icon: "dots-horizontal",
  },
];

export const DEGREE_OPTIONS = [
  "Certificate",
  "Diploma",
  "Associate",
  "Bachelor's",
  "Master's",
  "Doctorate",
  "Other",
] as const;

const MIDDLE_GRADES = ["Grade 6", "Grade 7", "Grade 8", "Grade 9"];
const HIGH_GRADES = [
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
  "Form 1",
  "Form 2",
  "Form 3",
  "Form 4",
  "Form 5",
  "Form 6",
];
const UNIVERSITY_YEARS = [
  "Year 1",
  "Year 2",
  "Year 3",
  "Year 4",
  "Year 5",
  "Year 6",
  "Graduate",
];
const VOCATIONAL_YEARS = ["Year 1", "Year 2", "Year 3"];
const EXPERIENCE_LEVELS = ["Beginner", "Intermediate", "Advanced"];

export function getGradeOptions(schoolType: string): string[] {
  switch (schoolType) {
    case "middle_school":
      return MIDDLE_GRADES;
    case "high_school":
      return HIGH_GRADES;
    case "university":
      return UNIVERSITY_YEARS;
    case "vocational":
      return VOCATIONAL_YEARS;
    case "self_taught":
      return EXPERIENCE_LEVELS;
    default:
      return [];
  }
}

export function getSchoolTypeOption(value: string): SchoolTypeOption | undefined {
  return SCHOOL_TYPES.find((option) => option.value === value);
}

export function getSchoolTypeLabel(value: string): string {
  return getSchoolTypeOption(value)?.label ?? value;
}

export function requiresDegree(value: string): boolean {
  return value === "university";
}

export function supportsGrade(value: string): boolean {
  return value !== "" && value !== "other";
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    eyebrow: "Welcome to Yuinx",
    title: "Let’s build your learning path",
    subtitle:
      "A few quick questions so your quests, streaks, and courses fit you from day one.",
  },
  {
    id: "name",
    eyebrow: "Make it personal",
    title: "What should we call you?",
    subtitle: "This is the name you’ll see across your camp and profile.",
  },
  {
    id: "birthday",
    eyebrow: "About you",
    title: "When were you born?",
    subtitle: "This helps us keep the experience age-appropriate.",
    optional: true,
  },
  {
    id: "country",
    eyebrow: "Your corner of Africa",
    title: "Where are you learning from?",
    subtitle: "Pick your country so we can shape examples around your world.",
  },
  {
    id: "region",
    eyebrow: "Make it local",
    title: "Which region or city?",
    subtitle: "Optional, but it helps us make your path feel closer to home.",
    optional: true,
  },
  {
    id: "schoolType",
    eyebrow: "Your learning stage",
    title: "Where are you learning right now?",
    subtitle: "We’ll use this to pitch courses at the right level.",
  },
  {
    id: "school",
    eyebrow: "Your learning home",
    title: "What school do you attend?",
    subtitle: "Optional. Add a school, university, or training centre.",
    optional: true,
  },
  {
    id: "grade",
    eyebrow: "Your level",
    title: "Which year are you in?",
    subtitle: "Choose the closest match. You can change this later.",
    optional: true,
  },
  {
    id: "degree",
    eyebrow: "Your programme",
    title: "What are you studying?",
    subtitle: "Tell us your degree level and field of study.",
    optional: true,
  },
  {
    id: "subjects",
    eyebrow: "Your curiosity",
    title: "Pick your subjects",
    subtitle: "Choose up to six. These shape your first quests.",
  },
  {
    id: "goals",
    eyebrow: "Your direction",
    title: "What do you want to achieve?",
    subtitle: "Pick up to six goals. We’ll keep your path pointed at them.",
  },
  {
    id: "ready",
    eyebrow: "Your path is ready",
    title: "One last step",
    subtitle:
      "Create your account and we’ll save your answers to your Yuinx profile.",
  },
];

export function getStep(stepId: OnboardingStepId): OnboardingStep {
  return ONBOARDING_STEPS.find((step) => step.id === stepId) ?? ONBOARDING_STEPS[0];
}
