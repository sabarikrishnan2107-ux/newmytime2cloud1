"use client";

import { useEffect } from "react";
import { X, Volume2, Mic, Sparkles, AlertCircle } from "lucide-react";
import { ResultCard } from "./ResultCard";

/**
 * Centered popup that shows a voice query result (lists, summary, count...).
 * Opens when a data command returns; closeable via X, backdrop click, or Escape.
 */
export default function VoiceResultModal({ result, wakeWordActive, onClose, onAskAgain }) {
  // Close on Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!result) return null;

  const isError = result.type === "error";
  const isAnswer = result.type === "answer";

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Card */}
      <div
        className="relative w-full max-w-lg bg-[#0d1529]/95 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl shadow-black/60 overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
            isError
              ? "bg-red-500/20 border-red-400/20"
              : "bg-gradient-to-br from-indigo-500/30 to-purple-600/30 border-indigo-400/20"
          }`}>
            {isError
              ? <AlertCircle size={20} className="text-red-300" />
              : <Sparkles size={20} className="text-indigo-300" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-base font-bold text-white truncate">{result.label}</div>
            <div className="text-[11px] text-slate-400">MyTime Assistant</div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Guidance / answer: readable scrollable text (keeps numbered steps on their own lines) */}
        {isAnswer && result.speech && (
          <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">
            <p className="text-sm leading-relaxed text-slate-200 whitespace-pre-line">{result.speech}</p>
          </div>
        )}

        {/* Spoken summary (for data results / greetings / errors) */}
        {!isAnswer && result.speech && (
          <div className="px-5 pt-4">
            <div className={`flex items-start gap-2.5 rounded-2xl px-4 py-3 border ${
              isError
                ? "bg-red-500/10 border-red-500/15"
                : "bg-indigo-500/10 border-indigo-500/15"
            }`}>
              <Volume2 size={18} className={isError ? "text-red-300 mt-0.5" : "text-indigo-300 mt-0.5"} />
              <p className={`text-sm leading-relaxed ${isError ? "text-red-100/90" : "text-indigo-100/90"}`}>
                {result.speech}
              </p>
            </div>
          </div>
        )}

        {/* Body (data list/summary/count) */}
        {!isError && !isAnswer && result.data && (
          <div className="px-5 py-4">
            <ResultCard result={result} size="lg" />
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-white/5 bg-white/[0.02] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] text-slate-400 min-w-0">
            {wakeWordActive ? (
              <>
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400/60 animate-ping" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
                </span>
                <span className="truncate">
                  Listening for <span className="text-indigo-300 font-semibold">&quot;Hey MyTime&quot;</span>
                </span>
              </>
            ) : (
              <span className="truncate">Voice assistant paused</span>
            )}
          </div>
          <button
            onClick={onAskAgain}
            className="flex items-center gap-2 bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg shadow-indigo-500/30 transition shrink-0"
          >
            <Mic size={16} />
            Ask again
          </button>
        </div>
      </div>
    </div>
  );
}
