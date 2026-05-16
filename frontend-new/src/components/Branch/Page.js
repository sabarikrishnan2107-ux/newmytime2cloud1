"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { getBranchesForTable } from "@/lib/api";
import Pagination from "@/lib/Pagination";
import Columns from "./columns";
import Create from "@/components/Branch/Create";
import Edit from "@/components/Branch/Edit";
import { useRouter } from "next/navigation";
import { parseApiError } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Branch() {
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchRecords();
  }, [currentPage, perPage]);

  const fetchRecords = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await getBranchesForTable({ page: currentPage, per_page: perPage });
      if (result && Array.isArray(result.data)) {
        setRecords(result.data);
        setCurrentPage(result.current_page || 1);
        setTotal(result.total || 0);
      }
    } catch (error) {
      setError(parseApiError(error));
    } finally {
      setIsLoading(false);
    }
  };

  const router = useRouter();

  const handleRowClick = (item) => {
    setEditingBranch(item);
    setEditOpen(true);
  };

  const handleSuccess = () => {
    setOpen(false);
    fetchRecords();
  };

  const columns = Columns({ onSuccess: fetchRecords, handleRowClick });

  const filtered = records.filter(b =>
    !search || (b.branch_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (b.address || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* Content Header */}
      <div className="flex justify-between items-end mb-10">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">Branches</h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm">Manage and configure your organizational branch network.</p>
        </div>
        <button onClick={() => setOpen(true)}
          className="bg-gradient-to-br from-indigo-500 to-indigo-700 dark:from-indigo-400 dark:to-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all text-sm">
          <span className="material-symbols-outlined text-lg">add</span>
          Add Branch
        </button>
      </div>

      {/* Data Table Card */}
      <div className="bg-white dark:bg-[#131b2e] rounded-2xl overflow-hidden border border-gray-200 dark:border-white/5 shadow-xl">
        {/* Table Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-[#060e20]/50">
          <div className="flex items-center gap-4">
            <span className="text-gray-800 dark:text-white font-semibold text-sm">Active Branches</span>
            <span className="bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] px-2.5 py-0.5 rounded-full font-bold">{total} Total</span>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 text-[18px]">search</span>
              <input value={search} onChange={e => setSearch(e.target.value)}
                className="bg-gray-100 dark:bg-[#060e20] border-none rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-1 focus:ring-indigo-500/40 w-64 text-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-slate-600"
                placeholder="Search branches..." type="text" />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 dark:bg-[#060e20]/30">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 dark:text-slate-500 tracking-[0.1em] uppercase">Name</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 dark:text-slate-500 tracking-[0.1em] uppercase">Short Name</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 dark:text-slate-500 tracking-[0.1em] uppercase">Location</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 dark:text-slate-500 tracking-[0.1em] uppercase">Lat / Lon</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 dark:text-slate-500 tracking-[0.1em] uppercase">Country</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 dark:text-slate-500 tracking-[0.1em] uppercase">Since</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 dark:text-slate-500 tracking-[0.1em] uppercase text-right">Options</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {isLoading ? (
                <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-400 dark:text-slate-500 text-sm">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-400 dark:text-slate-500 text-sm">No branches found</td></tr>
              ) : filtered.map((item, i) => (
                <tr key={item.id || i} className="hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors group cursor-pointer"
                  onClick={() => handleRowClick(item)}>
                  <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white text-sm">{item.branch_name || "—"}</td>
                  <td className="px-6 py-4 text-indigo-600 dark:text-indigo-400 font-mono text-xs">{item.branch_code || "—"}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-slate-400 text-sm">{item.address || "—"}</td>
                  <td className="px-6 py-4 text-gray-400 dark:text-slate-500 font-mono text-xs">{item.lat || "—"} / {item.lon || "—"}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-slate-400 text-sm font-medium">{item.country || "—"}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-slate-400 text-sm">{item.created_date || "—"}</td>
                  <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                    {columns.find(c => c.key === "options")?.render(item)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-white/5">
          <Pagination
            page={currentPage}
            perPage={perPage}
            total={total}
            onPageChange={setCurrentPage}
            onPerPageChange={(n) => { setPerPage(n); setCurrentPage(1); }}
            pageSizeOptions={[10, 25, 50]}
          />
        </div>
      </div>


      {/* Create Dialog */}
      {open && <Create setOpen={setOpen} onSuccess={handleSuccess} />}

      {/* Edit Dialog (controlled by row click) */}
      {editingBranch && (
        <Edit
          controlledOpen={editOpen}
          controlledSetOpen={(v) => {
            setEditOpen(v);
            if (!v) setEditingBranch(null);
          }}
          initialData={editingBranch}
          onSuccess={() => {
            setEditOpen(false);
            setEditingBranch(null);
            fetchRecords();
          }}
        />
      )}
    </>
  );
}
