"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Headset, Mail, Phone, MessageCircle, Copy, Check, ExternalLink } from "lucide-react";
import supportContact from "@/config/supportContact";

// Contact details card for the /support page. Reuses the same details config
// and the header.support.* labels as the (removed) header dropdown.
export default function ContactCard() {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(null); // "email" | "phone" | null

  const { name, role, email, phone, whatsapp, hours, helpCenterUrl, emailSubject } = supportContact;
  const telHref = phone ? `tel:${phone.replace(/[^+\d]/g, "")}` : null;
  const waHref = whatsapp ? `https://wa.me/${whatsapp.replace(/\D/g, "")}` : null;
  const mailHref = email
    ? `mailto:${email}${emailSubject ? `?subject=${encodeURIComponent(emailSubject)}` : ""}`
    : null;

  const copy = async (key, value) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    } catch (_) {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden self-start">
      {/* Gradient header */}
      <div className="bg-gradient-to-br from-primary to-purple-600 px-5 pt-5 pb-7 text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/15 ring-1 ring-white/30 flex items-center justify-center shrink-0">
            <Headset size={24} strokeWidth={1.8} />
          </div>
          <div className="leading-tight min-w-0">
            <div className="font-bold text-[15px] truncate">{name}</div>
            {role && <div className="text-[12px] text-white/80 truncate">{role}</div>}
          </div>
        </div>
      </div>

      {/* Availability strip */}
      {hours && (
        <div className="-mt-3 mx-4 rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-700 px-3 py-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span className="text-[12px] font-medium text-slate-600 dark:text-slate-200">{t("header.support.available")}</span>
          <span className="text-[12px] text-slate-400 truncate">· {hours}</span>
        </div>
      )}

      {/* Detail rows */}
      <div className="px-4 py-2 divide-y divide-slate-50 dark:divide-slate-700/50">
        {email && (
          <Row
            icon={<Mail size={17} />}
            label={t("header.support.email")}
            value={email}
            copied={copied === "email"}
            onCopy={() => copy("email", email)}
            copyTitle={copied === "email" ? t("header.support.copied") : t("header.support.copy")}
          />
        )}
        {phone && (
          <Row
            icon={<Phone size={17} />}
            label={t("header.support.phone")}
            value={phone}
            copied={copied === "phone"}
            onCopy={() => copy("phone", phone)}
            copyTitle={copied === "phone" ? t("header.support.copied") : t("header.support.copy")}
          />
        )}
        {whatsapp && (
          <div className="flex items-center gap-3 py-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <MessageCircle size={17} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] text-slate-400">{t("header.support.whatsapp")}</div>
              <div className="text-[13px] font-medium text-slate-700 dark:text-slate-100 truncate">{whatsapp}</div>
            </div>
            <a href={waHref} target="_blank" rel="noopener noreferrer" className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium hover:underline whitespace-nowrap">
              {t("header.support.chat")} ›
            </a>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 pt-1 pb-4">
        <div className="grid grid-cols-2 gap-2">
          <a href={mailHref} className="flex items-center justify-center gap-2 rounded-xl bg-primary text-white text-[13px] font-semibold py-2.5 shadow-sm hover:bg-purple-700 transition-colors">
            <Mail size={16} />
            {t("header.support.emailUs")}
          </a>
          <a href={telHref} className="flex items-center justify-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-100 text-[13px] font-semibold py-2.5 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
            <Phone size={16} />
            {t("header.support.call")}
          </a>
        </div>
        {helpCenterUrl && (
          <a href={helpCenterUrl} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center justify-center gap-1.5 text-[12px] font-medium text-primary dark:text-purple-300 hover:underline">
            {t("header.support.helpCenter")}
            <ExternalLink size={13} />
          </a>
        )}
      </div>
    </div>
  );
}

function Row({ icon, label, value, onCopy, copied, copyTitle }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="w-9 h-9 rounded-lg bg-violet-50 dark:bg-violet-500/15 text-primary dark:text-purple-300 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-slate-400">{label}</div>
        <div className="text-[13px] font-medium text-slate-700 dark:text-slate-100 truncate">{value}</div>
      </div>
      <button onClick={onCopy} title={copyTitle} className="text-slate-300 dark:text-slate-500 hover:text-primary dark:hover:text-purple-300 p-1">
        {copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
      </button>
    </div>
  );
}
