"use client";

import React, { useState, useEffect } from "react";
import { api, buildQueryParams } from "@/lib/api-client";
import { notify, parseApiError } from "@/lib/utils";
import { RefreshCcw, Plus, Trash2, Pencil, Power, Clock, Calendar, Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const FREQUENCIES = [
  { value: "daily", label: "Daily", desc: "Runs every day" },
  { value: "weekly", label: "Weekly", desc: "Runs once a week" },
  { value: "monthly", label: "Monthly", desc: "Runs once a month" },
];

const STATUS_ICONS = {
  success: <CheckCircle2 size={14} className="text-emerald-500" />,
  failed: <XCircle size={14} className="text-red-500" />,
  running: <Loader2 size={14} className="text-amber-500 animate-spin" />,
};

export default function AutoRegenerateSetup() {
  const [settings, setSettings] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const defaultForm = {
    branch_id: "",
    frequency: "daily",
    run_time: "02:00",
    day_of_week: 1,
    day_of_month: 1,
    lookback_days: 7,
  };
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = await buildQueryParams({});
      const [settingsRes, branchesRes] = await Promise.all([
        api.get("/auto-regenerate", { params }),
        api.get("/branch-list", { params }),
      ]);
      setSettings(settingsRes.data?.data || []);
      setBranches(branchesRes.data || []);
    } catch (e) {
      notify("Error", parseApiError(e), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const params = await buildQueryParams({});
      const payload = {
        ...form,
        company_id: params.company_id,
        branch_id: form.branch_id || null,
      };

      if (editingId) {
        await api.put(`/auto-regenerate/${editingId}`, { ...params, ...payload });
        notify("Success", "Setting updated", "success");
      } else {
        await api.post("/auto-regenerate", payload);
        notify("Success", "Auto-regenerate setting created", "success");
      }

      setForm(defaultForm);
      setEditingId(null);
      fetchData();
    } catch (e) {
      notify("Error", parseApiError(e), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setForm({
      branch_id: item.branch_id || "",
      frequency: item.frequency,
      run_time: item.run_time,
      day_of_week: item.day_of_week ?? 1,
      day_of_month: item.day_of_month ?? 1,
      lookback_days: item.lookback_days,
    });
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this auto-regenerate setting?")) return;
    try {
      const params = await buildQueryParams({});
      await api.delete(`/auto-regenerate/${id}`, { params });
      notify("Success", "Setting deleted", "success");
      fetchData();
    } catch (e) {
      notify("Error", parseApiError(e), "error");
    }
  };

  const handleToggle = async (id) => {
    try {
      const params = await buildQueryParams({});
      await api.post(`/auto-regenerate/${id}/toggle`, params);
      fetchData();
    } catch (e) {
      notify("Error", parseApiError(e), "error");
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(defaultForm);
  };

  const getFrequencyLabel = (setting) => {
    if (setting.frequency === "daily") return "Every day";
    if (setting.frequency === "weekly") return `Every ${DAYS_OF_WEEK.find((d) => d.value === setting.day_of_week)?.label || "Monday"}`;
    if (setting.frequency === "monthly") return `Every month on day ${setting.day_of_month}`;
    return setting.frequency;
  };

  return (
    <div className="h-[calc(100vh-140px)] flex overflow-hidden rounded-2xl border border-gray-200 dark:border-white/5">
      {/* LEFT: Form */}
      <div className="w-[380px] shrink-0 border-r border-gray-200 dark:border-white/5 bg-white dark:bg-[#0b1326] flex flex-col overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <RefreshCcw size={18} className="text-primary" />
            {editingId ? "Edit Setting" : "New Auto Regenerate"}
          </h2>
          <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">
            Automatically regenerate attendance for reports
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Branch */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-500 mb-1.5">
              Branch
            </label>
            <select
              value={form.branch_id}
              onChange={(e) => setForm((p) => ({ ...p, branch_id: e.target.value }))}
              className="w-full rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name || b.branch_name}</option>
              ))}
            </select>
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-500 mb-1.5">
              Frequency
            </label>
            <div className="grid grid-cols-3 gap-2">
              {FREQUENCIES.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, frequency: f.value }))}
                  className={`rounded-xl border px-3 py-2.5 text-center transition-all ${
                    form.frequency === f.value
                      ? "border-primary bg-primary/10 text-primary font-bold"
                      : "border-gray-200 dark:border-white/10 text-gray-500 dark:text-slate-400 hover:border-primary/30"
                  }`}
                >
                  <div className="text-sm font-medium">{f.label}</div>
                  <div className="text-[9px] mt-0.5 opacity-60">{f.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Day of Week (for weekly) */}
          {form.frequency === "weekly" && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-500 mb-1.5">
                Day of Week
              </label>
              <select
                value={form.day_of_week}
                onChange={(e) => setForm((p) => ({ ...p, day_of_week: Number(e.target.value) }))}
                className="w-full rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300"
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Day of Month (for monthly) */}
          {form.frequency === "monthly" && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-500 mb-1.5">
                Day of Month
              </label>
              <select
                value={form.day_of_month}
                onChange={(e) => setForm((p) => ({ ...p, day_of_month: Number(e.target.value) }))}
                className="w-full rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300"
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          )}

          {/* Run Time */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-500 mb-1.5">
              Run Time
            </label>
            <input
              type="time"
              value={form.run_time}
              onChange={(e) => setForm((p) => ({ ...p, run_time: e.target.value }))}
              className="w-full rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300"
            />
          </div>

          {/* Lookback Days */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-500">
                Date Range (days back)
              </label>
              <span className="text-xs font-bold text-primary">{form.lookback_days} days</span>
            </div>
            <input
              type="range"
              min="1"
              max="31"
              value={form.lookback_days}
              onChange={(e) => setForm((p) => ({ ...p, lookback_days: Number(e.target.value) }))}
              className="w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-[9px] text-gray-400 mt-1">
              <span>1 day</span>
              <span>31 days (max)</span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="px-5 py-4 border-t border-gray-200 dark:border-white/5 space-y-2">
          <button
            disabled={saving}
            onClick={handleSave}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary to-indigo-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-40"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : editingId ? <Pencil size={14} /> : <Plus size={14} />}
            {saving ? "Saving..." : editingId ? "Update Setting" : "Create Setting"}
          </button>
          {editingId && (
            <button onClick={cancelEdit} className="w-full py-2 text-xs text-gray-400 hover:text-gray-600 transition">
              Cancel Edit
            </button>
          )}
        </div>
      </div>

      {/* RIGHT: Settings List */}
      <div className="flex-1 bg-gray-50 dark:bg-[#0a1128] flex flex-col overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-white/5 bg-white dark:bg-[#0b1326]">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar size={18} className="text-primary" />
            Scheduled Regenerations
          </h2>
          <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">
            {settings.length} setting{settings.length !== 1 ? "s" : ""} configured
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin text-primary" size={24} />
              <span className="ml-2 text-sm text-gray-400">Loading...</span>
            </div>
          ) : settings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <RefreshCcw size={48} className="mb-4 opacity-20" />
              <p className="text-sm font-medium">No auto-regenerate settings</p>
              <p className="text-xs mt-1">Create one using the form on the left</p>
            </div>
          ) : (
            <div className="space-y-3">
              {settings.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-4 transition-all ${
                    item.is_active
                      ? "border-gray-200 dark:border-white/5 bg-white dark:bg-white/[0.02]"
                      : "border-gray-200/50 dark:border-white/5 bg-gray-100/50 dark:bg-white/[0.01] opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-gray-800 dark:text-white">
                          {item.branch?.branch_name || "All Branches"}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          item.is_active
                            ? "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                            : "bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400"
                        }`}>
                          {item.is_active ? "Active" : "Paused"}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 text-[9px] font-bold capitalize">
                          {item.frequency}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {item.run_time}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          {getFrequencyLabel(item)}
                        </span>
                        <span>Last {item.lookback_days} days</span>
                      </div>

                      {item.last_run_at && (
                        <div className="flex items-center gap-1.5 mt-2 text-[10px] text-gray-400 dark:text-slate-500">
                          {STATUS_ICONS[item.last_run_status] || <AlertCircle size={14} className="text-gray-400" />}
                          <span>Last run: {new Date(item.last_run_at).toLocaleString()}</span>
                          {item.last_run_message && (
                            <span className="truncate max-w-[200px]">- {item.last_run_message}</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleToggle(item.id)}
                        className={`p-2 rounded-lg transition ${
                          item.is_active
                            ? "hover:bg-amber-100 dark:hover:bg-amber-500/10 text-amber-500"
                            : "hover:bg-emerald-100 dark:hover:bg-emerald-500/10 text-emerald-500"
                        }`}
                        title={item.is_active ? "Pause" : "Activate"}
                      >
                        <Power size={15} />
                      </button>
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-2 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/10 text-indigo-500 transition"
                        title="Edit"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/10 text-red-500 transition"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
