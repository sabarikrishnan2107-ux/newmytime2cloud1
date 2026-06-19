"use client";

import { useState, useEffect } from "react";
import { api, buildQueryParams } from "@/lib/api-client";
import { Save, Plus, Trash2, AlertTriangle, Info, Settings as SettingsIcon, Clock, TrendingDown, ShieldCheck, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

const defaultSettings = {
  days_mode: "fixed_30",
  working_hours_per_day: 8,
  salary_mode: "gross_based",
  currency: "AED",
  normal_ot_multiplier: 1.25,
  weekend_ot_multiplier: 1.50,
  holiday_ot_multiplier: 2.00,
  late_deduction_mode: "slab_based",
  leave_deduction_enabled: true,
  rounding_rule: "none",
  late_slabs: [],
  approval_levels: 1,
  lock_after_approval: true,
};

function SelectInput({ value, onChange, options, className = "" }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className={`w-full rounded-md border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-[13px] text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30 ${className}`}>
      {options.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
    </select>
  );
}

function NumberInput({ value, onChange, step, min, max, disabled, placeholder, className = "" }) {
  return (
    <input type="number" value={value} step={step} min={min} max={max} disabled={disabled} placeholder={placeholder}
      onChange={e => onChange(e.target.value === "" ? "" : Number(e.target.value))}
      className={`w-full rounded-md border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-[13px] text-gray-700 dark:text-gray-200 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary/30 ${className}`} />
  );
}

function TextInput({ value, onChange, placeholder, className = "" }) {
  return (
    <input type="text" value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)}
      className={`w-full rounded-md border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-[13px] text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30 ${className}`} />
  );
}

