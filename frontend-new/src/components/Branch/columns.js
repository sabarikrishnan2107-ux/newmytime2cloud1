// columns.js
"use client";

import { useState } from "react";
import { MoreVertical, PenBox, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import Edit from "@/components/Branch/Edit";

import { deleteBranch } from "@/lib/api";
import { parseApiError } from "@/lib/utils";


function OptionsMenu({ item, onSuccess = () => { }, canEdit = true, canDelete = true }) {
  const [openEdit, setOpenEdit] = useState(false);

  const onDelete = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this item?");
    if (!confirmDelete) return;
    try {
      await deleteBranch(id);
      onSuccess();
    } catch (error) {
      console.log(parseApiError(error));
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <div className="p-2 rounded-full cursor-pointer w-fit">
            <MoreVertical className="w-5 h-5 text-gray-400" />
          </div>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-32 bg-white dark:bg-gray-900 shadow-md rounded-md py-1"
          onClick={(e) => e.stopPropagation()}
        >
          {canEdit !== false && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setOpenEdit(true);
            }}
            className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
          >
            <PenBox className="w-4 h-4 text-slate-700 dark:text-slate-200" />
            <span className="text-slate-700 dark:text-slate-200 font-medium">Edit</span>
          </DropdownMenuItem>
          )}
          {canDelete !== false && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
            className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
            <span className="text-red-600 dark:text-red-400 font-medium">Delete</span>
          </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {openEdit && (
        <Edit
          initialData={item}
          controlledOpen={true}
          controlledSetOpen={(val) => setOpenEdit(val)}
          onSuccess={() => {
            onSuccess();
            setOpenEdit(false);
          }}
        />
      )}
    </>
  );
}

export default function Columns({ handleRowClick, onSuccess = () => { }, canEdit = true, canDelete = true } = {}) {
  return [
    {
      key: "branch_name",
      header: "Name",
      render: (item) => (
        <span onClick={() => handleRowClick(item)}
          className="text-sm text-slate-600 dark:text-slate-300 hidden xl:table-cell"
        >
          {item.branch_name || "—"}
        </span>
      ),
    },

    {
      key: "branch_code",
      header: "Short Name",
      render: (item) => (
        <span onClick={() => handleRowClick(item)}
          className="text-sm text-slate-600 dark:text-slate-300 hidden xl:table-cell"
        >
          {item.branch_code || "—"}
        </span>
      ),
    },
    {
      key: "address",
      header: "Location",
      render: (item) => (
        <span
          className="text-sm text-slate-600 dark:text-slate-300 hidden xl:table-cell"
        >
          {item.address || "—"}
        </span>
      ),
    },

    {
      key: "latlon",
      header: "Lat/Lon",
      render: (item) => (
        <span
          className="text-sm text-slate-600 dark:text-slate-300 hidden xl:table-cell"
        >
          {item.lat || "—"} {item.lon || "—"}
        </span>
      ),
    },

    {
      key: "created_date",
      header: "Since",
      render: (item) => (
        <span
          className="text-sm text-slate-600 dark:text-slate-300 hidden xl:table-cell"
        >
          {item.created_date || "—"}
        </span>
      ),
    },

    {
      key: "options",
      header: "Options",
      render: (item) => (
        <OptionsMenu
          item={item}
          onSuccess={onSuccess}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      ),
    },
  ];
}
