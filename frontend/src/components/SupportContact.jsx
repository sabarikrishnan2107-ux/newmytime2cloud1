"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Headset } from "lucide-react";

// Header icon that opens the full Support page (/support).
export default function SupportContact() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const active = (pathname || "").replace(/\/$/, "") === "/support";

  return (
    <Link
      href="/support"
      title={t("header.tooltips.support")}
      aria-label={t("header.tooltips.support")}
      className={`relative p-2 transition-colors ${active ? "text-primary" : "text-slate-400 hover:text-primary"}`}
    >
      <Headset size={22} strokeWidth={1.8} />
    </Link>
  );
}
