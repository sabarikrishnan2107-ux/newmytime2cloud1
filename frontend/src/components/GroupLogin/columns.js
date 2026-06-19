// columns.js
import {
  ScanFace,
  QrCode,
  Fingerprint,
  Hand,
  Lock,
  MoreVertical,
  Pencil,
  Trash
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export default (editItem, deleteItem, perms = {}) => [
  {
    key: "employee",
    header: "Name",
    render: (item) => (
      <div className="flex items-center gap-4">
        <div className="relative">
          <img
            alt={item?.name}
            className="h-10 w-10 rounded-full object-cover ring-2 ring-white dark:ring-slate-700 shadow-sm"
            src={
              item?.login_employee?.profile_picture ||
              `https://placehold.co/40x40/6946dd/ffffff?text=${item?.name.charAt(0)}`
            }
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = `https://placehold.co/40x40/6946dd/ffffff?text=${item?.name.charAt(0)}`;
            }} />
          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></div>
        </div>
        <div>
          <div className="font-medium text-slate-800 dark:text-slate-100">
            {item?.name}
          </div>
          <div className="text-xs text-slate-400">
            ID: {item?.login_employee?.employee_id || "-"}
          </div>
        </div>
      </div>
    ),
  },
  {
    key: "mobile_email",
    header: "Mobile / Email",
    render: (item) => (
      <div className="text-sm text-slate-600 dark:text-slate-300 hidden xl:table-cell">
        <p className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">{item?.email || "—"}</p>
        <br />
        <p className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">{item?.login_employee?.phone_number || "—"}</p>
      </div>
    ),
  },
  {
    key: "branch_department",
    header: "Branch / Department",
    render: (item) => (
      <div className="text-sm text-slate-600 dark:text-slate-300 hidden xl:table-cell">
        <p className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">{item?.login_employee?.department?.branch?.name || "—"}</p>
        <br />
        <p className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">{item?.login_employee?.department?.name || "—"}</p>
      </div>
    ),
  },
  {
    key: "role",
    header: "Role",
    render: (item) => (
      <div className="text-sm text-slate-600 dark:text-slate-300 hidden xl:table-cell">
        {item?.role?.name || "N/A"}
      </div>
    ),
  },

  {
    key: "validty",
    header: "Validty",
    render: (item) => (
      <div className="text-sm text-slate-600 dark:text-slate-300 hidden xl:table-cell">
        {item?.start_date_display || "N/A"} - {item?.end_date_display || "N/A"}
      </div>
    ),
  },

  {
    key: "actions",
    header: "Actions",
    render: (item) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <MoreVertical className="w-5 h-5 text-gray-400 hover:text-gray-700 cursor-pointer" title="More Options" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-30 bg-white shadow-md rounded-md py-1">
          {perms.canEdit !== false && (
          <DropdownMenuItem
            onClick={() => editItem(item)}
            className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100"
          >
            <Pencil className="w-4 h-4 text-slate-700 dark:text-slate-200" /> <span className="text-primary">Edit</span>
          </DropdownMenuItem>
          )}

          {perms.canDelete !== false && (
          <DropdownMenuItem
            onClick={() => deleteItem(item.id)}
            className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100"
          >
            <Trash className="w-4 h-4 text-gray-500" /> <span className="text-gray-500">Delete</span>
          </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];
