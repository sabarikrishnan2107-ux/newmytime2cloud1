"use client";

import { useState, useEffect } from "react";
import { api, buildQueryParams } from "@/lib/api-client";
import { Save, Plus, Trash2, AlertTriangle, Info } from "lucide-react";

const deductionTypeLabels = {
  no_deduction: "No Deduction",
  half_day: "Half Day Salary",
  full_day: "Full Day Salary",
  two_days: "Two Days Salary",
  percentage: "Percentage of Salary",
  fixed_amount: "Fixed Amount",
};

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
      className={`w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 ${className}`}>
      {options.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
    </select>
  );
}

function NumberInput({ value, onChange, step, min, max, disabled, placeholder, className = "" }) {
  return (
    <input type="number" value={value} step={step} min={min} max={max} disabled={disabled} placeholder={placeholder}
      onChange={e => onChange(e.target.value === "" ? "" : Number(e.target.value))}
      className={`w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 disabled:opacity-50 ${className}`} />
  );
}

function TextInput({ value, onChange, placeholder, className = "" }) {
  return (
    <input type="text" value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)}
      className={`w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 ${className}`} />
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

function Section({ title, children, fullWidth }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50 p-5 space-y-4">
      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
      <div className={fullWidth ? "space-y-4" : "grid grid-cols-1 md:grid-cols-2 gap-4"}>{children}</div>
    </div>
  );
}

