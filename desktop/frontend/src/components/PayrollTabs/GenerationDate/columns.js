// columns.js
"use client";

import { useState } from "react";
import { MoreVertical, PenBox, Trash2 } from "lucide-react";
import Edit from "./Edit";
import { deletePayrollFormula } from "@/lib/api";
import { parseApiError } from "@/lib/utils";
import { useTranslation } from "react-i18next";

function OptionsMenu({ item, pageTitle, onSuccess = (e) => { e } }) {
  const { t } = useTranslation();
  const [openEdit, setOpenEdit] = useState(false);

  const onDelete = async (id) => {
    const confirmDelete = window.confirm(t("payroll.tabs.confirmDelete"));
    if (!confirmDelete) return; // exit if user cancels
    try {
      await deletePayrollFormula(id);
      onSuccess({ title: t("payroll.tabs.actions.successDeleted", { title: pageTitle }), description: t("payroll.tabs.actions.successDeletedDesc", { title: pageTitle }) }); actualSetOpen(false);
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
            <PenBox size={14} /> {t("payroll.common.edit")}
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="flex items-center gap-2 text-sm w-full text-left px-3 py-2 hover:bg-gray-100 text-gray-600"
          >
            <Trash2 size={14} /> {t("payroll.common.delete")}
          </button>
        </div>
      )}

      {/* 👇 Edit Dialog Integration */}
      {openEdit === "edit" && (
        <Edit
          pageTitle={pageTitle}
          initialData={item}
          controlledOpen={true}
          controlledSetOpen={(val) => setOpenEdit(val ? "edit" : false)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}

export default function Columns({ pageTitle, onSuccess = (e) => { e }, t = (k) => k } = {}) {
  return [
    {
      key: "branch",
      header: t("payroll.common.branch"),
      render: (item) => (
        <span className="text-gray-800 cursor-pointer" title={item.branch?.branch_name || "—"}>
          {item.branch?.branch_name || "—"}
        </span>
      ),
    },
    {
      key: "date",
      header: t("payroll.tabs.generationDate.date"),
      render: (item) => (
        <span className="text-gray-800 cursor-pointer" title={item.date || "—"}>
          {item.date || "—"}
        </span>
      ),
    },
    {
      key: "options",
      header: t("payroll.tabs.options"),
      render: (item) => (
        <OptionsMenu pageTitle={pageTitle} item={item} onSuccess={onSuccess} />
      ),
    },
  ];
}
