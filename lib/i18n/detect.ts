import { getLocales } from "expo-localization";
import { isAppLanguage, type AppLanguageCode } from "./languages";

export function detectDeviceAppLanguage(): AppLanguageCode {
  try {
    const locales = getLocales();
    for (const locale of locales) {
      if (isAppLanguage(locale.languageCode)) {
        return locale.languageCode;
      }
    }
  } catch (err) {
    console.warn("[i18n] device locale detection failed:", err);
  }
  return "en";
}
