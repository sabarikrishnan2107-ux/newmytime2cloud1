"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bot, Send, ChevronLeft, Home } from "lucide-react";
import { faqGreeting, faqEntries, faqSections } from "@/config/supportFaq";
import { matchFaq } from "@/lib/matchSupportFaq";
import { aiInterpret } from "@/lib/voice/aiInterpret";

const MAX_HISTORY = 8;

// Scripted FAQ assistant (text only, no backend / no LLM). Browse by category
// or type a question — both resolve to the editable entries in
// config/supportFaq.js via lib/matchSupportFaq.js.
export default function FaqChat() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([{ role: "bot", text: faqGreeting }]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  // Navigation state drives which chips show under the conversation.
  //   { level: "home" }                    → section chips
  //   { level: "section", sectionId }      → that section's question chips
  //   { level: "answered", sectionId }     → back / all-topics chips
  //   { level: "suggest", entries: [...] } → "did you mean" chips
  const [nav, setNav] = useState({ level: "home" });
  const scrollRef = useRef(null);
  const conversationRef = useRef([]); // [{role, content}] for AI follow-up context

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, typing, nav]);

  const sectionLabel = (id) => faqSections.find((s) => s.id === id)?.label || "";
  const entriesFor = (id) => faqEntries.filter((e) => e.section === id);

  const pushBot = (text) => setMessages((m) => [...m, { role: "bot", text }]);
  const pushUser = (text) => setMessages((m) => [...m, { role: "user", text }]);

  // Open a category — show its questions.
  const openSection = (sectionId) => {
    if (typing) return;
    pushBot(`${sectionLabel(sectionId)} — what would you like to do?`);
    setNav({ level: "section", sectionId });
  };

  // Answer a specific entry (from a chip).
  const askEntry = (entry) => {
    if (typing) return;
    pushUser(entry.question);
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      pushBot(entry.answer);
      setNav({ level: "answered", sectionId: entry.section });
    }, 450);
  };

  // Handle a typed question.
  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || typing) return;
    pushUser(q);
    setInput("");
    setTyping(true);

    // 1) Fast path: confident match against the curated FAQ entries (free, instant).
    const result = matchFaq(q);
    if (result.type === "answer") {
      setTimeout(() => {
        setTyping(false);
        pushBot(result.entry.answer);
        setNav({ level: "answered", sectionId: result.entry.section });
      }, 350);
      return;
    }

    // 2) AI fallback: professional, full step-by-step answer in the user's language.
    const ai = await aiInterpret(q, "", conversationRef.current, "chat");
    setTyping(false);

    if (ai?.speech) {
      pushBot(ai.speech);
      setNav({ level: "home" });
      conversationRef.current = [
        ...conversationRef.current,
        { role: "user", content: q },
        { role: "assistant", content: ai.speech },
      ].slice(-MAX_HISTORY);
    } else if (result.type === "suggest") {
      pushBot("Did you mean one of these?");
      setNav({ level: "suggest", entries: result.entries });
    } else {
      pushBot(result.text);
      setNav({ level: "home" });
    }
  };

  const goHome = () => {
    if (typing) return;
    setNav({ level: "home" });
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      send();
    }
  };

  const chipBase =
    "px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors inline-flex items-center gap-1.5";
  const chipPrimary =
    "bg-violet-50 dark:bg-violet-500/15 text-primary dark:text-purple-300 border-violet-100 dark:border-violet-500/20 hover:bg-violet-100 dark:hover:bg-violet-500/25";
  const chipNeutral =
    "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600";

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col h-[calc(100vh-13rem)] min-h-[480px]">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 dark:border-slate-700">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-purple-600 text-white flex items-center justify-center shrink-0">
          <Bot size={18} />
        </div>
        <div className="min-w-0">
          <div className="text-[14px] font-bold text-slate-800 dark:text-slate-100 truncate">{t("supportPage.assistant")}</div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {t("supportPage.assistantStatus")}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-slate-50/40 dark:bg-slate-900/30">
        {messages.map((msg, i) =>
          msg.role === "bot" ? (
            <div key={i} className="flex gap-2 items-end">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-purple-600 text-white flex items-center justify-center shrink-0">
                <Bot size={14} />
              </div>
              <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 px-3.5 py-2.5 text-[13px] text-slate-700 dark:text-slate-100 shadow-sm whitespace-pre-line leading-relaxed">
                {msg.text}
              </div>
            </div>
          ) : (
            <div key={i} className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-br-md bg-primary text-white px-3.5 py-2.5 text-[13px] shadow-sm whitespace-pre-line">
                {msg.text}
              </div>
            </div>
          )
        )}

        {/* Typing indicator */}
        {typing && (
          <div className="flex gap-2 items-end">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-purple-600 text-white flex items-center justify-center shrink-0">
              <Bot size={14} />
            </div>
            <div className="rounded-2xl rounded-bl-md bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 px-4 py-3 shadow-sm">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
              </span>
            </div>
          </div>
        )}

        {/* Contextual chips */}
        {!typing && (
          <div className="flex flex-wrap gap-2 ms-9">
            {/* Home — section chips */}
            {nav.level === "home" &&
              faqSections.map((s) => {
                const Icon = s.icon;
                return (
                  <button key={s.id} onClick={() => openSection(s.id)} className={`${chipBase} ${chipPrimary}`}>
                    {Icon ? <Icon size={13} /> : null}
                    {s.label}
                  </button>
                );
              })}

            {/* Section — back + question chips */}
            {nav.level === "section" && (
              <>
                <button onClick={goHome} className={`${chipBase} ${chipNeutral}`}>
                  <ChevronLeft size={13} /> Back
                </button>
                {entriesFor(nav.sectionId).map((e) => (
                  <button key={e.id} onClick={() => askEntry(e)} className={`${chipBase} ${chipPrimary}`}>
                    {e.question}
                  </button>
                ))}
              </>
            )}

            {/* Answered — back to section + all topics */}
            {nav.level === "answered" && (
              <>
                <button onClick={() => openSection(nav.sectionId)} className={`${chipBase} ${chipNeutral}`}>
                  <ChevronLeft size={13} /> Back to {sectionLabel(nav.sectionId)}
                </button>
                <button onClick={goHome} className={`${chipBase} ${chipNeutral}`}>
                  <Home size={13} /> All topics
                </button>
              </>
            )}

            {/* Suggest — did-you-mean chips */}
            {nav.level === "suggest" && (
              <>
                {nav.entries.map((e) => (
                  <button key={e.id} onClick={() => askEntry(e)} className={`${chipBase} ${chipPrimary}`}>
                    {e.question}
                  </button>
                ))}
                <button onClick={goHome} className={`${chipBase} ${chipNeutral}`}>
                  <Home size={13} /> All topics
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-slate-100 dark:border-slate-700 p-3">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 focus-within:ring-2 focus-within:ring-primary/30">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            className="flex-1 text-[13px] outline-none bg-transparent text-slate-700 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            placeholder={t("supportPage.inputPlaceholder")}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || typing}
            title={t("supportPage.send")}
            aria-label={t("supportPage.send")}
            className="w-9 h-9 rounded-lg bg-primary text-white flex items-center justify-center disabled:opacity-40 hover:bg-purple-700 transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
