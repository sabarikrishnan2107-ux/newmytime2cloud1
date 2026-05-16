import React, { useState } from 'react';
import { X, ChevronDown, Calendar, FileText, Check, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DropDown from '@/components/ui/DropDown';
import Input from '@/components/Theme/Input';
import { uploadEmployeeDocument } from '@/lib/api';
import DatePicker from '@/components/ui/DatePicker';
import { notify } from '@/lib/utils';

const DocumentModal = ({ onSuccess = () => { }, employee_id }) => {

  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    type: "",
    title: "",
    issue_date: "",
    expiry_date: "",
    attachment: "",
  });

  const toggleModal = () => setIsOpen(!isOpen);

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setForm({ ...form, file: e.target.files?.[0] ?? null })
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.file) return;

    setSubmitting(true);
    try {
      await uploadEmployeeDocument(0, form);
      await notify("Success!", `Document uploaded.`, "success");
      toggleModal();
      onSuccess(employee_id);
    } catch ({ response }) {
      await notify("Error!", response?.data?.message, "error");
      // Optionally show a toast here
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex justify-center">
      {/* Trigger Button - Styled like the Education Modal trigger */}
      <Button
        onClick={toggleModal}
      >
        <FileText size={20} />
        Add New Document
      </Button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-x-0 bottom-0 top-[72px] z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">

          {/* Modal Container - Reference style from Education Modal */}
          <div className="relative w-full max-w-[640px] max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 shrink-0">
              <h3 className="text-slate-900 dark:text-white text-xl font-bold tracking-tight">
                Add New Document
              </h3>
              <button
                onClick={toggleModal}
                className="flex items-center justify-center w-8 h-8 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-950/20">
              <form id="document-form" className="flex flex-col gap-6">

                {/* Document Type Selection */}
                <div className="flex flex-col gap-2">
                  <label className="text-slate-900 dark:text-slate-200 text-sm font-semibold">Document Type</label>
                  <div className="relative">

                    <DropDown
                      width="w-full"
                      items={[
                        { id: "pdf", name: "pdf" },
                        { id: "image", name: "image" },
                      ]}
                      value={form.type}
                      onChange={(type) => setForm({ ...form, type })}
                    />
                  </div>
                </div>

                {/* Document Name */}
                <div className="flex flex-col gap-2">
                  <label className="text-slate-900 dark:text-slate-200 text-sm font-semibold">Document Title</label>
                  <Input
                    type="text"
                    placeholder="e.g. Passport"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>

                {/* Date Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-slate-900 dark:text-slate-200 text-sm font-semibold">Issue Date</label>
                    <div className="relative">
                      <DatePicker
                        placeholder="Pick a Issue Date"
                        value={form.issue_date}
                        onChange={(e) => setForm({ ...form, issue_date: e })}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-slate-900 dark:text-slate-200 text-sm font-semibold">Expiry Date</label>
                    <div className="relative">
                      <DatePicker
                        placeholder="Pick a Expiry Date"
                        value={form.expiry_date}
                        onChange={(e) => setForm({ ...form, expiry_date: e })}
                      />
                    </div>
                  </div>
                </div>

                {/* File Upload Area - Matching the Education Modal style */}
                <div className="mt-2">
                  <label className="text-slate-900 dark:text-slate-200 text-sm font-semibold mb-2 block">
                    File Attachment
                  </label>
                  <div className="group relative flex flex-col md:flex-row items-center gap-4 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-500 bg-white dark:bg-slate-900 px-6 py-4 transition-all">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                      <UploadCloud size={20} />
                    </div>
                    <div className="flex flex-1 flex-col items-center md:items-start text-center md:text-left">
                      <p className="text-slate-900 dark:text-white text-sm font-medium leading-tight">
                        {file === "No file chosen" ? "Click to upload or drag and drop" : file}
                      </p>
                      <p className="text-slate-500 text-xs mt-1">PDF, JPG or PNG (max. 5MB)</p>
                    </div>
                    <label className="shrink-0 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                      Browse
                      <input type="file" className="hidden" onChange={handleFileChange} />
                    </label>
                  </div>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 shrink-0">
              <button
                onClick={toggleModal}
                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onSubmit}
                type="submit"
                form="document-form"
                className="px-5 py-2.5 rounded-lg bg-primary text-white font-bold text-sm shadow-md hover:bg-blue-700 transition-all flex items-center gap-2"
              >
                {submitting ? "Uploading..." : "Upload Document"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentModal;