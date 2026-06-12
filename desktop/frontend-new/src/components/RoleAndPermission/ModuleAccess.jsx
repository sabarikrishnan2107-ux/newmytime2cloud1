import React, { useState } from "react";
import { modules, active_module, sub_modules } from "@/lib/permissions";

/**
 * ModuleCard: Individual toggleable card
 */
const ModuleCard = ({ card, isActive, onToggle }) => {
  return (
    <div
      className={`p-5 rounded-xl border transition-all duration-300 flex flex-col gap-4 relative overflow-hidden group 
        ${
          isActive
            ? "bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-500/30 shadow-lg"
            : "bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800"
        }`}
    >
      <div className="flex justify-between items-start z-10">
        {/* Icon Wrapper */}
        <div
          className={`p-2 rounded-lg shadow-sm transition-colors 
          ${
            isActive
              ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400"
              : "bg-white dark:bg-slate-800 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
          }`}
        >
          <span className="material-icons-outlined">{card.icon}</span>
        </div>

        {/* Switch Toggle */}
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={isActive}
            onChange={() => onToggle(card.id)}
          />
          <div
            className={`w-9 h-5 peer-focus:outline-none rounded-full peer transition-colors
            peer-checked:after:translate-x-full peer-checked:after:border-white
            after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white
            after:border-gray-300 dark:after:border-slate-600 after:border after:rounded-full after:h-4 after:w-4 after:transition-all
            ${isActive ? "bg-green-500" : "bg-slate-200 dark:bg-slate-700"}`}
          ></div>
        </label>
      </div>

      <div className="z-10">
        <h3
          className={`font-bold transition-colors ${
            isActive
              ? "text-slate-800 dark:text-white"
              : "text-slate-600 dark:text-slate-400"
          }`}
        >
          {card.title}
        </h3>
        <p
          className={`text-xs mt-1 transition-colors ${
            isActive
              ? "text-slate-500 dark:text-slate-300"
              : "text-slate-400 dark:text-slate-500"
          }`}
        >
          {card.desc}
        </p>
      </div>

      {/* Background Icon Decoration */}
      <div
        className={`absolute -bottom-4 -right-4 opacity-10 dark:opacity-[0.05] z-0 transition-colors 
        ${isActive ? "text-indigo-500" : "text-slate-400"}`}
      >
        <span className="material-icons-outlined text-[80px]">{card.icon}</span>
      </div>
    </div>
  );
};

/**
 * ModuleAccess: The main container component
 */
const ModuleAccess = ({ modules, activeOptions, handleToggle }) => {

  const activeCount = Object.values(activeOptions).filter(Boolean).length;

  return (
    <section className="glass-panel rounded-xl p-8 shadow-soft">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-100 dark:border-indigo-800">
            2
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-600 dark:text-slate-300">
              Module Access
            </h2>
            <p className="text-xs text-slate-500">
              Enable high-level access to application modules.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">Access Granted:</span>
          <span className="font-bold text-primary px-2 py-0.5 rounded border border-border">
            {activeCount} / {modules.length} Modules
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 p-4">
        {modules.map((card) => (
          <ModuleCard
            key={card.id}
            card={card}
            isActive={!!activeOptions[card.id]}
            onToggle={handleToggle}
          />
        ))}
      </div>
    </section>
  );
};

export default ModuleAccess;
