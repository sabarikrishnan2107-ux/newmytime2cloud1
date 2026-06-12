"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useForm } from "react-hook-form"; // Used for standard form handling
import { useRouter } from 'next/navigation';
import { getBranches, getDepartments } from '@/lib/api';
import Dropdown from '../Theme/DropDown';
import PayslipChart from './PayslipChart';

const StatCard = ({ title, value, trend, subtitle, type, icon }) => (
  <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-border shadow-sm relative overflow-hidden group">
    <div className="absolute right-[-10px] top-[-10px] opacity-[0.05] group-hover:scale-110 transition-transform">
      <span className="material-symbols-outlined text-[100px]">{icon}</span>
    </div>
    <p className="text-gray-600 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider">{title}</p>
    <h3 className={`text-2xl font-bold mt-2 ${type === 'danger' ? 'text-rose-500' : 'text-gray-900 dark:text-white'}`}>
      {value}
    </h3>
    {trend && (
      <div className={`mt-3 flex items-center text-xs px-2 py-1 rounded-full w-fit ${type === 'danger' ? 'text-rose-600 bg-rose-50 dark:bg-rose-900/20' : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'}`}>
        <span className="material-symbols-outlined text-[14px] mr-1">{type === 'danger' ? 'pie_chart' : 'trending_up'}</span>
        <span className="font-medium">{trend}</span>
      </div>
    )}
    {subtitle && <p className="mt-3 text-xs text-slate-400 flex items-center"><span className="material-symbols-outlined text-[14px] mr-1">info</span>{subtitle}</p>}
  </div>
);

const BreakdownTable = ({ title, data, total, color, icon }) => (
  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border shadow-sm overflow-hidden">
    <div className="px-6 py-4 border-b border-border bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <div className={`w-1.5 h-1.5 rounded-full bg-${color}-500`}></div>
        <h4 className="text-sm font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wide">{title}</h4>
      </div>
      <span className={`material-symbols-outlined text-${color}-500`}>{icon}</span>
    </div>
    <table className="w-full text-sm text-left">
      <tbody className="divide-y divide-border">
        {data.map((item, idx) => (
          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
            <td className="px-6 py-3.5 text-gray-600 dark:text-slate-300">{item.label}</td>
            <td className="px-6 py-3.5 text-right font-medium text-gray-900 dark:text-white">{item.value}</td>
          </tr>
        ))}
      </tbody>
      <tfoot className="bg-slate-50 dark:bg-slate-800/80">
        <tr>
          <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">Total {title}</td>
          <td className={`px-6 py-4 text-right font-bold text-lg text-${color}-600 dark:text-${color}-400`}>{total}</td>
        </tr>
      </tfoot>
    </table>
  </div>
);

