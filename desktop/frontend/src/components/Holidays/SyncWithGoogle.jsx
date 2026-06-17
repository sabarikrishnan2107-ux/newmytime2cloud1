// @ts-nocheck
"use client";

import { useEffect, useState } from "react";

import { getBranches } from "@/lib/api";
import { getGoogleHolidays, storeHolidays } from "@/lib/endpoint/holidays";
import { SuccessDialog } from "@/components/SuccessDialog";
import { notify, parseApiError } from "@/lib/utils";
import Input from "../Theme/Input";
import TextArea from "../Theme/TextArea";
import DropDown from "../ui/DropDown";
import MultiDropDown from "../ui/MultiDropDown";
import DateRangeSelect from "../ui/DateRange";
import { Checkbox } from "../ui/checkbox";
import { useDebounce } from "@/hooks/useDebounce";
import { id } from "date-fns/locale";
import ShiftPreview from "../Shift/ShiftPreview";
import { CalendarCheck, Plus, RefreshCcw } from "lucide-react";
import ProfilePicture from "../ProfilePicture";
import { getUser } from "@/config";
import SyncModal from "./SyncModal";

const SyncWithGoogle = ({ onSuccess = () => {} }) => {
  const [open, setOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [selectedBranchId, setSelectedBranchId] = useState(null);
  const [name, setName] = useState("");
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);

  const [branches, setBranches] = useState([]);

  const fetchDropdowns = async () => {
    try {
      setBranches(await getBranches());
    } catch (error) {
      notify("Error", parseApiError(error), "error");
    }
  };

  const toggleModal = () => setOpen(!open);

  useEffect(() => {
    if (open) {
      fetchDropdowns();
      setSelectedBranchId(null);
      setFrom(null);
      setTo(null);
      setName("");
    }
  }, [open]);

  const [syncResults, setSyncResults] = useState([]);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [totalOperations, setTotalOperations] = useState(0);

  const onSubmit = async () => {
    if (!selectedBranchId) {
      notify("Error", "Branch range must be selected", "error");
      return;
    }

    setLoading(true);
    setSyncResults([]);
    setShowStatusModal(true);

    try {
      const { company_id } = await getUser();
      const selectedYear = new Date().getFullYear();
      const holidays = await getGoogleHolidays(selectedYear);

      setTotalOperations(holidays.length);

      for (const holiday of holidays) {
        const payload = {
          ...holiday,
          company_id: company_id,
          branch_id: selectedBranchId,
        };

        try {
          const apiResult = await storeHolidays(payload);

          // Update results list one-by-one
          setSyncResults((prev) => [
            ...prev,
            {
              name: holiday.name,
              start_date: holiday.start_date,
              end_date: holiday.end_date,
              total_days: holiday.total_days,
              status: 200,
            },
          ]);
        } catch (err) {
          console.error(err);
          // Push a failure result to the modal so the user sees which one failed
          setSyncResults((prev) => [
            ...prev,
            {
              name: holiday.name,
              start_date: holiday.start_date,
              end_date: holiday.end_date,
              total_days: holiday.total_days,
              status: 500, // Error status
            },
          ]);
        }
      }
    } catch (globalErr) {
      notify("Error", "Failed to initialize sync", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SyncModal
        isOpen={showStatusModal}
        results={syncResults}
        total={totalOperations}
        currentCount={syncResults.length}
        isLoading={loading}
        onClose={() => setShowStatusModal(false)}
      />

      <button
        onClick={() => setOpen(true)}
        className="bg-primary hover:bg-blue-600 text-white text-sm font-semibold py-2 px-3 rounded-lg flex items-center gap-1 transition-all shadow-lg shadow-primary/20"
      >
        <CalendarCheck size={15} />
        Sycn With Google
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
          <div className="relative min-w-[700px]  overflow-y-auto max-h-[calc(100vh-130px)]  bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10  overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-200 dark:border-white/10 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-600 dark:text-gray-300">
                  Add Holidays
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Create holidays for the employees
                </p>
              </div>
              <button
                onClick={toggleModal}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors rounded-full p-1"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 lg:p-8 custom-scrollbar bg-surface-variant/30 dark:bg-black/20">
              <div className="flex flex-col gap-6 pb-24">
                <section className="bg-surface-light dark:bg-surface-dark rounded-3xl p-6 shadow-elevation-1 border border-gray-200 dark:border-white/5">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-gray-600 dark:text-white flex items-center gap-3">
                      Select Branch & Dates
                    </h2>
                  </div>

                  <div className="flex flex-col gap-6">
                    {/* Filters */}
                    <div className="grid grid-cols-1 gap-4">
                      <DropDown
                        placeholder={"Select Branch"}
                        items={branches}
                        value={selectedBranchId}
                        onChange={setSelectedBranchId}
                      />
                    </div>
                  </div>
                </section>
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
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SyncWithGoogle;
