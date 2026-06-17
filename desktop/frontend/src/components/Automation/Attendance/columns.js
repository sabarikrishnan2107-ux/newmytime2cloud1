// columns.js
import { Eye, MoreVertical, Pencil, Trash } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export default (deleteItem, editItem) => {
    return [
        {
            key: "branch",
            header: "Branch",
            render: (e) => (
                <p className="text-sm text-slate-700 dark:text-slate-200">
                    {e.branch ? e.branch?.branch_name : "N/A"}
                </p>
            ),
        },
        {
            key: "subject",
            header: "Subject",
            render: (e) => (
                <p
                    className="text-sm text-slate-700 dark:text-slate-200"
                >
                    {e.subject || "N/A"}
                </p>
            ),
        },

        {
            key: "time",
            header: "Time",
            render: (e) => (
                <p
                    className="text-sm text-slate-600 dark:text-slate-300"
                >
                    {e.time || "N/A"}
                </p>
            ),
        },

        {
            key: "frequency",
            header: "Report Type",
            render: (e) => (
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    e.frequency === "Daily" ? "bg-emerald-500/20 text-emerald-400" :
                    e.frequency === "Weekly" ? "bg-blue-500/20 text-blue-400" :
                    e.frequency === "Monthly" ? "bg-purple-500/20 text-purple-400" :
                    "bg-slate-500/20 text-slate-400"
                }`}>
                    {e.frequency || "Daily"}
                </span>
            ),
        },
        {
            key: "days",
            header: "Days",
            render: (e) => {
                // Map: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
                const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
                const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                const NAME_TO_INDEX = {
                    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
                    thursday: 4, friday: 5, saturday: 6,
                };

                const selected = new Set();

                if (e.frequency === "Monthly" && e.date) {
                    const day = Number(e.date);
                    if (day >= 1 && day <= 31) {
                        const now = new Date();
                        const weekday = new Date(now.getFullYear(), now.getMonth(), day).getDay();
                        selected.add(weekday);
                    }
                } else if (e.frequency === "Weekly" && e.day) {
                    const key = String(e.day).toLowerCase();
                    if (key in NAME_TO_INDEX) {
                        selected.add(NAME_TO_INDEX[key]);
                    } else if (!Number.isNaN(Number(e.day))) {
                        selected.add(Number(e.day));
                    }
                } else {
                    let raw = e.days;
                    if (typeof raw === "string") {
                        raw = raw.split(/[, ]+/).filter(Boolean);
                    }
                    if (Array.isArray(raw)) {
                        raw.forEach((v) => selected.add(Number(v)));
                    }
                }

                if (selected.size === 0) {
                    return <p className="text-sm text-slate-600 dark:text-slate-300">N/A</p>;
                }

                // Display order: Mon, Tue, Wed, Thu, Fri, Sat, Sun
                const order = [1, 2, 3, 4, 5, 6, 0];

                return (
                    <div className="flex items-center gap-1">
                        {order.map((d) => {
                            const isOn = selected.has(d);
                            return (
                                <span
                                    key={d}
                                    title={DAY_NAMES[d]}
                                    className={`inline-flex items-center justify-center w-6 h-6 text-[11px] font-bold ${
                                        isOn
                                            ? "text-slate-700 dark:text-slate-100"
                                            : "text-slate-300 dark:text-slate-600"
                                    }`}
                                >
                                    {DAY_LETTERS[d]}
                                </span>
                            );
                        })}
                    </div>
                );
            },
        },

        {
            key: "manager1",
            header: "Manager1",
            render: (e) => {
                const m = e.managers?.[0];

                if (!m) return <span className="text-slate-400 text-sm">N/A</span>;

                return (
                    <div className="flex flex-col text-sm leading-tight text-slate-600 dark:text-slate-300">
                        <span className="font-medium">{m.name}</span>
                        <span className="text-xs">{m.email}</span>
                        <span className="text-xs">{m.whatsapp_number}</span>
                    </div>
                );
            },
        },

        {
            key: "manager2",
            header: "Manager2",
            render: (e) => {
                const m = e.managers?.[1];

                if (!m) return <span className="text-slate-400 text-sm">N/A</span>;

                return (
                    <div className="flex flex-col text-sm leading-tight text-slate-600 dark:text-slate-300">
                        <span className="font-medium">{m.name}</span>
                        <span className="text-xs">{m.email}</span>
                        <span className="text-xs">{m.whatsapp_number}</span>
                    </div>
                );
            },
        },

        {
            key: "manager3",
            header: "Manager3",
            render: (e) => {
                const m = e.managers?.[2];

                if (!m) return <span className="text-slate-400 text-sm">N/A</span>;

                return (
                    <div className="flex flex-col text-sm leading-tight text-slate-600 dark:text-slate-300">
                        <span className="font-medium">{m.name}</span>
                        <span className="text-xs">{m.email}</span>
                        <span className="text-xs">{m.whatsapp_number}</span>
                    </div>
                );
            },
        },
        {
            key: "medium",
            header: "Media",
            render: (e) => (
                <p
                    className="text-sm text-slate-600 dark:text-slate-300"
                >
                    {Array.isArray(e.mediums)
                        ? e.mediums.join(", ")
                        : e.medium || e.mediums || "N/A"}
                </p>
            ),
        },

        {
            key: "options",
            header: "Options",
            render: (row) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(ev) => ev.stopPropagation()}>
                        <div className="p-2 rounded-full cursor-pointer w-fit">
                            <MoreVertical className="w-5 h-5 text-gray-400" />
                        </div>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                        align="end"
                        className="w-32 bg-white dark:bg-gray-900 shadow-md rounded-md py-1"
                        onClick={(ev) => ev.stopPropagation()}
                    >
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.stopPropagation(); // Stop row redirect
                                editItem(row);
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                        >
                            <Pencil className="w-4 h-4 text-slate-700 dark:text-slate-200" />
                            <span className="text-slate-700 dark:text-slate-200 font-medium">Edit</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={(ev) => {
                                ev.stopPropagation();
                                // adjust the id field to your actual primary key if not employee_id
                                deleteItem(row.id ?? row.report_notification_id ?? row.employee_id);
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
};