const ShortViewMainSection = ({ payload }) => {

  const earnings = [
    { label: "Basic Salary", value: "$3,500.00" },
    { label: "Housing Allowance", value: "$1,200.00" },
    { label: "Transport Allowance", value: "$300.00" },
    { label: "Overtime (4hrs)", value: "$100.00" },
  ];

  const deductions = [
    { label: "Income Tax", value: "$450.00" },
    { label: "Provident Fund", value: "$350.00" },
    { label: "Health Insurance", value: "$50.00" },
  ];

  const historyData = [
    { month: 'Jun', total: '70%', ded: '10%' },
    { month: 'Jul', total: '72%', ded: '12%' },
    { month: 'Aug', total: '72%', ded: '11%' },
    { month: 'Sep', total: '75%', ded: '14%' },
    { month: 'Oct', total: '78%', ded: '13%' },
    { month: 'Nov', total: '85%', ded: '16%', active: true },
  ];

  const fileInputRef = useRef(null);
  const handleUploadClick = () => fileInputRef.current.click();

  const router = useRouter();
  const form = useForm({
    defaultValues: {
      // Personal Details
      title: "Mr.",
      first_name: "John", // Initial value
      last_name: "Doe", // Initial value
      full_name: "",
      display_name: "",
      // Employment Details
      employee_id: "",
      joining_date: "2023-10-11",
      branch_id: null, // null for no selection
      // Contact Information
      phone_number: "",
      whatsapp_number: "",
      // Other payload fields not tied to a visible input
      system_user_id: "",
      department_id: null,
      // Field present in original JSX but not in final payload keys (kept for form use)
      employee_device_id: "",
    },
  });
  const { reset, watch, setValue, formState: { isSubmitting } } = form;



  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        setBranches(await getBranches());
      } catch (error) {
        console.error("Error fetching branches:", error);
        setBranches([]);
      }
    };
    fetchBranches();
  }, []);


  useEffect(() => {
    const branchId = watch("branch_id");

    if (!branchId) {
      setDepartments([]);
      setValue("department_id", null);
      return;
    }

    const fetchDepartments = async () => {
      try {
        const data = await getDepartments(branchId);
        setDepartments(data);

        const currentDeptId = watch("department_id");
        if (currentDeptId && !data.some(d => d.id === currentDeptId)) {
          setValue("department_id", null);
        }
      } catch (error) {
        console.error("Error fetching departments:", error);
        setDepartments([]);
      }
    };

    fetchDepartments();
  }, [watch("branch_id"), payload]); // ✅ also depend on payload


  return (
    <>

      <section className="flex-1 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-border flex flex-col overflow-hidden relative">
        {/* ... (Previous Header & Stats Grid) */}
        <div className="p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-5">
            <img
              alt="Abdalla Abdulgadir"
              className="w-16 h-16 rounded-full object-cover ring-4 ring-slate-50 dark:ring-slate-800 shadow-md"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAGPlfiW9a3vEEXpkMihzAwJaffK93xoydgb1drVdfWi2XfzlFMXfNiL2IYLeEvz-s1ygCtLYXeSl7pU13qGNEkCdKvgXwfckwjThV58p4vtY63eXCCgWiCFM11hZ0qN1bmetoLnG-G8rFPnXUnfYG4xy3vLCoFiZq9Wgz-s0V-nOidAAt_OZhrv7wI5k7hBpYskl-6HaA4yWOtJ07Ue9k62CGciGd-5oTRkzSl5ZH-MHTiG3j1TZve_N1sImaMOfST0JQoamkd2Pg"
            />
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Abdalla Abdulgadir
                </h2>
                <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs px-2.5 py-0.5 rounded-md font-bold border border-border uppercase tracking-wide">
                  Active
                </span>
              </div>
              <p className="text-gray-600 dark:text-slate-300 text-sm mt-1 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">badge</span>
                ICARUS010
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <span className="material-symbols-outlined text-[16px]">work</span>
                Back Of House
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Dropdown
              items={[
                {
                  id: "November 2026", name: "November 2026",

                },
                {
                  id: "October 2026", name: "October 2026",

                },
                { id: "September 2026", name: "September 2026", }
              ]}
              placeholder="December 2026"
              width="w-[250px]"
            />

            <div className="h-8 w-px bg-border mx-1"></div>
            <button className="p-2 text-gray-600 dark:text-slate-300 hover:text-indigo-500 rounded-lg transition-colors">
              <span className="material-symbols-outlined">print</span>
            </button>
            <button className="p-2 text-gray-600 dark:text-slate-300 hover:text-indigo-500 rounded-lg transition-colors">
              <span className="material-symbols-outlined">mail</span>
            </button>
            <button className="ml-2 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-lg transition-all active:scale-95">
              <span className="material-symbols-outlined text-[20px]">download</span>
              <span className="text-sm font-semibold">Download</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto max-h-[calc(90vh-130px)] p-6 lg:p-8 space-y-8 bg-slate-50/50 dark:bg-slate-900/20">

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard title="Net Salary" value="$4,250.00" trend="+2.5% vs last month" type="success" icon="payments" />
            <StatCard title="Gross Earnings" value="$5,100.00" subtitle="Includes allowances" icon="account_balance_wallet" />
            <StatCard title="Deductions" value="$850.00" trend="16.6% of gross" type="danger" icon="pie_chart" />
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-border shadow-sm flex flex-col justify-between">
              <div>
                <p className="text-gray-600 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider">Working Days</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">22 <span className="text-sm font-normal text-slate-400">of 22</span></h3>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden mt-2">
                <div className="bg-indigo-600 h-full w-full"></div>
              </div>
            </div>
          </div>

          {/* Row for Salary History and Payment Details */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

           <PayslipChart />

            {/* Payment Details Section */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-border shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="text-base font-bold text-gray-900 dark:text-white mb-6">Payment Details</h4>
                <div className="space-y-6">
                  {/* Bank Info */}
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-indigo-600 ring-1 ring-indigo-100 dark:ring-indigo-900/40">
                      <span className="material-symbols-outlined text-[22px]">account_balance</span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-slate-300 uppercase font-semibold tracking-wider">Bank Transfer</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">HSBC Holdings</p>
                      <p className="text-xs text-slate-500 mt-0.5">**** 4589</p>
                    </div>
                  </div>
                  {/* Date Info */}
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-emerald-600 ring-1 ring-emerald-100 dark:ring-emerald-900/40">
                      <span className="material-symbols-outlined text-[22px]">event_available</span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-slate-300 uppercase font-semibold tracking-wider">Payment Date</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">Nov 28, 2026</p>
                      <p className="text-xs text-slate-500 mt-0.5">Processed at 09:30 AM</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-4 border-t border-border">
                <p className="text-xs text-slate-400 flex justify-between">
                  <span>Transaction ID:</span>
                  <span className="font-mono text-gray-600 dark:text-slate-300 font-medium">TXN-8842-XJ9</span>
                </p>
              </div>
            </div>
          </div>

          {/* ... (Breakdown Tables from previous part) */}
          {/* Breakdown Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BreakdownTable title="Earnings" data={earnings} total="$5,100.00" color="emerald" icon="add_circle" />
            <BreakdownTable title="Deductions" data={deductions} total="$850.00" color="rose" icon="remove_circle" />
          </div>

        </div>
      </section>
    </>
  )
};

export default ShortViewMainSection;