"use client";
import React, { useEffect, useState } from 'react';
import { BadgeCheck, Play, Info, } from 'lucide-react';
import Input from '@/components/Theme/Input';
import { Label, SectionTitle } from '@/components/ui/label';
import { notify, parseApiError } from '@/lib/utils';
import ImageUploader from '@/components/ImageUploader';
import { updateBank, updateContact } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';
import { updateEmployeeContact } from '@/lib/endpoint/employees';

const BankingDetails = ({ action = "Add", payload }) => {

  const { id, bank } = payload;

  console.log({ id, bank });


  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [bankInfo, setBankInfo] = useState(bank || {
    account_title: "",
    bank_name: "",
    account_no: "",
    iban: "",
    address: ""
  });


  const onSubmit = async () => {

    setLoading(true);

    try {
      const finalPayload = {
        ...bankInfo,
        employee_id: payload.id || "",
      };

      await updateBank(finalPayload);
      await notify("Success!", `Bank details updated`, "success");
      setLoading(false);

    } catch (error) {
      setLoading(false);
      await notify("Error!", parseApiError(error), "error")
    }
  };



  return (
    <div className="mt-5 bg-white/90 dark:bg-slate-800/85 backdrop-blur-xl border border-white/50 dark:border-slate-700 w-full  rounded-2xl shadow-2xl flex flex-col lg:flex-row overflow-hidden relative">
      {/* Left Section: Form */}
      <div className="flex-1 flex flex-col h-full overflow-hidden order-2 lg:order-1 border-r border-slate-200 dark:border-slate-700">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white/40 dark:bg-slate-800/40 flex items-center justify-between shrink-0">
          <div>
            {action == 'Add' &&
              <div className="flex items-center gap-2">
                <BadgeCheck className="text-primary" size={22} />
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-primary">New Enrollment</h2>
              </div>
            }
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mt-3">{action} Banking Details</h1>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <a href="#" className="group flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-red-600 dark:text-slate-400 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full transition-all border border-slate-200 dark:border-slate-600 shadow-sm">
              <span className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors">
                <Play size={10} fill="currentColor" />
              </span>
              Watch Tutorial Video
            </a>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <form className="space-y-6">

            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-6">
                <Label>Account Name</Label>
                <Input value={bankInfo.account_title} onChange={(e) => setBankInfo({ ...bankInfo, account_title: e.target.value })} placeholder="John Doe" />
              </div>
              <div className="col-span-6">
                <Label>Account Number</Label>
                <Input value={bankInfo.account_no} onChange={(e) => setBankInfo({ ...bankInfo, account_no: e.target.value })} placeholder="1234567890" />
              </div>
              <div className="col-span-6">
                <Label>Iban</Label>
                <Input value={bankInfo.iban} onChange={(e) => setBankInfo({ ...bankInfo, iban: e.target.value })} placeholder="AE123456789012345" />
              </div>

              <div className="col-span-6">
                <Label>Bank Name</Label>
                <Input value={bankInfo.bank_name} onChange={(e) => setBankInfo({ ...bankInfo, bank_name: e.target.value })} placeholder="Emirates NBD"
                />
              </div>
              <div className="col-span-6">
                <Label>Bank Branch</Label>
                <Input value={bankInfo.address} onChange={(e) => setBankInfo({ ...bankInfo, address: e.target.value })} placeholder="Dubai Main Branch"
                />
              </div>

            </div>





          </form>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 shrink-0 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push('/employees')}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-lg transition-all bg-red-500 hover:bg-red-600 text-white shadow-md">
            Cancel
          </button>
          <button
            disabled={loading}
            onClick={onSubmit}
            className="px-4 py-2 bg-primary hover:bg-primary-700 text-white text-xs font-bold uppercase tracking-wide rounded-lg shadow-lg shadow-primary-200 dark:shadow-none flex items-center gap-2 
             disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:shadow-none transition-all"
          >
            {loading ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>

      {/* Right Section: Biometric Sidebar */}
      <div className="w-full lg:w-80 xl:w-80 bg-slate-50/90 dark:bg-slate-900/60 p-6 flex flex-col items-center gap-6 order-1 lg:order-2 overflow-y-auto">
        <div className="w-full flex justify-between items-center text-gray-600 dark:text-slate-300">
          <h3 className="font-bold text-sm ">Biometric Data</h3>
          <span className="px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 text-[10px] font-bold border border-slate-200 dark:border-white/10 ">AI READY</span>
        </div>

        <ImageUploader existingImage={payload.profile_picture} />

        {/* Guidelines */}
        <div className="mt-auto w-full pt-4 border-t border-slate-200 dark:border-slate-700 text-slate-500">
          <h4 className="text-[10px] font-bold uppercase mb-2 flex items-center gap-1"><Info size={12} /> Guidelines</h4>
          <ul className="text-[10px] space-y-1">
            <li>• Neutral expression, eyes open.</li>
            <li>• Even lighting, no shadows.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default BankingDetails;