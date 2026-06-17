// columns.js
import { MoreVertical, Pencil, Trash } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

const safe = (v, fallback = "—") => (v === null || v === undefined || v === "" ? fallback : v);

export default function (handleRowClick, onEdit, onDelete, t = (k) => k, perms = {}) {
  return [
    {
      key: "name",
      header: t("shift.columns.name"),
      render: (shift) => (
        <p onClick={() => handleRowClick(shift)} className="text-sm text-slate-600 dark:text-slate-300 hidden xl:table-cell">
          {safe(shift?.name)}
        </p>
      ),
    },
    {
      key: "shift_type",
      header: t("shift.columns.type"),
      render: (shift) => (
        <p onClick={() => handleRowClick(shift)} className="text-sm text-slate-600 dark:text-slate-300 hidden xl:table-cell">
          {safe(shift?.shift_type?.name)}
        </p>
      ),
    },
    {
      key: "duty",
      header: t("shift.columns.onOffDuty"),
      render: (shift) => (
        <p onClick={() => handleRowClick(shift)} className="text-sm text-slate-600 dark:text-slate-300 hidden xl:table-cell">
          {safe(shift?.on_duty_time)}{shift?.off_duty_time ? " - " : ""}{safe(shift?.off_duty_time, "")}
          {
            shift.shift_type_id == 5 ? <>
              <br />
              {safe(shift?.on_duty_time1)}{shift?.off_duty_time1 ? " - " : ""}{safe(shift?.off_duty_time1, "")}
            </>
              : null
          }
        </p>
      ),
    },
    {
      key: "working_hours",
      header: t("shift.columns.totalHrs"),
      render: (shift) => (
        <p onClick={() => handleRowClick(shift)} className="text-sm text-slate-600 dark:text-slate-300 hidden xl:table-cell">
          {safe(shift?.working_hours, "")}
        </p>
      ),
    },
    {
      key: "break_duration",
      header: t("shift.columns.autoDeductBreak"),
      render: (shift) => (
        <p onClick={() => handleRowClick(shift)} className="text-sm text-slate-600 dark:text-slate-300 hidden xl:table-cell">
          {safe(shift?.break_duration, "")}
        </p>
      ),
    },
    // {
    //   key: "weekoff_rules",
    //   header: "Weekoff Config",
    //   render: (shift) => (
    //     <div onClick={() => handleRowClick(shift)} className="flex items-center gap-1 flex-nowrap whitespace-nowrap hidden xl:flex cursor-pointer">
    //       <span className="text-sm text-slate-400 mr-1">{safe(shift?.weekoff_rules?.type, "")}: </span>
    //       {shift?.weekoff_rules?.days?.map((day, i) => (
    //         <span key={i} className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-medium border border-slate-200 dark:border-slate-700 shrink-0">
    //           {day}
    //         </span>
    //       ))}
    //     </div>
    //   ),
    // },
    {
      key: "auto",
      header: t("shift.columns.autoShift"),
      render: (shift) => (
        <p onClick={() => handleRowClick(shift)} className="text-sm text-slate-600 dark:text-slate-300 hidden xl:table-cell">
          {shift?.isAutoShift ? t("shift.yes") : t("shift.no")}
        </p>
      ),
    },
    {
      key: "actions",
      header: t("shift.columns.actions"),
      render: (employee) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            asChild
            /* This prevents the dropdown trigger itself from triggering the row click */
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-2 rounded-full cursor-pointer w-fit">
              <MoreVertical className="w-5 h-5 text-gray-400" />
            </div>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="w-32 bg-white dark:bg-gray-900 shadow-md rounded-md py-1"
            /* This prevents clicking inside the menu from triggering the row click */
            onClick={(e) => e.stopPropagation()}
          >
            {perms.canEdit !== false && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation(); // Stop row redirect
                onEdit(employee.id)
              }}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
            >
              <Pencil className="w-4 h-4 text-slate-700 dark:text-slate-200" />
              <span className="text-slate-700 dark:text-slate-200 font-medium">{t("shift.edit")}</span>
            </DropdownMenuItem>
            )}

            {perms.canDelete !== false && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation(); // Stop row redirect
                onDelete(employee.id);
              }}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
            >
              <Trash className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span className="text-red-600 dark:text-red-400 font-medium">{t("shift.delete")}</span>
            </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}
