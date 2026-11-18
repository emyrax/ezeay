import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ar from "../../locales/ar.json";
import en from "../../locales/en.json";
import fr from "../../locales/fr.json";
import pt from "../../locales/pt.json";
import sw from "../../locales/sw.json";
import { isAppLanguage, type AppLanguageCode } from "./languages";

const resources = {
  en: { translation: en },
  fr: { translation: fr },
  pt: { translation: pt },
  sw: { translation: sw },
  ar: { translation: ar },
} as const;

let initialized = false;

export function initI18n(language: AppLanguageCode = "en") {
  if (!initialized) {
    i18n.use(initReactI18next).init({
      resources,
      lng: language,
      fallbackLng: "en",
      supportedLngs: ["en", "fr", "pt", "sw", "ar"],
      interpolation: { escapeValue: false },
      returnNull: false,
      saveMissing: false,
      missingKeyHandler: (languages, namespace, key) => {
        if (__DEV__) {
          console.warn(
            `[i18n] missing key "${String(key)}" (${namespace}) for ${languages.join(", ")}`,
          );
        }
      },
    });
    initialized = true;
  } else if (isAppLanguage(language) && i18n.language !== language) {
    void i18n.changeLanguage(language);
  }
  return i18n;
}

export { i18n };
