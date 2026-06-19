// columns.js
import { MoreVertical, Pencil, Trash } from "lucide-react";

import { Badge } from "@/components/ui/badge"; // Assuming you have shadcn Badge

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export default (deleteItem, editItem, perms = {}) => [
  {
    key: "Holiday Name",
    header: "Holiday",
    render: ({ name }) => (
      <div className="text-sm text-slate-600 dark:text-slate-300 hidden xl:table-cell">
        {name}
      </div>
    ),
  },
  {
    key: "branch",
    header: "Branch",
    render: ({ branch }) => (
      <div className="text-sm text-slate-600 dark:text-slate-300 hidden xl:table-cell">
        {branch?.branch_name || "-"}
      </div>
    ),
  },

  {
    key: "from",
    header: "From",
    render: ({ start_date }) => (
      <div className="text-sm text-slate-600 dark:text-slate-300 hidden xl:table-cell">
        {start_date}
      </div>
    ),
  },

  {
    key: "to",
    header: "To",
    render: ({ end_date }) => (
      <div className="text-sm text-slate-600 dark:text-slate-300 hidden xl:table-cell">
        {end_date}
      </div>
    ),
  },

  {
    key: "total_days",
    header: "Total Days",
    render: ({ total_days }) => (
      <div className="text-sm text-slate-600 dark:text-slate-300 hidden xl:table-cell">
        {total_days}
      </div>
    ),
  },

  {
    key: "last_sync_at",
    header: "Last Sync At",
    render: ({ last_sync_at }) => (
      <div className="text-sm text-slate-600 dark:text-slate-300 hidden xl:table-cell">
        {last_sync_at}
      </div>
    ),
  },

  {
    key: "status",
    header: "Status",
    render: ({ start_date }) => {
      // 1. Calculate status based on date
      const today = new Date();
      const startDate = new Date(start_date);

      // If start_date is in the past, use "P", otherwise "A"
      const statusKey = startDate < today ? "P" : "A";

      const statusConfig = {
        "P": {
          label: "Past",
          color: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-500 dark:border-amber-500/20",
        },
        "A": {
          label: "Active",
          color: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
        },
      };

      const current = statusConfig[statusKey];

      return (
        <div className="flex items-center">
          <Badge
            variant="outline"
            className={`flex items-center gap-1.5 font-medium px-2.5 py-0.5 rounded-full ${current.color}`}
          >
            {current.label}
          </Badge>
        </div>
      );
    },
  },

  {
    key: "actions",
    header: "Actions",
    render: (employee) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <MoreVertical className="w-5 h-5 text-gray-400 hover:text-gray-700 cursor-pointer" title="More Options" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-30 bg-white shadow-md rounded-md py-1">
          {perms.canEdit !== false && (
          <DropdownMenuItem
            onClick={() => editItem(employee)}
            className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100"
          >
            <Pencil className="w-4 h-4 text-slate-700 dark:text-slate-200" /> <span className="text-primary">Edit</span>
          </DropdownMenuItem>
          )}
          {perms.canDelete !== false && (
          <DropdownMenuItem
            onClick={() => deleteItem(employee.id)}
            className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100"
          >
            <Trash className="w-4 h-4 text-red-600 dark:text-red-400" /> <span className="text-primary">Delete</span>
          </DropdownMenuItem>
          )}
        </DropdownMenuContent>

      </DropdownMenu>
    ),
  },
];
