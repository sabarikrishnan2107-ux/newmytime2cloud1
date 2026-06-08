"use client";

import React, { useState, useEffect } from "react";
import { Pencil, Trash, UserLock } from "lucide-react";
import { deleteDepartment, deleteSubDepartments, getDepartmentsForTable, getSubDepartments } from "@/lib/api";

import Pagination from "@/lib/Pagination";
import DataTable from "@/components/ui/DataTable";
import Columns from "./columns";
import Create from "./Create";
import SubDepartmentCreate from "../SubDepartment/Create";
import { notify, parseApiError } from "@/lib/utils";
import { getUser } from "@/config";
import { can } from "@/lib/permissions-check";
import EditDepartment from "./Edit";
import EditSubDepartment from "../SubDepartment/Edit";

export default function Department() {
  // Manager permission flags for the Department (Organization Settings) feature.
  const user = getUser();
  const canCreate = can(user, "settings", "department-tabs", "create");
  const canEdit = can(user, "settings", "department-tabs", "edit");
  const canDelete = can(user, "settings", "department-tabs", "delete");
  const canView = can(user, "settings", "department-tabs", "view");

  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await getSubDepartments({
        page: currentPage,
        per_page: perPage,
      });

      console.log(`getSubDepartments`);
      console.log(result);


      if (result && Array.isArray(result.data)) {
        setRecords(result.data);
        setCurrentPage(result.current_page || 1);
        setTotal(result.total || 0);
      } else {
        throw new Error("Invalid data structure from API.");
      }
    } catch (error) {
      setError(parseApiError(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this employee?")) {
      try {
        await deleteSubDepartments(id);
        fetchRecords();
        notify("Success", "Sub department deleted", "success")
      } catch (error) {
        console.error("Error deleting employee:", error);
      }
    }
  };

  const handleParentDelete = async (id) => {
    if (confirm("Are you sure you want to delete this employee?")) {
      try {
        await deleteDepartment(id);
        fetchRecords();
        notify("Success", "Department deleted", "success")
      } catch (error) {
        console.error("Error deleting employee:", error);
      }
    }
  };



  const columns = Columns({
    onSuccess: fetchRecords, // refresh after edit
  });

  return (
    <>
      <div
        className="p-5 border-b border-gray-200 dark:border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900"
      >
        <div className="flex items-center gap-3">
          <div className="bg-indigo-500/10 p-2 rounded-lg text-indigo-400">
            <span className="material-symbols-outlined">domain</span>
          </div>
          <h3 className="font-bold text-white text-lg">Departments</h3>
        </div>
        <div className="flex items-center gap-3">
          {/* <button
            className="bg-primary hover:bg-blue-600 text-white text-sm font-semibold py-2 px-3 rounded-lg flex items-center gap-1 transition-all shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined text-[18px]"
            >add</span
            >
            Add Sub Department
          </button> */}

          {canCreate && <SubDepartmentCreate onSuccess={fetchRecords} />}


          {canCreate && <Create onSuccess={fetchRecords} />}

        </div>
      </div>
      <div
        className="p-4 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-white/20 flex items-center gap-4"
      >
        <div className="relative group flex-1">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary material-symbols-outlined text-[20px] transition-colors"
          >search</span
          >
          <input
            className="w-full bg-background-dark text-white pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-white/20 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder-slate-600 text-sm transition-all"
            placeholder="Search departments by name or code..."
            type="text"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto max-h-[500px] bg-white dark:bg-slate-900">
        <table
          className="w-full text-left border-collapse whitespace-nowrap"
        >
          <thead className="sticky top-0 z-10 bg-white dark:bg-slate-900">
            <tr
              className="text-xs text-slate-400 border-b border-gray-200 dark:border-white/20"
            >
              <th className="font-semibold py-3 px-6 w-1/3">Name</th>
              <th className="font-semibold py-3 px-4">Code</th>
              <th className="font-semibold py-3 px-4">Parent Dept</th>
              <th className="font-semibold py-3 px-4">Branch</th>
              <th className="font-semibold py-3 px-4 text-center">
                Employees
              </th>
              <th className="font-semibold py-3 px-4">Last Modified</th>
              <th className="font-semibold py-3 px-4 w-12 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {records.map((record) => {
              const isParent = record.type === 'Department';

              return (
                <tr key={`${record.type}-${record.id}`} className="group border-b border-gray-200 dark:border-white/10 transition-colors">
                  <td className="py-3 px-6">
                    <div className="flex items-center gap-3 relative">
                      {/* Icon logic: Indigo for Parents, Gray/Empty for Children */}
                      <div className={`w-8 h-8 rounded flex items-center justify-center ${isParent ? 'bg-indigo-500/10 text-indigo-400' : 'bg-gray-500/10 text-indigo-400'}`}>
                        {isParent && (
                          <span className="material-symbols-outlined text-[18px]">apartment</span>
                        )}
                      </div>
                      <div>
                        <span className={`${isParent ? 'text-white font-bold' : 'text-slate-400 font-medium'}`}>
                          {record.name}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Code logic: DEP or SUB */}
                  <td className="py-3 px-4 text-xs text-slate-500 group-hover:text-slate-400">
                    {isParent ? `DEP-${record.id}` : `SUB-${record.id}`}
                  </td>

                  {/* Parent Dept Name: Only show for Sub-Departments */}
                  <td className="py-3 px-4 text-blue-400 text-xs font-medium">
                    {isParent ? '-' : (record.parent_name || '-')}
                  </td>

                  <td className="py-3 px-4 text-blue-400 text-xs font-medium">
                    {(record.branch_name || '-')}
                  </td>


                  <td className="py-3 px-4 text-center text-slate-300">
                    {record.employees_count}
                  </td>

                  <td className="py-3 px-4 text-slate-500 text-xs">
                    {record.formatted_updated_at || record.created_at}
                  </td>

                  <td className="py-3 px-4 ">
                    <div className="flex justify-center gap-1">

                      {canEdit && (
                        isParent
                          ? <EditDepartment defaultPayload={record} onSuccess={fetchRecords} />
                          : <EditSubDepartment defaultPayload={record} onSuccess={fetchRecords} />
                      )}

                      {canDelete && (
                      <button
                        onClick={() => isParent ? handleParentDelete(record.id) : handleDelete(record.id)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                      >
                        <Trash size={15} />
                      </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
