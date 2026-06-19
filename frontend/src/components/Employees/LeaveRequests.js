"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  Eye,
  X,
  FileText,
  Calendar,
  Users,
  PieChart,
  ClipboardList
} from 'lucide-react';
import { approveLeave, getLeavesGroups, rejectLeave, getLeaveDocuments } from '@/lib/endpoint/leaves';
import TeamAvailability from './TeamAvailability';
import LeavesCalendarView from './LeavesCalendarView';
import { getUser } from '@/config';
import { notify } from '@/lib/utils';

export default function LeaveViewDialog({ isOpen, setIsOpen, editedItem, onSuccess }) {
  const [activeTab, setActiveTab] = useState('info');
  const [leaveStats, setLeaveStats] = useState([]);
  const [approveRejectNotes, setApproveRejectNotes] = useState(editedItem?.approve_reject_notes || "");
  const [loading, setLoading] = useState(false);
  const [leaveDocuments, setLeaveDocuments] = useState([]);

  const toggleModal = () => setIsOpen(!isOpen);

  // Computed: Day Difference logic from Vue
  const dayDifference = useMemo(() => {
    if (!editedItem?.start_date || !editedItem?.end_date) return 0;
    const from = new Date(editedItem.start_date);
    const to = new Date(editedItem.end_date);
    const diffTime = Math.abs(to - from);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diffDays);
  }, [editedItem]);

  const formatDate = (date) => {
    if (!date) return "--";
    return new Date(date).toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };


  const verifyAvailableCount = async (leaveGroupId) => {

    if (leaveGroupId) {
      try {
        let data1 = await getLeavesGroups(leaveGroupId, {
          per_page: 1000,
          employee_id: editedItem.employee.id,
        });

        let leaveStats = data1[0].leave_count.map((e) => ({
          leave_group: e.leave_type?.name || e.leave_type?.short_name || "—",
          used: e.employee_used,
          total: e.leave_type_count,
          available: e.leave_type_count - e.employee_used,
        }));

        setLeaveStats(leaveStats)
      } catch (error) {
        console.log(error);
      }
    }
  }

  const fetchLeaveDocuments = async () => {
    try {
      const data = await getLeaveDocuments({
        employee_id: editedItem.employee.id,
        leave_id: editedItem.id,
      });
      setLeaveDocuments(data?.data || data || []);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (isOpen && editedItem?.id) {
      console.log(editedItem);
      verifyAvailableCount(editedItem.employee.leave_group_id);
      fetchLeaveDocuments();
    }
  }, [isOpen, editedItem]);



  const approveLeaveAction = async (leaveid) => {

    if (!approveRejectNotes) {
      alert("Notes are required");
      return;
    }

    const { id, name, company_id } = await getUser();

    let payload = {
      approve_reject_notes: approveRejectNotes,
      system_user_id: editedItem?.employee?.system_user_id,
      shift_type_id: editedItem?.employee?.schedule?.shift?.shift_type_id,
      order: 0,
      user_name: name,
      user_id: id,
      company_id: company_id,
    };

    setLoading(true);
    try {
      await approveLeave(leaveid, payload)
      onSuccess?.(true);
      setIsOpen(false);
      notify("Success", "Leave has been Approved", "success");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }

  }
  const rejectLeaveAction = async (leaveid) => {

    if (!approveRejectNotes) {
      alert("Notes are required");
      return;
    }

    const { id, name, company_id } = await getUser();

    let payload = {
      approve_reject_notes: approveRejectNotes,
      system_user_id: editedItem?.employee?.system_user_id,
      shift_type_id: editedItem?.employee?.schedule?.shift?.shift_type_id,
      order: 0,
      user_name: name,
      user_id: id,
      company_id: company_id,
    };

    setLoading(true);

    try {
      await rejectLeave(leaveid, payload)
      onSuccess?.(true);
      setIsOpen(false);
      notify("Success", "Leave has been Rejected", "success");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-24 pb-8">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
            onClick={toggleModal}
          ></div>

          {/* Modal Card */}
          <div className="min-w-[1100px] relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 w-full max-w-4xl overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200 flex flex-col max-h-[calc(100vh-8rem)]">

            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-200 dark:border-white/10 flex justify-between items-center bg-white dark:bg-slate-800">
              <div>
                <h3 className="text-lg font-bold text-gray-600 dark:text-gray-200">
                  Leave Details
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Reviewing request for {editedItem?.employee?.full_name}
                </p>
              </div>
              <button onClick={toggleModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors rounded-full p-1">
                <X size={20} />
              </button>
            </div>

            {/* Tabs Navigation */}
            <div className="flex justify-end px-6 bg-gray-50 dark:bg-slate-900/50 border-b border-gray-200 dark:border-white/10">
              {[
                { id: 'info', label: 'Information', icon: <ClipboardList size={14} /> },
                { id: 'documents', label: 'Documents', icon: <FileText size={14} /> },
                { id: 'quota', label: 'Leave Quota', icon: <PieChart size={14} /> }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto bg-white dark:bg-slate-800">
              {activeTab === 'info' && (
                <div className="grid grid-cols-12 gap-6">
                  {/* Left Column */}
                  <div className="col-span-12 lg:col-span-7 space-y-5">
                    <div className="flex gap-4">
                      <div className="flex-1 space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">From Date</label>
                          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/5 text-sm dark:text-gray-300">
                            {formatDate(editedItem?.start_date)}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">To Date</label>
                          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/5 text-sm dark:text-gray-300">
                            {formatDate(editedItem?.end_date)}
                          </div>
                        </div>
                      </div>
                      <div className="w-28 flex flex-col items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20">
                        <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{dayDifference}</span>
                        <span className="text-[10px] font-bold text-blue-600/60 dark:text-blue-400/60 uppercase">Days</span>
                      </div>
                    </div>

                    {/* Alternate Employee Section */}
                    {editedItem?.alternate_employee && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Alternate Employee / Handover
                        </label>
                        <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/5 shadow-sm">
                          <div className="relative h-12 w-12 rounded-full overflow-hidden border-2 border-white dark:border-slate-700 shadow-sm">
                            <img
                              src={editedItem.alternate_employee.profile_picture || '/api/placeholder/48/48'}
                              alt="Avatar"
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-slate-700 dark:text-gray-200 truncate">
                              {editedItem.alternate_employee.full_name}
                            </h4>
                            <div className="flex gap-3 text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                              <span className="flex items-center gap-1">
                                ID: <span className="text-blue-500">{editedItem.alternate_employee.employee_id}</span>
                              </span>
                              <span className="flex items-center gap-1 uppercase tracking-tighter">
                                {editedItem.alternate_employee.department?.name}
                              </span>
                            </div>
                          </div>
                          <div className="hidden sm:block px-2 py-1 rounded bg-blue-500/10 text-blue-500 text-[10px] font-bold uppercase">
                            Coverage
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Reason Section (Keep this below the alternate employee) */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Reason</label>
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/5 text-sm dark:text-gray-400">
                        {editedItem?.reason || "No reason provided"}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Applied Date</label>
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/5 text-sm dark:text-gray-300">
                        {formatDate(editedItem?.created_at)}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Group</label>
                        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/5 text-sm dark:text-gray-300">
                          {editedItem?.employee?.leave_group?.group_name || "--"}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Leave Type</label>
                        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/5 text-sm dark:text-gray-300">
                          {editedItem?.leave_type?.short_name || "--"}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Reason</label>
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/5 text-sm dark:text-gray-400">
                        {editedItem?.reason || "No reason provided"}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Approve/Reject Date</label>
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/5 text-sm dark:text-gray-400">
                        {formatDate(editedItem?.updated_at)}
                      </div>
                    </div>



                    {/* Action Area */}
                    <div className="pt-4 border-t border-gray-100 dark:border-white/5 space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-blue-500 dark:text-blue-400">Manager Notes</label>
                        <textarea
                          value={approveRejectNotes}
                          onChange={(e) => setApproveRejectNotes(e.target.value)}
                          placeholder="Provide a reason for approval or rejection..."
                          className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-gray-200"
                          rows="3"
                        />
                      </div>

                      <div className="flex gap-3">
                        <button
                          disabled={loading}
                          onClick={() => rejectLeaveAction(editedItem.id)}
                          className="flex-1 px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all text-sm font-bold disabled:opacity-50"
                        >
                          Reject Request
                        </button>
                        <button
                          disabled={loading}
                          onClick={() => approveLeaveAction(editedItem.id)}
                          className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all text-sm font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50"
                        >
                          Approve Leave
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-12 lg:col-span-5 space-y-4">
                    {/* Calendar Widget Container */}
                    <div className="p-5 border border-gray-100 dark:border-white/10 rounded-2xl bg-white dark:bg-slate-900/40 shadow-sm transition-all hover:border-indigo-500/30">
                      <LeavesCalendarView />
                    </div>

                    {/* Team Availability Container */}
                    <div className="p-5 border border-gray-100 dark:border-white/10 rounded-2xl bg-white dark:bg-slate-900/40 shadow-sm transition-all hover:border-blue-500/30">
                      <TeamAvailability />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'documents' && (
                <div className="space-y-4">
                  {leaveDocuments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                      <FileText size={40} strokeWidth={1.5} />
                      <p className="mt-3 text-sm font-medium">No documents uploaded</p>
                      <p className="text-xs mt-1">Documents attached to this leave request will appear here.</p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-gray-100 dark:border-white/10 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 font-bold">
                          <tr>
                            <th className="px-4 py-3 text-left">#</th>
                            <th className="px-4 py-3 text-left">Document Title</th>
                            <th className="px-4 py-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-slate-600 dark:text-slate-300">
                          {leaveDocuments.map((doc, index) => (
                            <tr key={doc.id || index} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                              <td className="px-4 py-3 font-medium">{index + 1}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <FileText size={16} className="text-blue-500 shrink-0" />
                                  <span className="font-medium">{doc.key || `Document ${index + 1}`}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <a
                                  href={doc.value}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
                                >
                                  <Eye size={14} /> View
                                </a>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'quota' && (
                <div className="rounded-xl border border-gray-100 dark:border-white/10 overflow-hidden">
                  <table className="w-full text-sm text-center">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 font-bold">
                      <tr>
                        <th className="px-4 py-3 text-left">Type</th>
                        <th className="px-4 py-3">Total</th>
                        <th className="px-4 py-3">Used</th>
                        <th className="px-4 py-3">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-slate-600 dark:text-slate-300">
                      {leaveStats.map((d, index) => (
                        <tr key={index} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3 text-left font-medium"> {d.leave_group}</td>
                          <td className="px-4 py-3">{d.total}</td>
                          <td className="px-4 py-3 text-red-500">{d.used}</td>
                          <td className="px-4 py-3 text-green-500 font-bold">{d.available}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-slate-900/30 flex justify-end">
              <button
                onClick={toggleModal}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-slate-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-all text-sm font-medium"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}