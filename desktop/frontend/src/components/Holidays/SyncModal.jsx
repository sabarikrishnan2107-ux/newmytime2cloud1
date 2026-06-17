import { CheckCircle2, XCircle } from "lucide-react";

// Add this helper component at the top of your file (or in a separate file)
const SyncModal = ({
  results,
  total,
  currentCount,
  isOpen,
  onClose,
  isLoading,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 top-[72px] z-[100] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={!isLoading ? onClose : null}
      ></div>
      <div className="min-w-[1000] relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-white/10 w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">
              Sync Progress
            </h3>
            <p className="text-sm text-slate-500">
              Processed {currentCount} of {total} operations
            </p>
          </div>
          {!isLoading && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </div>

        {/* Results List */}
        <div className="p-4 overflow-y-auto flex-1">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-white dark:bg-slate-900 text-slate-400 border-b border-gray-100 dark:border-white/5">
              <tr>
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">Start Date</th>
                <th className="p-3 font-medium">End Date</th>
                <th className="p-3 font-medium">Total Days</th>
                <th className="p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-white/5">
              {results.map((res, index) => (
                <tr
                  key={index}
                  className="animate-in fade-in slide-in-from-bottom-1"
                >
                  <td className="p-3 font-medium text-slate-700 dark:text-slate-200">
                    {res.name}
                  </td>
                  <td className="p-3 text-slate-500 text-xs">
                    {res.start_date}
                  </td>
                  <td className="p-3 text-slate-500 text-xs">
                    {res.end_date}
                  </td>
                  <td className="p-3 text-slate-500 text-xs">
                    {res.total_days}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                        res.status == 200
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {res.status == 200 ? (
                        <>
                          <CheckCircle2 size={20} />
                          SUCCESS
                        </>
                      ) : (
                        <>
                          <XCircle size={20} />
                          FAILED
                        </>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
              {results.length === 0 && (
                <tr>
                  <td
                    colSpan="3"
                    className="p-10 text-center text-slate-400 italic"
                  >
                    Initializing connection...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/50 flex justify-end">
          <button
            disabled={isLoading}
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-slate-800 text-white font-semibold disabled:opacity-50 transition-all hover:bg-slate-700"
          >
            {isLoading ? "Syncing..." : "Done"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SyncModal;
