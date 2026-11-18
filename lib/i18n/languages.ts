export type AppLanguageCode = "en" | "fr" | "pt" | "sw" | "ar";

export interface LanguageOption {
  code: string;
  englishName: string;
  nativeName: string;
}

export const APP_LANGUAGES: readonly LanguageOption[] = [
  { code: "en", englishName: "English", nativeName: "English" },
  { code: "fr", englishName: "French", nativeName: "Français" },
  { code: "pt", englishName: "Portuguese", nativeName: "Português" },
  { code: "sw", englishName: "Swahili", nativeName: "Kiswahili" },
  { code: "ar", englishName: "Arabic", nativeName: "العربية" },
] as const;

export const LEARNING_LANGUAGES: readonly LanguageOption[] = [
  { code: "en", englishName: "English", nativeName: "English" },
  { code: "fr", englishName: "French", nativeName: "Français" },
  { code: "pt", englishName: "Portuguese", nativeName: "Português" },
  { code: "sw", englishName: "Swahili", nativeName: "Kiswahili" },
  { code: "ar", englishName: "Arabic", nativeName: "العربية" },
  { code: "es", englishName: "Spanish", nativeName: "Español" },
  { code: "zh", englishName: "Mandarin Chinese", nativeName: "中文" },
  { code: "hi", englishName: "Hindi", nativeName: "हिन्दी" },
  { code: "de", englishName: "German", nativeName: "Deutsch" },
  { code: "it", englishName: "Italian", nativeName: "Italiano" },
  { code: "ja", englishName: "Japanese", nativeName: "日本語" },
  { code: "ko", englishName: "Korean", nativeName: "한국어" },
  { code: "ru", englishName: "Russian", nativeName: "Русский" },
  { code: "tr", englishName: "Turkish", nativeName: "Türkçe" },
  { code: "nl", englishName: "Dutch", nativeName: "Nederlands" },
  { code: "yo", englishName: "Yoruba", nativeName: "Yorùbá" },
  { code: "ig", englishName: "Igbo", nativeName: "Igbo" },
  { code: "ha", englishName: "Hausa", nativeName: "Hausa" },
  { code: "am", englishName: "Amharic", nativeName: "አማርኛ" },
  { code: "zu", englishName: "Zulu", nativeName: "isiZulu" },
] as const;

const APP_LANGUAGE_CODES = new Set(APP_LANGUAGES.map((language) => language.code));
const LEARNING_LANGUAGE_CODES = new Set(
  LEARNING_LANGUAGES.map((language) => language.code),
);

export function normalizeLanguageCode(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase().replace(/_/g, "-").split("-")[0] ?? "";
}

export function isAppLanguage(value: unknown): value is AppLanguageCode {
  return APP_LANGUAGE_CODES.has(normalizeLanguageCode(value));
}

export function isLearningLanguage(value: unknown): boolean {
  return LEARNING_LANGUAGE_CODES.has(normalizeLanguageCode(value));
}

export function getAppLanguage(value: unknown): LanguageOption | undefined {
  const code = normalizeLanguageCode(value);
  return APP_LANGUAGES.find((language) => language.code === code);
}

export function getLearningLanguage(value: unknown): LanguageOption | undefined {
  const code = normalizeLanguageCode(value);
  return LEARNING_LANGUAGES.find((language) => language.code === code);
}

export function appLanguageEnglishName(value: unknown): string {
  return getAppLanguage(value)?.englishName ?? "English";
}

export function learningLanguageEnglishName(value: unknown): string {
  return getLearningLanguage(value)?.englishName ?? "";
}

export function appLanguageNativeName(value: unknown): string {
  return getAppLanguage(value)?.nativeName ?? "English";
}

export function learningLanguageNativeName(value: unknown): string {
  return getLearningLanguage(value)?.nativeName ?? "";
}

export function isRTL(value: unknown): boolean {
  return normalizeLanguageCode(value) === "ar";
}

export function appLocale(value: unknown): string {
  switch (normalizeLanguageCode(value)) {
    case "fr":
      return "fr-FR";
    case "pt":
      return "pt-PT";
    case "sw":
      return "sw-KE";
    case "ar":
      return "ar-EG";
    default:
      return "en-NG";
  }
}
