"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "@/locales/en/common.json";
import ar from "@/locales/ar/common.json";
import fr from "@/locales/fr/common.json";
import hi from "@/locales/hi/common.json";

export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
];

export const LANGUAGE_STORAGE_KEY = "app_language";

const isBrowser = typeof window !== "undefined";

function readSavedLanguage() {
  if (!isBrowser) return "en";
  const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  const valid = SUPPORTED_LANGUAGES.some((l) => l.code === saved);
  return valid ? saved : "en";
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      en: { common: en },
      ar: { common: ar },
      fr: { common: fr },
      hi: { common: hi },
    },
    lng: readSavedLanguage(),
    fallbackLng: "en",
    defaultNS: "common",
    ns: ["common"],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export default i18n;
