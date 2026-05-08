import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Loader2, MessageSquare, Paperclip } from "lucide-react";

const LogDetails = ({ isLogsOpen = false, setIsLogsOpen = () => { }, logDetails = [], isLogsLoading = false, selectedLogRow = null }) => {
  return (
    <Dialog open={isLogsOpen} onOpenChange={setIsLogsOpen}>
      <DialogContent className="min-w-[900px] max-w-[900px] p-0 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
        <DialogHeader className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-primary text-white">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-base font-semibold">
              Log Details
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="px-6 py-2 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3 text-sm">
          <div className="text-slate-600 dark:text-slate-300">
            Employee Id:{" "}
            <span className="font-semibold text-slate-900 dark:text-white">
              {selectedLogRow?.employee?.system_user_id ||
                selectedLogRow?.employee_id ||
                "---"}
            </span>
          </div>

          <div className="ml-auto text-slate-600 dark:text-slate-300">
            Total logs:{" "}
            <span className="font-semibold text-primary">
              ({logDetails.length})
            </span>
          </div>
        </div>

        <div className="px-6 py-5">
          {isLogsLoading ? (
            <div className="flex items-center justify-center py-16 text-slate-500 dark:text-slate-300">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Loading log details...
            </div>
          ) : logDetails.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              No logs found for this date.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 dark:bg-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">
                      Log Time
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">
                      Device
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">
                      Log Type
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">
                      Reason
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">
                      Note
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-200">
                      Attachment
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {logDetails.map((log, index) => (
                    <tr
                      key={`${log?.LogTime || "log"}-${index}`}
                      className="border-t border-slate-200 dark:border-slate-800"
                    >
                      <td
                        className={`px-4 py-3 ${log?.device?.name === "Manual"
                          ? "text-red-600 dark:text-red-400 font-medium"
                          : "text-slate-700 dark:text-slate-200"
                          }`}
                      >
                        {log?.LogTime || "---"}
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                        {log?.device?.name || "---"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-primary/10 text-white">
                          {log?.log_type || "Device"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200 max-w-[150px]">
                        {log?.reason ? (
                          <span className="inline-flex items-center gap-1 text-xs">
                            <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {log.reason}
                          </span>
                        ) : (
                          <span className="text-slate-400">---</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200 max-w-[150px]">
                        {log?.note ? (
                          <span className="inline-flex items-center gap-1 text-xs">
                            <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {log.note}
                          </span>
                        ) : (
                          <span className="text-slate-400">---</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {log?.attachment ? (
                          <a
                            href={`${API_BASE_URL.replace('/api', '')}/ManualLog/attachments/${log.attachment}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                            View
                          </a>
                        ) : (
                          <span className="text-slate-400">---</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
};

export default LogDetails;
