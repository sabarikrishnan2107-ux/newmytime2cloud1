"use client";

import React, { useEffect, useRef, useState } from "react";
import { getLeaveManagers, getLeaveGroups, leaveGroupAndReportManagerUpdate } from "@/lib/api";
import { notify, parseApiError } from "@/lib/utils";
import DropDown from "../ui/DropDown";

const LeaveAndReporting = ({ id, leave_group_id, reporting_manager_id }) => {
    const isInitialMount = useRef(true);
    const [leaveManagers, setLeaveManagers] = useState([]);
    const [leaveGroups, setLeaveGroups] = useState([]);
    
    const [selectedLeaveGroupId, setSelectedLeaveGroupId] = useState(leave_group_id);
    const [selectedReportingManagerId, setSelectedReportingManagerId] = useState(reporting_manager_id);

    // Sync with props when payload updates
    useEffect(() => {
        setSelectedLeaveGroupId(leave_group_id);
    }, [leave_group_id]);
    useEffect(() => {
        setSelectedReportingManagerId(reporting_manager_id);
    }, [reporting_manager_id]);

    // 1. Fetch Dropdown Data once on load
    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const [managers, groups] = await Promise.all([
                    getLeaveManagers(),
                    getLeaveGroups()
                ]);

                setLeaveManagers(managers.map(e => ({ name: e.full_name, id: e.id })));
                setLeaveGroups(groups.map(e => ({ name: e.group_name, id: e.id })));
            } catch (error) {
                console.error("Failed to load dropdowns", error);
            }
        };
        fetchOptions();
    }, []);

    // 2. Handle Auto-Update logic
    useEffect(() => {
        // Guard: Don't run on mount
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        // Guard: Ensure ID exists
        if (!id) return;

        // Guard: Only update if values are actually different from initial props
        const hasChanged = 
            selectedLeaveGroupId !== leave_group_id || 
            selectedReportingManagerId !== reporting_manager_id;

        if (!hasChanged) return;

        const performUpdate = async () => {
            try {
                const finalPayload = {
                    leave_group_id: selectedLeaveGroupId,
                    reporting_manager_id: selectedReportingManagerId,
                };

                await leaveGroupAndReportManagerUpdate(finalPayload, id);
                notify(`Success`, "Reporting settings updated", 'success');
            } catch (error) {
                notify(`Error`, parseApiError(error), 'error');
            }
        };

        performUpdate();
        
    }, [selectedLeaveGroupId, selectedReportingManagerId]); // Listen for selection changes

    return (
        <section className="glass-card bg-card-light dark:bg-card-dark border border-white/50 dark:border-slate-700/50 rounded-2xl p-6 md:p-8 scroll-mt-28">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
                <span className="material-icons text-primary bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-lg">tune</span>
                <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Leave & Reporting</h3>
            </div>
            
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Leave Group */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Leave Group</label>
                        <DropDown
                            items={leaveGroups}
                            value={selectedLeaveGroupId}
                            onChange={(val) => setSelectedLeaveGroupId(val)}
                            placeholder="Select a Leave Group"
                            width="w-full"
                        />
                    </div>

                    {/* Reporting Manager */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Reporting Manager</label>
                        <DropDown
                            items={leaveManagers}
                            value={selectedReportingManagerId}
                            onChange={(val) => setSelectedReportingManagerId(val)}
                            placeholder="Select a Reporting Manager"
                            width="w-full"
                        />
                    </div>
                </div>
            </div>
        </section>
    );
};

export default LeaveAndReporting;