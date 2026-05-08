// columns.js
import {
    AlertCircle,
    Check,
    Eye,
    MoreVertical,
    Pencil,
    Trash,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import ProfilePicture from "@/components/ProfilePicture";


export default (deleteItem, onEdit, onView) => {
    return [
        {
            key: "employee",
            header: "Personnel",
            render: (e) => (
                <div className="flex items-center space-x-3" onClick={() => handleRowClick(e)}>

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
            header: "Branch / Dept",
            render: (e) => (
                <p onClick={() => handleRowClick(e)} className="text-sm text-slate-600 dark:text-slate-300 hidden xl:table-cell">
                    {e.branch?.branch_name || "N/A"} / {e.department?.name || "N/A"}
                </p>
            ),
        },

        {
            key: "schedule_status",
            header: "Active Interval",
            render: (e) => {
                const all = e.schedule_all?.length > 0 ? e.schedule_all : (e.schedule?.shift ? [e.schedule] : []);
                const today = new Date().toISOString().split('T')[0];

                // Only show currently active schedule (today falls within the range)
                const schedule = all.find(s => s.from_date <= today && s.to_date >= today);

                const formatDate = (dateStr) => {
                    const d = new Date(dateStr + 'T00:00:00');
                    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                };

                return (
                    <div className="flex flex-col text-slate-600 dark:text-slate-300">
                        {!schedule ? (
                            <div className="text-sm text-gray-400">No Schedules</div>
                        ) : (
                            <div>
                                <div className="text-sm font-medium">
                                    {schedule.isAutoShift ? "Auto" : (schedule.shift?.name || "---")}
                                </div>
                                {schedule.from_date && (
                                    <div className="text-xs text-gray-400">
                                        {formatDate(schedule.from_date)} - {formatDate(schedule.to_date)}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            },
        },

        {
            key: "status",
            header: "Status",
            render: (e) => {
                const all = e.schedule_all?.length > 0 ? e.schedule_all : (e.schedule?.shift ? [e.schedule] : []);
                const today = new Date().toISOString().split('T')[0];
                const hasActive = all.some(s => s.from_date <= today && s.to_date >= today);

                return (
                    <div className="flex flex-col text-slate-600 dark:text-slate-300">
                        {all.length === 0 ? (
                            <span className="text-xs text-slate-400">No Schedule</span>
                        ) : hasActive ? (
                            <Check className="text-green-500" />
                        ) : (
                            <AlertCircle className="text-yellow-500" />
                        )}
                    </div>
                );
            },
        },

        // {
        //     key: "schedule_count",
        //     header: "All Schedules",
        //     render: (e) => (
        //         <div onClick={() => handleRowClick(e)} className="flex flex-col text-gray-500">{e.schedule_all.length}</div>
        //     ),
        // },
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
                                onView?.(employee);
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                        >
                            <Eye className="w-4 h-4 text-slate-700 dark:text-slate-200" />
                            <span className="text-slate-700 dark:text-slate-200 font-medium">View</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit?.(employee);
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                        >
                            <Pencil className="w-4 h-4 text-slate-700 dark:text-slate-200" />
                            <span className="text-slate-700 dark:text-slate-200 font-medium">Edit</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.stopPropagation();
                                deleteItem(employee.employee_id);
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
    ]
};
