// columns.js
import {
  MoreVertical,
  Pencil,
  Trash,
  History,
} from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"; // Ensure you have this shadcn component

import { Badge } from "@/components/ui/badge"; // Assuming you have shadcn Badge

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { getRandomItem } from "@/lib/utils";
import ProfilePicture from "@/components/ProfilePicture";
import LeaveViewDialog from "@/components/Employees/LeaveRequests";

export default (editItem) => [
  {
    key: "employee",
    header: "Name",
    render: ({ employee }) => (
      <div className="flex items-center gap-4">
        <div className="relative">
          <ProfilePicture src={employee?.profile_picture} />
          {/* <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></div> */}
        </div>
        <div>
          <div className="font-medium text-slate-800 dark:text-slate-100">
            {employee?.full_name}
          </div>
          <div className="text-xs text-slate-400">
            {employee?.designation?.title || employee?.last_name}
          </div>
        </div>
      </div>
    ),
  },
  {
    key: "branch",
    header: "Branch / Dept",
    render: ({ employee }) => (
      <div className="text-sm text-slate-600 dark:text-slate-300 hidden xl:table-cell">
        {employee?.branch?.branch_name || "-"} / {employee?.department?.name || "-"}
      </div>
    ),
  },

  {
    key: "duration",
    header: "Duration",
    render: ({ from_date, to_date }) => (
      <div className="text-sm text-slate-600 dark:text-slate-300 hidden xl:table-cell">
        {from_date} - {to_date}
      </div>
    ),
  },

  {
    key: "remarks",
    header: "Remarks",
    render: ({ remarks }) => (
      <div className="text-sm text-slate-600 dark:text-slate-300 hidden xl:table-cell">
        {remarks}
      </div>
    ),
  },

  {
    key: "requested_at",
    header: "Applied On",
    render: ({ requested_at }) => (
      <div className="text-sm text-slate-600 dark:text-slate-300 hidden xl:table-cell">
        {requested_at}
      </div>
    ),
  },


  {
    key: "status",
    header: "Status",
    render: ({ status }) => {
      const statusConfig = {
        "P": {
          label: "Pending",
          // Light: Soft Amber | Dark: Muted Gold with subtle glow
          color: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-500 dark:border-amber-500/20",
        },
        "A": {
          label: "Approved",
          // Light: Soft Emerald | Dark: Neon Mint
          color: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
        },
        "R": {
          label: "Rejected",
          // Light: Soft Rose | Dark: Crimson Tint
          color: "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20",
        },
      };
      const current = statusConfig[status] || { label: "Unknown", color: "bg-slate-100", icon: null };

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
          <DropdownMenuItem
            onClick={() => editItem(employee)}
            className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100"
          >
            <Pencil className="w-4 h-4 text-slate-700 dark:text-slate-200" /> <LeaveViewDialog editedItem={employee} />  <span className="text-primary">Edit</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];
