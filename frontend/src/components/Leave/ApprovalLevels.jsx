"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown, Save } from "lucide-react";
import { getUser } from "@/config";
import { notify } from "@/lib/utils";
import DropDown from "@/components/ui/DropDown";

const APPROVER_TYPES = [
  { id: "reporting_manager", name: "Reporting Manager" },
  { id: "department_head", name: "Department Head" },
  { id: "branch_manager", name: "Branch Manager" },
  { id: "hr", name: "HR" },
  { id: "admin", name: "Admin / Super User" },
];

const storageKey = (companyId) => `leave_approval_levels::${companyId || 0}`;

export default function ApprovalLevels() {
  const [companyId, setCompanyId] = useState(null);
  const [levels, setLevels] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const u = await getUser();
        const cid = u?.company_id || 0;
        setCompanyId(cid);
        if (typeof window !== "undefined") {
          const raw = localStorage.getItem(storageKey(cid));
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setLevels(parsed);
                setLoaded(true);
                return;
              }
            } catch (_) {}
          }
        }
        setLevels([{ approver_type: "reporting_manager" }]);
        setLoaded(true);
      } catch (e) {
        setLevels([{ approver_type: "reporting_manager" }]);
        setLoaded(true);
      }
    })();
  }, []);

  const addLevel = () => setLevels((l) => [...l, { approver_type: "reporting_manager" }]);

  const removeLevel = (idx) => setLevels((l) => l.filter((_, i) => i !== idx));

  const moveLevel = (idx, dir) => {
    setLevels((l) => {
      const arr = [...l];
      const j = idx + dir;
      if (j < 0 || j >= arr.length) return arr;
      [arr[idx], arr[j]] = [arr[j], arr[idx]];
      return arr;
    });
  };

  const updateLevel = (idx, patch) =>
    setLevels((l) => l.map((row, i) => (i === idx ? { ...row, ...patch } : row)));

  const handleSave = async () => {
    if (levels.length === 0) {
      notify("Error", "Add at least one approval level before saving.", "error");
      return;
    }
    if (levels.some((l) => !l.approver_type)) {
      notify("Error", "Each level needs an approver type.", "error");
      return;
    }
    setIsSaving(true);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(storageKey(companyId), JSON.stringify(levels));
      }
      notify("Saved", "Approval levels saved.", "success");
    } catch (e) {
      notify("Error", "Could not save approval levels.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const summary = useMemo(() =>
    levels.map((l, i) => `L${i + 1} → ${APPROVER_TYPES.find((t) => t.id === l.approver_type)?.name || "—"}`).join("  →  "),
    [levels]);

  if (!loaded) return <div className="text-sm text-slate-500">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Approval Levels</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure the order of approvers. A leave request must pass each level in sequence.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={addLevel}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            <Plus className="w-4 h-4" /> Add Level
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-white px-3 py-1.5 text-sm font-semibold shadow-md hover:opacity-90 transition disabled:opacity-60"
          >
            <Save className="w-4 h-4" /> {isSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {levels.length > 0 && (
        <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/40 px-4 py-2.5 text-xs text-slate-600 dark:text-slate-300">
          <span className="font-semibold text-slate-700 dark:text-slate-200 mr-2">Workflow:</span>
          {summary}
        </div>
      )}

      <div className="space-y-3">
        {levels.length === 0 && (
          <div className="rounded-lg border-2 border-dashed border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-900/40 p-6 text-center text-sm text-slate-500">
            No approval levels configured. Click "Add Level" to start.
          </div>
        )}
        {levels.map((row, idx) => (
          <div
            key={idx}
            className="flex flex-col md:flex-row md:items-center gap-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/50 p-4"
          >
            <div className="flex items-center gap-3 md:w-48">
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                {idx + 1}
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-800 dark:text-white">Level {idx + 1}</div>
                <div className="text-[11px] text-slate-500">
                  {idx === 0 ? "First approver" : idx === levels.length - 1 ? "Final approver" : "Intermediate"}
                </div>
              </div>
            </div>

            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 mb-1">Approver Type</label>
              <DropDown
                value={row.approver_type}
                items={APPROVER_TYPES}
                onChange={(v) => updateLevel(idx, { approver_type: v })}
                placeholder="Select approver"
                width="w-full"
              />
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => moveLevel(idx, -1)}
                disabled={idx === 0}
                title="Move up"
                className="h-8 w-8 rounded-md flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                onClick={() => moveLevel(idx, 1)}
                disabled={idx === levels.length - 1}
                title="Move down"
                className="h-8 w-8 rounded-md flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              <button
                onClick={() => removeLevel(idx)}
                title="Remove level"
                className="h-8 w-8 rounded-md flex items-center justify-center text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
