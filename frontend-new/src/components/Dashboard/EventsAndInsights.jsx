import AutomationAll from "@/components/Automation/All/page";
import HolidaysAll from "@/components/Holidays/page";
import AnnouncementsAll from "@/components/Announcements/page";

import React, { useState, useMemo } from "react";
import {
  Sparkles,
  Workflow,
  CalendarDays,
  Megaphone,
  FileWarning,
  Bot,
  Cake,
  Inbox,
} from "lucide-react";
import DocumentExpiryAll from "../Employees/DocumentExpiry/All/page";
import AIFeedAll from "../AIFeeds/All/page";
import WeeklyBirthdays from "./WeeklyBirthdays";

const MOCK_DATA = {
  Automation: [
    { id: 1, event: "Unauthorized Access", location: "Server Room B", source: "Security AI", time: "10:41 AM", type: "error" },
    { id: 2, event: "Protocol Compliance", location: "Shift Change A", source: "Ops Monitor", time: "10:30 AM", type: "success" },
    { id: 3, event: "Capacity Warning", location: "Cafeteria Zone", source: "Crowd Sense", time: "10:15 AM", type: "warning" },
  ],
  Announcements: [
    { id: 4, event: "Town Hall Meeting", location: "Main Hall", source: "HR Dept", time: "09:00 AM", type: "info" },
  ],
  Holidays: [],
  Spotlight: [],
};

const TYPE_COLORS = {
  error: "bg-rose-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  info: "bg-blue-500",
};

const TABS = [
  { id: "Automation",      label: "Automation",      icon: Workflow },
  { id: "Holidays",        label: "Holidays",        icon: CalendarDays },
  { id: "Announcements",   label: "Announcements",   icon: Megaphone },
  { id: "Document Expiry", label: "Document Expiry", icon: FileWarning },
  { id: "AI Feeds",        label: "AI Feeds",        icon: Bot },
  { id: "Wishes",          label: "Wishes",          icon: Cake },
];

function EventsAndInsights({ branch_ids }) {
  const [activeTab, setActiveTab] = useState("Automation");
  const currentData = useMemo(() => MOCK_DATA[activeTab] || [], [activeTab]);

  return (
    <div className="flex flex-col h-full">
      {/* Header Section */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/15 text-purple-500 dark:text-purple-400">
              <Sparkles className="h-4 w-4" strokeWidth={2.2} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-100 leading-tight">
                Insights & Events
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">Live activity stream</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-gray-100 dark:bg-slate-800/60 p-1 rounded-lg overflow-x-auto no-scrollbar">
          {TABS.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 text-[11px] font-semibold rounded-md transition-all duration-200 outline-none whitespace-nowrap ${
                  isActive
                    ? "bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-slate-700/50"
                }`}
              >
                <TabIcon className="h-3.5 w-3.5" strokeWidth={2.2} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Section */}
      <div className="flex-1 relative flex flex-col min-h-0 overflow-hidden">
        {activeTab === "Automation" ? (
          <AutomationAll />
        ) : activeTab === "Holidays" ? (
          <HolidaysAll />
        ) : activeTab === "Announcements" ? (
          <AnnouncementsAll />
        ) : activeTab === "Document Expiry" ? (
          <DocumentExpiryAll />
        ) : activeTab === "AI Feeds" ? (
          <AIFeedAll />
        ) : activeTab === "Wishes" ? (
          <WeeklyBirthdays />
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
            <div className="grid grid-cols-12 px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <div className="col-span-6">Event</div>
              <div className="col-span-3">Source</div>
              <div className="col-span-3 text-right">Time</div>
            </div>

            {currentData.length > 0 ? (
              currentData.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-12 items-center px-3 py-2.5 border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors rounded-lg group cursor-pointer"
                >
                  <div className="col-span-6 flex items-center gap-3">
                    <div className={`h-2 w-2 shrink-0 rounded-full ${TYPE_COLORS[item.type] || "bg-slate-400"}`} />
                    <div className="truncate">
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-200 truncate">{item.event}</p>
                      <p className="text-[9px] text-slate-500 truncate">{item.location}</p>
                    </div>
                  </div>
                  <div className="col-span-3 text-[10px] text-gray-600 dark:text-gray-300 truncate">{item.source}</div>
                  <div className="col-span-3 text-right">
                    <span className="text-[10px] text-gray-600 dark:text-gray-300">{item.time}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-slate-500">
                <Inbox className="h-10 w-10 mb-2 opacity-50" />
                <p className="text-[10px] font-bold uppercase tracking-widest">No Events Found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default EventsAndInsights;
