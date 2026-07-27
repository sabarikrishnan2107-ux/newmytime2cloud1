"use client";

import { useRef, useEffect } from "react";
import { X, Mic, Send, Sparkles } from "lucide-react";

// Each chip's text is sent verbatim to the assistant (matched by intentMatcher / AI).
const CHIPS = ["Absent today", "Present count", "On leave", "Pending leaves", "How to add employee?"];
const AV_COLORS = ["#ef4444", "#f59e0b", "#8b5cf6", "#0ea5e9", "#10b981", "#6366f1"];
const TONES = {
  red: "text-red-300 bg-red-500/15 border-red-500/25",
  green: "text-emerald-300 bg-emerald-500/15 border-emerald-500/25",
  amber: "text-amber-300 bg-amber-500/15 border-amber-500/25",
  indigo: "text-indigo-300 bg-indigo-500/15 border-indigo-500/25",
};

const initials = (name) => {
  const p = String(name || "?").trim().split(/\s+/);
  return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || "?";
};

function BotAvatar() {
  return (
    <div className="w-6 h-6 rounded-full shrink-0 grid place-items-center text-[10px] font-bold text-white bg-gradient-to-br from-indigo-500 to-purple-600">
      M
    </div>
  );
}

function Person({ name, meta, photo }) {
  const bg = AV_COLORS[String(name || "").length % AV_COLORS.length];
  return (
    <div className="flex items-center gap-2.5 py-1.5 [&+&]:border-t [&+&]:border-dashed [&+&]:border-white/[0.06]">
      {/* photo over an initials circle; if the image fails to load it hides and the initials show */}
      <div className="w-[26px] h-[26px] rounded-full shrink-0 relative overflow-hidden grid place-items-center text-[10px] font-bold text-white" style={{ background: bg }}>
        {photo && (
          <img src={photo} alt="" className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => { e.currentTarget.style.display = "none"; }} />
        )}
        <span className="relative">{initials(name)}</span>
      </div>
      <div className="text-[12.5px] text-slate-200 truncate">{name}</div>
      {meta != null && meta !== "" && <div className="ml-auto text-[11px] text-slate-500 shrink-0">{meta}</div>}
    </div>
  );
}

