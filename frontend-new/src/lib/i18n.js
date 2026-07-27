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

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      en: { common: en },
      ar: { common: ar },
      fr: { common: fr },
      hi: { common: hi },
    },
    // ALWAYS initialize in English — the same language the pages were
    // pre-rendered in at build time. Reading the saved language here (before
    // hydration) made React's first client render differ from the server HTML
    // for every non-English user → React error #418 on every page load.
    // LanguageProvider switches to the saved language right after mount.
    lng: "en",
    fallbackLng: "en",
    defaultNS: "common",
    ns: ["common"],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export default i18n;
