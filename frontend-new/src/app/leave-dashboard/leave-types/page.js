"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, X, Loader2 } from "lucide-react";
import { api, API_BASE } from "@/lib/api-client";
import { getUser } from "@/config/index";
import { notify, parseApiError } from "@/lib/utils";

export default function LeaveTypesPage() {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", short_name: "", description: "", paid: false, carryForward: false });

  const fetchLeaveTypes = useCallback(async () => {
    setLoading(true);
    try {
      const user = await getUser();
      const { data } = await api.get(`${API_BASE}/leave_type`, {
        params: { company_id: user?.company_id || 0, per_page: 100 },
      });
      setLeaveTypes(data?.data || []);
    } catch (error) {
      notify("Error", parseApiError(error), "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeaveTypes(); }, [fetchLeaveTypes]);

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", short_name: "", description: "", paid: false, carryForward: false });
    setDrawerOpen(true);
  };

  const openEdit = (lt) => {
    setEditing(lt);
    setForm({
      name: lt.name || "",
      short_name: lt.short_name || "",
      description: lt.description || "",
      paid: lt.paid || false,
      carryForward: lt.carry_forward || false,
    });
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { notify("Error", "Name is required", "error"); return; }
    setSaving(true);
    try {
      const user = await getUser();
      const payload = {
        name: form.name,
        short_name: form.short_name || form.name.substring(0, 3).toUpperCase(),
        company_id: user?.company_id || 0,
        branch_id: 0,
        description: form.description || "",
        paid: form.paid,
        carry_forward: form.carryForward,
      };
      if (editing) {
        await api.put(`${API_BASE}/leave_type/${editing.id}`, payload);
        notify("Success", "Leave type updated", "success");
      } else {
        await api.post(`${API_BASE}/leave_type`, payload);
        notify("Success", "Leave type created", "success");
      }
      setDrawerOpen(false);
      fetchLeaveTypes();
    } catch (error) {
      notify("Error", parseApiError(error), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this leave type?")) return;
    try {
      await api.delete(`${API_BASE}/leave_type/${id}`);
      notify("Success", "Leave type deleted", "success");
      fetchLeaveTypes();
    } catch (error) {
      notify("Error", parseApiError(error), "error");
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">Leave Types</h2>
          <p className="text-sm text-slate-500">Manage leave type definitions for your organization</p>
        </div>
        <button onClick={openNew} className="bg-primary hover:bg-blue-600 text-white text-sm font-semibold py-2 px-4 rounded-lg flex items-center gap-1.5 transition-all">
          <Plus size={16} /> Add Leave Type
        </button>
      </div>

      {/* Table */}
      <div className="bg-white/5 dark:bg-slate-800/50 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left font-medium text-slate-400 px-5 py-3 text-xs uppercase">Name</th>
              <th className="text-left font-medium text-slate-400 px-5 py-3 text-xs uppercase">Short Name</th>
              <th className="text-left font-medium text-slate-400 px-5 py-3 text-xs uppercase">Branch</th>
              <th className="text-right font-medium text-slate-400 px-5 py-3 text-xs uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {leaveTypes.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-10 text-slate-500">No leave types found</td></tr>
            ) : (
              leaveTypes.map(lt => (
                <tr key={lt.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                  <td className="px-5 py-3 font-medium text-white">{lt.name}</td>
                  <td className="px-5 py-3 text-slate-400">{lt.short_name || "—"}</td>
                  <td className="px-5 py-3 text-slate-400">{lt.branch?.branch_name || "All"}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(lt)} className="p-1.5 text-slate-400 hover:text-white transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(lt.id)} className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Drawer */}
      {drawerOpen && (
        <div className="fixed inset-x-0 bottom-0 top-[72px] z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border-l border-white/10 shadow-2xl flex flex-col overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <h2 className="text-lg font-bold text-white">{editing ? "Edit Leave Type" : "Add Leave Type"}</h2>
              <button onClick={() => setDrawerOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="flex-1 p-6 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Annual Leave"
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-primary focus:outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description of this leave type"
                  rows={3}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-primary focus:outline-none resize-none"
                />
              </div>

              {/* Paid Leave Toggle */}
              <div className="flex items-center justify-between py-3 border-t border-white/10">
                <div>
                  <p className="text-sm font-medium text-white">Paid Leave</p>
                  <p className="text-xs text-slate-500">Employee receives salary during this leave</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, paid: !form.paid })}
                  className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors duration-300 ${form.paid ? 'bg-emerald-500' : 'bg-slate-700'}`}
                >
                  <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-300 ${form.paid ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* Carry Forward Toggle */}
              <div className="flex items-center justify-between py-3 border-t border-white/10">
                <div>
                  <p className="text-sm font-medium text-white">Carry Forward</p>
                  <p className="text-xs text-slate-500">Unused balance carries over to next year</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, carryForward: !form.carryForward })}
                  className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors duration-300 ${form.carryForward ? 'bg-emerald-500' : 'bg-slate-700'}`}
                >
                  <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-300 ${form.carryForward ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/10 flex gap-3">
              <button onClick={() => setDrawerOpen(false)} className="flex-1 py-2.5 px-4 border border-white/10 rounded-lg text-sm text-slate-300 hover:bg-white/5 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 px-4 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-blue-600 disabled:opacity-50 transition-all"
              >
                {saving ? "Saving..." : editing ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
