import ProfilePicture from "@/components/ProfilePicture";
import { FileType, ImageIcon } from "lucide-react";

export default (deleteItem) => {
    return [
        {
            key: "employee",
            header: "Personnel",
            render: (e) => (
                <div className="flex items-center space-x-3" onClick={() => handleRowClick(e)}>

                    <ProfilePicture src={e?.employee?.profile_picture} />

                    <div>
                        <p className="font-medium text-sm text-slate-600 dark:text-slate-300 hidden xl:table-cell font-mono">{e?.employee?.first_name}</p>
                        <p className="text-sm text-gray-500">
                            ID: {e?.employee?.employee_id}
                        </p>
                    </div>
                </div>
            ),
        },
        {
            key: "branch",
            header: "Branch / Department",
            render: (e) => (
                <p className="text-sm text-slate-700 dark:text-slate-200">
                    {e?.employee?.branch ? e.employee.branch.branch_name : "N/A"} / {e?.employee?.department ? e.employee.department.name : "N/A"} 
                </p>
            ),
        },
        {
            key: "title",
            header: "Title",
            render: (e) => (
                <p className="text-sm text-slate-700 dark:text-slate-200">
                    {e.title || "N/A"}
                </p>
            ),
        },
        {
            key: "issue_date",
            header: "Issue Date",
            render: (e) => (
                <p className="text-sm text-slate-700 dark:text-slate-200">
                    {e.issue_date_display || "N/A"}
                </p>
            ),
        },
        {
            key: "expiry_date",
            header: "Expiry Date",
            render: (e) => (
                <p className="text-sm text-slate-700 dark:text-slate-200">
                    {e.expiry_date_display || "N/A"}
                </p>
            ),
        },

        {
            key: "access_url",
            header: "Access URL",
            render: (e) => (
                <div className="flex items-center">
                    <a
                        href={e.access_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                        <div className={`flex-shrink-0 h-10 w-10 flex items-center justify-center rounded ${e.type === 'pdf' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                            }`}>
                            {e.type === 'pdf' ? <FileType size={20} /> : <ImageIcon size={20} />}
                        </div>
                    </a>
                </div>
            ),
        },
    ];
};