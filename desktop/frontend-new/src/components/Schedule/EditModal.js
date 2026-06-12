"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import DropDown from "../ui/DropDown";
import DateRangeSelect from "../ui/DateRange";
import { getShiftDropDownList, getSchedulesByEmployee, storeSchedule } from "@/lib/api";
import { notify, parseApiError } from "@/lib/utils";

const emptyRow = () => ({ shiftId: null, from: null, to: null, isOverTime: false, isAutoShift: false });

const EditScheduleModal = ({ employee, open, onClose, onSuccess, viewOnly = false, onSwitchToView }) => {
  const [shifts, setShifts] = useState([]);
  const [rows, setRows] = useState([emptyRow()]);
  const [loading, setLoading] = useState(false);
  const [fetchingSchedules, setFetchingSchedules] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);

  useEffect(() => {
    if (open && employee) {
      getShiftDropDownList().then(setShifts).catch(console.error);

      if (!justSubmitted) {
        // Fetch schedules directly from API for this employee
        setFetchingSchedules(true);
        const empId = employee.system_user_id || employee.employee_id;
        console.log("EditModal fetching schedules for employee_id:", empId);
        getSchedulesByEmployee(empId)
          .then((schedules) => {
            console.log("EditModal API response:", schedules);
            if (Array.isArray(schedules) && schedules.length > 0) {
              const mapped = schedules.map(s => ({
                shiftId: s.shift_id || null,
                from: s.from_date || null,
                to: s.to_date || null,
                isOverTime: s.is_over_time || false,
                isAutoShift: !!s.isAutoShift,
              }));
              setRows(mapped);
            } else {
              setRows([emptyRow()]);
            }
          })
          .catch((err) => {
            console.error("Failed to fetch schedules:", err);
            // Fallback to employee data
            const allSchedules = employee?.schedule_all?.length > 0
              ? employee.schedule_all
              : (employee?.schedule?.shift ? [employee.schedule] : []);

            if (allSchedules.length > 0) {
              const mapped = allSchedules.map(s => ({
                shiftId: s.shift?.id || s.shift_id || null,
                from: s.from_date || null,
                to: s.to_date || null,
                isOverTime: s.is_over_time || s.isOverTime || false,
                isAutoShift: !!(s.isAutoShift ?? s.is_auto_shift ?? false),
              }));
              setRows(mapped);
            } else {
              setRows([emptyRow()]);
            }
          })
          .finally(() => setFetchingSchedules(false));
      }
      setJustSubmitted(false);
    } else {
      setJustSubmitted(false);
    }
  }, [open, employee]);

  const datesOverlap = (from1, to1, from2, to2) => {
    return from1 <= to2 && from2 <= to1;
  };

  const updateRow = (index, field, value) => {
    setRows(prev => {
      const updated = prev.map((r, i) => i === index ? { ...r, [field]: value } : r);
      if (field === 'from' || field === 'to') {
        const current = updated[index];
        if (current.from && current.to) {
          const hasOverlap = updated.some((r, i) =>
            i !== index && r.from && r.to && datesOverlap(r.from, r.to, current.from, current.to)
          );
          if (hasOverlap) {
            notify("Error", "This date range overlaps with another schedule", "error");
            return prev;
          }
        }
      }
      return updated;
    });
  };

  const addRow = () => setRows(prev => [...prev, emptyRow()]);

  const removeRow = (index) => {
    if (rows.length <= 1) return;
    setRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    for (const row of rows) {
      if (!row.shiftId) { notify("Error", "Please select a shift for all rows", "error"); return; }
      if (!row.from || !row.to) { notify("Error", "Please select a date range for all rows", "error"); return; }
    }

    // Block submission if any schedules overlap
    for (let i = 0; i < rows.length; i++) {
      for (let j = i + 1; j < rows.length; j++) {
        if (datesOverlap(rows[i].from, rows[i].to, rows[j].from, rows[j].to)) {
          notify("Error", `Schedule ${i + 1} and ${j + 1} have overlapping dates`, "error");
          return;
        }
      }
    }

    setLoading(true);
    try {
      const schedules = rows.map(row => {
        const selectedShift = shifts.find(s => s.id === row.shiftId);
        return {
          shift_id: row.shiftId,
          shift_type_id: selectedShift?.shift_type_id || 0,
          from_date: row.from,
          to_date: row.to,
          is_over_time: row.isOverTime,
          isAutoShift: row.isAutoShift,
        };
      });

      const empId = employee.system_user_id || employee.id;
      console.log("Using empId:", empId, "system_user_id:", employee.system_user_id, "id:", employee.id);
      const payload = {
        employee_ids: [empId],
        schedules,
        replace_schedules: true,
        branch_id: 0,
      };

      console.log("Schedule Update Payload:", JSON.stringify(payload));
      const response = await storeSchedule(payload);
      const data = response?.data;
      console.log("Schedule Update Response:", JSON.stringify(data));

      if (data?.status === false) {
        const firstKey = Object.keys(data.errors)[0];
        notify("Error", data.errors[firstKey][0], "error");
        return;
      }

      await notify("Success", "Schedule updated", "success");
      await new Promise(r => setTimeout(r, 1000));
      await onSuccess?.();
      setJustSubmitted(true);
      if (onSwitchToView) onSwitchToView();

    } catch (error) {
      notify("Error", parseApiError(error), "error");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 top-[72px] z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-primary flex justify-between items-center">
          <h3 className="text-white font-bold text-lg">{viewOnly ? 'View Schedule(s)' : 'Update Schedule(s)'}</h3>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Employee Name + Add Button */}
          <div className="flex justify-between items-center">
            <div className="text-sm text-slate-500">
              Employee: <span className="font-semibold text-slate-700 dark:text-slate-200">{employee?.first_name || employee?.name || "—"}</span>
            </div>
            {!viewOnly && (
              <button
                onClick={addRow}
                className="bg-primary hover:bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all"
              >
                ADD <Plus size={14} />
              </button>
            )}
          </div>

          {/* Schedule Rows */}
          {fetchingSchedules ? (
            <div className="text-center text-slate-400 py-4">Loading schedules...</div>
          ) : (
            <div className={`space-y-3 ${viewOnly ? 'pointer-events-none opacity-80' : ''}`}>
              {rows.map((row, index) => (
                <div key={index} className="flex items-end gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                  <div className="flex-1">
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1 uppercase">Shift Name</label>
                    <DropDown
                      items={shifts}
                      value={row.shiftId}
                      onChange={(val) => updateRow(index, "shiftId", val)}
                      placeholder="Select Shift"
                      width="w-full"
                      disabled={viewOnly}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1 uppercase">Date Range</label>
                    <DateRangeSelect
                      value={{ from: row.from, to: row.to }}
                      onChange={({ from, to }) => { updateRow(index, "from", from); updateRow(index, "to", to); }}
                    />
                  </div>
                  <div className="flex items-center gap-2 pb-1">
                    <span className="text-xs text-slate-500">OT</span>
                    <button
                      type="button"
                      onClick={() => !viewOnly && updateRow(index, "isOverTime", !row.isOverTime)}
                      className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors duration-300 ${row.isOverTime ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'}`}
                    >
                      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-300 ${row.isOverTime ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 pb-1">
                    <span className="text-xs text-slate-500">Auto</span>
                    <button
                      type="button"
                      onClick={() => !viewOnly && updateRow(index, "isAutoShift", !row.isAutoShift)}
                      className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors duration-300 ${row.isAutoShift ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'}`}
                    >
                      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-300 ${row.isAutoShift ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                  {!viewOnly && rows.length > 1 && (
                    <button
                      onClick={() => removeRow(index)}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors mb-0.5"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!viewOnly && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-center">
            <button
              onClick={handleSubmit}
              disabled={loading || fetchingSchedules}
              className="px-8 py-2.5 bg-primary text-white font-bold text-sm rounded-lg hover:bg-blue-600 transition-all shadow-lg disabled:opacity-50"
            >
              {loading ? "Saving..." : "SUBMIT"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditScheduleModal;
