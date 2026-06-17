// @ts-nocheck
"use client";

import { useEffect, useState } from "react";

import { getBranches } from "@/lib/api";
import { updateHolidays } from "@/lib/endpoint/holidays";

import { SuccessDialog } from "@/components/SuccessDialog";
import { notify, parseApiError, caps, numberRound } from "@/lib/utils";
import Input from "../Theme/Input";
import TextArea from "../Theme/TextArea";
import DropDown from "../ui/DropDown";
import MultiDropDown from "../ui/MultiDropDown";
import DateRangeSelect from "../ui/DateRange";
import { Checkbox } from "../ui/checkbox";
import { useDebounce } from "@/hooks/useDebounce";
import { id } from "date-fns/locale";
import ShiftPreview from "../Shift/ShiftPreview";
import {
  RefreshCcw,
  CalendarDays,
  CheckCircle2,
  FileText,
  Hash,
  MapPin,
  ReceiptText,
  X,
  User,
  Printer,
  Circle,
} from "lucide-react";
import ProfilePicture from "../ProfilePicture";
import { getUser } from "@/config";
import { getCompany, getPayslip } from "@/lib/endpoint/payroll";

let defaultPayload = {
  name: "",
  total_days: 0,
  start_date: null, // Assuming 'from' is already in YYYY-MM-DD format
  end_date: null, // Assuming 'to' is already in YYYY-MM-DD format
  year: null,
  branch_id: 0,
  company_id: 0,
};

