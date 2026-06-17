"use client";

import React from 'react';
import { Search } from 'lucide-react';
import Input from '@/components/Theme/Input';
import ProfilePicture from '@/components/ProfilePicture';

const PersonnelRow = ({ person, isChecked, onToggle, theme = 'slate' }) => {
  return (
    <label className="group flex items-center px-4 py-2 border border-border transition-all cursor-pointer">
      <div className="relative flex items-center justify-center">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={isChecked}
          onChange={() => onToggle(person.id)}
        />
        <div className="w-5 h-5 rounded-full border-2 border-border bg-white flex items-center justify-center transition-all duration-200 peer-checked:bg-blue-600 peer-checked:border-blue-600 peer-checked:shadow-lg">
          <svg className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"></path>
          </svg>
        </div>
      </div>

      <div className="flex items-center gap-4 ml-4 flex-1">
        <ProfilePicture src={person.profile_picture || `https://ui-avatars.com/api/?name=${person.name}&background=random`} />
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-gray-600 dark:text-slate-300 group-hover:text-blue-600 transition-colors">
            {person.name}
          </span>
          <span className="text-[10px] text-slate-400 font-medium">{person.dept}</span>
        </div>
      </div>

      <span className="text-xs text-slate-500 tracking-tight border border-border px-2 py-0.5 rounded">
        {person.id}
      </span>
    </label>
  );
};

const ItemsList = ({
  title,
  icon: Icon,
  items,
  checkedItems,
  onToggle,
  searchTerm,
  onSearchChange,
  theme = 'slate',
  badgeLabel = "Total",
  showSyncPlaceholder = false
}) => {
  const isIndigo = theme === 'indigo';

  return (
    <div className="lg:col-span-5 flex flex-col h-[440px] bg-white/80 dark:bg-slate-900 backdrop-blur-xl rounded-xl shadow-lg border border-border overflow-hidden">
      <div className="px-4 py-3 bg-white/30 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-2 shrink-0">
            <Icon className={`${isIndigo ? 'text-indigo-400/80' : 'text-slate-400/80'} w-5 h-5`} />
            {title}
          </h2>

          {showSyncPlaceholder ? (
            <div className="flex-1">
              <div className="w-full h-[38px] border border-dashed border-border/50 rounded-lg flex items-center justify-center bg-slate-50/30 dark:bg-slate-800/20">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Ready for Sync</span>
              </div>
            </div>
          ) : (
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search ID or Name..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="bg-white/50 dark:bg-slate-800/50"
              />
            </div>
          )}

          <span className={`text-[10px] font-bold px-2.5 py-1 border rounded-full uppercase tracking-wider shrink-0 ${isIndigo
              ? 'text-indigo-500 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/50 dark:bg-indigo-950/30'
              : 'text-slate-600 dark:text-slate-300 border-border bg-slate-50/50 dark:bg-slate-800/30'
            }`}>
            {items.length} {badgeLabel}
          </span>
        </div>
      </div>

      <div className="overflow-y-auto flex-1 border-t border-border/50">
        {items.map((emp) => (
          <PersonnelRow
            key={emp.id}
            person={emp}
            isChecked={checkedItems.includes(emp.id)}
            onToggle={onToggle}
            theme={theme}
          />
        ))}
      </div>
    </div>
  );
};

export default ItemsList;