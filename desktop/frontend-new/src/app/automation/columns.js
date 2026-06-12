// columns.js
import { MoreVertical, Trash } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export default (deleteItem) => {
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
            key: "type",
            header: "Type",
            render: (e) => (
                <p className="text-sm text-slate-700 dark:text-slate-200">
                    {e.type
                        ? e.type.charAt(0).toUpperCase() + e.type.slice(1).toLowerCase()
                        : "N/A"}
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
            key: "days",
            header: "Days",
            render: (e) => (
                <p
                    className="text-sm text-slate-600 dark:text-slate-300"
                >
                    {Array.isArray(e.days) ? e.days.join(", ") : e.days || "N/A"}
                </p>
            ),
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
                            onClick={(ev) => {
                                ev.stopPropagation();
                                // adjust the id field to your actual primary key if not employee_id
                                deleteItem(row.id ?? row.report_notification_id ?? row.employee_id);
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
};