"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Layers, Plus, X, Trash2, ShieldCheck, ChevronRight, Loader2 } from "lucide-react";
import { api, API_BASE } from "@/lib/api-client";
import { getUser } from "@/config/index";
import { notify, parseApiError } from "@/lib/utils";

function Drawer({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 top-[72px] z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border-l border-white/10 shadow-2xl flex flex-col overflow-y-auto animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="flex-1 p-6">{children}</div>
      </div>
    </div>
  );
}

export default function LeaveGroupsPage() {
  const [groups, setGroups] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [isNew, setIsNew] = useState(false);

  // Form state
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [leaveCounts, setLeaveCounts] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const user = await getUser();
      const [groupsRes, typesRes] = await Promise.all([
        api.get(`${API_BASE}/leave_groups`, { params: { company_id: user?.company_id || 0, per_page: 100 } }),
        api.get(`${API_BASE}/leave_type`, { params: { company_id: user?.company_id || 0, per_page: 100 } }),
      ]);
      setGroups(groupsRes.data?.data || []);
      setLeaveTypes(typesRes.data?.data || []);
    } catch (error) {
      console.error(error);
      notify("Error", parseApiError(error), "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openNew = () => {
    setIsNew(true);
    setEditingGroup(null);
    setGroupName("");
    setGroupDescription("");
    setLeaveCounts([]);
    setDrawerOpen(true);
  };

  const openEdit = (group) => {
    setIsNew(false);
    setEditingGroup(group);
    setGroupName(group.group_name || "");
    setGroupDescription(group.description || "");
    setLeaveCounts(
      (group.leave_count || []).map(lc => ({
        id: lc.leave_type_id,
        leave_type_count: lc.leave_type_count || 0,
        accrual: lc.accrual || "monthly",
        carry_forward_max: lc.carry_forward_max || 0,
        max_limit: lc.max_limit || 0,
      }))
    );
    setDrawerOpen(true);
  };

  const addRule = () => {
    if (leaveTypes.length === 0) return;
    setLeaveCounts(prev => [...prev, { id: leaveTypes[0].id, leave_type_count: 0, accrual: "monthly", carry_forward_max: 0, max_limit: 0 }]);
  };

  const removeRule = (index) => {
    setLeaveCounts(prev => prev.filter((_, i) => i !== index));
  };

  const updateRule = (index, field, value) => {
    setLeaveCounts(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  const handleSave = async () => {
    if (!groupName.trim()) {
      notify("Error", "Group name is required", "error");
      return;
    }
    setSaving(true);
    try {
      const user = await getUser();
      const payload = {
        group_name: groupName,
        description: groupDescription,
        company_id: user?.company_id || 0,
        branch_id: 0,
        leave_counts: leaveCounts.map(lc => ({
          id: lc.id,
          leave_type_count: lc.leave_type_count,
          accrual: lc.accrual || "monthly",
          carry_forward_max: lc.carry_forward_max || 0,
          max_limit: lc.max_limit || 0,
          company_id: user?.company_id || 0,
        })),
      };

      if (isNew) {
        await api.post(`${API_BASE}/leave_groups`, payload);
        notify("Success", "Leave group created", "success");
      } else {
        await api.put(`${API_BASE}/leave_groups/${editingGroup.id}`, payload);
        notify("Success", "Leave group updated", "success");
      }
      setDrawerOpen(false);
      fetchData();
    } catch (error) {
      notify("Error", parseApiError(error), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this leave group?")) return;
    try {
      await api.delete(`${API_BASE}/leave_groups/${id}`);
      notify("Success", "Leave group deleted", "success");
      fetchData();
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">Leave Groups</h2>
          <p className="text-sm text-slate-500">Configure leave policies for different employee groups</p>
        </div>
        <button onClick={openNew} className="bg-primary hover:bg-blue-600 text-white text-sm font-semibold py-2 px-4 rounded-lg flex items-center gap-1.5 transition-all">
          <Plus size={16} /> New Group
        </button>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map(g => (
          <div
            key={g.id}
            className="bg-white/5 dark:bg-slate-800/50 border border-white/10 rounded-xl p-5 hover:shadow-lg transition-all cursor-pointer group"
            onClick={() => openEdit(g)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(g.id); }}
                  className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
                <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-white transition-colors" />
              </div>
            </div>
            <h3 className="font-semibold text-white mb-1">{g.group_name}</h3>
            {g.description && <p className="text-xs text-slate-400 mb-2">{g.description}</p>}
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
              <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 font-medium">
                {g.leave_count?.length || 0} rules
              </span>
            </div>
          </div>
        ))}
        {groups.length === 0 && (
          <div className="col-span-3 text-center py-10 text-slate-500">No leave groups found. Click "New Group" to create one.</div>
        )}
      </div>

      {/* Drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={isNew ? "New Leave Group" : groupName}>
        <div className="space-y-6">
          {/* Group Name */}
          {isNew && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Group Name</label>
                <input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g., Standard Full-Time"
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Description</label>
                <input
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="Brief description of this policy"
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-primary focus:outline-none"
                />
              </div>
            </>
          )}
          {!isNew && (
            <p className="text-sm text-slate-500">Edit policy rules</p>
          )}

          {/* Rules - only show for existing groups */}
          {!isNew && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Policy Rules</h3>
              <button onClick={addRule} className="text-xs text-primary hover:text-blue-400 flex items-center gap-1 font-medium">
                <Plus size={14} /> + Add Rule
              </button>
            </div>

            <div className="space-y-3">
              {leaveCounts.map((rule, index) => {
                const lt = leaveTypes.find(t => t.id === rule.id);
                return (
                  <div key={index} className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-white">{lt?.name || "Select type"}</span>
                      <button onClick={() => removeRule(index)} className="text-slate-500 hover:text-red-400">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Leave Type</label>
                        <select
                          value={rule.id}
                          onChange={(e) => updateRule(index, "id", Number(e.target.value))}
                          className="w-full bg-slate-800 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:border-primary focus:outline-none"
                        >
                          {leaveTypes.map(lt => (
                            <option key={lt.id} value={lt.id}>{lt.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Annual Quota</label>
                        <input
                          type="number"
                          value={rule.leave_type_count}
                          onChange={(e) => updateRule(index, "leave_type_count", Number(e.target.value))}
                          className="w-full bg-slate-800 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:border-primary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Accrual</label>
                        <select
                          value={rule.accrual || "monthly"}
                          onChange={(e) => updateRule(index, "accrual", e.target.value)}
                          className="w-full bg-slate-800 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:border-primary focus:outline-none"
                        >
                          <option value="monthly">Monthly</option>
                          <option value="quarterly">Quarterly</option>
                          <option value="yearly">Yearly</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Carry Forward Max</label>
                        <input
                          type="number"
                          value={rule.carry_forward_max || 0}
                          onChange={(e) => updateRule(index, "carry_forward_max", Number(e.target.value))}
                          className="w-full bg-slate-800 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:border-primary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Max Limit</label>
                        <input
                          type="number"
                          value={rule.max_limit || 0}
                          onChange={(e) => updateRule(index, "max_limit", Number(e.target.value))}
                          className="w-full bg-slate-800 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:border-primary focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              {leaveCounts.length === 0 && (
                <p className="text-center text-sm text-slate-500 py-6">No rules. Click "Add Rule" to configure leave quotas.</p>
              )}
            </div>
          </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-white/10">
            <button onClick={() => setDrawerOpen(false)} className="flex-1 py-2 px-4 border border-white/10 rounded-lg text-sm text-slate-300 hover:bg-white/5 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2 px-4 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-blue-600 disabled:opacity-50 transition-all"
            >
              {saving ? "Saving..." : isNew ? "Create Group" : "Save Changes"}
            </button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
