// @ts-nocheck
"use client";

import { useEffect, useState } from "react";

import { getBranches } from "@/lib/api";
import { updateHolidays } from "@/lib/endpoint/holidays";

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
import { RefreshCcw } from "lucide-react";
import ProfilePicture from "../ProfilePicture";
import { getUser } from "@/config";

let defaultPayload = {
  name: "",
  total_days: 0,
  start_date: null, // Assuming 'from' is already in YYYY-MM-DD format
  end_date: null, // Assuming 'to' is already in YYYY-MM-DD format
  year: null,
  branch_id: 0,
  company_id: 0,
};

const HolidaysEdit = ({ open, setOpen, editedItem, onSuccess = () => {} }) => {
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
    if (open && editedItem) {
      fetchDropdowns();
      setSelectedBranchId(editedItem?.branch_id);
      setName(editedItem.name);

      // Ensure these are passed as Date objects or ISO strings the child can parse
      setFrom(editedItem.start_date);
      setTo(editedItem.end_date);
    }
  }, [open, editedItem]);

  const onSubmit = async () => {
    if (!selectedBranchId) {
      notify("Error", "Branch range must be selected", "error");
      return;
    }

    if (!from || !to) {
      notify("Error", "Date range must be selected", "error");
      return;
    }

    setLoading(true);

    const { company_id } = await getUser();

    // --- Dynamic Calculation Logic ---
    const startDate = new Date(from);
    const endDate = new Date(to);

    // Calculate difference in milliseconds, then convert to days
    // We add +1 to include both the start and end date in the count
    const diffTime = Math.abs(endDate - startDate);
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Extract the year from the start date
    const selectedYear = startDate.getFullYear();
    // ---------------------------------

    let payload = {
      name: name,
      total_days: totalDays,
      start_date: from, // Assuming 'from' is already in YYYY-MM-DD format
      end_date: to, // Assuming 'to' is already in YYYY-MM-DD format
      year: selectedYear,
      branch_id: selectedBranchId,
      company_id: company_id,
    };

    try {
      const dayResult = await updateHolidays(editedItem.id, payload);
      console.log(dayResult);
      notify("Success", "Holidays stored successfully", "success");
      onSuccess?.();
      setOpen(false);
    } catch (error) {
      console.log(error);
      await notify("Error", parseApiError(error), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
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

                    <div className="grid grid-cols-1 gap-4">
                      <Input
                        placeholder="Enter Holiday Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <DateRangeSelect
                        value={{ from, to }} // Pass the current state down
                        onChange={({ from, to }) => {
                          // Logic to handle the return from child
                          // If your API needs "YYYY-MM-DD", format it here or in onSubmit
                          setFrom(from);
                          setTo(to);
                        }}
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

export default HolidaysEdit;