function ToggleSwitch({ checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors ${checked ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"}`}>
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
    </button>
  );
}

function Section({ title, description, icon: Icon, accent = "blue", children, fullWidth }) {
  const accentMap = {
    blue:   { bg: "bg-blue-500/10",    fg: "text-blue-500" },
    amber:  { bg: "bg-amber-500/10",   fg: "text-amber-500" },
    rose:   { bg: "bg-rose-500/10",    fg: "text-rose-500" },
    purple: { bg: "bg-purple-500/10",  fg: "text-purple-500" },
  };
  const a = accentMap[accent] || accentMap.blue;
  return (
    <div className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50 overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-gray-100 dark:border-white/5">
        {Icon && (
          <div className={`flex h-7 w-7 items-center justify-center rounded-md ${a.bg}`}>
            <Icon className={`h-3.5 w-3.5 ${a.fg}`} strokeWidth={2} />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-[13px] font-semibold text-gray-800 dark:text-gray-100 leading-tight">{title}</h3>
          {description && <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">{description}</p>}
        </div>
      </div>
      <div className={`p-4 ${fullWidth ? "space-y-3" : "grid grid-cols-1 md:grid-cols-2 gap-3"}`}>{children}</div>
    </div>
  );
}

export default function PayrollSettings() {
  const { t } = useTranslation();
  const deductionTypeLabels = {
    no_deduction: t("payroll.settings.deduction.deductionTypes.no_deduction"),
    half_day: t("payroll.settings.deduction.deductionTypes.half_day"),
    full_day: t("payroll.settings.deduction.deductionTypes.full_day"),
    two_days: t("payroll.settings.deduction.deductionTypes.two_days"),
    percentage: t("payroll.settings.deduction.deductionTypes.percentage"),
    fixed_amount: t("payroll.settings.deduction.deductionTypes.fixed_amount"),
  };
  const [settings, setSettings] = useState(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const params = await buildQueryParams({});
        const { data } = await api.get("/payroll-management/settings", { params });
        if (data) setSettings({ ...defaultSettings, ...data, late_slabs: data.late_slabs || defaultSettings.late_slabs });
      } catch (e) {}
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const update = (key, value) => setSettings({ ...settings, [key]: value });

  const updateSlab = (id, field, value) => {
    setSettings({
      ...settings,
      late_slabs: settings.late_slabs.map(s => s.id === id ? { ...s, [field]: value } : s),
    });
  };

  const addSlab = () => {
    const slabs = settings.late_slabs;
    const lastTo = slabs.length > 0 ? (slabs[slabs.length - 1].toMinutes ?? 999) : 0;
    const newSlab = {
      id: String(Date.now()),
      fromMinutes: lastTo + 1,
      toMinutes: null,
      deductionType: "half_day",
      value: 0,
      label: t("payroll.settings.newRuleLabel"),
    };
    setSettings({ ...settings, late_slabs: [...slabs, newSlab] });
  };

  const removeSlab = (id) => {
    setSettings({ ...settings, late_slabs: settings.late_slabs.filter(s => s.id !== id) });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const params = await buildQueryParams({});
      await api.post("/payroll-management/settings", { ...params, ...settings });
      alert(t("payroll.settings.savedSuccess"));
    } catch (e) { alert(t("payroll.common.saveFailed")); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-8 text-center text-gray-400 text-sm">{t("payroll.settings.loading")}</div>;

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <SettingsIcon className="h-4 w-4 text-primary" strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="text-base font-bold text-gray-800 dark:text-gray-100 leading-tight">{t("payroll.settings.title")}</h1>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">{t("payroll.settings.subtitle")}</p>
        </div>
      </div>

      {/* General Settings */}
      <Section title={t("payroll.settings.general.title")} description={t("payroll.settings.general.desc")} icon={SettingsIcon} accent="blue">
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{t("payroll.settings.general.daysMode")}</label>
          <SelectInput value={settings.days_mode} onChange={v => update("days_mode", v)}
            options={[["fixed_30", t("payroll.settings.general.daysModeOptions.fixed_30")], ["actual_calendar", t("payroll.settings.general.daysModeOptions.actual_calendar")], ["working_days", t("payroll.settings.general.daysModeOptions.working_days")]]} />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{t("payroll.settings.general.workingHours")}</label>
          <NumberInput value={settings.working_hours_per_day} onChange={v => update("working_hours_per_day", v)} step={0.5} min={1} max={24} />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{t("payroll.settings.general.salaryMode")}</label>
          <SelectInput value={settings.salary_mode} onChange={v => update("salary_mode", v)}
            options={[["basic_based", t("payroll.settings.general.salaryModeOptions.basic_based")], ["gross_based", t("payroll.settings.general.salaryModeOptions.gross_based")]]} />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{t("payroll.settings.general.currency")}</label>
          <TextInput value={settings.currency} onChange={v => update("currency", v)} />
        </div>
      </Section>

      {/* Overtime Rules */}
      <Section title={t("payroll.settings.overtime.title")} description={t("payroll.settings.overtime.desc")} icon={Clock} accent="amber">
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{t("payroll.settings.overtime.normalOt")}</label>
          <NumberInput value={settings.normal_ot_multiplier} onChange={v => update("normal_ot_multiplier", v)} step={0.05} min={1} />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{t("payroll.settings.overtime.weekendOt")}</label>
          <NumberInput value={settings.weekend_ot_multiplier} onChange={v => update("weekend_ot_multiplier", v)} step={0.05} min={1} />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{t("payroll.settings.overtime.holidayOt")}</label>
          <NumberInput value={settings.holiday_ot_multiplier} onChange={v => update("holiday_ot_multiplier", v)} step={0.05} min={1} />
        </div>
      </Section>

      {/* Deduction Rules */}
      <Section title={t("payroll.settings.deduction.title")} description={t("payroll.settings.deduction.desc")} icon={TrendingDown} accent="rose" fullWidth>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          <div className="flex flex-col justify-center gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg min-h-[72px]">
            <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{t("payroll.settings.deduction.lateMode")}</label>
            <SelectInput value={settings.late_deduction_mode} onChange={v => update("late_deduction_mode", v)}
              options={[["per_minute", t("payroll.settings.deduction.lateModeOptions.per_minute")], ["per_hour", t("payroll.settings.deduction.lateModeOptions.per_hour")], ["slab_based", t("payroll.settings.deduction.lateModeOptions.slab_based")]]} />
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg min-h-[72px]">
            <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{t("payroll.settings.deduction.leaveEnabled")}</label>
            <ToggleSwitch checked={settings.leave_deduction_enabled} onChange={v => update("leave_deduction_enabled", v)} />
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg min-h-[72px]">
            <div>
              <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{t("payroll.settings.deduction.rounding")}</label>
              <p className="text-[10px] text-gray-400 mt-0.5">{settings.rounding_rule === "round" ? t("payroll.settings.deduction.roundingEnabled") : t("payroll.settings.deduction.roundingDisabled")}</p>
            </div>
            <ToggleSwitch checked={settings.rounding_rule === "round"} onChange={v => update("rounding_rule", v ? "round" : "floor")} />
          </div>
        </div>

        {settings.late_deduction_mode === "slab_based" && (
          <div className="space-y-4 mt-2">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-500/20">
              <Info className="h-4 w-4 text-blue-500 shrink-0" />
              <p className="text-[10px] text-blue-700 dark:text-blue-400">
                {t("payroll.settings.deduction.slabInfo")}
              </p>
            </div>

            <div className="space-y-3">
              {(settings.late_slabs || []).map((slab) => (
                <div key={slab.id} className="grid grid-cols-[1fr_70px_70px_1fr_1fr_auto] gap-2 items-end p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50">
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500">{t("payroll.settings.deduction.ruleLabel")}</label>
                    <TextInput value={slab.label} onChange={v => updateSlab(slab.id, "label", v)} placeholder={t("payroll.settings.deduction.ruleLabelPlaceholder")} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500">{t("payroll.settings.deduction.from")}</label>
                    <NumberInput value={slab.fromMinutes} onChange={v => updateSlab(slab.id, "fromMinutes", v)} min={0} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500">{t("payroll.settings.deduction.to")}</label>
                    <NumberInput value={slab.toMinutes ?? ""} placeholder="∞" onChange={v => updateSlab(slab.id, "toMinutes", v === "" ? null : v)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500">{t("payroll.settings.deduction.deductionType")}</label>
                    <SelectInput value={slab.deductionType} onChange={v => updateSlab(slab.id, "deductionType", v)}
                      options={Object.entries(deductionTypeLabels)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500">
                      {slab.deductionType === "percentage" ? "%" : slab.deductionType === "fixed_amount" ? t("payroll.common.amount") : t("payroll.settings.deduction.value")}
                    </label>
                    <NumberInput value={slab.value} onChange={v => updateSlab(slab.id, "value", v)}
                      disabled={!["percentage", "fixed_amount"].includes(slab.deductionType)}
                      placeholder={["percentage", "fixed_amount"].includes(slab.deductionType) ? t("payroll.settings.deduction.enterPlaceholder") : "—"} />
                  </div>
                  <button onClick={() => removeSlab(slab.id)}
                    className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <button onClick={addSlab}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
              <Plus className="h-3.5 w-3.5" /> {t("payroll.settings.deduction.addSlab")}
            </button>

            {(settings.late_slabs || []).length > 0 && (
              <div className="rounded-lg border border-dashed border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-gray-800/30 p-4">
                <h4 className="text-[10px] font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" /> {t("payroll.settings.deduction.previewTitle")}
                </h4>
                <div className="space-y-1.5">
                  {(settings.late_slabs || []).map(slab => (
                    <div key={slab.id} className="flex items-center gap-2 text-[11px]">
                      <span className="font-mono text-gray-400 w-24 shrink-0">{slab.fromMinutes}–{slab.toMinutes ?? "∞"} {t("payroll.settings.deduction.minutesShort")}</span>
                      <span className="text-gray-500">→</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">{slab.label}:</span>
                      <span className="text-gray-500">
                        {slab.deductionType === "no_deduction" && t("payroll.settings.deduction.preview.no_deduction")}
                        {slab.deductionType === "half_day" && t("payroll.settings.deduction.preview.half_day")}
                        {slab.deductionType === "full_day" && t("payroll.settings.deduction.preview.full_day")}
                        {slab.deductionType === "two_days" && t("payroll.settings.deduction.preview.two_days")}
                        {slab.deductionType === "percentage" && t("payroll.settings.deduction.preview.percentage", { value: slab.value })}
                        {slab.deductionType === "fixed_amount" && t("payroll.settings.deduction.preview.fixed_amount", { currency: settings.currency, value: slab.value })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* Workflow */}
      <Section title={t("payroll.settings.workflow.title")} description={t("payroll.settings.workflow.desc")} icon={ShieldCheck} accent="purple">
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{t("payroll.settings.workflow.approvalLevels")}</label>
          <NumberInput value={settings.approval_levels} onChange={v => update("approval_levels", v)} min={1} max={5} />
        </div>
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{t("payroll.settings.workflow.lockAfterApproval")}</label>
          <ToggleSwitch checked={settings.lock_after_approval} onChange={v => update("lock_after_approval", v)} />
        </div>
      </Section>

      {/* Sticky save bar */}
      <div className="sticky bottom-0 left-0 right-0 -mx-6 px-6 py-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-t border-gray-200 dark:border-white/10 flex items-center justify-between mt-4">
        <p className="text-[11px] text-gray-500 dark:text-gray-400">{t("payroll.settings.changesNote")}</p>
        <button disabled={saving} onClick={handleSave}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-white hover:opacity-95 transition shadow-sm disabled:opacity-50">
          <Save className="h-3.5 w-3.5" /> {saving ? t("payroll.common.saving") : t("payroll.settings.saveSettings")}
        </button>
      </div>
    </div>
  );
}
