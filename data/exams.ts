export const ALL_EXAMS_VALUE = "";
export const OTHER_EXAM_VALUE = "__other__";

export interface ExamOption {
  label: string;
  value: string;
}

export const EXAM_OPTIONS: ExamOption[] = [
  { label: "All exams / Not specified", value: ALL_EXAMS_VALUE },
  { label: "WAEC", value: "WAEC" },
  { label: "JAMB", value: "JAMB" },
  { label: "NECO", value: "NECO" },
  { label: "BECE", value: "BECE" },
  { label: "KCSE", value: "KCSE" },
  { label: "IGCSE", value: "IGCSE" },
  { label: "IB", value: "IB" },
  { label: "SAT", value: "SAT" },
  { label: "ACT", value: "ACT" },
  { label: "University / College", value: "University" },
  { label: "Professional certification", value: "Professional" },
  { label: "Other", value: OTHER_EXAM_VALUE },
];

export function isPresetExam(value: string | null | undefined): boolean {
  const exam = value?.trim();
  if (!exam) return false;
  return EXAM_OPTIONS.some(
    (option) =>
      option.value === exam &&
      option.value !== ALL_EXAMS_VALUE &&
      option.value !== OTHER_EXAM_VALUE,
  );
}

export function examLabel(value: string | null | undefined): string {
  return value?.trim() || "All exams";
}
