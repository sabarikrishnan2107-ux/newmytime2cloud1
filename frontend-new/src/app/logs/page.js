"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Pencil, RefreshCw, MapPin, X as XIcon } from 'lucide-react';

import { getBranches, getDeviceList, getDeviceLogs } from '@/lib/api';

import DropDown from '@/components/ui/DropDown';
import DateRangeSelect from "@/components/ui/DateRange";
import Pagination from '@/lib/Pagination';
import { EmployeeExtras } from '@/components/Employees/Extras';
import DataTable from '@/components/ui/DataTable';
import Columns from "./columns";
import { notify, parseApiError } from '@/lib/utils';
import MultiDropDown from '@/components/ui/MultiDropDown';
import ManualAttendanceCorrectionModal from '@/components/Attendance/ManualAttendanceCorrectionModal';
import { getUser } from '@/config';
import { generateManualLog } from '@/lib/endpoint/attendance';

function isMobileLog(log) {
  const deviceName = log?.device?.name;
  return (
    log?.DeviceID?.includes?.("Mobile") ||
    (typeof deviceName === "string" && deviceName.toLowerCase() === "mobile") ||
    (log?.lat && log?.lon)
  );
}



export default function AttendanceTable() {

    // filters
    const [selectedBranchIds, setSelectedBranchIds] = useState([]);
    const [selectedDeviceIds, setSelectedDeviceIds] = useState([]);


    const [isOpen, setIsOpen] = useState(false);
    const [isManualSubmitting, setIsManualSubmitting] = useState(false);

    const [from, setFrom] = useState(null);
    const [to, setTo] = useState(null);

    const [employees, setAttendance] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(25);
    const [total, setTotalAttendance] = useState(0);

    const [branches, setBranches] = useState([]);
    const [devices, setDevices] = useState([]);
    const [mapLog, setMapLog] = useState(null);
    const [devicePhotoLog, setDevicePhotoLog] = useState(null);

    const fetchBranches = async () => {
        try {
            setBranches(await getBranches());
        } catch (error) {
            setError(parseApiError(error));
        }
    };

    const fetchDevices = async () => {
        if (!selectedBranchIds.length) {
            setDevices([]); // Clear devices if no branch is selected
            return;
        }

        try {
            let result = await getDeviceList(selectedBranchIds);

            // 1. Map your API results
            const apiDevices = result.map((e) => ({ name: e.name, id: e.device_id }));

            // 2. Define the "Mobile" option
            const mobileOption = { name: 'Mobile Devices', id: 'Mobile' };

            // 3. Combine them (Mobile at the top, then the rest)
            setDevices([mobileOption, ...apiDevices]);

        } catch (error) {
            setError(parseApiError(error));
        }
    };


    useEffect(() => {
        fetchBranches();
    }, []);


    useEffect(() => {
        fetchDevices();
    }, [selectedBranchIds]);

    useEffect(() => {
        fetchRecords();
    }, [currentPage, perPage]);

    const fetchRecords = async () => {
        try {
            setIsLoading(true);

            const params = {
                page: currentPage,
                per_page: perPage,
                sortDesc: 'false',
                device_ids: selectedDeviceIds,
                branch_ids: selectedBranchIds,
                from_date: from,
                to_date: to,
            };

            const result = await getDeviceLogs(params);

            // Check if result has expected structure before setting state
            if (result && Array.isArray(result.data)) {
                setAttendance(result.data);
                setCurrentPage(result.current_page || 1);
                setTotalAttendance(result.total || 0);
                setIsLoading(false);
                return; // Success, exit
            } else {
                // If the API returned a 2xx status but the data structure is wrong
                throw new Error('Invalid data structure received from API.');
            }

        } catch (error) {
            setError(parseApiError(error))
            setIsLoading(false); // Make sure loading state is turned off on error
        }
    };

    return (
        <div className='p-3 sm:p-4 pb-24 overflow-y-auto max-h-[calc(100vh-100px)]'>
            <div className="flex flex-col xl:flex-row xl:justify-between xl:items-center gap-3 mb-6">
                <h1 className="text-xl sm:text-2xl font-extrabold text-gray-600 dark:text-gray-300 flex items-center shrink-0">
                    Logs
                </h1>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full xl:w-auto xl:justify-end">
                    <div className="relative w-full sm:w-auto">
                        <MultiDropDown
                            placeholder={'Select Branch'}
                            items={branches}
                            value={selectedBranchIds}
                            onChange={setSelectedBranchIds}
                            badgesCount={1}
                            width='w-full sm:w-[180px] 2xl:w-[220px]'
                        />
                    </div>

                    <div className="relative w-full sm:w-auto">
                        <MultiDropDown
                            placeholder={'Select Device'}
                            items={devices}
                            value={selectedDeviceIds}
                            onChange={setSelectedDeviceIds}
                            badgesCount={1}
                            width='w-full sm:w-[180px] 2xl:w-[220px]'
                        />
                    </div>

                    <div className="relative w-full sm:w-auto">
                        <DateRangeSelect
                            value={{ from, to }}
                            onChange={({ from, to }) => {
                                setFrom(from);
                                setTo(to);
                            }
                            } />
                    </div>

                    <button onClick={fetchRecords} className="bg-primary text-white px-4 py-2 rounded-lg font-semibold shadow-md hover:bg-indigo-700 transition-all flex items-center gap-2 whitespace-nowrap text-sm">
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Submit
                    </button>

                    <button
                        onClick={() => setIsOpen(true)}
                        className="bg-primary hover:bg-blue-600 text-white text-sm font-semibold py-2 px-3 rounded-lg flex items-center gap-1 transition-all shadow-lg shadow-primary/20 whitespace-nowrap"
                    >
                        <Pencil size={15} />
                        Manual Log
                    </button>

                    <ManualAttendanceCorrectionModal
                        open={isOpen}
                        onClose={() => setIsOpen(false)}
                        isSubmitting={isManualSubmitting}
                        initialData={{
                            date: from || "",
                        }}
                        onSuccess={() => {
                            if (isButtonclicked) fetchRecords();
                        }}

                    />
                </div>
            </div>

            <DataTable
                columns={Columns}
                data={employees}
                isLoading={isLoading}
                error={error}
                onRowClick={(item) => {
                    if (isMobileLog(item)) {
                        setMapLog(item);
                    } else {
                        setDevicePhotoLog(item);
                    }
                }}
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

            {mapLog && <LocationMapModal log={mapLog} onClose={() => setMapLog(null)} />}
            {devicePhotoLog && <DevicePhotoModal log={devicePhotoLog} onClose={() => setDevicePhotoLog(null)} />}
        </div>
    );
}

