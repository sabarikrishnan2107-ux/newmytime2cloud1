"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { CheckCircle2, Building2, User, Mail, Phone, Briefcase, Calendar, Clock, FileText, Loader2, Camera, Upload, X as XIcon } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function decodeHostPayload(raw) {
  if (!raw) return null;
  try {
    const json = decodeURIComponent(escape(atob(raw)));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Resize+compress an image File/Blob to a JPEG data URL no wider than `maxW`.
async function compressImage(fileOrBlob, maxW = 480, quality = 0.78) {
  const dataUrl = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(fileOrBlob);
  });
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });
  const ratio = img.width > maxW ? maxW / img.width : 1;
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

function Field({ label, icon: Icon, children, required }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
        {Icon ? <Icon className="w-3.5 h-3.5" /> : null}
        {label} {required ? <span className="text-rose-500">*</span> : null}
      </span>
      {children}
    </label>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className={`h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition disabled:opacity-70 ${props.className || ""}`}
    />
  );
}

function Select({ children, ...props }) {
  return (
    <select
      {...props}
      className={`h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition ${props.className || ""}`}
    >
      {children}
    </select>
  );
}

function HostCheckinInner() {
  const { t } = useTranslation();
  const params = useSearchParams();
  const host = useMemo(() => decodeHostPayload(params.get("h")), [params]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    company: "",
    purpose: "",
    gender: "",
    email: "",
    visitFrom: todayStr(),
    visitTo: todayStr(),
    entryTime: nowTime(),
    exitTime: "",
  });
  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const selfieInputRef = useRef(null);
  const uploadInputRef = useRef(null);

  const update = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const onPhotoFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoBusy(true);
    try {
      const url = await compressImage(file);
      setPhotoDataUrl(url);
    } catch {
      // ignore — user can re-try
    } finally {
      setPhotoBusy(false);
      e.target.value = "";
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.phone.trim() || !host?.id) return;
    if (!host?.cid) {
      setSubmitError(t("visitor.hostCheckin.qrMissingCompany"));
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    const fullName = [form.firstName, form.lastName].filter(Boolean).join(" ").trim();
    const notesParts = [
      form.gender ? `Gender: ${form.gender}` : null,
      form.visitTo && form.visitTo !== form.visitFrom ? `Until: ${form.visitTo}` : null,
      form.exitTime ? `Exit: ${form.exitTime}` : null,
      host.flat ? `Host flat: ${host.flat}` : null,
    ].filter(Boolean);
    const payload = {
      company_id: host.cid,
      branch_id: host.bid || null,
      visitor_name: fullName,
      company_name: form.company,
      email: form.email,
      phone: form.phone,
      host_employee_id: host.id,
      host_name: host.name,
      purpose: form.purpose,
      visitor_type: "Host QR",
      expected_date: form.visitFrom,
      expected_time: form.entryTime,
      notes: notesParts.join(" · "),
      photo: photoDataUrl || null,
    };
    try {
      await axios.post(`${API_BASE}/visitor-management/pre-registrations`, payload);
      setSubmitted(true);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || t("visitor.hostCheckin.couldNotSubmit");
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!host) {
    return (
      <div className="h-screen overflow-y-auto bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-8 max-w-md text-center">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">{t("visitor.hostCheckin.invalidQr")}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t("visitor.hostCheckin.invalidQrDesc")}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="h-screen overflow-y-auto bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-8 max-w-md text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-800 dark:text-white">{t("visitor.hostCheckin.visitRegistered")}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t("visitor.hostCheckin.hostNotified", { name: host.name })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto bg-slate-50 dark:bg-slate-950 py-8 px-4">
      <div className="max-w-2xl mx-auto pb-12">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white">{t("visitor.hostCheckin.title")}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t("visitor.hostCheckin.youAreVisiting")} <span className="font-semibold text-indigo-600 dark:text-indigo-400">{host.name}</span>
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl divide-y divide-slate-100 dark:divide-slate-800"
        >
          <section className="p-5">
            <h2 className="text-sm font-bold text-slate-700 dark:text-white mb-4 flex items-center gap-2">
              <Camera className="w-4 h-4" /> {t("visitor.hostCheckin.photo")}
            </h2>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative">
                <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                  {photoDataUrl ? (
                    <img src={photoDataUrl} alt="Visitor" className="w-full h-full object-cover" />
                  ) : photoBusy ? (
                    <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                  ) : (
                    <Camera className="w-7 h-7 text-slate-400" />
                  )}
                </div>
                {photoDataUrl && (
                  <button
                    type="button"
                    onClick={() => setPhotoDataUrl("")}
                    title={t("visitor.reception.remove")}
                    className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow"
                  >
                    <XIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => selfieInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-semibold shadow"
                >
                  <Camera className="w-4 h-4" /> {t("visitor.hostCheckin.takeSelfie")}
                </button>
                <button
                  type="button"
                  onClick={() => uploadInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Upload className="w-4 h-4" /> {t("visitor.hostCheckin.uploadPhoto")}
                </button>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{t("visitor.hostCheckin.photoOptional")}</p>
              </div>
              <input
                ref={selfieInputRef}
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={onPhotoFile}
              />
              <input
                ref={uploadInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPhotoFile}
              />
            </div>
          </section>

          <section className="p-5">
            <h2 className="text-sm font-bold text-slate-700 dark:text-white mb-4 flex items-center gap-2">
              <User className="w-4 h-4" /> {t("visitor.hostCheckin.visitorDetails")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label={t("visitor.hostCheckin.firstName")} required>
                <Input required value={form.firstName} onChange={(e) => update("firstName", e.target.value)} placeholder={t("visitor.hostCheckin.firstNamePlaceholder")} />
              </Field>
              <Field label={t("visitor.hostCheckin.lastName")}>
                <Input value={form.lastName} onChange={(e) => update("lastName", e.target.value)} placeholder={t("visitor.hostCheckin.lastNamePlaceholder")} />
              </Field>
              <Field label={t("visitor.hostCheckin.phoneNumber")} icon={Phone} required>
                <Input required type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+971 50 000 0000" />
              </Field>
              <Field label={t("visitor.hostCheckin.emailAddress")} icon={Mail}>
                <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder={t("visitor.hostCheckin.emailPlaceholder")} />
              </Field>
              <Field label={t("visitor.hostCheckin.companyName")} icon={Building2}>
                <Input value={form.company} onChange={(e) => update("company", e.target.value)} placeholder={t("visitor.hostCheckin.companyPlaceholder")} />
              </Field>
              <Field label={t("visitor.hostCheckin.gender")}>
                <Select value={form.gender} onChange={(e) => update("gender", e.target.value)}>
                  <option value="">{t("visitor.common.select")}</option>
                  <option value="Male">{t("visitor.reception.genders.Male")}</option>
                  <option value="Female">{t("visitor.reception.genders.Female")}</option>
                  <option value="Other">{t("visitor.reception.genders.Other")}</option>
                </Select>
              </Field>
              <Field label={t("visitor.hostCheckin.purpose")} icon={FileText}>
                <Input value={form.purpose} onChange={(e) => update("purpose", e.target.value)} placeholder={t("visitor.hostCheckin.purposePlaceholder")} />
              </Field>
            </div>
          </section>

          <section className="p-5">
            <h2 className="text-sm font-bold text-slate-700 dark:text-white mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> {t("visitor.hostCheckin.visitSchedule")}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field label={t("visitor.hostCheckin.visitFrom")}>
                <Input type="date" value={form.visitFrom} onChange={(e) => update("visitFrom", e.target.value)} />
              </Field>
              <Field label={t("visitor.hostCheckin.visitTo")}>
                <Input type="date" value={form.visitTo} onChange={(e) => update("visitTo", e.target.value)} />
              </Field>
              <Field label={t("visitor.hostCheckin.entryTime")} icon={Clock}>
                <Input type="time" value={form.entryTime} onChange={(e) => update("entryTime", e.target.value)} />
              </Field>
              <Field label={t("visitor.hostCheckin.exitTime")} icon={Clock}>
                <Input type="time" value={form.exitTime} onChange={(e) => update("exitTime", e.target.value)} />
              </Field>
            </div>
          </section>

          <section className="p-5 bg-slate-50/60 dark:bg-slate-950/40">
            <h2 className="text-sm font-bold text-slate-700 dark:text-white mb-4 flex items-center gap-2">
              <Briefcase className="w-4 h-4" /> {t("visitor.hostCheckin.hostDetails")} <span className="ml-1 text-[10px] font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">{t("visitor.hostCheckin.autoFilled")}</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label={t("visitor.hostCheckin.hostName")}>
                <Input readOnly value={host.name || ""} />
              </Field>
              <Field label={t("visitor.hostCheckin.hostCompany")}>
                <Input readOnly value={host.company || ""} />
              </Field>
              <Field label={t("visitor.hostCheckin.hostEmail")}>
                <Input readOnly value={host.email || ""} />
              </Field>
              <Field label={t("visitor.hostCheckin.hostPhone")}>
                <Input readOnly value={host.phone || ""} />
              </Field>
              <Field label={t("visitor.hostCheckin.branchDept")}>
                <Input readOnly value={[host.branch, host.department].filter(Boolean).join(" / ")} />
              </Field>
              <Field label={t("visitor.hostCheckin.flatNumber")}>
                <Input readOnly value={host.flat || ""} />
              </Field>
            </div>
          </section>

          <div className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {submitError ? (
              <div className="text-xs text-rose-600 dark:text-rose-400">{submitError}</div>
            ) : <span />}
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed text-white px-5 py-2.5 text-sm font-semibold shadow"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {submitting ? t("visitor.hostCheckin.submitting") : t("visitor.hostCheckin.registerVisit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function HostCheckinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 dark:bg-slate-950" />}>
      <HostCheckinInner />
    </Suspense>
  );
}
