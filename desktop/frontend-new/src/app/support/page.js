"use client";

import { useTranslation } from "react-i18next";
import ContactCard from "@/components/Support/ContactCard";
import FaqChat from "@/components/Support/FaqChat";

export default function SupportPage() {
  const { t } = useTranslation();

  return (
    <div className="p-6 w-full">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t("supportPage.title")}</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">{t("supportPage.subtitle")}</p>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5 items-start">
        <ContactCard />
        <FaqChat />
      </div>
    </div>
  );
}
