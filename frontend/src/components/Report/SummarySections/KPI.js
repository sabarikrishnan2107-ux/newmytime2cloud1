// Helper for color logic
const colors = {
  blue: "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
  emerald: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
  orange: "bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
  purple: "bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
};

export default function KPISection({ stats }) {
  return (
    <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-3">
      {stats.map((item, idx) => (
        <div key={idx} className="glass-panel p-4 rounded-xl flex flex-col gap-1 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          {/* Header */}
          <div className="flex items-center justify-between mb-2 z-10">
            <p className="text-slate-600 dark:text-slate-300 text-[10px] font-semibold uppercase tracking-wide truncate">
              {item.title}
            </p>
            <div className={`p-1 rounded-md ${colors[item.color]}`}>
              <span className="material-symbols-outlined text-[18px] block">
                {item.icon}
              </span>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="flex items-end justify-between gap-2 z-10">
            <div className="flex-1 min-w-0">
              <p className="text-xl font-bold text-slate-900 dark:text-white leading-none">
                {item.value}
              </p>

              {/* Conditional Trend Badge */}
              {item.trend !== "0%" ? (
                <div className={`flex items-center text-[9px] font-bold mt-1 px-1 py-0.5 rounded w-fit ${item.trendUp ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : 'text-orange-600 bg-orange-50 dark:bg-orange-900/20'
                  }`}>
                  <span className="material-symbols-outlined text-[10px]">
                    {item.trendUp ? 'trending_up' : 'trending_down'}
                  </span>
                  <span>{item.trend}</span>
                </div>
              ) : (
                <p className="text-[9px] text-slate-400 mt-1 font-medium">{item.subText}</p>
              )}
            </div>

            {/* Conditional Visuals (Sparkline or Progress) */}
            {item.type === 'sparkline' && (
              <svg className="h-6 w-12 text-blue-500/30" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 100 40">
                <path d={item.path} vectorEffect="non-scaling-stroke" />
              </svg>
            )}

            {item.type === 'progress' && (
              <div className="h-1.5 w-10 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-1">
                <div
                  className={`h-full rounded-full ${item.color === 'orange' ? 'bg-orange-500' : 'bg-emerald-500'}`}
                  style={{ width: item.progress }}
                />
              </div>
            )}
          </div>
        </div>
      ))}
    </section>
  )
}