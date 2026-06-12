// columns.js
import {
    MoreVertical,
    Pencil,
    Trash2,
    Eye,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";


export default (handleRowClick, handleEdit, handleDelete, handleView, perms = {}) => {

    const getPriorityColor = (category) => {
        if (!category) return {};
        const name = category.name;
        if (name === "Urgent") return { container: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/50", dot: "bg-red-600 dark:bg-red-400" };
        if (name === "Informational") return { container: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/50", dot: "bg-blue-600 dark:bg-blue-400" };
        if (name === "Meeting") return { container: "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/50", dot: "bg-orange-600 dark:bg-orange-400" };
        if (name === "Priority") return { container: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/50", dot: "bg-green-600 dark:bg-green-400" };
        if (name === "Low Priority") return { container: "bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-400 dark:border-slate-600/50", dot: "bg-slate-500 dark:bg-slate-500" };
        return { container: "bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-400 border border-border", dot: "bg-slate-500 dark:bg-slate-500" };
    };

    return [
        {
            key: "title",
            header: "Title",
            render: (e) => (
                <p
                    onClick={() => handleRowClick(e)}
                    className="text-sm text-slate-600 dark:text-slate-300 cursor-pointer hover:text-primary transition-colors font-medium"
                >
                    {e.title || "N/A"}
                </p>
            ),
        },
        {
            key: "description",
            header: "Description",
            render: (e) => (
                <p
                    onClick={() => handleRowClick(e)}
                    className="text-sm text-slate-600 dark:text-slate-300 hidden xl:table-cell cursor-pointer max-w-[300px] truncate"
                    title={e.description?.replace(/<[^>]*>/g, '') || ""}
                >
                    {e.description?.replace(/<[^>]*>/g, '')?.substring(0, 80) || "N/A"}
                </p>
            ),
        },
        {
            key: "category",
            header: "Category",
            render: (e) => {
                const style = getPriorityColor(e.category);
                return (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium dark:border ${style.container || ''}`}>
                        <span className={`size-1.5 rounded-full ${style.dot || ''}`}></span>
                        {e.category?.name || "N/A"}
                    </span>
                );
            }
        },
        {
            key: "start_date",
            header: "Start Date",
            render: (e) => (
                <p className="text-sm text-slate-600 dark:text-slate-300">
                    {e.start_date || "N/A"}
                </p>
            ),
        },
        {
            key: "end_date",
            header: "End Date",
            render: (e) => (
                <p className="text-sm text-slate-600 dark:text-slate-300">
                    {e.end_date || "N/A"}
                </p>
            ),
        },
        {
            key: "created_at",
            header: "Posted",
            render: (e) => (
                <p className="text-sm text-slate-600 dark:text-slate-300">
                    {e.created_at || "N/A"}
                </p>
            ),
        },
        {
            key: "actions",
            header: "Actions",
            render: (record) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <MoreVertical
                            className="w-5 h-5 text-gray-400 cursor-pointer hover:text-gray-700 transition-colors"
                            title="More Options"
                        />
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" className="w-36 bg-white shadow-md rounded-md py-1">
                        <DropdownMenuItem
                            onClick={() => handleView(record)}
                            className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100"
                        >
                            <Eye className="w-4 h-4 text-slate-700 dark:text-slate-200" /> <span className="text-indigo-500">View</span>
                        </DropdownMenuItem>
                        {perms.canEdit !== false && (
                        <DropdownMenuItem
                            onClick={() => handleEdit(record)}
                            className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100"
                        >
                            <Pencil className="w-4 h-4 text-slate-700 dark:text-slate-200" /> <span className="text-primary">Edit</span>
                        </DropdownMenuItem>
                        )}
                        {perms.canDelete !== false && (
                        <DropdownMenuItem
                            onClick={() => handleDelete(record)}
                            className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-red-50"
                        >
                            <Trash2 className="w-4 h-4 text-slate-700 dark:text-slate-200" /> <span className="text-red-500">Delete</span>
                        </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
        },
    ];
};
