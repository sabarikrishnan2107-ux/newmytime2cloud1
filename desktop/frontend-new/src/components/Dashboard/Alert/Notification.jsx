function Notification() {
  return (
    <div className="fixed bottom-8 right-8 z-50 animate-toast">
      <div className="glass-panel p-4 rounded-xl border-l-4 border-l-purple-500 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] flex items-start gap-4 max-w-sm backdrop-blur-md bg-white/90">
        <div className="mt-0.5 size-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 border border-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
          <span className="material-symbols-outlined text-purple-600 text-[18px]">
            diamond
          </span>
        </div>
        <div className="flex-1 min-w-0 pr-2">
          <h4 className="text-sm font-bold text-slate-900 leading-tight mb-1">
            VIP Proximity Alert
          </h4>
          <div className="flex flex-col gap-0.5">
            <p className="text-[11px] text-slate-500">
              Subject:
              <span className="text-purple-700 text-xs font-medium">
                A. Sterling
              </span>
            </p>
            <p className="text-[11px] text-slate-500">
              Location: <span className="text-slate-700">North Gate Cam 4</span>
            </p>
          </div>
        </div>
        <button className="group/close mt-0.5 p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition-colors">
          <span className="material-symbols-outlined text-[16px] group-hover/close:rotate-90 transition-transform">
            close
          </span>
        </button>
      </div>
    </div>
  );
}

export default Notification;