export default function PayrollSettings() {
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
      label: "New Rule",
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
      alert("Settings saved successfully!");
    } catch (e) { alert("Save failed"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-8 text-center text-gray-400 text-sm">Loading settings...</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Payroll Settings</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400">Configure company-wide payroll calculation rules and preferences</p>
      </div>

      {/* General Settings */}
      <Section title="General Settings">
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-500">Payroll Days Mode</label>
          <SelectInput value={settings.days_mode} onChange={v => update("days_mode", v)}
            options={[["fixed_30", "Fixed 30 Days"], ["actual_calendar", "Actual Calendar Days"], ["working_days", "Working Days Only"]]} />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-500">Working Hours / Day</label>
          <NumberInput value={settings.working_hours_per_day} onChange={v => update("working_hours_per_day", v)} step={0.5} min={1} max={24} />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-500">Salary Mode</label>
          <SelectInput value={settings.salary_mode} onChange={v => update("salary_mode", v)}
            options={[["basic_based", "Basic Based"], ["gross_based", "Gross Based"]]} />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-500">Currency</label>
          <TextInput value={settings.currency} onChange={v => update("currency", v)} />
        </div>
      </Section>

      {/* Overtime Rules */}
      <Section title="Overtime Rules">
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-500">Normal OT Multiplier</label>
          <NumberInput value={settings.normal_ot_multiplier} onChange={v => update("normal_ot_multiplier", v)} step={0.05} min={1} />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-500">Weekend OT Multiplier</label>
          <NumberInput value={settings.weekend_ot_multiplier} onChange={v => update("weekend_ot_multiplier", v)} step={0.05} min={1} />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-500">Holiday OT Multiplier</label>
          <NumberInput value={settings.holiday_ot_multiplier} onChange={v => update("holiday_ot_multiplier", v)} step={0.05} min={1} />
        </div>
      </Section>

      {/* Deduction Rules */}
      <Section title="Deduction Rules" fullWidth>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          <div className="flex flex-col justify-center gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg min-h-[72px]">
            <label className="text-xs font-medium text-gray-500">Late Deduction Mode</label>
            <SelectInput value={settings.late_deduction_mode} onChange={v => update("late_deduction_mode", v)}
              options={[["per_minute", "Per Minute"], ["per_hour", "Per Hour"], ["slab_based", "Slab Based (Monthly Total)"]]} />
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg min-h-[72px]">
            <label className="text-xs font-medium text-gray-500">Leave Deduction Enabled</label>
            <ToggleSwitch checked={settings.leave_deduction_enabled} onChange={v => update("leave_deduction_enabled", v)} />
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg min-h-[72px]">
            <div>
              <label className="text-xs font-medium text-gray-500">Salary Rounding</label>
              <p className="text-[10px] text-gray-400 mt-0.5">{settings.rounding_rule === "round" ? "Enabled — salary rounded up" : "Disabled — salary rounded down (floor)"}</p>
            </div>
            <ToggleSwitch checked={settings.rounding_rule === "round"} onChange={v => update("rounding_rule", v ? "round" : "floor")} />
          </div>
        </div>

        {settings.late_deduction_mode === "slab_based" && (
          <div className="space-y-4 mt-2">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-500/20">
              <Info className="h-4 w-4 text-blue-500 shrink-0" />
              <p className="text-[10px] text-blue-700 dark:text-blue-400">
                Define monthly late minute thresholds. The system totals each employee's late minutes for the month and applies the matching slab rule.
              </p>
            </div>

            <div className="space-y-3">
              {(settings.late_slabs || []).map((slab) => (
                <div key={slab.id} className="grid grid-cols-[1fr_70px_70px_1fr_1fr_auto] gap-2 items-end p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50">
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500">Rule Label</label>
                    <TextInput value={slab.label} onChange={v => updateSlab(slab.id, "label", v)} placeholder="e.g. Grace Period" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500">From</label>
                    <NumberInput value={slab.fromMinutes} onChange={v => updateSlab(slab.id, "fromMinutes", v)} min={0} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500">To</label>
                    <NumberInput value={slab.toMinutes ?? ""} placeholder="∞" onChange={v => updateSlab(slab.id, "toMinutes", v === "" ? null : v)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500">Deduction Type</label>
                    <SelectInput value={slab.deductionType} onChange={v => updateSlab(slab.id, "deductionType", v)}
                      options={Object.entries(deductionTypeLabels)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500">
                      {slab.deductionType === "percentage" ? "%" : slab.deductionType === "fixed_amount" ? "Amount" : "Value"}
                    </label>
                    <NumberInput value={slab.value} onChange={v => updateSlab(slab.id, "value", v)}
                      disabled={!["percentage", "fixed_amount"].includes(slab.deductionType)}
                      placeholder={["percentage", "fixed_amount"].includes(slab.deductionType) ? "Enter" : "—"} />
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
              <Plus className="h-3.5 w-3.5" /> Add Slab Rule
            </button>

            {(settings.late_slabs || []).length > 0 && (
              <div className="rounded-lg border border-dashed border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-gray-800/30 p-4">
                <h4 className="text-[10px] font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" /> Preview: How Deductions Apply
                </h4>
                <div className="space-y-1.5">
                  {(settings.late_slabs || []).map(slab => (
                    <div key={slab.id} className="flex items-center gap-2 text-[11px]">
                      <span className="font-mono text-gray-400 w-24 shrink-0">{slab.fromMinutes}–{slab.toMinutes ?? "∞"} min</span>
                      <span className="text-gray-500">→</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">{slab.label}:</span>
                      <span className="text-gray-500">
                        {slab.deductionType === "no_deduction" && "No deduction applied"}
                        {slab.deductionType === "half_day" && "Deduct half day salary"}
                        {slab.deductionType === "full_day" && "Deduct one full day salary"}
                        {slab.deductionType === "two_days" && "Deduct two days salary"}
                        {slab.deductionType === "percentage" && `Deduct ${slab.value}% of monthly salary`}
                        {slab.deductionType === "fixed_amount" && `Deduct ${settings.currency} ${slab.value} fixed`}
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
      <Section title="Workflow & Security">
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-500">Approval Levels</label>
          <NumberInput value={settings.approval_levels} onChange={v => update("approval_levels", v)} min={1} max={5} />
        </div>
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <label className="text-xs font-medium text-gray-500">Lock Payroll After Approval</label>
          <ToggleSwitch checked={settings.lock_after_approval} onChange={v => update("lock_after_approval", v)} />
        </div>
      </Section>

      {/* Save Button */}
      <div className="flex justify-end">
        <button disabled={saving} onClick={handleSave}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white hover:bg-blue-600 transition shadow-sm disabled:opacity-50">
          <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
