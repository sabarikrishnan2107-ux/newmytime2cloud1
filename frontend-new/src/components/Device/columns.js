import {
  Flame,
  MoreVertical,
  Pencil,
  Settings,
  Trash,
} from "lucide-react";
import { syncDeviceDateTime } from "@/lib/api";
import { notify, parseApiError } from "@/lib/utils";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

const DEVICE_TYPE_ICONS = {
  all: "/icons/device_type_all.png",
  attendance: "/icons/device_type_attendance.png",
  "access control": "/icons/device_type_access_control.png",
};

export default function Columns(
  deleteItem,
  editItem,
  deviceSettings,
  setOpenDoor,
  setCloseDoor,
  openAlwaysOpen
) {
  return [
    {
      key: "branch",
      header: "Branch",
      render: (device) => (
        <span
          className="text-slate-600 dark:text-slate-300 cursor-pointer block max-w-[150px] truncate"
          title={device.branch?.branch_name || "—"}
        >
          {device.branch?.branch_name || "—"}
        </span>
      ),
    },
    {
      key: "name",
      header: "Name",
      render: (device) => (
        <span
          className="text-slate-600 dark:text-slate-300 cursor-pointer block max-w-[150px] truncate"
          title={device.name || "—"}
        >
          {device.name || "—"}
        </span>
      ),
    },
    {
      key: "location",
      header: "Location",
      render: (device) => (
        <span
          className="text-slate-600 dark:text-slate-300 cursor-pointer block max-w-[180px] truncate"
          title={device.location || "—"}
        >
          {device.location || "—"}
        </span>
      ),
    },
    {
      key: "timezone",
      header: "Time Zone",
      render: (device) => (
        <span
          className="text-slate-600 dark:text-slate-300 block max-w-[160px] truncate"
          title={device.utc_time_zone || "—"}
        >
          {device.utc_time_zone || "—"}
        </span>
      ),
    },
    {
      key: "serial_number",
      header: "Serial No",
      render: (device) => (
        <span
          className="text-slate-600 dark:text-slate-300 block max-w-[160px] truncate"
          title={device.serial_number || "—"}
        >
          {device.serial_number || "—"}
        </span>
      ),
    },
    {
      key: "function",
      header: "Function",
      render: (device) => (
        <span
          onClick={(e) => {
            e.stopPropagation();
            setOpenDoor(device.device_id);
          }}
        >
          <img src="/icons/function_in_out.png" className="w-7" alt="Function" />
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (device) => {
        const typeKey = (device.device_type || "").toLowerCase().trim();
        const icon = DEVICE_TYPE_ICONS[typeKey] || DEVICE_TYPE_ICONS.all;

        return (
          <span title={device.device_type || "all"}>
            <img
              src={icon}
              className="w-7 h-7 object-contain"
              alt={device.device_type || "all"}
              onError={(e) => {
                e.currentTarget.src = DEVICE_TYPE_ICONS.all;
              }}
            />
          </span>
        );
      },
    },
    {
      key: "door_open",
      header: "Door Open",
      render: (device) => (
        <span
          title={device.door_open || "—"}
          onClick={(e) => {
            e.stopPropagation();
            setOpenDoor(device.device_id);
          }}
        >
          <img src="/icons/door_open.png" className="w-7" alt="Door Open" />
        </span>
      ),
    },
    {
      key: "door_close",
      header: "Door Close",
      render: (device) => (
        <span
          title={device.door_close || "—"}
          onClick={(e) => {
            e.stopPropagation();
            setCloseDoor(device.device_id);
          }}
        >
          <img src="/icons/door_close.png" className="w-7" alt="Door Close" />
        </span>
      ),
    },
    {
      key: "always_open",
      header: "Always Open",
      render: (device) => (
        <span
          title="Configure always-open time slots"
          onClick={(e) => {
            e.stopPropagation();
            if (typeof openAlwaysOpen === "function") openAlwaysOpen(device);
          }}
          className="inline-block cursor-pointer hover:opacity-80 transition"
        >
          <img
            src="/icons/always_open.png"
            alt={device.always_open ? "Yes" : "No"}
            className="w-7"
          />
        </span>
      ),
    },
    {
      key: "fire",
      header: "Fire",
      render: () => (
        <span className="text-center text-orange-500" title="Fire">
          <Flame size={25} />
        </span>
      ),
    },
    {
      key: "sync_date_time",
      header: "Time Sync",
      render: (device) => (
        <span
          className="text-slate-600 dark:text-slate-300 cursor-pointer block max-w-[150px] truncate"
          title={`Sync time to ${device.utc_time_zone || ''}`}
          onClick={async (e) => {
            e.stopPropagation();
            e.preventDefault();
            if (!confirm(`Sync device time to ${device.utc_time_zone || 'system'}?`)) return;
            try {
              const data = await syncDeviceDateTime(device.device_id, device.company_id);
              notify("Time Sync", data?.message || "Device time synced", "success");
            } catch (err) {
              notify("Time Sync Failed", parseApiError(err), "error");
            }
          }}
        >
          <img
            src="/icons/sync_date_time.png"
            className="w-7"
            alt="Time Sync"
          />
        </span>
      ),
    },
    {
      key: "status_id",
      header: "Status",
      render: (device) => {
        const isActive = device.status_id == 1;

        return (
          <div className="flex items-center justify-center space-x-2">
            <img
              src={`/icons/device_status_${isActive ? "open" : "close"}.png`}
              alt={isActive ? "Active" : "Inactive"}
              className="w-7 h-7 object-contain"
            />
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      render: (device) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            asChild
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-2 rounded-full cursor-pointer w-fit">
              <MoreVertical className="w-5 h-5 text-gray-400" />
            </div>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="w-32 bg-white dark:bg-gray-900 shadow-md rounded-md py-1"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                editItem(device);
              }}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
            >
              <Pencil className="w-4 h-4 text-slate-700 dark:text-slate-200" />
              <span className="text-slate-700 dark:text-slate-200 font-medium">Edit</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                deviceSettings(device);
              }}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
            >
              <Settings className="w-4 h-4 text-slate-700 dark:text-slate-200" />
              <span className="text-slate-700 dark:text-slate-200 font-medium">Settings</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                deleteItem(device.id);
              }}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
            >
              <Trash className="w-4 h-4 text-red-500" />
              <span className="text-red-600 dark:text-red-400 font-medium">Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}