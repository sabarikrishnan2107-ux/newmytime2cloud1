"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Settings as SettingsIcon,
  ShieldCheck,
  Workflow,
  FileText,
  Tag,
  Clock,
  Bell,
  Plus,
  X,
  Save,
  Check,
  Info,
  AlertCircle,
} from "lucide-react";

const STORAGE_KEY = "visitor_settings_v1";

const DEFAULTS = {
  approvalLevel: "single",
  approverRoles: ["Reception", "Host"],
  autoApprovePreCheck: true,
  notifyHostOnArrival: true,
  overstayAlertMins: 30,
  dailyDigest: false,
  defaultDurationMins: 60,
  badgeExpiryHours: 8,
  autoCheckoutAfterHours: 12,
  purposes: [
    "Business Meeting",
    "Interview",
    "Delivery",
    "Maintenance",
    "Vendor Visit",
    "Personal",
  ],
  visitorTypes: [
    "Business",
    "Interview",
    "Contractor",
    "Vendor",
    "Delivery",
    "VIP",
    "Maintenance",
    "Event Attendee",
  ],
  idTypes: ["Passport", "National ID", "Driver's License", "Emirates ID", "Company Badge"],
};

function readSettings() {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

function writeSettings(s) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

function SectionCard({ icon: Icon, title, description, accent = "indigo", children }) {
  const accentBg = {
    indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    slate: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  }[accent] || "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400";

  return (
    <section className="rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 shadow-sm">
      <header className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-white/5">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accentBg}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-800 dark:text-white">{title}</h2>
          {description ? (
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{description}</p>
          ) : null}
        </div>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Field({ label, hint, children, required }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label} {required ? <span className="text-rose-500">*</span> : null}
      </span>
      {children}
      {hint ? <span className="text-[11px] text-slate-400 dark:text-slate-500">{hint}</span> : null}
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

function Toggle({ checked, onChange, label, description }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="min-w-0">
        <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{label}</div>
        {description ? <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{description}</div> : null}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex shrink-0 h-5 w-9 items-center rounded-full transition ${
          checked ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
        }`}
        aria-pressed={checked}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function ChipList({ items, onAdd, onRemove, placeholder, emptyText }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");
  const submit = () => {
    const v = draft.trim();
    if (!v) return;
    if (items.includes(v)) return;
    onAdd(v);
    setDraft("");
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {items.length === 0 ? (
          <span className="text-[11px] text-slate-500 dark:text-slate-400">{emptyText || t("visitor.settings.noItems")}</span>
        ) : (
          items.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs px-2.5 py-1 border border-slate-200 dark:border-white/10"
            >
              {item}
              <button
                type="button"
                onClick={() => onRemove(item)}
                className="text-slate-400 hover:text-rose-500"
                title={t("visitor.reception.remove")}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))
        )}
      </div>
      <div className="flex items-center gap-2">
        <Input
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button
          type="button"
          onClick={submit}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-3 h-10 text-sm font-semibold shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" /> {t("visitor.common.add")}
        </button>
      </div>
    </div>
  );
}

const APPROVER_ROLE_OPTIONS = ["Reception", "Host", "Security", "Admin", "Manager"];

export default function VisitorSettingsPage() {
  const { t } = useTranslation();
  const [s, setS] = useState(DEFAULTS);
  const [savedFlash, setSavedFlash] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setS(readSettings());
  }, []);

  const update = (patch) => {
    setS((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  };

  const toggleRole = (role) => {
    update({
      approverRoles: s.approverRoles.includes(role)
        ? s.approverRoles.filter((r) => r !== role)
        : [...s.approverRoles, role],
    });
  };

  const onSave = () => {
    writeSettings(s);
    setDirty(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2200);
  };

  const onReset = () => {
    setS(DEFAULTS);
    setDirty(true);
  };

  const approvalSummary = useMemo(() => {
    if (s.approvalLevel === "none") return t("visitor.settings.summaryAuto");
    if (s.approvalLevel === "two")
      return t("visitor.settings.summaryTwo", {
        roles: s.approverRoles.join(" → ") || t("visitor.settings.noRolesSet"),
      });
    return t("visitor.settings.summarySingle", { roles: s.approverRoles.join(", ") || "—" });
  }, [s.approvalLevel, s.approverRoles, t]);

  return (
    <div className="p-4 sm:p-6 pb-10 overflow-y-auto max-h-[calc(100vh-100px)] bg-slate-50 dark:bg-slate-950">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
              <SettingsIcon className="w-6 h-6 text-indigo-500" />
              {t("visitor.settings.title")}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t("visitor.settings.subtitle")}
            </p>
          </div>
          {dirty && (
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2.5 py-1 text-[11px] font-semibold">
              <AlertCircle className="w-3.5 h-3.5" /> {t("visitor.settings.unsavedChanges")}
            </span>
          )}
        </div>

        {/* Approval workflow */}
        <div className="grid lg:grid-cols-2 gap-5 mb-5">
          <SectionCard
            icon={ShieldCheck}
            title={t("visitor.settings.preRegApproval")}
            description={t("visitor.settings.preRegApprovalDesc")}
            accent="indigo"
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label={t("visitor.settings.approvalLevel")} hint={t("visitor.settings.approvalLevelHint")}>
                <Select value={s.approvalLevel} onChange={(e) => update({ approvalLevel: e.target.value })}>
                  <option value="none">{t("visitor.settings.approvalNone")}</option>
                  <option value="single">{t("visitor.settings.approvalSingle")}</option>
                  <option value="two">{t("visitor.settings.approvalTwo")}</option>
                </Select>
              </Field>
              <Field label={t("visitor.settings.approverRoles")} hint={t("visitor.settings.approverRolesHint")}>
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {APPROVER_ROLE_OPTIONS.map((r) => {
                    const active = s.approverRoles.includes(r);
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => toggleRole(r)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border transition ${
                          active
                            ? "bg-indigo-600 border-indigo-600 text-white"
                            : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-500/60"
                        }`}
                      >
                        {active ? <Check className="w-3 h-3" /> : null}
                        {r}
                      </button>
                    );
                  })}
                </div>
              </Field>
            </div>
            <div className="mt-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 px-3 py-2.5 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 mt-0.5 text-slate-400 shrink-0" />
              <p className="text-[11px] text-slate-600 dark:text-slate-400">{approvalSummary}</p>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5">
              <Toggle
                checked={s.autoApprovePreCheck}
                onChange={(v) => update({ autoApprovePreCheck: v })}
                label={t("visitor.settings.autoConfirm")}
                description={t("visitor.settings.autoConfirmDesc")}
              />
            </div>
          </SectionCard>

          <SectionCard
            icon={Bell}
            title={t("visitor.settings.notifications")}
            description={t("visitor.settings.notificationsDesc")}
            accent="amber"
          >
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              <Toggle
                checked={s.notifyHostOnArrival}
                onChange={(v) => update({ notifyHostOnArrival: v })}
                label={t("visitor.settings.notifyHost")}
                description={t("visitor.settings.notifyHostDesc")}
              />
              <Toggle
                checked={s.dailyDigest}
                onChange={(v) => update({ dailyDigest: v })}
                label={t("visitor.settings.dailyDigest")}
                description={t("visitor.settings.dailyDigestDesc")}
              />
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5 grid grid-cols-2 gap-4">
              <Field label={t("visitor.settings.overstayAlert")} hint={t("visitor.settings.overstayAlertHint")}>
                <Input
                  type="number"
                  min={0}
                  step={5}
                  value={s.overstayAlertMins}
                  onChange={(e) => update({ overstayAlertMins: Number(e.target.value) || 0 })}
                />
              </Field>
              <Field label={t("visitor.settings.autoCheckout")} hint={t("visitor.settings.autoCheckoutHint")}>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={s.autoCheckoutAfterHours}
                  onChange={(e) => update({ autoCheckoutAfterHours: Number(e.target.value) || 0 })}
                />
              </Field>
            </div>
          </SectionCard>
        </div>

        {/* Lists */}
        <div className="grid lg:grid-cols-3 gap-5 mb-5">
          <SectionCard
            icon={FileText}
            title={t("visitor.settings.purposeTitle")}
            description={t("visitor.settings.purposeDesc")}
            accent="emerald"
          >
            <ChipList
              items={s.purposes}
              placeholder={t("visitor.settings.purposePlaceholder")}
              emptyText={t("visitor.settings.noPurposes")}
              onAdd={(v) => update({ purposes: [...s.purposes, v] })}
              onRemove={(v) => update({ purposes: s.purposes.filter((x) => x !== v) })}
            />
          </SectionCard>

          <SectionCard
            icon={Tag}
            title={t("visitor.settings.typesTitle")}
            description={t("visitor.settings.typesDesc")}
            accent="sky"
          >
            <ChipList
              items={s.visitorTypes}
              placeholder={t("visitor.settings.typesPlaceholder")}
              emptyText={t("visitor.settings.noTypes")}
              onAdd={(v) => update({ visitorTypes: [...s.visitorTypes, v] })}
              onRemove={(v) => update({ visitorTypes: s.visitorTypes.filter((x) => x !== v) })}
            />
          </SectionCard>

          <SectionCard
            icon={Workflow}
            title={t("visitor.settings.idTypesTitle")}
            description={t("visitor.settings.idTypesDesc")}
            accent="rose"
          >
            <ChipList
              items={s.idTypes}
              placeholder={t("visitor.settings.idTypesPlaceholder")}
              emptyText={t("visitor.settings.noIdTypes")}
              onAdd={(v) => update({ idTypes: [...s.idTypes, v] })}
              onRemove={(v) => update({ idTypes: s.idTypes.filter((x) => x !== v) })}
            />
          </SectionCard>
        </div>

        {/* Defaults */}
        <SectionCard
          icon={Clock}
          title={t("visitor.settings.visitDefaults")}
          description={t("visitor.settings.visitDefaultsDesc")}
          accent="slate"
        >
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label={t("visitor.settings.defaultDuration")} hint={t("visitor.settings.defaultDurationHint")}>
              <Input
                type="number"
                min={0}
                step={15}
                value={s.defaultDurationMins}
                onChange={(e) => update({ defaultDurationMins: Number(e.target.value) || 0 })}
              />
            </Field>
            <Field label={t("visitor.settings.badgeExpiry")} hint={t("visitor.settings.badgeExpiryHint")}>
              <Input
                type="number"
                min={0}
                step={1}
                value={s.badgeExpiryHours}
                onChange={(e) => update({ badgeExpiryHours: Number(e.target.value) || 0 })}
              />
            </Field>
          </div>
        </SectionCard>


        {/* Save bar — inline at the end of the page */}
        <div className="mt-6 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 shadow-sm">
          <div className="px-5 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 min-w-0">
              {savedFlash ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <Check className="w-3.5 h-3.5" /> {t("visitor.settings.saved")}
                </span>
              ) : dirty ? (
                <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                  <AlertCircle className="w-3.5 h-3.5" /> {t("visitor.settings.unsavedChangesLong")}
                </span>
              ) : (
                <span>{t("visitor.settings.allSaved")}</span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 px-3 h-9 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                {t("visitor.settings.resetDefaults")}
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={!dirty}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 h-9 text-sm font-semibold shadow"
              >
                <Save className="w-4 h-4" /> {t("visitor.settings.saveChanges")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
