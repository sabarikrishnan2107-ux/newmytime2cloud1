"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { closeDoor, deleteDevice, getBranches, getDevices, openDoor, removeEmployee, checkDeviceHealth } from '@/lib/api';
import { getUser } from '@/config';
import { can } from '@/lib/permissions-check';
import { Activity } from 'lucide-react';

import Columns from "./columns";
import DataTable from '@/components/ui/DataTable';
import Pagination from '@/lib/Pagination';
import { notify, parseApiError } from '@/lib/utils';
import MultiDropDown from '@/components/ui/MultiDropDown';
import DeviceCreate from './Create';
import DeviceEdit from './Edit';
import axios from 'axios';
import PinEntryModal from './UnlockDoor';
import DeviceSettings from './Settings';
import TimeSelectionModal from './TimeSelection';

export default function EmployeeDataTable() {

  const router = useRouter();

  // Manager permission flags for the Device feature. Non-managers => all true.
  const permUser = getUser();
  const canCreate = can(permUser, "settings", "device", "create");
  const canEdit = can(permUser, "settings", "device", "edit");
  const canDelete = can(permUser, "settings", "device", "delete");
  const canView = can(permUser, "settings", "device", "view");

  const [branches, setBranches] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [selectedBranchIds, setSelectedBranchIds] = useState([]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotalEmployees] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {

    const fetchBranches = async () => {
      try {
        setBranches(await getBranches());
      } catch (error) {
        setError(parseApiError(error));
      }
    };

    fetchBranches();
  }, []);



  const fetchRecords = useCallback(async (page, perPage) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = {
        page: page,
        per_page: perPage,
        sortDesc: 'false',
        branch_ids: selectedBranchIds.length > 0 ? selectedBranchIds : [],
        search: searchTerm || null, // Only include search if it's not empty
      };
      const result = await getDevices(params);

      // Check if result has expected structure before setting state
      if (result && Array.isArray(result.data)) {
        setEmployees(result.data);
        setCurrentPage(result.current_page || 1);
        setTotalEmployees(result.total || 0);
        setIsLoading(false);
      } else {
        // If the API returned a 2xx status but the data structure is wrong
        throw new Error('Invalid data structure received from API.');
      }

    } catch (error) {
      setError(parseApiError(error));
      setIsLoading(false);
    }
  }, [perPage, selectedBranchIds, searchTerm]);


  useEffect(() => {
    fetchRecords(currentPage, perPage);
  }, [currentPage, perPage, fetchRecords]); // Re-fetch when page or perPage changes

  const handleRefresh = () => {
    fetchRecords(currentPage, perPage);
  }

  const [checkingHealth, setCheckingHealth] = useState(false);
  const handleCheckHealth = async () => {
    try {
      setCheckingHealth(true);
      const user = await getUser();
      const res = await checkDeviceHealth(user?.company_id);
      notify("Device Health", typeof res === 'string' ? res : (res?.message || "Health check complete"), "success");
      fetchRecords(currentPage, perPage);
    } catch (err) {
      notify("Health Check Failed", parseApiError(err), "error");
    } finally {
      setCheckingHealth(false);
    }
  }

  const handlePin = async (pin) => {
    try {
      let result = await openDoor({ device_id, otp: pin })
      if (result?.status) {
        notify("Success", result.message, "success");
        setPinModal(false);
        return;
      }

      notify("Success", "Door open command failed", "success");

    } catch (error) {
      notify("Error", parseApiError(error), "error");
    }
  }



  const deleteItem = async (id) => {
    if (confirm("Are you sure you want to delete this employee?")) {
      try {
        await deleteDevice(id);
        fetchRecords(currentPage, perPage);
      } catch (error) {
        console.error("Error deleting employee:", error);
      }
    }
  }

  const [editingRecord, setEditingRecord] = useState(null);
  const [isDeviceSettings, setisDeviceSettings] = useState(null);
  const [open, setOpen] = useState(false);
  const [deviceOpen, setDeviceOpen] = useState(false);
  const [pinModal, setPinModal] = useState(false);
  const [device_id, setDeviceId] = useState(false);
  const [alwaysOpenDevice, setAlwaysOpenDevice] = useState(null);


  const editItem = (record) => {
    setOpen(true); // Save the record to state
    setEditingRecord(record); // Save the record to state
  };

  const deviceSettings = (device) => {
    setDeviceId(device.device_id);
    setisDeviceSettings(device);
    setDeviceOpen(true)
    return;
  };

  const setOpenDoor = async (device_id) => {
    setDeviceId(device_id);
    setPinModal(true);
  };

  const setCloseDoor = async (device_id) => {
    try {
      let result = await closeDoor({ device_id })
      if (result?.status) {
        notify("Success", result.message, "success");
        return;
      }

      notify("Success", "Door open command failed", "success");

    } catch (error) {
      notify("Error", parseApiError(error), "error");
    }
  };



  return (
    <div className='overflow-y-auto max-h-[calc(100vh-100px)]'>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6  sm:space-y-0">
        <h1 className="text-2xl font-extrabold text-gray-600 dark:text-gray-300 flex items-center">
          {/* <User className="w-7 h-7 mr-3 text-indigo-600" /> */}
          Devices
        </h1>
        <div className="flex flex-wrap items-center space-x-3 space-y-2 sm:space-y-0">
          <div className="relative">
            <MultiDropDown
              placeholder={'Select Branch'}
              items={branches}
              value={selectedBranchIds}
              onChange={setSelectedBranchIds}
              badgesCount={1}
              width='w-[220px]'
            />
          </div>

          <button
            onClick={handleRefresh}
            title="Reload"
            className="p-2 rounded-lg border border-gray-200 dark:border-white/10 text-slate-600 dark:text-gray-300 hover:bg-white/5 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleCheckHealth}
            disabled={checkingHealth}
            title="Check device online/offline status"
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-slate-600 dark:text-gray-300 hover:bg-white/5 transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
          >
            <Activity className="w-4 h-4" />
            {checkingHealth ? 'Checking...' : 'Online Devices'}
          </button>

          {canCreate && <DeviceCreate onSuccess={handleRefresh} />}

        </div>
      </div>

      <DataTable
        columns={Columns(deleteItem, editItem, deviceSettings, setOpenDoor, setCloseDoor, setAlwaysOpenDevice, { canEdit, canDelete })}
        data={employees}
        isLoading={isLoading}
        error={error}
        onRowClick={(item) => { }}
        pagination={
          <Pagination
            page={currentPage}
            perPage={perPage}
            total={total}
            onPageChange={setCurrentPage}
            onPerPageChange={(n) => {
              setPerPage(n);
              setCurrentPage(1);
            }}
            pageSizeOptions={[10, 25, 50]}
          />
        }
      />

      {editingRecord && (
        <DeviceEdit
          open={open}
          setOpen={setOpen}
          defaultPayload={editingRecord}
          onSuccess={handleRefresh}
        />
      )}

      {isDeviceSettings && (
        <DeviceSettings
          device_id={device_id}
          device={isDeviceSettings}
          open={deviceOpen}
          setOpen={setDeviceOpen}
          onSuccess={handleRefresh}
        />
      )}

      <TimeSelectionModal
        open={!!alwaysOpenDevice}
        device={alwaysOpenDevice}
        onClose={() => setAlwaysOpenDevice(null)}
        onUpdate={(payload) => {
          // Hook a real save endpoint here later. For now we log the schedule.
          console.log("[AlwaysOpen schedule]", payload);
        }}
      />

      <PinEntryModal
        device_id={device_id}
        pinModal={pinModal}
        setPinModal={setPinModal}
        onSuccess={handlePin}
      />

    </div>
  );
}
