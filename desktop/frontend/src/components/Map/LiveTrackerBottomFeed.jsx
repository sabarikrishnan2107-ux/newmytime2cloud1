import { useTranslation } from "react-i18next";

export default function LiveTrackerBottomFeed({ employees, openPanel }) {
    const { t } = useTranslation();
    return (
        <div
            className="absolute bottom-0 inset-x-0 z-40 border-t border-slate-200 dark:border-slate-800 px-6 py-4 shadow-2xl bg-white dark:bg-[rgba(17,19,24,0.95)] backdrop-blur-xl"
        >
            <div className="max-w-[1400px] mx-auto">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[#1152d4]">
                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z" />
                        </svg>
                        <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">{t("liveTracker.feed.recentCheckins")}</h3>
                        <span className="ml-2 px-2 py-0.5 rounded bg-[#1152d4]/10 text-[#1152d4] text-[10px] font-bold">
                            {t("liveTracker.feed.liveFeed")}
                        </span>
                    </div>
                    <button className="text-xs font-semibold text-[#1152d4] hover:underline transition-all">
                        {t("liveTracker.feed.viewAllEvents")}
                    </button>
                </div>

                <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
                    {employees.map((emp,index) => (
                        <button
                            key={index}
                            onClick={() => openPanel(emp)}
                            className="flex-shrink-0 flex items-center gap-3 bg-slate-100 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700/50 w-72 hover:border-[#1152d4]/50 transition-all cursor-pointer text-left"
                        >
                            <div className="relative flex-shrink-0">
                                <div
                                    className="w-11 h-11 rounded-lg bg-center bg-cover border border-slate-200 dark:border-slate-700"
                                    style={{ backgroundImage: `url('${emp.avatar}')` }}
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold truncate text-slate-900 dark:text-white">{emp.name}</p>
                                <p className="text-[10px] text-slate-700 dark:text-slate-500 truncate mb-1">{emp.location}</p>
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-medium text-slate-600 dark:text-slate-400">{emp.timestamp}</span>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
