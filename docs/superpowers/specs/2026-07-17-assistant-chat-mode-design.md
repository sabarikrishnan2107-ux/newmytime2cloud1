# MyTime Assistant — Chat Mode

**Date:** 2026-07-17
**Status:** Approved (design + visual mockup confirmed)
**Area:** `frontend-new` (front-end only — no backend or API-key changes)

## Goal

Replace the floating **voice/mic** assistant with a **typed chatbot** that answers
questions about the **currently logged-in company** (attendance, leave, quick
stats) and gives step-by-step how-to help. Voice is kept as an option *inside*
the chat, not removed.

## Why this is small

The engine already exists. `VoiceButton.jsx`'s `processCommand(text)` takes a
plain text string and runs the full pipeline: local intent match
(`intentMatcher`) → company-scoped data query (`commandExecutor.executeDataQuery`)
→ AI fallback (`aiInterpret` → `POST /api/voice/interpret`). The backend
(`VoiceAssistantController`) already supports a **`chat` mode** (detailed,
step-by-step) and uses Grok via the existing `XAI_API_KEY`. What's missing is
only a **typed UI**; today's `VoicePanel.jsx` is voice-only.

## Scope (approved)

- **Answers:** the existing fixed company intents only — `absent_list`,
  `present_count`, `late_list`, `attendance_summary`, `leave_requests`,
  `change_requests`, `on_leave_today`, `employee_count`, `upcoming_holidays` —
  plus how-to / general answers. All scoped to the logged-in company (unchanged;
  `executeDataQuery` already keys off the current company).
- **Input:** text box + a mic icon inside it (type OR tap-to-talk).
- **Replies:** rendered inline as a chat thread. Data answers show as compact
  cards (person list / count / on-leave); how-to answers show as text/numbered
  steps.
- **Speech:** only *voice*-initiated replies are spoken (TTS); typed replies are
  silent.

## Out of scope (YAGNI)

- Free-form "any data" Q&A (a possible phase 2).
- Persisting chat history across page reloads.
- Cross-company switching (assistant always answers for the active company).

## Components

- **`ChatPanel.jsx`** (new) — the chat UI. Props: `messages`, `state`
  (idle/processing/listening), `language`, `languages`, `onSend(text)`,
  `onMic()`, `onLanguageChange`, `onClose`. Renders:
  - **Header** (pinned): badge, "MyTime Assistant", "Online · <company name>",
    close button.
  - **Thread** (the only scrolling region; `flex:1; min-height:0; overflow-y:auto`):
    user bubbles (right) + bot bubbles (left, avatar). A bot message may carry a
    `data` payload → rendered as a card via a small `renderResultCard(result)`
    helper (reusing the shapes `commandExecutor` already returns:
    `employee_list`, `count`, `summary`, `leave_list`, `change_list`,
    `holiday_list`, `answer`, `greeting`, `error`).
  - **Suggestion chips** (pinned): Absent today, Present count, On leave,
    Pending leaves, How to add employee? — each calls `onSend(chipText)`.
  - **Input bar** (pinned): text field + inner mic button + send button.
  - Auto-scroll thread to bottom on every new message.
- **`VoiceButton.jsx`** (edit):
  - Launcher icon: mic → chat-bubble (keep drag/position/behaviour).
  - New `messages` state: `[{ id, role:'user'|'bot', text, data?, language? }]`.
  - `handleSend(text)` appends the user message, then calls the existing
    `processCommand(text, { mode:'chat', speak:false })`; the existing `finish()`
    callback appends the bot message (text = `res.speech`, `data = res`).
  - The inner mic button reuses `startCommand()` (voice path, `mode:'voice'`,
    speaks the reply).
  - Render `<ChatPanel>` instead of `<VoicePanel>`. `VoiceResultModal` /
    `VoicePanel` are no longer used by this flow (left in place, unreferenced).
- **`processCommand(text, opts)`** (edit): accept `{ mode, speak }`. `mode` is
  forwarded to `aiInterpret`; `speak` gates the TTS `speak()` call. Voice keeps
  today's behaviour (`mode:'voice'`, `speak:true`); chat uses
  (`mode:'chat'`, `speak:false`).
- **`aiInterpret(text, language, history, mode='voice')`** (edit): pass `mode`
  in the POST body to `/api/voice/interpret` (backend already reads it).

## Data flow

```
user types / chip tap / mic
      │  handleSend(text) | startCommand()
      ▼
processCommand(text, {mode, speak})
      │  matchIntent (en) ─► executeDataQuery(intent)   ← company-scoped
      │  else ─► aiInterpret(text, lang, history, mode) ─► /api/voice/interpret
      ▼
finish(result) ─► append bot message {text: result.speech, data: result}
                └─► if speak: TTS(result.speech)
```

## Error handling

- AI unavailable / `kind:'none'` → friendly bot bubble ("Sorry, I didn't
  understand — try 'absent today' or 'how to add an employee'.").
- `executeDataQuery` throws → bot bubble "Couldn't fetch that, please try again."
- No token / logged out → existing 401 path from the backend; bot bubble asks to
  re-login. (Same behaviour as today.)

## Testing

- Manual: type each of the 9 intents → correct company-scoped card; a how-to
  question → numbered steps; a nonsense string → graceful fallback; the inner
  mic → voice still works and speaks. Verify header/chips/input stay pinned and
  only the thread scrolls, auto-scrolling to newest.
- Confirm no other company's data appears (scoping unchanged).

## Reference

Visual mockup: `chatbot-mockup.html` (repo root) — approved look, scroll fixed.
