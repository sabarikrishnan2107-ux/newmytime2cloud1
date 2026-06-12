"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { deleteGroupLogin, getBranches, getDepartments, getManagerLogins } from '@/lib/api';
import { getUser } from "@/config";
import { can } from "@/lib/permissions-check";
import { EmployeeExtras } from '@/components/Employees/Extras';

import Columns from "./columns";
import DataTable from '@/components/ui/DataTable';
import Pagination from '@/lib/Pagination';
import { parseApiError } from '@/lib/utils';
import Dropdown from '@/components/Theme/DropDown';
import Input from '@/components/Theme/Input';
import IconButton from '@/components/Theme/IconButton';

import Create from "@/components/GroupLogin/Create";

export default function EmployeeDataTable() {

  // Manager permission flags for the Manager Login feature. Non-managers => all true.
  const user = getUser();
  const canCreate = can(user, "settings", "login/manager-login", "create");
  const canEdit = can(user, "settings", "login/manager-login", "edit");
  const canDelete = can(user, "settings", "login/manager-login", "delete");
  const canView = can(user, "settings", "login/manager-login", "view");

  const [payload, setPayload] = useState({
    employee_id: 0,
    name: "",
    email: "",
    start_date: "",
    end_date: "",
    password: "",
    password_confirmation: "",
    notify: false,
    role_id: "",
    branch_ids: [],
    department_ids: []
  });

  const [employees, setEmployees] = useState([]);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotalEmployees] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedBranch, setSelectedBranch] = useState({ name: "Select All", id: "" });
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [branches, setBranches] = useState([]);

  const fetchBranches = async () => {
    try {
      setBranches([{ name: "Select All", id: "" }, ...await getBranches()]);
    } catch (error) {
      setError(parseApiError(error));
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);


  const fetchEmployees = useCallback(async (page, perPage) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = {
        page: page,
        per_page: perPage,
        sortDesc: 'false',
        branch_id: selectedBranch?.id || "",
        department_ids: selectedDepartments,
        search: searchTerm || null, // Only include search if it's not empty
      };
      const result = await getManagerLogins(params);

      // Check if result has expected structure before setting state
      if (result && Array.isArray(result.data)) {
        setEmployees(result.data);
        setCurrentPage(result.current_page || 1);
        setTotalEmployees(result.total || 0);
        setIsLoading(false);
        return; // Success, exit
      } else {
        // If the API returned a 2xx status but the data structure is wrong
        throw new Error('Invalid data structure received from API.');
      }

    } catch (error) {
      setError(parseApiError(error));
      setIsLoading(false);
    }
  }, [perPage, selectedBranch, selectedDepartments, searchTerm]);

  const router = useRouter();

  const [departments, setDepartments] = useState([]);

  const fetchDepartments = async () => {
    try {
      setDepartments(await getDepartments(selectedBranch.id));
    } catch (error) {
      setError(parseApiError(error));
    }
  };


  useEffect(() => {
    fetchDepartments();
  }, [selectedBranch]);


  useEffect(() => {
    fetchEmployees(currentPage, perPage);
  }, [currentPage, perPage, fetchEmployees]); // Re-fetch when page or perPage changes

  const handleRefresh = () => {
    setSelectedBranch(null);
    setSelectedDepartments([]);
    fetchEmployees(currentPage, perPage);

    setIsEditOpen(false);
  }

  const editItem = async (item) => {

    let payload = {
      id: item.id,
      employee_id: item.employee_id,
      name: item.name,
      email: item.email,
      start_date: item.start_date_edit,
      end_date: item.end_date_edit,
      role_id: item.role_id,
      branch_ids: item.branches.map(e => e.id),
      department_ids: item.departments.map(e => e.id),

      password: "",
      password_confirmation: "",
    }

    setPayload(payload)

    setIsEditOpen(true);

    console.log(isEditOpen);
    
  }

  const deleteItem = async (id) => {
    if (confirm("Are you sure you want to delete this employee?")) {
      try {
        await deleteGroupLogin(id);
        fetchEmployees(currentPage, perPage);
      } catch (error) {
        console.error("Error deleting employee:", error);
      }
    }
  }

  return (
    <div className='p-5'>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6  sm:space-y-0">
        <h1 className="text-2xl font-extrabold text-gray-600 dark:text-gray-300 flex items-center">
          {/* <User className="w-7 h-7 mr-3 text-indigo-600" /> */}
          Manager Login
        </h1>
        <div className="flex flex-wrap items-center space-x-3 space-y-2 sm:space-y-0">
          <div className="relative">
            <Dropdown
              items={branches}
              selectedItem={selectedBranch}
              onSelect={(item) => {
                setSelectedBranch(item);
                setCurrentPage(1); // Any extra logic goes here
              }}
              placeholder="Select a Branch"
              width="w-[320px]"
            />
          </div>
          <div className="relative">
            <Input
              placeholder="Search by name or ID"
              icon="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {/* <div className="relative">
                        <MultiDropDown
                            placeholder={'Select Departments'}
                            items={departments}
                            value={selectedDepartments}
                            onChange={setSelectedDepartments}
                            badgesCount={1}
                        />
                    </div> */}

          <IconButton
            icon={RefreshCw}
            onClick={handleRefresh}
            isLoading={isLoading}
            title="Refresh Data"
          />

          <EmployeeExtras data={employees} onUploadSuccess={fetchEmployees} />

          {/* New Employee Button */}
          {canCreate && <Create isEditOpen={isEditOpen} pageTitle="Manager Login" onSuccess={handleRefresh} defaultPayload={payload} />}
        </div>
      </div>

      <DataTable
        columns={Columns(editItem, deleteItem, { canEdit, canDelete })}
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
    </div>
  );
}
