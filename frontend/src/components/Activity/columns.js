// columns.js
"use client";

export default function Columns({ pageTitle, onSuccess = (e) => { e } } = {}) {
  return [
    {
      key: "action_by",
      header: "Action By",
      render: (item) => (
        <span className="text-gray-800 dark:text-gray-200 cursor-pointer" title={item?.user?.name || "—"}>
          {item?.user?.name || "—"}
        </span>
      ),
    },
    {
      key: "action",
      header: "Action",
      render: (item) => (
        <span className="text-gray-800 dark:text-gray-200 cursor-pointer" title={item?.action || "—"}>
          {item?.action || "—"}
        </span>
      ),
    },

    {
      key: "description",
      header: "Description",
      render: (item) => (
        <span className="text-gray-800 dark:text-gray-200 cursor-pointer" title={item?.description || "—"}>
          {item?.description || "—"}
        </span>
      ),
    },

    {
      key: "type",
      header: "Type",
      render: (item) => (
        <span className="text-gray-800 dark:text-gray-200 cursor-pointer" title={item?.type || "—"}>
          {item?.type || "—"}
        </span>
      ),
    },

    {
      key: "Date Time",
      header: "OT Value",
      render: (item) => (
        <span className="text-gray-800 dark:text-gray-200 cursor-pointer" title={item.date_time || "—"}>
          {item.date_time || "—"}
        </span>
      ),
    },

  ];
}
