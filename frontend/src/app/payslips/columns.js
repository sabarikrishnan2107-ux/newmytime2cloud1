// columns.js
import {
  MoreVertical,
  Trash,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import ProfilePicture from "@/components/ProfilePicture";

export default (deleteEmployee) => [
  {
    key: "employee",
    header: "Personnel",
    render: (e) => (
      <div className="flex items-center space-x-3">

        <ProfilePicture src={e.profile_picture} />

        <div>
          <p className="font-medium text-sm text-slate-600 dark:text-slate-300 hidden xl:table-cell">{e?.first_name}</p>
          <p className="text-sm text-gray-500">
            ID: {e.employee_id}
          </p>
        </div>
      </div>
    ),
  },
  {
    key: "branch",
    header: "Branch / Department",
    render: (employee) => (
      <div className="text-sm text-slate-600 dark:text-slate-300 hidden xl:table-cell">
        {employee.branch?.branch_name || "N/A"} / {employee.department?.name || "N/A"}
      </div>
    ),
  },
  {
    key: "position",
    header: "Position",
    render: (employee) => (
      <div className="text-sm text-slate-600 dark:text-slate-300 hidden xl:table-cell">
        {employee.designation?.name || "N/A"}
      </div>
    ),
  },
  {
    key: "basic_salary",
    header: "Basic Salary",
    render: ({ payroll }) => (
      <div className="text-sm text-slate-600 dark:text-slate-300 hidden xl:table-cell">
        <p className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">{payroll?.basic_salary || "—"}</p>
      </div>
    ),
  },

  {
    key: "net_salary",
    header: "Net Salary",
    render: ({ payroll }) => (
      <div className="text-sm text-slate-600 dark:text-slate-300 hidden xl:table-cell">
        <p className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">{payroll?.net_salary || "—"}</p>
      </div>
    ),
  },

  {
    key: "actions",
    header: "Actions",
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
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Delete payroll for ${employee.first_name || 'this employee'}?`)) {
                deleteEmployee?.(employee);
              }
            }}
            className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
          >
            <Trash className="w-4 h-4 text-red-600 dark:text-red-400" />
            <span className="text-red-600 dark:text-red-400 font-medium">Delete</span>
          </DropdownMenuItem>


        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];
