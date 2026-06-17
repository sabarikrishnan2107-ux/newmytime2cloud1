// columns.js
"use client";

import { useState } from "react";
import { MoreVertical, PenBox, Trash2 } from "lucide-react";
import Edit from "@/components/SubDepartment/Edit";

import { deleteSubDepartments } from "@/lib/api";
import { parseApiError } from "@/lib/utils";

function OptionsMenu({ admin, onSuccess = () => { } }) {
  const [openEdit, setOpenEdit] = useState(false);

  const onDelete = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this item?");
    if (!confirmDelete) return; // exit if user cancels
    try {
      await deleteSubDepartments(id);
      onSuccess(); // refresh parent data after successful delete
      setOpenEdit(false); // close menu
    } catch (error) {
      console.log(parseApiError(error));
    }
  };

  return (
    <div className="relative">
      <MoreVertical
        className="text-gray-600 hover:text-gray-800 cursor-pointer"
        onClick={() => setOpenEdit(!openEdit)}
      />

      {openEdit && (
        <div className="absolute mt-2 w-24 bg-white border rounded shadow-lg z-10">
          <button
            onClick={() => setOpenEdit("edit")}
            className="flex items-center gap-2 text-sm w-full text-left px-3 py-2 hover:bg-gray-100 text-gray-600"
          >
            <PenBox size={14} /> Edit
          </button>
          <button
            onClick={() => onDelete(admin.id)}
            className="flex items-center gap-2 text-sm w-full text-left px-3 py-2 hover:bg-gray-100 text-gray-600"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}

      {/* 👇 Edit Dialog Integration */}
      {openEdit === "edit" && (
        <Edit
          initialData={admin}
          controlledOpen={true}
          controlledSetOpen={(val) => setOpenEdit(val ? "edit" : false)}
          onSuccess={() => {
            onSuccess(); // refresh parent data
            setOpenEdit(false);
          }}
        />
      )}
    </div>
  );
}


export default function Columns({ onSuccess = () => { } } = {}) {
  return [
    {
      key: "name",
      header: "Name",
      render: (admin) => (
        <span
          className="text-sm text-slate-600 dark:text-slate-300 hidden xl:table-cell"
          title={admin.name || "—"}
        >
          {admin.name || "—"}
        </span>
      ),
    },
    {
      key: "options",
      header: "Options",
      render: (admin) => (
        <OptionsMenu
          admin={admin}
          onSuccess={onSuccess}
        />
      ),
    },
  ];
}
