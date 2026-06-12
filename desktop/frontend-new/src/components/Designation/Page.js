"use client";

import React, { useState, useEffect, useMemo } from "react";
import { deleteDesignations, getDesignations } from "@/lib/api";
import { notify, parseApiError } from "@/lib/utils";
import { getUser } from "@/config";
import { can } from "@/lib/permissions-check";
import Create from "@/components/Designation/Create";
import Input from "../Theme/Input";
import { Loader } from "../Loader";
import { Pencil, Trash } from "lucide-react";
import EditDesignation from "./Edit";

export default function Designation() {
  // Manager permission flags for the Designation (Organization Settings) feature.
  const user = getUser();
  const canCreate = can(user, "settings", "department-tabs", "create");
  const canEdit = can(user, "settings", "department-tabs", "edit");
  const canDelete = can(user, "settings", "department-tabs", "delete");
  const canView = can(user, "settings", "department-tabs", "view");

  const [records, setRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage] = useState(1000);
  const [total, setTotal] = useState(0);

  // 1. Fetch Logic
  const fetchRecords = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await getDesignations({
        page: currentPage,
        per_page: perPage,
      });

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

  useEffect(() => {
    fetchRecords();
  }, [currentPage, perPage]);

  // 2. Search Logic (Derived State)
  // We use useMemo to filter locally. It's faster and keeps code cleaner.
  const filteredDesignations = useMemo(() => {
    if (!searchTerm.trim()) return records;
    const term = searchTerm.toLowerCase();
    return records.filter((e) => e.name?.toLowerCase().includes(term));
  }, [searchTerm, records]);

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this employee?")) {
      try {
        await deleteDesignations(id);
        fetchRecords();
        notify("Success", "Designation deleted", "success")
      } catch (error) {
        console.error("Error deleting employee:", error);
      }
    }
  };

  return (
    <div className=" overflow-y-auto max-h-[600px]">
      <div className="p-5 border-b border-gray-200 dark:border-white/20 flex items-center justify-between bg-white dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-400">
            <span className="material-symbols-outlined">badge</span>
          </div>
          <h3 className="font-bold text-white text-lg">Designations</h3>
        </div>

        {canCreate && <Create onSuccess={fetchRecords} />}
      </div>

      <div className="p-4 bg-surface-card">
        <div className="relative group">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary material-symbols-outlined text-[20px] transition-colors">
            search
          </span>

          <Input
            placeholder="Search designations..."
            icon="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <Loader className="min-h-0 h-[300px]" />
      ) : (
        filteredDesignations.map((e) => (
          <div key={e.id} className="bg-white dark:bg-slate-900 p-2 space-y-1">
            <div className="group flex items-center justify-between p-3 rounded-lg hover:bg-background-dark/80 border border-transparent hover:border-gray-200 dark:border-white/20 transition-all cursor-pointer">
              <div>
                <span className="text-gray-600 dark:text-gray-300 font-semibold text-sm block">
                  {e.name}
                </span>
              </div>
              <div className="flex items-center gap-1 opacity-100">
                {canEdit && <EditDesignation defaultPayload={e} onSuccess={fetchRecords} />}

                {canDelete && (
                <button onClick={() => handleDelete(e.id)} className="p-1.5 rounded-md hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors">
                  <Trash size={15} />
                </button>
                )}
              </div>
            </div>
          </div>
        ))
      )}

      {!isLoading && filteredDesignations.length === 0 && (
        <div className="p-10 text-center text-slate-500 text-sm">
          No designations found.
        </div>
      )}
    </div>
  );
}