function DevicePhotoModal({ log, onClose }) {
    const photo = log?.device?.device_photo;
    const name = log?.device?.name || log?.DeviceID || "Device";
    const location = log?.device?.location || log?.gps_location || "—";
    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65"
            onClick={onClose}
        >
            <div
                className="w-[440px] max-w-[95vw] rounded-xl overflow-hidden shadow-2xl flex flex-col bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-slate-700">
                    <div>
                        <h3 className="text-sm font-bold text-gray-800 dark:text-white">{name}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{location}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 flex items-center justify-center p-4 min-h-[280px]">
                    {photo ? (
                        <img src={photo} alt={name} className="max-w-full max-h-[360px] rounded-lg object-contain" />
                    ) : (
                        <div className="text-center text-slate-500 dark:text-slate-400 py-12">
                            <span className="material-symbols-outlined text-4xl">photo_camera</span>
                            <p className="text-xs mt-2">No photo uploaded for this device</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function LocationMapModal({ log, onClose }) {
    const locationName = log?.gps_location || log?.device?.location || log?.device?.name || "—";
    const [coords, setCoords] = useState({
        lat: log?.lat ?? log?.latitude ?? null,
        lon: log?.lon ?? log?.longitude ?? log?.lng ?? null,
    });

    // For mobile logs without lat/lon stored on the attendance row, look up
    // the closest real_time_locations entry for that user/date and use its coords.
    useEffect(() => {
        const hasLogCoords =
            coords.lat !== null && coords.lat !== undefined && coords.lat !== "" &&
            coords.lon !== null && coords.lon !== undefined && coords.lon !== "";
        if (hasLogCoords) return;

        const isMobile =
            log?.DeviceID?.includes?.("Mobile") ||
            (typeof log?.device?.name === "string" && log.device.name.toLowerCase() === "mobile");
        if (!isMobile) return;

        const userId = log?.UserID || log?.employee?.system_user_id || log?.employee?.employee_id;
        const companyId = log?.company_id || log?.employee?.company_id;
        const date = log?.edit_date || log?.date;
        if (!userId || !companyId || !date) return;

        const isoDate = (() => {
            if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
            const d = new Date(date);
            return !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : null;
        })();
        if (!isoDate) return;

        const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://v2backend.mytime2cloud.com/api";
        let cancelled = false;
        fetch(`${apiBase}/realtime_location?company_id=${companyId}&UserID=${userId}&date=${isoDate}&per_page=1000`)
            .then((r) => r.json())
            .then((data) => {
                if (cancelled) return;
                const rows = Array.isArray(data) ? data : (data?.data || []);
                if (!rows.length) return;
                const target = (() => {
                    if (!log?.time) return rows[0];
                    const targetMs = new Date(`${isoDate}T${log.time}`).getTime();
                    return rows.reduce((best, r) => {
                        const t = new Date(r.datetime || r.created_at || `${isoDate}T${r.time || "00:00:00"}`).getTime();
                        if (isNaN(t)) return best;
                        if (!best) return r;
                        const bestMs = new Date(best.datetime || best.created_at).getTime();
                        return Math.abs(t - targetMs) < Math.abs(bestMs - targetMs) ? r : best;
                    }, null) || rows[0];
                })();
                if (target?.latitude && target?.longitude) {
                    setCoords({ lat: target.latitude, lon: target.longitude });
                }
            })
            .catch(() => { /* keep fallback */ });
        return () => { cancelled = true; };
    }, [log]);

    const lat = coords.lat;
    const lon = coords.lon;
    const hasCoords = lat !== undefined && lat !== null && lat !== "" && lon !== undefined && lon !== null && lon !== "";
    const query = hasCoords ? `${lat},${lon}` : encodeURIComponent(locationName);
    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65"
            onClick={onClose}
        >
            <div
                className="w-[620px] max-w-[95vw] rounded-xl overflow-hidden shadow-2xl flex flex-col bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-100">
                        <MapPin size={16} className="text-primary" />
                        <span>Location</span>
                    </div>
                    <button
                        onClick={onClose}
                        title="Close"
                        className="flex items-center justify-center p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-slate-700/60 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-200 transition"
                    >
                        <XIcon size={16} />
                    </button>
                </div>
                <div className="relative w-full h-[480px]">
                    <iframe
                        title="Map"
                        width="100%"
                        height="100%"
                        className="border-0 block"
                        loading="lazy"
                        allowFullScreen
                        referrerPolicy="no-referrer-when-downgrade"
                        src={`https://maps.google.com/maps?q=${query}&z=16&output=embed`}
                    />
                    <div
                        style={{ transform: 'translate(-50%, -100%)', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}
                        className="absolute left-1/2 top-1/2 pointer-events-none"
                    >
                        <svg width="32" height="40" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20c0-6.6-5.4-12-12-12z" fill="#dc2626" />
                            <circle cx="12" cy="12" r="4.5" fill="#ffffff" />
                        </svg>
                    </div>
                </div>
                <div className="px-4 py-3 bg-gray-50 dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200">
                    <div className="flex items-start gap-2.5">
                        <MapPin size={16} className="mt-0.5 shrink-0 text-primary" />
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate" title={locationName}>{locationName}</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {hasCoords ? `${lat}, ${lon}` : "Coordinates unavailable"}
                                {log?.date && log?.time ? <span className="ml-2">• {log.date} {log.time}</span> : null}
                            </p>
                        </div>
                        <a
                            href={`https://www.google.com/maps?q=${query}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                        >
                            Open in Maps
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
