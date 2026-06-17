"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Languages, Check } from "lucide-react";
import i18n, {
  SUPPORTED_LANGUAGES,
  LANGUAGE_STORAGE_KEY,
} from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export default function LanguageSwitcher({ className = "" }) {
  const { i18n: i18nFromHook } = useTranslation();
  const [current, setCurrent] = useState(i18nFromHook.language || "en");

  useEffect(() => {
    const onChange = (lng) => setCurrent(lng);
    i18n.on("languageChanged", onChange);
    return () => i18n.off("languageChanged", onChange);
  }, []);

  const activeLang =
    SUPPORTED_LANGUAGES.find((l) => l.code === current) ||
    SUPPORTED_LANGUAGES[0];

  const handleSelect = (code) => {
    i18n.changeLanguage(code);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
      document.documentElement.lang = code;
      // Layout stays LTR for all languages — see LanguageProvider for context.
      document.documentElement.dir = "ltr";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`inline-flex items-center justify-center h-9 w-9 rounded-lg bg-white border border-slate-200 text-slate-600 shadow-sm hover:bg-slate-50 transition-colors dark:bg-slate-800/50 dark:border-white/10 dark:text-slate-200 dark:shadow-none dark:hover:bg-slate-800/80 ${className}`}
        aria-label={`Change language (current: ${activeLang.name})`}
        title={activeLang.name}
      >
        <Languages className="w-4 h-4" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="z-[200] min-w-[180px] bg-white border border-slate-200 text-slate-700 shadow-xl dark:bg-[#0D1626] dark:border-white/10 dark:text-slate-200 dark:shadow-2xl"
      >
        {SUPPORTED_LANGUAGES.map((lang) => {
          const isActive = lang.code === current;
          return (
            <DropdownMenuItem
              key={lang.code}
              onSelect={() => handleSelect(lang.code)}
              className="flex items-center gap-2 cursor-pointer focus:bg-slate-100 focus:text-slate-900 dark:focus:bg-white/10 dark:focus:text-white"
            >
              <span className="text-base leading-none">{lang.flag}</span>
              <span className="flex-1">{lang.name}</span>
              {isActive && <Check className="w-3.5 h-3.5 text-emerald-400" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
