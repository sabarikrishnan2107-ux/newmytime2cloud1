"use client";

import { useEffect } from "react";
import i18n, { LANGUAGE_STORAGE_KEY, SUPPORTED_LANGUAGES } from "@/lib/i18n";

export default function LanguageProvider({ children }) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    const valid = SUPPORTED_LANGUAGES.some((l) => l.code === saved);
    const code = valid ? saved : "en";

    if (i18n.language !== code) {
      i18n.changeLanguage(code);
    }

    document.documentElement.lang = code;
    // Force LTR layout for all languages so the app's visual layout stays
    // identical across English / Arabic / French / Hindi. Arabic glyphs still
    // render right-to-left within text (browser bidi algorithm).
    document.documentElement.dir = "ltr";
  }, []);

  return children;
}