function Card({ title, badge, tone = "indigo", children }) {
  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-xl p-2.5 mt-2">
      <div className="flex items-center gap-2 text-[12px] font-bold text-white mb-2">
        {title}
        {badge != null && <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full border ${TONES[tone]}`}>{badge}</span>}
      </div>
      {children}
    </div>
  );
}

function ResultCard({ result }) {
  const { type, data, label } = result || {};
  if (!data) return null;
  const list = (arr, tone, meta) => (
    <Card title={label} badge={data.count} tone={tone}>
      {(arr || []).slice(0, 12).map((e, i) => <Person key={i} name={e.name} meta={meta(e)} photo={e.photo} />)}
      {(arr || []).length > 12 && <div className="text-[11px] text-slate-500 pt-1">+{arr.length - 12} more</div>}
    </Card>
  );
  if (type === "employee_list") return list(data.employees, "red", (e) => e.employee_id);
  if (type === "leave_list") return list(data.leaves, "green", (e) => e.leave_type);
  if (type === "change_list") return list(data.requests, "amber", (e) => e.date);
  if (type === "holiday_list") return list(data.holidays, "indigo", (e) => e.date);
  if (type === "count") return <Card title={label}><div className="text-2xl font-bold text-white px-1">{data.count}</div></Card>;
  if (type === "summary")
    return (
      <Card title={label}>
        {[["Present", data.present], ["Absent", data.absent], ["Late", data.late], ["On leave", data.leave]].map(([k, v]) => (
          <div key={k} className="flex items-center justify-between px-1 py-1 text-[12.5px]">
            <span className="text-slate-300">{k}</span><span className="font-bold text-white">{v}</span>
          </div>
        ))}
      </Card>
    );
  return null;
}

function MessageRow({ message }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] px-3 py-2.5 rounded-2xl rounded-br-[5px] text-[13px] leading-relaxed bg-gradient-to-br from-indigo-500 to-purple-600 text-white whitespace-pre-wrap">
          {message.text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-2 items-end">
      <BotAvatar />
      <div className="max-w-[80%] px-3 py-2.5 rounded-2xl rounded-bl-[5px] text-[13px] leading-relaxed bg-white/5 border border-white/10 text-slate-200 whitespace-pre-wrap">
        {message.text}
        {message.data && <ResultCard result={message.data} />}
      </div>
    </div>
  );
}

export default function ChatPanel({
  messages = [], state = "idle", company = "", language = "en-US", languages = [],
  onSend, onMic, onLanguageChange, onClose,
}) {
  const threadRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const t = threadRef.current;
    if (t) t.scrollTop = t.scrollHeight;
  }, [messages, state]);

  const submit = () => {
    const el = inputRef.current;
    const text = (el?.value || "").trim();
    if (!text) return;
    el.value = "";
    onSend?.(text);
  };
  const onKeyDown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } };

  return (
    <div className="absolute bottom-20 right-0 w-[372px] h-[620px] max-h-[80vh] flex flex-col bg-[#0d1529] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200 z-[9999]">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3.5 py-3 border-b border-white/10 bg-gradient-to-r from-indigo-500/15 via-purple-500/10 to-transparent shrink-0">
        <div className="w-[30px] h-[30px] rounded-[10px] grid place-items-center bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/40">
          <Sparkles size={16} className="text-white" />
        </div>
        <div className="flex flex-col leading-tight">
          <b className="text-[13.5px] text-white">MyTime Assistant</b>
          <span className="text-[10.5px] text-emerald-400 flex items-center gap-1.5 mt-0.5">
            <i className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
            Online{company ? ` · ${company}` : ""}
          </span>
        </div>
        <button onClick={onClose} className="ml-auto text-slate-500 hover:text-slate-300 transition" aria-label="Close">
          <X size={18} />
        </button>
      </div>

      {/* Thread — the only scrolling region */}
      <div ref={threadRef} className="flex-1 min-h-0 overflow-y-auto p-3.5 flex flex-col gap-3">
        {messages.map((m) => <MessageRow key={m.id} message={m} />)}
        {state === "processing" && (
          <div className="flex gap-2 items-end">
            <BotAvatar />
            <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-[5px] px-3 py-3">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:.3s]" />
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Suggestion chips */}
      <div className="flex flex-wrap gap-1.5 px-3.5 pb-2 shrink-0">
        {CHIPS.map((c) => (
          <button key={c} onClick={() => onSend?.(c)}
            className="text-[11.5px] text-indigo-200 bg-indigo-500/[0.12] border border-indigo-500/30 px-2.5 py-1.5 rounded-full hover:bg-indigo-500/20 transition whitespace-nowrap">
            {c}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-3.5 py-3 border-t border-white/10 bg-white/[0.02] shrink-0">
        <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 rounded-full pl-3.5 pr-1.5 py-1.5">
          <input ref={inputRef} onKeyDown={onKeyDown}
            placeholder={company ? `Ask anything about ${company}…` : "Ask anything…"}
            className="flex-1 bg-transparent border-none outline-none text-[13px] text-slate-200 placeholder:text-slate-500" />
          <button onClick={onMic} title="Tap to talk"
            className={`w-8 h-8 rounded-full grid place-items-center transition ${state === "listening" ? "text-red-400 bg-red-500/10" : "text-slate-400 hover:text-white hover:bg-white/5"}`}>
            <Mic size={18} />
          </button>
        </div>
        <button onClick={submit} title="Send"
          className="w-9 h-9 shrink-0 rounded-full grid place-items-center text-white bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/40 hover:from-indigo-600 hover:to-purple-700 transition">
          <Send size={18} />
        </button>
      </div>

      {/* Language row */}
      {languages.length > 0 && (
        <div className="text-[10px] text-slate-500 text-center pb-2.5 shrink-0">
          Replies in{" "}
          <select value={language} onChange={(e) => onLanguageChange?.(e.target.value)}
            className="bg-transparent text-indigo-300 font-semibold outline-none cursor-pointer">
            {languages.map((l) => <option key={l.value} value={l.value} className="bg-[#0d1529] text-slate-200">{l.label}</option>)}
          </select>{" "}· tap the mic for voice
        </div>
      )}
    </div>
  );
}
