// @ts-nocheck
"use client";

import { useEffect, useState } from "react";

import { createDesignations } from "@/lib/api";
import { SuccessDialog } from "@/components/SuccessDialog";
import { notify, parseApiError } from "@/lib/utils";
import Input from "../Theme/Input";
import TextArea from "../Theme/TextArea";

let defaultPayload = {
  name: "",
  description: "",
};

const Create = ({ onSuccess = () => { } }) => {

  const [open, setOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState(defaultPayload);
  const toggleModal = () => setOpen(!open);

  useEffect(() => {
    if (open) {
      setForm(defaultPayload);
    }
  }, [open]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const onSubmit = async () => {
    setLoading(true);
    try {
      let { data } = await createDesignations(form);

      // FIX: Check if status is explicitly false
      if (data?.status === false) {
        const firstKey = Object.keys(data.errors)[0];
        notify("Error", data.errors[firstKey][0], "error");
        return; // Stop execution if there's a validation error
      }

      // Success Path
      onSuccess();
      setSuccessOpen(true);
      setOpen(false);
      notify("Success", "Designation Saved", "success")
    } catch (error) {
      notify("Error", parseApiError(error), "error");

    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="bg-primary hover:bg-blue-600 text-white text-sm font-semibold py-2 px-3 rounded-lg flex items-center gap-1 transition-all shadow-lg shadow-primary/20"
      >
        <span className="material-symbols-outlined text-[18px]">add</span>
        Add Designation
      </button>

      {/* Modal Portal Logic */}
      {open && (
        <div
          aria-modal="true"
          role="dialog"
          className="fixed inset-x-0 bottom-0 top-[72px] z-50 flex items-center justify-center px-4"
        >
          {/* Backdrop/Overlay */}
          <div
            className="absolute inset-0 bg-black/70 frosted-glass transition-opacity animate-in fade-in duration-300"
            onClick={toggleModal}
          ></div>

          {/* Modal Card */}
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 w-full max-w-lg overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">

            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-200 dark:border-white/10 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-600 dark:text-gray-300">Add Designation</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Create a new job role in the system
                </p>
              </div>
              <button
                onClick={toggleModal}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors rounded-full p-1"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-5 bg-white/50 dark:bg-gray-900">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-400">
                  Designation Title <span className="text-red-400">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. Senior Backend Engineer"
                  type="text"
                  value={form.title}
                  onChange={(e) => handleChange("name", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-400">
                  Description
                </label>

                <TextArea
                  placeholder="Brief description of the designation..."
                  rows={3}
                  value={form.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10  flex justify-end gap-3">
              <button
                type="button"
                onClick={toggleModal}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-slate-600 dark:text-gray-300 hover:text-white hover:bg-background-dark transition-all text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSubmit}
                className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-blue-600 transition-all text-sm font-bold shadow-lg shadow-primary/20"
              >
                {loading ? "Saving..." : "Save Designation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Create;
