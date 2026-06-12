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
          <ProfilePicture src={employee.profile_picture} />
          {/* <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></div> */}
        </div>
        <div>
          <div className="font-medium text-slate-800 dark:text-slate-100">
            {employee.full_name}
          </div>
          <div className="text-xs text-slate-400">
            {employee.designation?.title || employee.last_name}
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
        {employee.branch?.branch_name || "-"} / {employee.department?.name || "-"}
      </div>
    ),
  },
  {
    key: "group",
    header: "Group",
    render: ({ employee }) => (
      <div className="text-sm text-slate-600 dark:text-slate-300 hidden xl:table-cell">
        {employee.leave_group?.group_name || "-"}
      </div>
    ),
  },
  {
    key: "leave_type",
    header: "Leave Type",
    render: (employee) => (
      <div className="text-sm text-slate-600 dark:text-slate-300 hidden xl:table-cell">
        {employee.leave_type?.name || employee.leave_type?.short_name || "-"}
      </div>
    ),
  },
  {
    key: "duration",
    header: "Duation",
    render: ({ start_date, end_date }) => (
      <div className="text-sm text-slate-600 dark:text-slate-300 hidden xl:table-cell">
        {start_date} to {end_date}
      </div>
    ),
  },

  {
    key: "leave_note",
    header: "Leave Note",
    render: ({ reason }) => (
      <div className="text-sm text-slate-600 dark:text-slate-300 hidden xl:table-cell">
        {reason}
      </div>
    ),
  },

  {
    key: "created_at",
    header: "Applied On",
    render: ({ created_at }) => (
      <div className="text-sm text-slate-600 dark:text-slate-300 hidden xl:table-cell">
        {created_at}
      </div>
    ),
  },

  {
    key: "timeline",
    header: "Timeline",
    render: ({ employee_leave_timelines }) => {
      const timelines = employee_leave_timelines || [];

      return (
        <Popover>
          <PopoverTrigger asChild>
            <History size={20} className=" text-blue-500" />
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4 shadow-xl max-h-[500px] overflow-y-auto" align="center">
            <div className="space-y-4">
              <h4 className="font-semibold leading-none text-slate-900 dark:text-slate-100">Leave Timeline</h4>
              <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-2">
                {timelines.length > 0 ? (
                  timelines.map((item, index) => (
                    <div key={item.id} className="mb-6 ml-4 last:mb-0">
                      {/* The Dot */}
                      <span className="absolute -left-[9px] flex items-center justify-center w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-2 border-blue-500">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                      </span>

                      {/* Date */}
                      <time className="block mb-1 text-[10px] leading-none text-slate-400 uppercase">
                        {new Date(item.created_at).toLocaleString()}
                      </time>

                      {/* Description (Parsing HTML) */}
                      <div
                        className="text-sm text-slate-600 dark:text-slate-300 [&>b]:font-bold [&>.primary--text]:text-blue-600"
                        dangerouslySetInnerHTML={{ __html: item.description }}
                      />
                    </div>
                  ))
                ) : (
                  <div className="ml-4 text-sm text-slate-500">No timeline data available.</div>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      );
    },
  },

  {
    key: "status",
    header: "Status",
    render: ({ status }) => {
      const statusConfig = {
        0: {
          label: "Pending",
          // Light: Soft Amber | Dark: Muted Gold with subtle glow
          color: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-500 dark:border-amber-500/20",
        },
        1: {
          label: "Approved",
          // Light: Soft Emerald | Dark: Neon Mint
          color: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
        },
        2: {
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
