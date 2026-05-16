"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";

import { getUser } from "@/config";
import { notify } from "@/lib/utils";
import DropDown from "../ui/DropDown";
import { updateRequest } from "@/lib/endpoint/attendance";

function DetailCard({ label, value }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-slate-900/40">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-100">{value || "---"}</p>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "---";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function normalizeTime(value) {
  if (!value) return "---";

  const text = String(value).trim();
  if (!text) return "---";

  const match = text.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return text;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ChangeRequestDialog({ isOpen, setIsOpen, editedItem, onSuccess }) {
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedStatus(editedItem?.status || "P");
  }, [editedItem, isOpen]);

  const toggleModal = () => setIsOpen(false);

  const onSubmit = async () => {
    if (!editedItem?.id || !selectedStatus) return;

    const { company_id } = await getUser();

    const payload = {
      ...editedItem,
      status: selectedStatus,
      company_id,
    };

    setLoading(true);

    try {
      const result = await updateRequest(editedItem.id, payload);

      if (result.status) {
        notify("Success", "Change request has been updated", "success");
        onSuccess?.(true);
        setIsOpen(false);
      } else {
        notify("Error", result.message || "Change request cannot update", "error");
      }
    } catch (e) {
      console.error(e);
      notify("Error", "Change request cannot update", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !editedItem) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 top-[72px] z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
        onClick={toggleModal}
      />

      <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-800">
        <div className="flex items-start justify-between border-b border-gray-200 bg-white px-8 py-6 dark:border-white/10 dark:bg-slate-800">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-gray-700 dark:text-gray-100">Change Request Review</h3>
            <p className="text-xs text-slate-400">
              Review the submitted request window, remarks, and final approval status.
            </p>
          </div>

          <button
            onClick={toggleModal}
            className="rounded-full p-2 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6 overflow-y-auto bg-white px-8 py-7 dark:bg-slate-800">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <DetailCard label="Employee" value={editedItem?.employee?.full_name} />
            <DetailCard label="Branch" value={editedItem?.employee?.branch?.branch_name} />
            <DetailCard label="Request Type" value={editedItem?.request_type} />
            <DetailCard label="Status" value={editedItem?.status} />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <DetailCard label="From Date" value={formatDate(editedItem?.from_date)} />
            <DetailCard label="From Time" value={normalizeTime(editedItem?.from_time)} />
            <DetailCard label="To Date" value={formatDate(editedItem?.to_date)} />
            <DetailCard label="To Time" value={normalizeTime(editedItem?.to_time)} />
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 dark:border-white/10 dark:bg-slate-900/40">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Remarks</p>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{editedItem?.remarks || "---"}</p>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Update Status</p>
            <DropDown
              items={[
                { id: "P", name: "Pending" },
                { id: "A", name: "Approved" },
                { id: "R", name: "Rejected" },
              ]}
              value={selectedStatus}
              onChange={setSelectedStatus}
              placeholder="Select a Status"
              width="w-[320px]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-8 py-4 dark:border-white/10 dark:bg-slate-900/30">
          <button
            onClick={toggleModal}
            className="rounded-lg border border-gray-200 px-5 py-2 text-sm font-medium text-slate-600 transition-all hover:bg-gray-100 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
          >
            Close
          </button>

          <button
            onClick={onSubmit}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-slate-700 transition-all hover:bg-primary/90 dark:text-gray-100"
          >
            {loading ? "Saving..." : "Save Status"}
          </button>
        </div>
      </div>
    </div>
  );
}
