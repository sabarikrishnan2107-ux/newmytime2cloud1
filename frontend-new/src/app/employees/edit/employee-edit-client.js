"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";

import { getBranches, getEmployees, updateProfilePicture } from "@/lib/api";
import { parseApiError } from "@/lib/utils";
import EmployeeEditTabs from "@/components/Employees/EmployeeEditTabs";

export default function EmployeeEditClient() {
  const searchParams = useSearchParams();
  const employeeId = searchParams.get("id");

  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [employees, setEmployees] = useState([]);
  const [error, setError] = useState(null);
  const [globalError, setGlobalError] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEmployees, setTotalEmployees] = useState(0);

  const [selectedBranch, setSelectedBranch] = useState(null);
  const [open, setOpen] = useState(false);
  const [branches, setBranches] = useState([]);

  const [selectedEmployee, setSelectedEmployee] = useState(null);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        setBranches(await getBranches());
      } catch (error) {
        setGlobalError(parseApiError(error));
      }
    };
    fetchBranches();
  }, []);

  const fetchEmployees = useCallback(
    async (page, perPage) => {
      setError(null);

      try {
        const params = {
          page: page,
          per_page: 1000,
          sortDesc: "false",
          branch_id: selectedBranch,
        };
        const result = await getEmployees(params);

        if (result && Array.isArray(result.data)) {
          setEmployees(result.data);
          setCurrentPage(result.current_page || 1);
          setTotalPages(result.last_page || 1);
          setTotalEmployees(result.total || 0);

          let foundEmployee = result.data.find((e) => e.id == employeeId);
          setSelectedEmployee(foundEmployee);
          return;
        }

        throw new Error("Invalid data structure received from API.");
      } catch (error) {
        setGlobalError(parseApiError(error));
      }
    },
    [perPage, selectedBranch, employeeId],
  );

  useEffect(() => {
    fetchEmployees(currentPage, perPage);
  }, [currentPage, perPage, fetchEmployees]);

  const handleRowClick = (employee) => {
    setSelectedEmployee(employee);
  };

  const renderEmployeeRow = (employee) => {
    const isSelected = selectedEmployee && selectedEmployee.id === employee.id;

    return (
      <li
        key={employee.id}
        className={`
        p-3 flex border border-gray-100 dark:border-gray-700 items-center space-x-4 cursor-pointer transition-colors
        ${
          isSelected
            ? "bg-gray-300 dark:bg-white/10 text-gray-600 dark:text-gray-300"
            : "bg-white dark:bg-gray-900 hover:bg-primary/10 text-gray-600 dark:text-gray-300"
        }
      `}
        onClick={() => handleRowClick(employee)}
      >
        <img
          alt="avatar of jane cooper"
          className="w-10 h-10 rounded-full"
          src={
            employee.profile_picture ||
            `https://placehold.co/40x40/6946dd/ffffff?text=${employee.full_name.charAt(0)}`
          }
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = `https://placehold.co/40x40/6946dd/ffffff?text=${employee.full_name.charAt(0)}`;
          }}
        />
        <div>
          <p className="font-medium text-text-light dark:text-text-dark">
            {employee.full_name || [employee.first_name, employee.last_name].filter(Boolean).join(" ")}
          </p>
          <p className="text-sm text-subtext-light dark:text-subtext-dark">
            {employee.employee_id || "N/A"}
          </p>
        </div>
      </li>
    );
  };

  return (
    <>
      <div className="flex flex-1 gap-6">
        <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="p-5 space-y-4">
            <div className="relative inline-block w-full">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
              >
                <span className="truncate">
                  {selectedBranch
                    ? branches.find((b) => b.id === selectedBranch)?.name
                    : "Select Branch"}
                </span>
                <span
                  className={`material-symbols-outlined text-slate-400 transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                >
                  expand_more
                </span>
              </button>

              {isOpen && (
                <div className="absolute z-[50] w-full mt-2 origin-top bg-white border border-slate-200 rounded-xl shadow-xl dark:bg-slate-800 dark:border-slate-700 p-1.5 animate-in fade-in zoom-in-95 duration-100">
                  <div className="max-h-60 overflow-y-auto custom-scrollbar">
                    {branches.map((opt) => (
                      <div
                        key={opt.id}
                        onClick={() => {
                          setSelectedBranch(opt.id);
                          setCurrentPage(1);
                          setIsOpen(false);
                        }}
                        className="flex items-center px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-600 dark:text-slate-300"
                      >
                        {opt.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Employee search */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none">
                search
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search employee name or ID..."
                className="w-full pl-9 pr-9 py-2.5 text-sm bg-white border border-slate-200 rounded-xl shadow-sm placeholder-slate-400 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:placeholder-slate-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded"
                  aria-label="Clear search"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[calc(100vh-100px)]">
            {(() => {
              const q = searchTerm.trim().toLowerCase();
              const visible = !q
                ? employees
                : employees.filter((e) => {
                    const full = (e.full_name || `${e.first_name || ""} ${e.last_name || ""}`).toLowerCase();
                    const eid = String(e.employee_id || "").toLowerCase();
                    return full.includes(q) || eid.includes(q);
                  });
              if (visible.length === 0) {
                return (
                  <p className="px-5 py-6 text-center text-sm text-slate-500">
                    No employees match "{searchTerm}".
                  </p>
                );
              }
              return <ul className="">{visible.map(renderEmployeeRow)}</ul>;
            })()}
          </div>
        </div>
        <div className="flex-1 pt-5 pr-5">
          <EmployeeEditTabs selectedEmployee={selectedEmployee} employeeId={employeeId} />
        </div>
      </div>
    </>
  );
}

