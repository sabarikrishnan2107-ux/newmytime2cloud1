# MyTime Assistant — Chat Mode Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the floating voice assistant into a typed chatbot (mic kept inside the input) that answers company-scoped quick stats and how-to questions, reusing the existing engine.

**Architecture:** New presentational `ChatPanel.jsx` renders a chat thread + input. `VoiceButton.jsx` keeps all its existing logic (`processCommand`, `startCommand`, `executeDataQuery`, `aiInterpret`) and gains a `messages` thread state; typed input calls `processCommand(text, {mode:'chat', speak:false})`, the inner mic reuses the voice path. No backend, no API-key, no scoping changes.

**Tech Stack:** Next.js (app router), React client components, Tailwind, lucide-react icons.

## Global Constraints

- **No git commits by the agent.** The user handles all commits/pushes ([feedback_no_git_push]). Tasks END with a runtime verification, not a commit.
- **No frontend test runner exists** (`frontend-new` scripts are dev/build/start only). Verification is runtime: `npm run dev` + browser, or `npm run build` for compile checks. Do NOT add Jest/Vitest.
- **Company scoping is already correct** — `executeDataQuery` keys off the logged-in company via `buildQueryParams`. Do not change it.
- **`aiInterpret(text, language, history, mode)` already accepts `mode`** — just pass it. Do not edit `aiInterpret.js`.
- Headings gotcha: globals.css sets `h1/h2/h3 { … !important }`. ChatPanel uses only `div`/`span`/`b` — keep it that way.
- Result shapes returned by `executeDataQuery` (used to render cards):
  - `employee_list` → `{ type, label, speech, data:{ employees:[{name,employee_id,branch,in,out}], count } }`
  - `leave_list` → `{ …, data:{ leaves:[{name,leave_type,start_date,end_date,days,status}], count } }`
  - `change_list` → `{ …, data:{ requests:[{name,date,reason}], count } }`
  - `holiday_list` → `{ …, data:{ holidays:[{name,date,days}], count } }`
  - `count` → `{ …, data:{ count } }`
  - `summary` → `{ …, data:{ present,absent,late,leave,holiday,off,total } }`
  - `answer` / `greeting` / `navigate` / `error` → `{ …, data:null }` (text only, no card)

---

### Task 1: Create `ChatPanel.jsx` (presentational chat UI)

**Files:**
- Create: `frontend-new/src/components/Voice/ChatPanel.jsx`

**Interfaces:**
- Produces: default export `ChatPanel` with props
  `{ messages:Array<{id,role:'user'|'bot',text,data?}>, state:'idle'|'processing'|'listening', company:string, language:string, languages:Array<{value,label}>, onSend:(text)=>void, onMic:()=>void, onLanguageChange:(v)=>void, onClose:()=>void }`.
- Consumes: `lucide-react` icons.

- [ ] **Step 1: Write the component**

Create `frontend-new/src/components/Voice/ChatPanel.jsx`:

```jsx
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

function Person({ name, meta }) {
  const bg = AV_COLORS[String(name || "").length % AV_COLORS.length];
  return (
    <div className="flex items-center gap-2.5 py-1.5 [&+&]:border-t [&+&]:border-dashed [&+&]:border-white/[0.06]">
      <div className="w-[26px] h-[26px] rounded-full shrink-0 grid place-items-center text-[10px] font-bold text-white" style={{ background: bg }}>
        {initials(name)}
      </div>
      <div className="text-[12.5px] text-slate-200">{name}</div>
      {meta != null && meta !== "" && <div className="ml-auto text-[11px] text-slate-500">{meta}</div>}
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
      {(arr || []).slice(0, 12).map((e, i) => <Person key={i} name={e.name} meta={meta(e)} />)}
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
```

- [ ] **Step 2: Verify it compiles**

