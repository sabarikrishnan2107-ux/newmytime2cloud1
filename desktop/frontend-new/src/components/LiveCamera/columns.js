"use client";

const Columns = (onView) => [
  {
    key: "branch",
    label: "BRANCH",
    sortable: true,
    render: (item) => (
      <span className="text-sm text-gray-600 dark:text-gray-300">
        {item.branch?.name || "—"}
      </span>
    ),
  },
  {
    key: "name",
    label: "DEVICE NAME",
    sortable: true,
    render: (item) => (
      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
        {item.name}
      </span>
    ),
  },
  {
    key: "camera_rtsp_ip",
    label: "CAMERA IP",
    sortable: false,
    render: (item) => (
      <span className="text-sm text-gray-600 dark:text-gray-300 font-mono">
        {item.camera_rtsp_ip}
      </span>
    ),
  },
  {
    key: "location",
    label: "LOCATION",
    sortable: false,
    render: (item) => (
      <span className="text-sm text-gray-600 dark:text-gray-300">
        {item.location || "—"}
      </span>
    ),
  },
  {
    key: "status",
    label: "STATUS",
    sortable: false,
    render: (item) => (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
          item.status_id === 1
            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            item.status_id === 1 ? "bg-green-500" : "bg-red-500"
          }`}
        ></span>
        {item.status_id === 1 ? "Online" : "Offline"}
      </span>
    ),
  },
  {
    key: "actions",
    label: "ACTIONS",
    sortable: false,
    render: (item) => (
      <button
        onClick={() => onView(item.id)}
        className="bg-primary hover:bg-blue-600 text-white text-xs font-semibold py-1.5 px-3 rounded-lg flex items-center gap-1 transition-all"
      >
        <span className="material-symbols-outlined text-[16px]">videocam</span>
        View
      </button>
    ),
  },
];

export default Columns;
