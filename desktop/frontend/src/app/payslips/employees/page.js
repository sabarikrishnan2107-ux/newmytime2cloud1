"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getBranches, getDepartmentsByBranchIds, getEmployees } from '@/lib/api';
import { api, buildQueryParams } from "@/lib/api-client";
import { EmployeeExtras } from '@/components/Employees/Extras';
import Columns from "../columns";
import DataTable from "@/components/ui/DataTable";
import Pagination from "@/lib/Pagination";
import MultiDropDown from "@/components/ui/MultiDropDown";
import DropDown from "@/components/Theme/DropDown";
import { notify, parseApiError } from "@/lib/utils";

export default function PayrollEmployeesPage() {
  const router = useRouter();
  const [branches, setBranches] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [selectedBranchIds, setSelectedBranchIds] = useState([]);

  useEffect(() => {
    const fetchBranches = async () => { setBranches(await getBranches()); };
    fetchBranches();
  }, []);

  const fetchRecords = useCallback(async (page, perPage) => {
    setIsLoading(true);
    try {
      // 1. Pull all employees (bulk)
      const empResult = await getEmployees({ page: 1, per_page: 1000, branch_ids: selectedBranchIds });
      const allEmployees = empResult?.data || [];

      // 2. Pull salary structures — only employees with a structure are "payroll employees"
      const params = await buildQueryParams({});
      const { data: structuresRes } = await api.get("/payroll-management/salary-structures", {
        params: { ...params, per_page: 1000 },
      });
      const structures = structuresRes?.data || [];

      // Map employee_id → latest structure
      const byEmp = {};
      structures.forEach((s) => {
        const key = String(s.employee_id);
        if (!byEmp[key] || new Date(s.effective_from) > new Date(byEmp[key].effective_from)) {
          byEmp[key] = s;
        }
      });

      // 3. Keep only employees who have a structure, merge structure values in as `payroll`
      const withStructure = allEmployees
        .filter((e) => byEmp[String(e.system_user_id)] || byEmp[String(e.employee_id)] || byEmp[String(e.id)])
        .map((e) => {
          const s =
            byEmp[String(e.system_user_id)] ||
            byEmp[String(e.employee_id)] ||
            byEmp[String(e.id)];
          return {
            ...e,
            payroll: {
              basic_salary: Number(s.basic_salary || 0),
              gross_salary: Number(s.gross_salary || 0),
              net_salary: Number(s.net_salary || s.gross_salary || 0),
              house_allowance: Number(s.house_allowance || 0),
              transport_allowance: Number(s.transport_allowance || 0),
              food_allowance: Number(s.food_allowance || 0),
              medical_allowance: Number(s.medical_allowance || 0),
              other_allowance: Number(s.other_allowance || 0),
              overtime_eligible: !!s.overtime_eligible,
              effective_from: s.effective_from,
              salary_mode: s.salary_mode,
            },
          };
        });

      const start = (page - 1) * perPage;
      setEmployees(withStructure.slice(start, start + perPage));
      setCurrentPage(page);
      setTotal(withStructure.length);
    } catch (error) {
      notify("Error", parseApiError(error), "error");
    } finally {
      setIsLoading(false);
    }
  }, [perPage, selectedBranchIds]);

  useEffect(() => { fetchRecords(currentPage, perPage); }, [currentPage, perPage, fetchRecords]);

  return (
    <div className="p-4 pb-24 overflow-y-auto max-h-[calc(100vh-100px)]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h1 className="text-xl font-bold text-gray-600 dark:text-gray-300">Payroll Employees</h1>
        <MultiDropDown placeholder="Select Branch" items={branches} value={selectedBranchIds} onChange={setSelectedBranchIds} badgesCount={1} width="w-[220px]" />
      </div>
      <DataTable columns={Columns()} data={employees} isLoading={isLoading}
        pagination={<Pagination page={currentPage} perPage={perPage} total={total} onPageChange={setCurrentPage} onPerPageChange={(n) => { setPerPage(n); setCurrentPage(1); }} pageSizeOptions={[10, 25, 50]} />} />
    </div>
  );
}
