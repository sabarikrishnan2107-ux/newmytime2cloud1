// @ts-nocheck
"use client";

import { useState } from "react";

import { SuccessDialog } from "@/components/SuccessDialog";
import { parseApiError } from "@/lib/utils";
import { updatePassword } from "@/lib/api";

const CompanyPassword = () => {

  // Simple local form state
  const [formData, setFormData] = useState({
    current_password: "",
    password: "",
    password_confirmation: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [open, setOpen] = useState(false);
  const [globalError, setGlobalError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setGlobalError(null);
    setIsSubmitting(true);

    try {

      await updatePassword(formData);
      setOpen(true);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setOpen(false);
    } catch (error) {
      setGlobalError(parseApiError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-1xl">
      <form onSubmit={onSubmit} className="space-y-6">
        <section className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-6 md:p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <span className="material-symbols-outlined">lock</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Password</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">Update company user password</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-600 dark:text-slate-300">
                Current Password
              </label>
              <input
                type="password"
                name="current_password"
                value={formData.current_password || ""}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border bg-white/70 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-600 dark:text-slate-300">
                New Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password || ""}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border bg-white/70 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-600 dark:text-slate-300">
                Confirm New Password
              </label>
              <input
                type="password"
                name="password_confirmation"
                value={formData.password_confirmation || ""}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border bg-white/70 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {globalError && (
            <div className="w-full mt-4">
              <div className="p-3 rounded-lg border border-red-400/30 bg-red-500/10 text-red-600 dark:text-red-300 text-sm" role="alert">
                {globalError}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-6">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Updating..." : "Update Password"}
            </button>
          </div>
        </section>

        <SuccessDialog
          open={open}
          onOpenChange={setOpen}
          title="Password Change"
          description="Password Change successfully."
        />
      </form>
    </div>
  );
};

export default CompanyPassword;
