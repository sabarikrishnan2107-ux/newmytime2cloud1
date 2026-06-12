import { useState } from "react";
import { AlarmClock, MoreVertical, PenBox, Trash2 } from "lucide-react";
import { deleteDevice, syncDeviceDateTime } from "@/lib/api";
import { parseApiError, notify } from "@/lib/utils";


export default function Columns({ pageTitle, handleRowClick, onSuccess = (e) => { e }, canDelete = true } = {}) {

  return [
    {
      key: "name",
      header: "Name",
      render: (device) => (
        <span
          className="text-gray-800 cursor-pointer block max-w-[150px] truncate"
          title={device.name || "—"}
          onClick={() => handleRowClick(device.id)}
        >
          {device.name || "—"}
        </span>
      ),
    },
    {
      key: "utc_time_zone",
      header: "Time zone",
      render: (device) => (
        <span
          className="text-gray-800 cursor-pointer block max-w-[100px] truncate"
          title={device.utc_time_zone || "—"}
          onClick={() => handleRowClick(device.id)}
        >
          {device.utc_time_zone || "—"}
        </span>
      ),
    },
    {
      key: "device_id",
      header: "Serial Number",
      render: (device) => (
        <span
          className="text-gray-800 cursor-pointer block max-w-[120px] truncate"
          title={device.device_id || "—"}
          onClick={() => handleRowClick(device.id)}
        >
          {device.device_id || "—"}
        </span>
      ),
    },
    {
      key: "function",
      header: "Function",
      render: (device) => (
        <span
          className="text-gray-800 cursor-pointer block max-w-[100px] truncate"
          title={device.function || "—"}
          onClick={() => handleRowClick(device.id)}
        >
          {device.function || "—"}
        </span>
      ),
    },
    {
      key: "device_type",
      header: "Type",
      render: (device) => (
        <span
          className="text-gray-800 cursor-pointer block max-w-[100px] truncate"
          title={device.device_type || "—"}
          onClick={() => handleRowClick(device.id)}
        >
          {device.device_type || "—"}
        </span>
      ),
    },
    {
      key: "door_open",
      header: "Door Open",
      render: (device) => (
        <span
          title={device.door_open || "—"}
          onClick={() => console.log(device.id)}
        >
          <img src="/icons/door_open.png" className="w-7" />
        </span>
      ),
    },
    {
      key: "door_close",
      header: "Door Close",
      render: (device) => (
        <span
          title={device.door_close || "—"}
          onClick={() => console.log(device.id)}
        >
          <img src="/icons/door_close.png" className="w-7" />
        </span>
      ),
    },
    {
      key: "always_open",
      header: "Always Open",
      render: (device) => (
        <span
          title={device.always_open ? "Yes" : "No"}
          onClick={() => console.log(device.id)}
          className="inline-block"
        >
          <img
            src="/icons/always_open.png"
            alt={device.always_open ? "Yes" : "No"}
            className="w-7" // small size
          />
        </span>
      ),
    }
    ,
    {
      key: "alarm",
      header: "Alarm",
      render: (device) => (
        <span className="text-center text-gray-800">
          <AlarmClock size={25} />
        </span>
      ),
    },
    {
      key: "sync_date_time",
      header: "Time Sync",
      render: (device) => (
        <span
          className="text-gray-800 cursor-pointer block max-w-[150px] truncate"
          title={`Sync time to ${device.utc_time_zone || ''}`}
          onClick={async (e) => {
            e.stopPropagation();
            if (!confirm(`Sync device time to ${device.utc_time_zone || 'system'}?`)) return;
            try {
              const data = await syncDeviceDateTime(device.device_id, device.company_id);
              notify("Time Sync", data?.message || "Device time synced", "success");
            } catch (err) {
              notify("Time Sync Failed", parseApiError(err), "error");
            }
          }}
        >
          <img src="/icons/sync_date_time.png" className="w-7" />
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
              src={`/icons/device_status_${isActive ? 'open' : 'close'}.png`}
              alt={isActive ? "Active" : "Inactive"}
              className="w-7 h-7 object-contain"
            />
          </div>
        );
      },
    },

    {
      key: "options",
      header: "Options",
      render: (device) => (
        <OptionsCell device={device} pageTitle={pageTitle} onSuccess={onSuccess} canDelete={canDelete} />
      ),
    }
  ];
}

function OptionsCell({ device, pageTitle, onSuccess, canDelete = true }) {
  const [open, setOpen] = useState(false);

  const onDeleteDevice = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this item?");
    if (!confirmDelete) return;
    try {
      await deleteDevice(id);
      onSuccess({ title: `${pageTitle} Deleted`, description: `${pageTitle} Deleted successfully` });
      setOpen(false);
    } catch (error) {
      console.log(parseApiError(error));
    }
  };

  return (
    <div className="relative">
      <MoreVertical className="text-gray-600 hover:text-gray-800" onClick={() => setOpen(!open)} />

      {open && canDelete !== false && (
        <div className="absolute mt-2 w-24 bg-white border rounded shadow-lg z-10">
          <button
            onClick={() => {
              onDeleteDevice(device.id);
              setOpen(false);
            }}
            className="flex items-center gap-2 w-full text-sm text-left px-3 py-2 hover:bg-gray-100 text-gray-600"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
