"use client";

import React, { useState } from "react";
import LeaveTypesPage from "@/app/leave-dashboard/leave-types/page";
import LeaveGroupsPage from "@/app/leave-dashboard/leave-groups/page";
import ApprovalLevels from "@/components/Leave/ApprovalLevels";

const TABS = [
  { id: "types",  label: "LEAVE TYPES" },
  { id: "groups", label: "GROUPS" },
  { id: "levels", label: "APPROVAL LEVELS" },
];

export default function LeaveSettingsPage() {
  const [activeTab, setActiveTab] = useState("types");

  const renderContent = () => {
    switch (activeTab) {
      case "types":  return <LeaveTypesPage />;
      case "groups": return <LeaveGroupsPage />;
      case "levels": return <ApprovalLevels />;
      default:       return null;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-80px)]">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-600 dark:text-white flex items-center gap-2">
          Leave
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Configure leave types, group policies, and approval workflow</p>
      </div>

      <div className="border-b border-white/10">
        <div className="flex gap-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`pb-3 text-sm font-semibold transition-all border-b-2 ${
                activeTab === t.id
                  ? "text-primary border-primary"
                  : "text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {renderContent()}
    </div>
  );
}