const ViewPayslip = ({ open, setOpen, paySlipInput, onSuccess = () => {} }) => {
  const [data, setData] = useState({
    month: "January 2026",
    employee: {
      name: "Sabari R",
      id: "2460",
      ref: "#2460126",
    },
    company: {
      name: "Demo Company LLC",
      location: "Al Karama, Dubai, UAE",
    },
    attendance: {
      total: 31,
      present: 0,
      absent: 31,
      late: null,
    },
    earnings: [
      { label: "Basic Salary", value: 5000.0 },
      { label: "Add Item", value: 100.0 },
      { label: "Overtime (OT)", value: 0.0 },
    ],
    deductions: [{ label: "Absence Deduction", value: 5167.0 }],
    netPayable: 33,
    netPayableWords: "Thirty-three only",
  });
  const [employee, setEmployee] = useState({});
  const [company, setCompanyPayload] = useState({
    name: "",
    logo: "",
    location: "",
    p_o_box_no: "",
  });

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
    if (!paySlipInput) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [employee_id, month, year] = paySlipInput.split("_");

        // Replace with your actual auth logic for company_id
        const company_id = 2;

        // 1. Fetch Payslip Data
        let data = await getPayslip(employee_id, {
          company_id,
          employee_id,
          month,
          year,
        });

        setData(data);
        setEmployee(data.employee);

        let companyData = await getCompany(company_id);

        setCompanyPayload(companyData.record);
      } catch (error) {
        console.error("Error fetching payslip data:", error);
      } finally {
        setLoading(false);
      }
    };

    // fetchData();
  }, [paySlipInput]);

  const totalEarnings = data.earnings.reduce(
    (acc, item) => acc + item.value,
    0,
  );
  const totalDeductions = data.deductions.reduce(
    (acc, item) => acc + item.value,
    0,
  );

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 top-[72px] z-[100] flex items-center justify-center p-4">
      {/* Dynamic Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity animate-in fade-in duration-300"
        onClick={() => setOpen(false)}
      />

      {/* Modal Container */}
      <div className="relative bg-white dark:bg-slate-700 rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] border border-slate-200 dark:border-white/10 w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
        {/* Fixed Header Section */}
        <div className="px-8 py-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-20">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <FileText size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Salary Statement
              </h3>
              <p className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-[0.2em]">
                {data.month || "Processing..."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                /* Add Refresh Logic */
              }}
              className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400"
            >
              <RefreshCcw size={20} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={() => setOpen(false)}
              className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 bg-slate-50/50 dark:bg-[#0b0e14]/50">
          {/* Company & Employee Row */}
          <div className="grid grid-cols-1 gap-6">
            <div className="bg-white dark:bg-[#161b22] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-2">
                  Employee Details
                </p>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                  {data.employee.name}
                </h2>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-xs border dark:border-slate-700">
                    ID: {data.employee.id}
                  </span>
                  <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-xs border dark:border-slate-700">
                    REF: {data.employee.ref}
                  </span>
                </div>
              </div>
              <User className="absolute right-[-10px] bottom-[-10px] w-28 h-28 text-slate-900/5 dark:text-white/5 pointer-events-none" />
            </div>
          </div>

          {/* Attendance Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: "Total Days",
                value: data.attendance.total,
                color: "text-slate-900 dark:text-white",
              },
              {
                label: "Present",
                value: data.attendance.present,
                color: "text-emerald-500",
                border: "border-b-emerald-500/50",
              },
              {
                label: "Absent",
                value: data.attendance.absent,
                color: "text-red-500",
                border: "border-b-red-500/50",
              },
              {
                label: "Late",
                value: data.attendance.late || "—",
                color: "text-slate-400",
              },
            ].map((stat, i) => (
              <div
                key={i}
                className={`bg-white dark:bg-[#161b22] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 text-center border-b-2 shadow-sm ${stat.border || "border-b-transparent"}`}
              >
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">
                  {stat.label}
                </p>
                <p className={`text-2xl font-bold ${stat.color}`}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Finance Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Earnings Column */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Circle
                  className="fill-emerald-500 text-emerald-500"
                  size={8}
                />
                <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                  Earnings
                </h3>
              </div>
              <div className="bg-white dark:bg-[#161b22] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="p-5 space-y-4">
                  {data.earnings.map((item, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400 text-sm">
                        {item.label}
                      </span>
                      <span className="font-mono font-semibold text-slate-900 dark:text-white">
                        {item.value.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="bg-emerald-500/5 p-5 flex justify-between items-center border-t border-emerald-500/10">
                  <span className="font-bold text-emerald-600 dark:text-emerald-500 text-xs uppercase">
                    Total Earnings
                  </span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-500 text-xl">
                    {totalEarnings.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Deductions Column */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Circle className="fill-red-500 text-red-500" size={8} />
                <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                  Deductions
                </h3>
              </div>
              <div className="bg-white dark:bg-[#161b22] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="p-5 space-y-4">
                  {data.deductions.map((item, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400 text-sm">
                        {item.label}
                      </span>
                      <span className="font-mono font-semibold text-slate-900 dark:text-white">
                        {item.value.toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div className="h-4 hidden lg:block" />{" "}
                  {/* Alignment spacer */}
                </div>
                <div className="bg-red-500/5 p-5 flex justify-between items-center border-t border-red-500/10">
                  <span className="font-bold text-red-600 dark:text-red-500 text-xs uppercase">
                    Total Deductions
                  </span>
                  <span className="font-mono font-bold text-red-600 dark:text-red-500 text-xl">
                    -{totalDeductions.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Box */}
          <div className="relative p-8 rounded-[2rem] border border-indigo-500/30 bg-gradient-to-br from-indigo-500/5 to-purple-600/5 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden">
            <div className="relative z-10 text-center md:text-left">
              <p className="text-xs font-bold text-indigo-500 uppercase tracking-[0.2em] mb-2">
                Net Payable Amount
              </p>
              <p className="italic text-slate-600 dark:text-slate-300 text-sm">
                "{data.netPayableWords}"
              </p>
            </div>
            <div className="relative z-10 flex items-baseline gap-3">
              <span className="text-slate-600 dark:text-slate-300 font-medium">
                AED
              </span>
              <span className="text-5xl md:text-6xl font-bold text-slate-900 dark:text-white tracking-tighter drop-shadow-sm">
                {data.netPayable}
              </span>
            </div>
          </div>

          <p className="text-center text-[10px] font-medium text-slate-400 dark:text-slate-600 uppercase tracking-widest pb-4">
            Authorized Electronic Document • Strictly Confidential
          </p>
        </div>

        {/* Fixed Action Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900 flex justify-end gap-3 z-20">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 shadow-sm"
          >
            <Printer size={16} /> Print PDF
          </button>
          <button
            onClick={() => setOpen(false)}
            className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
          >
            Close Statement
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewPayslip;
