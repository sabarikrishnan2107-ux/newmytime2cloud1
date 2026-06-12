export default (deleteEmployee) => [
    {
        key: "name",
        header: "Document Name",
        render: (item) => (
            <div className="text-sm text-slate-600 dark:text-slate-300 hidden xl:table-cell">
                {item.name}
            </div>
        ),
    },
    {
        key: "branch",
        header: "Uploaded Date",
        render: (item) => (
            <div className="text-sm text-slate-600 dark:text-slate-300 hidden xl:table-cell">
                {item.date || "N/A"}
            </div>
        ),
    },
    {
        key: "department",
        header: "Type",
        render: (item) => (
            <div className="text-sm text-slate-600 dark:text-slate-300 hidden xl:table-cell">
                {item.type || "N/A"}
            </div>
        ),
    },

    {
        key: "expiry",
        header: "Expiry Date",
        render: (item) => (
            <div className="text-sm text-slate-600 dark:text-slate-300 hidden xl:table-cell">
                {item.type || "N/A"}
            </div>
        ),
    },
    {
        key: "actions",
        header: "Actions",
        render: (employee) => (
            <>
                <button className="text-slate-400 hover:text-indigo-600 transition-colors mx-1" title="View">
                    <span className="material-symbols-outlined text-[20px]">visibility</span>
                </button>
                <button className="text-slate-400 hover:text-indigo-600 transition-colors mx-1" title="Download">
                    <span className="material-symbols-outlined text-[20px]">download</span>
                </button></>
        ),
    },
];
