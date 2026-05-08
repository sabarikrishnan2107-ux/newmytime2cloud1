import ProfilePicture from "@/components/ProfilePicture";
import { getBgColor, getTextColor, setStatusLabel } from "@/lib/utils";
import { Eye } from "lucide-react";

export default (shiftTypeId, { onViewLogs } = {}) => {
    // 1. Base columns (common to all types)
    const columns = [
        {
            key: "name",
            header: "Name",
            render: ({ employee }) => (
                <div className="flex items-center space-x-3">
                    <ProfilePicture src={employee.profile_picture} />
                    <div>
                        <p className="font-medium text-[15px] text-slate-700 dark:text-slate-200 hidden xl:table-cell">{employee?.first_name} ({employee?.system_user_id})</p>
                        <p className="text-[15px] text-slate-700 dark:text-slate-200">
                            {employee?.department?.name}
                        </p>
                    </div>
                </div>
            ),
        },
        {
            key: "date", header: "Date",
            render: (log) => (<p className="text-[15px] text-slate-700 dark:text-slate-200">{log.day.toString().substring(0, 3)}, {log.date}</p>)
        },
        {
            key: "shift", header: "Shift",
            render: (log) => (
                <p className="text-[15px] text-slate-700 dark:text-slate-200">{log.shift?.name}</p>
            ),
        },
    ];

    // 2. Dynamic columns for shiftTypeId 2 (The 1-7 loop)
    const inOutColumns = [];
    for (let i = 1; i <= 5; i++) {
        inOutColumns.push({
            key: `in${i}`,
            header: `In${i}`,
            render: (log) => (<p className="text-[15px] text-slate-700 dark:text-slate-200">{`${log[`in${i}`] || "—"}`}</p>)
        });
        inOutColumns.push({
            key: `out${i}`,
            header: `Out${i}`,
            render: (log) => (<p className="text-[15px] text-slate-700 dark:text-slate-200">{`${log[`out${i}`] || "—"}`}</p>)
        });
    }

    // 3. Specific columns for shiftTypeId 5 (In1, Out1, In2, Out2)
    // 3. Specific columns for shiftTypeId 5
    const doubleShiftColumns = [
        ...[1, 2].flatMap(i => [
            {
                key: `in${i}`, // Unique Key
                header: `In${i}`,
                render: (log) => (<p className="text-[15px] text-slate-700 dark:text-slate-200">{`${log[`in${i}`] || "—"}`}</p>)
            },
            {
                key: `out${i}`, // Unique Key
                header: `Out${i}`,
                render: (log) => (<p className="text-[15px] text-slate-700 dark:text-slate-200">{`${log[`out${i}`] || "—"}`}</p>)
            }
        ]),
        {
            key: "late_coming_5", // Unique Key
            header: "Late In",
            render: (log) => (<p className="text-[15px] text-slate-700 dark:text-slate-200">{`${log?.late_coming || "—"}`}</p>),
        },
        {
            key: "early_going_5", // Unique Key
            header: "Early Out",
            render: (log) => (<p className="text-[15px] text-slate-700 dark:text-slate-200">{`${log?.early_going || "—"}`}</p>),
        },
    ];

    // 4. Closing columns (common to all types)
    const otherColumns = [
        { key: "ot", header: "OT", render: (log) => (<p className="text-[15px] text-slate-700 dark:text-slate-200">{log.ot}</p>) },
        { key: "total_hrs", header: "Total Hrs", render: (log) => (<p className="text-[15px] text-slate-700 dark:text-slate-200">{log.total_hrs}</p>) },
        {
            key: "status",
            header: "Status",
            render: (log) => (
                <div className="flex flex-col items-center">
                    <span className={`text-sm ${getBgColor(log.status)}`}
                        style={{ padding: "2px 10px", borderRadius: "50px" }}
                    >
                        {setStatusLabel(log?.status)}
                    </span>
                    {log.is_manual_entry && <span className="text-xs text-red-500 mt-1">Manual</span>}
                </div>
            ),
        },
        {
            accessorKey: "actions",
            header: "Actions",
            render: (item) => (
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => onViewLogs?.(item)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-primary hover:bg-primary/5"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    // --- Conditional Logic ---
    if (shiftTypeId == '2') {
        return [...columns, ...inOutColumns, ...otherColumns];
    }

    if (shiftTypeId == '5') {
        return [...columns, ...doubleShiftColumns, ...otherColumns];
    }

    // Default Case (Original Layout)
    return [
        ...columns,
        {
            key: "in",
            header: "In",
            render: (log) => (
                <div>
                    <p className="text-[15px] text-slate-700 dark:text-slate-200">{`${log?.in || "—"}`}</p>
                    {log?.device_in?.name && <p className="text-xs text-slate-400">{log.device_in.name}</p>}
                </div>
            ),
        },
        {
            key: "out",
            header: "Out",
            render: (log) => (
                <div>
                    <p className="text-[15px] text-slate-700 dark:text-slate-200">{`${log?.out || "—"}`}</p>
                    {log?.device_out?.name && <p className="text-xs text-slate-400">{log.device_out.name}</p>}
                </div>
            ),
        },
        {
            key: "late_coming",
            header: "Late In",
            render: (log) => (<p className="text-[15px] text-slate-700 dark:text-slate-200">{`${log?.late_coming || "—"}`}</p>),
        },
        {
            key: "early_going",
            header: "Early Out",
            render: (log) => (<p className="text-[15px] text-slate-700 dark:text-slate-200">{`${log?.early_going || "—"}`}</p>),
        },
        ...otherColumns,
    ];
};