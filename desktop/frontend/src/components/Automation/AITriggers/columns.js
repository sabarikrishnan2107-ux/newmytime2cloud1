// columns.js
"use client";

import { useState } from "react";
import { MoreVertical, PenBox, Trash2 } from "lucide-react";
import AiTriggerEdit from "@/components/Automation/AITriggers/Edit";

import { deleteItem } from "@/lib/endpoint/ai_triggers";

import { parseApiError } from "@/lib/utils";


function OptionsMenu({ admin, onSuccess = () => { } }) {
  const [openEdit, setOpenEdit] = useState(false);

  const onDelete = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this item?");
    if (!confirmDelete) return; // exit if user cancels

    try {
      await deleteItem(id);
      onSuccess();
    } catch (error) {
      console.log(parseApiError(error));
    }
  };

  return (
    <div className="relative">
      <AiTriggerEdit
        defaultPayload={admin}
        onSuccess={() => {
          onSuccess(); // refresh parent data
          setOpenEdit(false);
        }}
      />
      <button onClick={() => onDelete(admin.id)} className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
        <Trash2 size={15} />
      </button>
    </div>
  );
}


export default function Columns({ onSuccess = () => { } } = {}) {
  return [
    {
      key: "Description",
      header: "Description",
      render: (admin) => (
        <span
          className="text-sm w-[150px] text-slate-600 dark:text-slate-300 hidden xl:table-cell"
          title={admin.description || "—"}
        >
          {admin.description || "—"}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (admin) => (
        <span
          className="text-sm w-[150px] text-slate-600 dark:text-slate-300 hidden xl:table-cell"
          title={admin.type || "—"}
        >
          {admin.type || "—"}
        </span>
      ),
    },
    {
      key: "frequency",
      header: "Frequency",
      render: (admin) => (
        <span
          className="text-sm w-[150px] text-slate-600 dark:text-slate-300 hidden xl:table-cell"
          title={admin.frequency || "—"}
        >
          {admin.frequency || "—"}
        </span>
      ),
    },
    {
      key: "run_time",
      header: "Scheduled AT",
      render: (admin) => (
        <span
          className="text-sm w-[150px] text-slate-600 dark:text-slate-300 hidden xl:table-cell"
          title={admin.run_time || "—"}
        >
          {admin.run_time || "—"}
        </span>
      ),
    },
    {
      key: "created_at",
      header: "Created At",
      render: (admin) => (
        <span
          className="text-sm text-slate-600 dark:text-slate-300 hidden xl:table-cell"
          title={admin.created_at || "—"}
        >
          {admin.created_at || "—"}
        </span>
      ),
    },
    {
      key: "options",
      header: "Actions",
      render: (admin) => (
        <OptionsMenu
          admin={admin}
          onSuccess={onSuccess}
        />
      ),
    },
  ];
}
