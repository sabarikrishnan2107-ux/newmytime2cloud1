"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
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
      setSubmitError("This QR is missing a company reference. Ask reception to regenerate it.");
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
      const msg = err?.response?.data?.message || err?.message || "Could not submit. Please try again.";
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!host) {
    return (
      <div className="h-screen overflow-y-auto bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-8 max-w-md text-center">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Invalid QR</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">This link is missing host details. Please ask reception for help.</p>
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
          <h2 className="mt-4 text-lg font-bold text-slate-800 dark:text-white">Visit registered</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {host.name} has been notified. Please wait at the reception.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto bg-slate-50 dark:bg-slate-950 py-8 px-4">
      <div className="max-w-2xl mx-auto pb-12">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white">Visitor Registration</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            You are visiting <span className="font-semibold text-indigo-600 dark:text-indigo-400">{host.name}</span>
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl divide-y divide-slate-100 dark:divide-slate-800"
        >
          <section className="p-5">
            <h2 className="text-sm font-bold text-slate-700 dark:text-white mb-4 flex items-center gap-2">
              <Camera className="w-4 h-4" /> Photo
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
                    title="Remove"
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
                  <Camera className="w-4 h-4" /> Take Selfie
                </button>
                <button
                  type="button"
                  onClick={() => uploadInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Upload className="w-4 h-4" /> Upload Photo
                </button>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Optional. Used for the visitor badge.</p>
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
              <User className="w-4 h-4" /> Visitor Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="First Name" required>
                <Input required value={form.firstName} onChange={(e) => update("firstName", e.target.value)} placeholder="First name" />
              </Field>
              <Field label="Last Name">
                <Input value={form.lastName} onChange={(e) => update("lastName", e.target.value)} placeholder="Last name" />
              </Field>
              <Field label="Phone Number" icon={Phone} required>
                <Input required type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+971 50 000 0000" />
              </Field>
              <Field label="Email Address" icon={Mail}>
                <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@company.com" />
              </Field>
              <Field label="Company Name" icon={Building2}>
                <Input value={form.company} onChange={(e) => update("company", e.target.value)} placeholder="Company name" />
              </Field>
              <Field label="Gender">
                <Select value={form.gender} onChange={(e) => update("gender", e.target.value)}>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </Select>
              </Field>
              <Field label="Purpose" icon={FileText}>
                <Input value={form.purpose} onChange={(e) => update("purpose", e.target.value)} placeholder="e.g. Meeting, Delivery" />
              </Field>
            </div>
          </section>

          <section className="p-5">
            <h2 className="text-sm font-bold text-slate-700 dark:text-white mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Visit Schedule
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="Visit From">
                <Input type="date" value={form.visitFrom} onChange={(e) => update("visitFrom", e.target.value)} />
              </Field>
              <Field label="Visit To">
                <Input type="date" value={form.visitTo} onChange={(e) => update("visitTo", e.target.value)} />
              </Field>
              <Field label="Entry Time" icon={Clock}>
                <Input type="time" value={form.entryTime} onChange={(e) => update("entryTime", e.target.value)} />
              </Field>
              <Field label="Exit Time" icon={Clock}>
                <Input type="time" value={form.exitTime} onChange={(e) => update("exitTime", e.target.value)} />
              </Field>
            </div>
          </section>

          <section className="p-5 bg-slate-50/60 dark:bg-slate-950/40">
            <h2 className="text-sm font-bold text-slate-700 dark:text-white mb-4 flex items-center gap-2">
              <Briefcase className="w-4 h-4" /> Host Details <span className="ml-1 text-[10px] font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Auto-filled</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Host Name">
                <Input readOnly value={host.name || ""} />
              </Field>
              <Field label="Host Company">
                <Input readOnly value={host.company || ""} />
              </Field>
              <Field label="Host Email">
                <Input readOnly value={host.email || ""} />
              </Field>
              <Field label="Host Phone">
                <Input readOnly value={host.phone || ""} />
              </Field>
              <Field label="Branch / Department">
                <Input readOnly value={[host.branch, host.department].filter(Boolean).join(" / ")} />
              </Field>
              <Field label="Flat Number">
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
              {submitting ? "Submitting…" : "Register Visit"}
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