Run: `cd frontend-new && npm run build`
Expected: build succeeds with no error referencing `ChatPanel.jsx`. (A full build is slow; if it's too slow, at minimum confirm no import/syntax error is reported for this file.)

---

### Task 2: Wire `ChatPanel` into `VoiceButton.jsx`

**Files:**
- Modify: `frontend-new/src/components/Voice/VoiceButton.jsx`

**Interfaces:**
- Consumes: `ChatPanel` (Task 1); existing `processCommand`, `startCommand`, `changeLanguage`.
- Produces: chat-thread UI wired to the existing engine.

- [ ] **Step 1: Swap imports (icons + panel + user)**

Change line 5 `import { Mic, MicOff } from "lucide-react";` to:
```jsx
import { MessageCircle } from "lucide-react";
```
Change line 10 `import VoicePanel from "./VoicePanel";` to:
```jsx
import ChatPanel from "./ChatPanel";
import { getUser } from "@/config";
```
(Leave the `import VoiceResultModal` line as-is.)

- [ ] **Step 2: Add chat thread + company state**

Immediately after the `const [dragging, setDragging] = useState(false);` line (~48), add:
```jsx
  const [company, setCompany] = useState("");
  const [messages, setMessages] = useState([
    { id: 0, role: "bot", text: "Hi! I'm your MyTime Assistant. Ask me about today's attendance, leave, or how to do anything in the app. 👋" },
  ]);
  const msgIdRef = useRef(1);

  const appendMessage = useCallback((role, text, data = null) => {
    setMessages((prev) => [...prev, { id: msgIdRef.current++, role, text, data }]);
  }, []);
```

- [ ] **Step 3: Load the company name for the header**

After the hydrate effect (near the other `useEffect`s, after the block ending ~439), add:
```jsx
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const u = await getUser();
        if (!cancelled) setCompany(u?.company?.name || u?.company_name || u?.name || "");
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);
```

- [ ] **Step 4: Make `processCommand` accept mode/speak and write to the thread**

Change the signature (line 149) from `const processCommand = useCallback(async (text) => {` to:
```jsx
  const processCommand = useCallback(async (text, { mode = "voice", speak: doSpeak = true } = {}) => {
```
Right after `addToHistory(text);` (line 150), add:
```jsx
    appendMessage("user", text);
```
Inside the local `finish` closure, change the speak line (line 161) from
`      if (res?.speech) speak(res.speech, res.language || langRef.current);`
to:
```jsx
      if (doSpeak && res?.speech) speak(res.speech, res.language || langRef.current);
      appendMessage("bot", res?.speech || "", res && res.data ? res : null);
```
Delete the modal-open line inside `finish` (line 160): `      if (res && MODAL_TYPES.has(res.type)) setModalOpen(true);` (results now show inline in the thread).
Change the AI call (line 214) from `const ai = await aiInterpret(text, langRef.current, conversationRef.current);` to:
```jsx
    const ai = await aiInterpret(text, langRef.current, conversationRef.current, mode);
```
Add `appendMessage` to the `processCommand` dependency array (line 261): append `, appendMessage` before the closing `]`.

- [ ] **Step 5: Replace the launcher click + render `ChatPanel`**

Replace `handleMicClick` (lines 520-541) with a launcher that just opens/closes the chat:
```jsx
  const handleLauncherClick = () => {
    if (dragStateRef.current.didDrag) { dragStateRef.current.didDrag = false; return; }
    setPanelOpen((o) => !o);
  };
  const handlePanelMic = () => startCommand();
  const handleSend = (text) => { processCommand(text, { mode: "chat", speak: false }); };
```
In the JSX, replace the whole `<VoicePanel … />` block (lines 621-634) with:
```jsx
        {panelOpen && (
          <ChatPanel
            messages={messages}
            state={voiceState}
            company={company}
            language={language}
            languages={LANGUAGES}
            onSend={handleSend}
            onMic={handlePanelMic}
            onLanguageChange={changeLanguage}
            onClose={handleClosePanel}
          />
        )}
```
Change the launcher button's `onClick={handleMicClick}` (line 639) to `onClick={handleLauncherClick}`.
Replace the icon block (lines 651-655) with a chat bubble:
```jsx
          <MessageCircle size={20} className="text-white" />
```
(Remove the now-unused `isActive ? red : gradient` swap only if it references removed vars — keep the existing gradient classes; they still work. The `Mic`/`MicOff` refs are gone.)

- [ ] **Step 6: Verify runtime — drive the app**

Run: `cd frontend-new && npm run dev` (starts on :3001). Log in, then:
1. Click the floating chat-bubble button → the chat panel opens with the greeting.
2. Type `absent today` → Enter → a user bubble appears, a typing indicator, then a bot bubble "N employees are absent today." with an **Absent** card listing people for THIS company only.
3. Tap each chip (Present count, On leave, Pending leaves) → correct cards.
4. Type `how do I add an employee?` → numbered how-to steps in a bot bubble.
5. Type gibberish `asdfgh` → graceful fallback bubble.
6. Click the mic inside the input → say a command → it still works AND speaks the reply; the exchange appears in the thread.
7. Confirm header/chips/input stay pinned; only the thread scrolls; it auto-scrolls to the newest message.
Expected: all pass; no console errors; no other company's names appear.

---

### Task 3: Cleanup pass

**Files:**
- Modify: `frontend-new/src/components/Voice/VoiceButton.jsx`

- [ ] **Step 1: Remove dead references**

Search `VoiceButton.jsx` for now-unused symbols and remove ONLY if unreferenced elsewhere in the file: the `MODAL_TYPES` const (only used by the deleted modal-open line) and the `Mic`/`MicOff` imports (already removed in Task 2). Leave `VoiceResultModal`, `setModalOpen`, `modalOpen` and the `{modalOpen && <VoiceResultModal … />}` block intact — the mic permission path still uses the modal.

- [ ] **Step 2: Verify build**

Run: `cd frontend-new && npm run build`
Expected: compiles clean, no "defined but never used" errors for removed symbols.

---

## Self-Review

- **Spec coverage:** chat UI (Task 1) ✓; company-scoped data via existing engine (Task 2, unchanged executor) ✓; mic-inside-input (Task 2, `onMic`) ✓; inline cards for all 6 data shapes (Task 1 `ResultCard`) ✓; how-to answers as text (MessageRow) ✓; typed→`chat` mode, voice→`voice`+speak (Task 2 Step 4) ✓; launcher icon → chat bubble (Task 2 Step 5) ✓; out-of-scope items untouched ✓.
- **Placeholder scan:** none — full component code + exact edit lines given.
- **Type consistency:** `appendMessage(role,text,data)` defined and used consistently; `ResultCard` reads `result.type/.data/.label` matching the executor shapes in Global Constraints; `ChatPanel` prop names match the render in Task 2 Step 5.
