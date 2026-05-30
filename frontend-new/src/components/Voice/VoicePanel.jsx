"use client";

import { XCircle, Mic } from "lucide-react";

export default function VoicePanel({ state, enabled, language = "en-US", languages = [], transcript, history = [], debugLog = [], onToggleEnabled, onLanguageChange, onClose }) {
  const statusLabel =
    state === "waiting" ? "Say \"Hey MyTime\"..." :
    state === "listening" ? "Listening..." :
    state === "processing" ? "Processing..." :
    "MyTime Assistant";

  const dotClass =
    state === "waiting" ? "bg-amber-400 animate-pulse" :
    state === "listening" ? "bg-emerald-400 animate-pulse" :
    state === "processing" ? "bg-blue-400 animate-pulse" :
    enabled ? "bg-emerald-500" : "bg-slate-600";

  return (
    <div className="absolute bottom-20 right-0 w-[340px] bg-[#0d1529] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200 z-[9999]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${dotClass}`} />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">{statusLabel}</span>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition" aria-label="Close">
          <XCircle size={16} />
        </button>
      </div>

      {/* Listening animation */}
      {(state === "waiting" || state === "listening") && (
        <div className="flex items-center justify-center py-6">
          <div className="relative">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              state === "listening" ? "bg-emerald-500/20" : "bg-indigo-500/20"
            }`}>
              <Mic size={26} className="text-white" />
            </div>
            {state === "listening" && (
              <>
                <div className="absolute inset-0 rounded-full border-2 border-emerald-400/40 animate-ping" />
                <div className="absolute -inset-2 rounded-full border border-emerald-400/20 animate-pulse" />
                <div className="absolute -inset-4 rounded-full border border-emerald-400/10 animate-pulse" style={{ animationDelay: "0.3s" }} />
              </>
            )}
            {state === "waiting" && (
              <div className="absolute inset-0 rounded-full border-2 border-indigo-400/30 animate-pulse" />
            )}
          </div>
        </div>
      )}

      {/* Live transcript */}
      {transcript && (state === "waiting" || state === "listening") && (
        <div className="px-4 pb-3">
          <div className="bg-white/5 rounded-xl px-3 py-2 text-sm text-slate-300 italic">&quot;{transcript}&quot;</div>
        </div>
      )}

      {/* Processing */}
      {state === "processing" && (
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Language picker */}
      {languages.length > 0 && (
        <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-slate-200">Language</div>
            <div className="text-[10px] text-slate-500">Speak &amp; reply in</div>
          </div>
          <select
            value={language}
            onChange={(e) => onLanguageChange?.(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg text-xs text-slate-200 px-2 py-1.5 outline-none focus:border-indigo-400/50 max-w-[170px]"
          >
            {languages.map((l) => (
              <option key={l.value} value={l.value} className="bg-[#0d1529] text-slate-200">{l.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Hands-free toggle */}
      <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-slate-200">Hands-free</div>
          <div className="text-[10px] text-slate-500">Wake on &quot;Hey MyTime&quot;</div>
        </div>
        <button
          onClick={onToggleEnabled}
          role="switch"
          aria-checked={enabled}
          className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? "bg-emerald-500" : "bg-slate-600"}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${enabled ? "translate-x-5" : "translate-x-0"}`} />
        </button>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="px-4 py-3 border-t border-white/5">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Recent</div>
          <div className="space-y-1">
            {history.slice(0, 3).map((h, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px] text-slate-500">
                <span className="truncate">{h.command}</span>
                <span className="text-slate-600 ml-auto shrink-0">{h.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Debug log */}
      {debugLog.length > 0 && (
        <div className="px-4 py-2 border-t border-white/5">
          <details className="group">
            <summary className="text-[10px] font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:text-slate-400">
              Debug Log
            </summary>
            <div className="mt-1 max-h-[120px] overflow-y-auto space-y-0.5">
              {debugLog.map((msg, i) => (
                <div key={i} className="text-[9px] text-slate-600 font-mono">{msg}</div>
              ))}
            </div>
          </details>
        </div>
      )}

      {/* Footer hint */}
      <div className="px-4 py-2 border-t border-white/5 bg-white/[0.02]">
        <div className="text-[10px] text-slate-600 text-center">
          Say <span className="text-indigo-400 font-medium">&quot;Hey MyTime&quot;</span>, then your command &mdash; or tap the mic to talk
        </div>
      </div>
    </div>
  );
}
