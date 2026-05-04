"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';

import { getAccessControlReport, getBranches, getDeviceList, getDeviceLogs, getScheduledEmployeeList } from '@/lib/api';

import DropDown from '@/components/ui/DropDown';
import DateRangeSelect from "@/components/ui/DateRange";
import Pagination from '@/lib/Pagination';
import { EmployeeExtras } from '@/components/Employees/Extras';
import DataTable from '@/components/ui/DataTable';
import Columns from "./columns";
import { parseApiError } from '@/lib/utils';



export default function AttendanceTable() {

    // filters
    const [selectedReportType, setSelectedReportType] = useState(null);
    const [selectedUserType, setSelectedUserType] = useState(null);
    const [selectedBranch, setSelectedBranch] = useState(null);
    const [selectedDeviceId, setSelectedDevice] = useState(null);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);


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
    const [scheduledEmployees, setScheduledEmployees] = useState([]);

    const fetchScheduledEmployees = async () => {

        try {
            let result = await getScheduledEmployeeList(selectedBranch);

            setScheduledEmployees(result.map((e) => ({ ...e, name: e.full_name, id: e.system_user_id })));
        } catch (error) {
            setError(parseApiError(error));
        }
    };

    const fetchBranches = async () => {
        try {
            setBranches(await getBranches());
        } catch (error) {
            setError(parseApiError(error));
        }
    };

    const fetchDevices = async () => {
        try {
            let result = await getDeviceList(selectedBranch);
            const seen = new Set();
            const list = (result || [])
                .filter((e) => e?.device_id != null && !seen.has(e.device_id) && seen.add(e.device_id))
                .map((e) => ({ name: e.name, id: e.device_id }));
            setDevices(list);
        } catch (error) {
            setError(parseApiError(error));
        }
    };


    useEffect(() => {
        fetchBranches();
    }, []);


    useEffect(() => {
        fetchDevices();
    }, [selectedBranch]);

    useEffect(() => {
        fetchScheduledEmployees();
    }, []);

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
                branch_id: selectedBranch,
                DeviceID: selectedDeviceId,
                from_date: from,
                to_date: to,
                UserID: selectedEmployeeId,
                include_device_types: ["all", "Access Control"],
                user_type: selectedUserType,
                report_type: selectedReportType,
            };

            console.log(params);


            const result = await getAccessControlReport(params);


            console.log(result.data);


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
        <div className="px-6 py-6">
            <div className="flex flex-wrap items-center space-x-3 space-y-2 mb-6 sm:space-y-0">
                <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 flex items-center">
                    {/* <User className="w-7 h-7 mr-3 text-indigo-600" /> */}
                    Access Control Logs
                </h1>

                <div className="flex flex-col">
                    <DropDown
                        placeholder={'Select Report Type'}
                        onChange={setSelectedReportType}
                        value={selectedReportType}
                        items={[{
                            id: null,
                            name: `All`,
                        },
                        {
                            id: `Date Wise Access Control Report`,
                            name: `Date Wise Access Control Report`,
                        },
                        {
                            id: `Door Wise Access Control Report`,
                            name: `Door Wise Access Control Report`,
                        },
                        {
                            id: `Branch Wise Access Control Report`,
                            name: `Branch Wise Access Control Report`,
                        },
                        {
                            id: `Allowed`,
                            name: `Access Granted Access Control Report`,
                        },
                        {
                            id: `Access Denied`,
                            name: `Access Denied Access Control Report`,
                        }]}
                    />
                </div>

                <div className="flex flex-col">
                    <DropDown
                        placeholder={'Select Branch'}
                        onChange={setSelectedBranch}
                        value={selectedBranch}
                        items={branches}
                    />
                </div>

                <div className="flex flex-col">
                    <DropDown
                        placeholder={'Select Device'}
                        onChange={setSelectedDevice}
                        value={selectedDeviceId}
                        items={devices}
                    />
                </div>

                <div className="flex flex-col">
                    <DropDown
                        placeholder={'Select User Type'}
                        onChange={setSelectedUserType}
                        value={selectedUserType}
                        items={[
                            { id: `Employee`, name: `Employee` },
                            { id: `Visitor`, name: `Visitor` },
                        ]}
                    />
                </div>

                <div className="flex flex-col">
                    <DropDown
                        placeholder={'Select Employees'}
                        onChange={setSelectedEmployeeId}
                        value={selectedEmployeeId}
                        items={scheduledEmployees}
                    />
                </div>

                <div className="flex flex-col">
                    <DateRangeSelect
                        value={{ from, to }}
                        onChange={({ from, to }) => {
                            setFrom(from);
                            setTo(to);
                        }
                        } />
                </div>

                {/* Refresh Button */}
                <button onClick={fetchRecords} className="bg-primary text-white px-4 py-1 rounded-lg font-semibold shadow-md hover:bg-indigo-700 transition-all flex items-center space-x-2 whitespace-nowrap">
                    <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} /> Submit
                </button>

                {/* <EmployeeExtras data={employees} onUploadSuccess={fetchRecords} /> */}
            </div>

            <DataTable
                columns={Columns}
                data={employees}
                isLoading={isLoading}
                error={error}
                onRowClick={(item) => console.log("Clicked:", item)}
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
        </div>
    );
}
