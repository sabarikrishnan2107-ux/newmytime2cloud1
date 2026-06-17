// columns.js
"use client";

import { useState } from "react";
import { MoreVertical, PenBox, Trash2 } from "lucide-react";
import Edit from "@/components/Company/Admin/Edit";

import { deleteAdmin } from "@/lib/api";
import { parseApiError } from "@/lib/utils";


function OptionsMenu({ admin, pageTitle, onSuccess = (e) => { e } }) {
  const [openEdit, setOpenEdit] = useState(false);

  const onDelete = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this item?");
    if (!confirmDelete) return; // exit if user cancels
    try {
      await deleteAdmin(id);
      onSuccess({ title: `${pageTitle} Deleted`, description: `${pageTitle} Deleted successfully` }); actualSetOpen(false);
      setOpenEdit(false); // close menu
    } catch (error) {
      console.log(parseApiError(error));
    }
  };

  const handleSuccess = (e) => {
    onSuccess(e); // refresh parent data
    setOpenEdit(false);
  }

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
          pageTitle={pageTitle}
          initialData={admin}
          controlledOpen={true}
          controlledSetOpen={(val) => setOpenEdit(val ? "edit" : false)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}


export default function Columns({ pageTitle, onSuccess = (e) => { e } } = {}) {
  return [
    {
      key: "name",
      header: "Name",
      render: (admin) => (
        <span
          className="text-gray-800 cursor-pointer"
          title={admin.name || "—"}
        >
          {admin.name || "—"}
        </span>
      ),
    },
    {
      key: "email",
      header: "Email",
      render: (admin) => (
        <span
          className="text-gray-800 cursor-pointer"
          title={admin.email || "—"}
        >
          {admin.email || "—"}
        </span>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (admin) => (
        <span
          className="text-gray-800 cursor-pointer"
          title={admin.role?.name || "—"}
        >
          {admin.role?.name || "—"}
        </span>
      ),
    },
    {
      key: "options",
      header: "Options",
      render: (admin) => (
        <OptionsMenu
          pageTitle={pageTitle}
          admin={admin}
          onSuccess={onSuccess}
        />
      ),
    },
  ];
}
