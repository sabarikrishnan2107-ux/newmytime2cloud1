import React from "react";
import Input from '@/components/Theme/Input';

const BasicDetails = ({ formData, updateField }) => {
  return (
    <section className="glass-panel rounded-xl p-8 shadow-soft border-t-4 border-t-indigo-500/20">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-100 dark:border-indigo-800">
          1
        </div>
        <h2 className="text-lg font-bold text-gray-600 dark:text-slate-300">
          Basic Details
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-600 dark:text-slate-300 mb-1">
              Role Name <span className="text-rose-500">*</span>
            </label>

            <Input
              value={formData.name}
              placeholder="e.g. Shift Manager"
              icon="badge"
              onChange={(e) => updateField("name", e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-600 dark:text-slate-300 mb-1">
            Description <span className="text-rose-500">*</span>
          </label>

          <Input
            value={formData.description}
            placeholder="Describe the responsibilities and access level for this role..."
            onChange={(e) => updateField("description", e.target.value)}
          />
        </div>
      </div>
    </section>
  );
};

export default BasicDetails;
