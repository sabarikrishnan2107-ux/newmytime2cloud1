"use client";

import React, { useState, useEffect } from 'react';
import {
  Users,
  Cpu,
  RefreshCw,
  CheckCircle2,
  XCircle
} from 'lucide-react';

// UI Components
import DropDown from '@/components/ui/DropDown';
import SyncGrid from '@/components/Employees/UploadPhoto/SyncGrid';
import { useAttendanceSync } from './useAttendanceSync';
import { addPerson, getBranches, getDepartments, getDeviceListNew, getScheduledEmployeeList } from '@/lib/api';
import { notify, parseApiError } from '@/lib/utils';
import { MODEL_NUMBERS } from '@/lib/dropdowns';
import MultiDropDown from '@/components/ui/MultiDropDown';
import { getUser } from '@/config/index';

// Add this helper component at the top of your file (or in a separate file)
const SyncStatusModal = ({ results, total, currentCount, isOpen, onClose, isLoading }) => {
  if (!isOpen) return null;
  console.log("SyncStatusModal Rendered with results:", results);
  return (
    <div className="fixed inset-x-0 bottom-0 top-[72px] z-[100] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={!isLoading ? onClose : null}></div>
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-white/10 w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">

        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">Sync Progress</h3>
            <p className="text-sm text-slate-500">
              Processed {currentCount} of {total} operations
            </p>
          </div>
          {!isLoading && (
            <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </div>

        {/* Results List */}
        <div className="p-4 overflow-y-auto flex-1">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-white dark:bg-slate-900 text-slate-400 border-b border-gray-100 dark:border-white/5">
              <tr>
                <th className="p-3 font-medium">Employee</th>
                <th className="p-3 font-medium">Device ID</th>
                <th className="p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-white/5">
              {results.map((res, index) => (
                <tr key={index} className="animate-in fade-in slide-in-from-bottom-1">
                  <td className="p-3 font-medium text-slate-700 dark:text-slate-200">{res.name}</td>
                  <td className="p-3 text-slate-500 text-xs">{res.device_id}</td>
                  <td className="p-3">
                    {(() => {
                      const isSuccess = res.status == 200;
                      const isDuplicate = typeof res.status === 'string' && /duplicate|already|is exist|exists/i.test(res.status);
                      const cls = isSuccess
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : isDuplicate
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
                      return (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${cls}`}>
                          {isSuccess ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                          {isSuccess ? 'SUCCESS' : isDuplicate ? 'ALREADY EXISTS' : (res.status || 'FAILED')}
                        </span>
                      );
                    })()}
                  </td>
                </tr>
              ))}
              {results.length === 0 && (
                <tr><td colSpan="3" className="p-10 text-center text-slate-400 italic">Initializing connection...</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/50 flex justify-end">
          <button
            disabled={isLoading}
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-slate-800 text-white font-semibold disabled:opacity-50 transition-all hover:bg-slate-700"
          >
            {isLoading ? 'Syncing...' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function AttendanceTable() {

  const [syncResults, setSyncResults] = useState([]);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [totalOperations, setTotalOperations] = useState(0);

  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [scheduledEmployees, setScheduledEmployees] = useState([]);
  const [devices, setDevices] = useState([]);


  // 1. Personnel Logic
  const personSync = useAttendanceSync(scheduledEmployees);

  // 2. Device Logic (Reusing the same hook!)
  const deviceSync = useAttendanceSync(devices);

  useEffect(() => {
    getBranches().then(setBranches).catch(err => notify("Error", parseApiError(err), "error"));
  }, []);

  useEffect(() => {
    getDepartments(selectedBranch).then(setDepartments).catch(err => notify("Error", parseApiError(err), "error"));
  }, [selectedBranch]);


  const fetchScheduledEmployees = async () => {
    try {

      let result = await getScheduledEmployeeList(selectedDepartment);

      const formattedData = result.map((emp) => ({
        itemId: emp.id.toString(),

        id: emp.id, // Use real ID from DB
        name: emp?.full_name || "Unknown",
        dept: [emp?.branch?.branch_name, emp?.department?.name]
          .filter(Boolean)
          .join(" / ") || "N/A",
        profile_picture_raw: emp.profile_picture_raw,
        profile_picture: emp.profile_picture,
      }));

      setScheduledEmployees(formattedData);

      // setScheduledEmployees(data);
    } catch (error) {
      console.log(error);

    }
  };

  useEffect(() => {
    fetchScheduledEmployees();
  }, [selectedDepartment]);

  useEffect(() => {
    fetchScheduledEmployees();
  }, []);


  const fetchDevices = async () => {
    try {
      let result = await getDeviceListNew({ branch_id: selectedBranch, module_number: selectedModel });

      // Use a Map to keep track of unique device_ids
      const seen = new Map();
      const uniqueResults = result.filter(emp => {
        if (!seen.has(emp.device_id)) {
          seen.set(emp.device_id, true);
          return true;
        }
        return false;
      });

      const formattedData = uniqueResults.map((emp) => ({
        itemId: emp.id.toString(), // The DB primary key
        id: emp.device_id,         // Now guaranteed unique in this array
        name: emp?.name || "Unknown",
        dept: emp?.branch?.branch_name || "N/A",
        profile_picture_raw: null,
        profile_picture: null,
      }));

      setDevices(formattedData);
    } catch (error) {
      console.error("Failed to fetch devices:", error);
    }
  };

  useEffect(() => {
    fetchDevices()
  }, [selectedBranch, selectedModel]);


  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    const selectedEmployees = personSync.selected;
    const selectedDevices = deviceSync.selected;

    // Validation
    if (selectedEmployees.length === 0 || selectedDevices.length === 0) {
      return notify("Selection Required", "Please select at least one employee and one device.", "error");
    }

    // Initialize UI
    setLoading(true);
    setSyncResults([]); // Clear previous results
    setTotalOperations(selectedEmployees.length * selectedDevices.length);
    setShowStatusModal(true); // Open the status popup

    try {
      const user = await getUser();
      const companyId = user?.company_id || 0;

      // Loop through each device
      for (const device of selectedDevices) {

        // Loop through each employee for that specific device
        for (const emp of selectedEmployees) {

          const payload = {
            personList: [{
              name: emp.name,
              userCode: emp.id,
              profile_picture_raw: emp.profile_picture_raw,
              faceImage: emp.profile_picture
            }],
            snList: [device.id], // Single device ID in the array
            branch_id: null,
            company_id: companyId
          };

          try {
            console.group(`[SYNC DEBUG] ${emp.name} → ${device.id}`);
            console.log('Outgoing payload:', JSON.parse(JSON.stringify(payload)));
            console.time('addPerson duration');

            const data = await addPerson(payload);

            console.timeEnd('addPerson duration');
            console.log('Raw API response:', data);
            console.log('deviceResponse array:', data?.deviceResponse);

            const apiResult = data?.deviceResponse?.[0];
            console.log('apiResult[0]:', apiResult);
            console.log('status value:', apiResult?.status, '| type:', typeof apiResult?.status);
            console.log('sdk_response:', apiResult?.sdk_response);
            console.groupEnd();

            if (apiResult) {
              // apiResult.status is only the GATEWAY status (200 = "request sent").
              // The device's own verdict is in sdk_response.status:
              //   200 = enrolled OK; 103 = person already exists on the device
              //   (firmware reports it as "parameter error" in Chinese);
              //   422 = photo file missing on server (guard refused to push).
              const dev = apiResult.sdk_response;
              const devStatus = dev && typeof dev === "object" ? dev.status : null;
              let displayStatus;
              if (devStatus === 200) displayStatus = 200;
              else if (devStatus === 103) displayStatus = "Already exists on device";
              else if (devStatus === 422 || apiResult.status === 422) displayStatus = "Photo missing on server";
              else if (apiResult.status === 500) displayStatus = "Device offline / timeout";
              else displayStatus = (dev && dev.message) || apiResult.status;
              setSyncResults((prev) => [...prev, {
                ...apiResult,
                name: apiResult.name || emp.name,
                device_id: apiResult.device_id || device.id,
                status: displayStatus
              }]);
            } else {
              throw new Error("Invalid API Response Structure");
            }

          } catch (err) {
            console.groupEnd();
            console.error(`[SYNC DEBUG] Error syncing ${emp.name}:`, err);
            console.error('Error response data:', err?.response?.data);
            console.error('Error status:', err?.response?.status);
            setSyncResults((prev) => [...prev, {
              name: emp.name,
              device_id: device.id,
              status: "Error",
              sdk_response: parseApiError(err)
            }]);
          }
        }
      }

      // notify("Sync Complete", "All operations have finished processing.", "success");

    } catch (globalError) {
      notify("Error", "Could not initialize synchronization.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='p-4 space-y-8 pb-24 overflow-y-auto max-h-[calc(100vh-80px)]'>

      <SyncStatusModal
        isOpen={showStatusModal}
        results={syncResults}
        total={totalOperations}
        currentCount={syncResults.length}
        isLoading={loading}
        onClose={() => setShowStatusModal(false)}
      />

      {/* HEADER SECTION */}
      <header className="flex flex-col lg:flex-row justify-between items-center gap-3 bg-surface p-3 px-5 rounded-2xl shadow-glass border border-glass-border">
        {/* Left Side: Title & Subtitle */}
        <div className="flex flex-col whitespace-nowrap">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 leading-tight">
            Employee Upload
          </h1>
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            upload emplpyee info to devices
          </p>
        </div>

        {/* Right Side: Dropdowns in one line */}
        <div className="flex flex-wrap lg:flex-nowrap items-center gap-3 w-full lg:w-auto">
          <div className="min-w-[200px]">
            <DropDown
              items={branches}
              value={selectedBranch}
              onChange={setSelectedBranch}
              placeholder="Select Branch"
              width="w-full lg:w-[220px]"
            />
          </div>
          <div className="min-w-[200px]">
            <MultiDropDown
              items={departments}
              value={selectedDepartment}
              onChange={setSelectedDepartment}
              placeholder="Select Department"
              width="w-full lg:w-[220px]"
            />
          </div>
          <div className="min-w-[200px]">
            <DropDown
              items={MODEL_NUMBERS}
              value={selectedModel}
              onChange={setSelectedModel}
              placeholder="Select Model"
              width="w-full lg:w-[220px]"
            />
          </div>
        </div>
      </header>

      {/* SECTION 1: PERSONNEL */}
      <SyncGrid sync={personSync} leftTitle="Available Employees" rightTitle="Selected Personnel" leftIcon={Users} />

      {/* SECTION 2: DEVICES */}
      <SyncGrid sync={deviceSync} leftTitle="Available Devices" rightTitle="Target Hardware" leftIcon={Cpu} theme="indigo" />


      <div className="fixed bottom-6 left-0 right-0 flex justify-center z-50 pl-16">
        <button disabled={loading} onClick={onSubmit}
          className="group relative px-6 py-2.5 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-[0_10px_40px_-10px_rgba(79,70,229,0.5)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-10px_rgba(79,70,229,0.6)] overflow-hidden">
          <div
            className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 opacity-80 group-hover:opacity-100 transition-opacity duration-300">
          </div>
          <div className="relative flex items-center gap-3">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Synchronizing...' : 'Synchronize Data'}
          </div>
          <div
            className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shine">
          </div>
        </button>
      </div>
    </div>
  );
}


