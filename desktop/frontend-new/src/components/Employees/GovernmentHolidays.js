"use client";

import React, { useEffect, useState, useCallback } from "react";
import { notify, parseApiError } from "@/lib/utils";
import { getUser } from "@/config";
import {
  getEmployeeGovernmentHolidays,
  saveEmployeeGovernmentHolidays,
  resetEmployeeGovernmentHolidays,
} from "@/lib/endpoint/holidays";
import { Checkbox } from "../ui/checkbox";
import { Globe, RotateCcw, Save, Loader2 } from "lucide-react";

const GovernmentHolidays = ({ id, branch_country }) => {
  const [holidays, setHolidays] = useState([]);
  const [isCustom, setIsCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [countryCode, setCountryCode] = useState(branch_country || "AE");
  const [hasChanges, setHasChanges] = useState(false);

  // Update country code when branch_country changes (e.g. switching employees)
  useEffect(() => {
    if (branch_country) {
      setCountryCode(branch_country.toUpperCase().trim());
    }
  }, [branch_country]);

  const fetchHolidays = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await getEmployeeGovernmentHolidays(id, {
        country_code: countryCode,
        year,
      });
      if (res.success) {
        setHolidays(
          (res.data || []).map((h) => ({
            holiday_id: h.holiday_id || h.id,
            name: h.name,
            start_date: h.start_date,
            end_date: h.end_date,
            total_days: h.total_days || 1,
            is_enabled: h.is_enabled ?? true,
          }))
        );
        setIsCustom(res.is_custom || false);
        setHasChanges(false);
      }
    } catch (error) {
      notify("Error", parseApiError(error), "error");
    } finally {
      setLoading(false);
    }
  }, [id, year, countryCode]);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  const toggleHoliday = (index) => {
    setHolidays((prev) =>
      prev.map((h, i) =>
        i === index ? { ...h, is_enabled: !h.is_enabled } : h
      )
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { company_id } = await getUser();
      await saveEmployeeGovernmentHolidays(id, {
        company_id,
        country_code: countryCode,
        year,
        holidays,
      });
      setIsCustom(true);
      setHasChanges(false);
      notify("Success", "Government holidays saved for this employee", "success");
    } catch (error) {
      notify("Error", parseApiError(error), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      await resetEmployeeGovernmentHolidays(id, {
        country_code: countryCode,
        year,
      });
      setIsCustom(false);
      setHasChanges(false);
      notify("Success", "Reset to default government holidays", "success");
      fetchHolidays();
    } catch (error) {
      notify("Error", parseApiError(error), "error");
    } finally {
      setSaving(false);
    }
  };

  const enabledCount = holidays.filter((h) => h.is_enabled).length;

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <section className="glass-card bg-card-light dark:bg-card-dark border border-white/50 dark:border-slate-700/50 rounded-2xl p-6 md:p-8 scroll-mt-28">
      <div className="flex items-center justify-between gap-3 mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
        <div className="flex items-center gap-3">
          <span className="material-icons text-primary bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-lg">
            <Globe size={20} />
          </span>
          <div>
            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
              Government Holidays
              <span className="ml-2 text-xs font-normal text-slate-400 dark:text-slate-500">
                ({countryCode})
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isCustom ? (
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  Custom holidays applied
                </span>
              ) : (
                "Default government holidays"
              )}
              {" "} &middot; {enabledCount} of {holidays.length} enabled
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-primary" size={24} />
          <span className="ml-2 text-sm text-slate-500">Loading holidays...</span>
        </div>
      ) : holidays.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          No government holidays found for {countryCode} in {year}
        </div>
      ) : (
        <>
          <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
            {holidays.map((holiday, index) => (
              <div
                key={holiday.holiday_id}
                className={`flex items-center justify-between p-3 rounded-xl transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                  !holiday.is_enabled ? "opacity-50" : ""
                }`}
                onClick={() => toggleHoliday(index)}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={holiday.is_enabled}
                    onCheckedChange={() => toggleHoliday(index)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {holiday.name}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {holiday.start_date}
                      {holiday.end_date !== holiday.start_date &&
                        ` to ${holiday.end_date}`}
                      {holiday.total_days > 1 &&
                        ` (${holiday.total_days} days)`}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
            {isCustom && (
              <button
                onClick={handleReset}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <RotateCcw size={14} />
                Reset to Default
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-primary hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-lg shadow-primary/20"
            >
              {saving ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                <Save size={14} />
              )}
              Save
            </button>
          </div>
        </>
      )}
    </section>
  );
};

export default GovernmentHolidays;
