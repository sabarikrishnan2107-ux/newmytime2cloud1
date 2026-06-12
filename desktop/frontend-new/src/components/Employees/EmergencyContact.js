"use client";

import React from "react";

const COUNTRY_NAMES = {
  AE: "United Arab Emirates", IN: "India", US: "United States", GB: "United Kingdom",
  PK: "Pakistan", BD: "Bangladesh", LK: "Sri Lanka", PH: "Philippines", NP: "Nepal",
  SA: "Saudi Arabia", QA: "Qatar", OM: "Oman", BH: "Bahrain", KW: "Kuwait",
  EG: "Egypt", JO: "Jordan", LB: "Lebanon", SY: "Syria", IQ: "Iraq", YE: "Yemen",
  MA: "Morocco", DZ: "Algeria", TN: "Tunisia", LY: "Libya", SD: "Sudan",
  CA: "Canada", AU: "Australia", NZ: "New Zealand", DE: "Germany", FR: "France",
  IT: "Italy", ES: "Spain", PT: "Portugal", NL: "Netherlands", BE: "Belgium",
  CH: "Switzerland", AT: "Austria", IE: "Ireland", SE: "Sweden", NO: "Norway",
  DK: "Denmark", FI: "Finland", PL: "Poland", RU: "Russia", UA: "Ukraine",
  TR: "Turkey", GR: "Greece", CN: "China", JP: "Japan", KR: "South Korea",
  TH: "Thailand", VN: "Vietnam", MY: "Malaysia", SG: "Singapore", ID: "Indonesia",
  ZA: "South Africa", NG: "Nigeria", KE: "Kenya", GH: "Ghana", ET: "Ethiopia",
  MX: "Mexico", BR: "Brazil", AR: "Argentina", CL: "Chile", CO: "Colombia",
};

const expandCountry = (raw) => {
  if (!raw) return "";
  const t = String(raw).trim();
  if (t.length === 2 && COUNTRY_NAMES[t.toUpperCase()]) return COUNTRY_NAMES[t.toUpperCase()];
  if (t.length === 3 && COUNTRY_NAMES[t.slice(0, 2).toUpperCase()]) return COUNTRY_NAMES[t.slice(0, 2).toUpperCase()];
  return t;
};

const Row = ({ icon, label, value, href }) => {
  const display = value && String(value).trim() && String(value).trim() !== "---" ? value : "";
  const isMissing = !display;
  const inner = (
    <>
      <div className="size-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center text-primary ring-1 ring-primary/20">
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-[11px] font-bold text-[#9db0b9] uppercase tracking-wider">{label}</span>
        <span className={`text-sm font-semibold truncate ${isMissing ? "text-slate-500 italic" : "text-gray-700 dark:text-gray-200"}`}>
          {display || "Not provided"}
        </span>
      </div>
    </>
  );
  const baseClasses = "flex items-center gap-3 p-3.5 rounded-xl bg-white/5 dark:bg-white/[0.03] border border-white/5 transition-all";
  if (href && !isMissing) {
    return (
      <a href={href} className={`${baseClasses} hover:bg-white/10 hover:border-primary/30 group cursor-pointer`}>
        {inner}
        <span className="material-symbols-outlined text-[16px] text-[#9db0b9] opacity-0 group-hover:opacity-100 transition-opacity shrink-0">arrow_outward</span>
      </a>
    );
  }
  return <div className={baseClasses}>{inner}</div>;
};

const firstNonEmpty = (...values) => {
  for (const v of values) {
    if (v !== null && v !== undefined && String(v).trim() !== "" && String(v).trim() !== "---") {
      return String(v).trim();
    }
  }
  return "";
};

const EmergencyContact = ({ payload }) => {
  const { present_address, contact, primary_contact, branch, user } = payload || {};

  const workEmail = firstNonEmpty(contact?.work_email, user?.email, payload?.email);
  const personalEmail = firstNonEmpty(contact?.person_email, contact?.personal_email, payload?.personal_email);
  const mobile = firstNonEmpty(contact?.mobile_phone, payload?.phone_number, payload?.mobile, contact?.mobile);
  const workExtension = firstNonEmpty(contact?.work_phone, contact?.work_extension);

  const emergencyName = firstNonEmpty(primary_contact?.full_name, payload?.emergency_contact_name);
  const emergencyPhone = firstNonEmpty(primary_contact?.primary_phone, primary_contact?.phone, payload?.emergency_contact);
  const emergencyValue = [emergencyName, emergencyPhone].filter(Boolean).join(" · ");

  const residentialValue = firstNonEmpty(
    [present_address?.building, present_address?.street_address].filter(Boolean).join(", "),
    [present_address?.room_no, present_address?.building, present_address?.street_address].filter(Boolean).join(", "),
    payload?.address
  );

  const officeValue = firstNonEmpty(
    [branch?.branch_name, branch?.address].filter(Boolean).join(" · "),
    branch?.branch_name,
    branch?.address,
    payload?.company?.name
  );

  const country = expandCountry(firstNonEmpty(
    present_address?.country,
    payload?.country?.name,
    payload?.nationality,
    branch?.country
  ));

  const city = firstNonEmpty(
    present_address?.city,
    branch?.city,
    payload?.city
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="glass-card p-6 rounded-2xl">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-5">Contact Details</h3>
        <div className="space-y-3">
          <Row icon="mail" label="Work Email" value={workEmail} href={workEmail ? `mailto:${workEmail}` : null} />
          <Row icon="mail" label="Personal Email" value={personalEmail} href={personalEmail ? `mailto:${personalEmail}` : null} />
          <Row icon="phone" label="Mobile" value={mobile} href={mobile ? `tel:${mobile}` : null} />
          <Row icon="phone" label="Work Extension" value={workExtension} href={workExtension ? `tel:${workExtension}` : null} />
          <Row icon="person" label="Emergency Contact" value={emergencyValue} href={emergencyPhone ? `tel:${emergencyPhone}` : null} />
        </div>
      </div>

      <div className="glass-card p-6 rounded-2xl">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-5">Address</h3>
        <div className="space-y-3">
          <Row icon="location_on" label="Residential" value={residentialValue} />
          <Row icon="business" label="Office" value={officeValue} />
          <Row icon="language" label="Country" value={country} />
          <Row icon="location_city" label="City" value={city} />
        </div>
      </div>
    </div>
  );
};

export default EmergencyContact;
