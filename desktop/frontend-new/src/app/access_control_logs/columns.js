export default [
  {
    key: "S.NO",
    header: "Name",
    render: ({ employee }) => (
      <div
        onClick={() => handleRowClick(employee.id)}
        className="flex items-center space-x-3 cursor-pointer"
      >
        <img
          alt={employee.full_name}
          className="w-10 h-10 rounded-full object-cover shadow-sm"
          src={
            employee.profile_picture ||
            `https://placehold.co/40x40/6946dd/ffffff?text=${employee.full_name.charAt(0)}`
          }
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = `https://placehold.co/40x40/6946dd/ffffff?text=${employee.full_name.charAt(0)}`;
          }}
        />
        <div>
          <p className="font-medium text-gray-800 dark:text-gray-100">{employee.full_name}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {employee.designation?.title || employee.last_name}
          </p>
        </div>
      </div>
    ),
  },
  {
    key: "emp_device",
    header: "Emp Id / Device Id",
    render: ({ employee }) => (
      <div onClick={() => handleRowClick(employee.id)} className="cursor-pointer">
        <p className="text-gray-800 dark:text-gray-100">{employee.employee_id || "—"}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Device ID: {employee.system_user_id || "—"}
        </p>
      </div>
    ),
  },
  {
    key: "branch",
    header: "Branch",
    render: ({ employee }) => (
      <span
        onClick={() => handleRowClick(employee.id)}
        className="text-gray-800 dark:text-gray-100 cursor-pointer"
      >
        {employee.branch?.branch_name || "N/A"}
      </span>
    ),
  },
  {
    key: "department",
    header: "Department",
    render: ({ employee }) => (
      <span
        onClick={() => handleRowClick(employee.id)}
        className="text-gray-800 dark:text-gray-100 cursor-pointer"
      >
        {employee.department?.name || "N/A"}
      </span>
    ),
  },
  {
    key: "datetime",
    header: "Date",
    render: (log) => (
      <span
        onClick={() => handleRowClick(log.employee.id)}
        className="text-gray-800 dark:text-gray-100 cursor-pointer"
      >
        {log?.time} {log?.date}
      </span>
    ),
  },
  {
    key: "device",
    header: "Device",
    render: (log) => (
      <span
        onClick={() => handleRowClick(log.employee.id)}
        className="text-gray-800 dark:text-gray-100 cursor-pointer"
      >
        {log?.device?.name || "—"}
      </span>
    ),
  },
  {
    key: "in",
    header: "In",
    render: (log) => {
      return (
        <span
          onClick={() => handleRowClick(log.employee.id)}
          className={`font-medium cursor-pointer text-gray-800 dark:text-gray-100`}
        >
          {log.device.function !== "out" || log.device.function !== "Out"
            ? "In"
            : "---"}
        </span>
      );
    },
  },
  {
    key: "out",
    header: "Out",
    render: (log) => {
      return (
        <span
          onClick={() => handleRowClick(log.employee.id)}
          className={`font-medium cursor-pointer text-gray-800 dark:text-gray-100`}
        >
          {log.device.function == "out" || log.device.function == "Out"
            ? "Out"
            : "---"}
        </span>
      );
    },
  },
  {
    key: "mode",
    header: "Mode",
    render: (log) => (
      <span
        onClick={() => handleRowClick(log.employee.id)}
        className="text-gray-800 dark:text-gray-100 cursor-pointer"
      >
        {log?.mode || "—"}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (log) => (
      <span
        onClick={() => handleRowClick(log.employee.id)}
        className="text-gray-800 dark:text-gray-100 cursor-pointer"
      >
        {log?.status || "—"}
      </span>
    ),
  },
  {
    key: "user_type",
    header: "User Type",
    render: (log) => (
      <span
        onClick={() => handleRowClick(log.employee.id)}
        className="text-gray-800 dark:text-gray-100 cursor-pointer"
      >
        Employee
      </span>
    ),
  },
];
