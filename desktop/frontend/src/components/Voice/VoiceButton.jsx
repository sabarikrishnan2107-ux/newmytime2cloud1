"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff } from "lucide-react";
import useTextToSpeech from "@/hooks/useTextToSpeech";
import { matchIntent } from "@/lib/voice/intentMatcher";
import { executeDataQuery } from "@/lib/voice/commandExecutor";
import { aiInterpret } from "@/lib/voice/aiInterpret";
import VoicePanel from "./VoicePanel";
import VoiceResultModal from "./VoiceResultModal";

const SILENCE_TIMEOUT = 8000;
const WAKE_WORDS = ["hey mytime", "hi mytime", "hey my time", "hi my time", "hey my-time"];
const POSITION_STORAGE_KEY = "voiceButtonPosition";
const ENABLED_STORAGE_KEY = "voiceHandsFreeEnabled";
const LANG_STORAGE_KEY = "voiceLanguage";
const DRAG_THRESHOLD_PX = 5;
const RESUME_DELAY = 1500; // wait for TTS before re-listening for the wake word

// Languages offered in the picker. value = BCP-47 used by the mic + TTS.
const LANGUAGES = [
  { value: "en-US", label: "English" },
  { value: "ta-IN", label: "தமிழ் (Tamil)" },
  { value: "hi-IN", label: "हिन्दी (Hindi)" },
  { value: "ar-SA", label: "العربية (Arabic)" },
  { value: "fr-FR", label: "Français (French)" },
];

// Result types that deserve the big centered popup
const MODAL_TYPES = new Set([
  "employee_list", "summary", "count", "leave_list", "change_list", "holiday_list", "greeting", "answer", "error",
]);
const MAX_HISTORY = 8; // conversation turns kept for follow-up context

export default function VoiceButton() {
  const router = useRouter();
  const [enabled, setEnabled] = useState(false); // hands-free wake word on/off — default OFF
  const [language, setLanguage] = useState("en-US"); // mic + reply language
  const [panelOpen, setPanelOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [voiceState, setVoiceState] = useState("idle"); // idle | waiting | listening | processing
  const [transcript, setTranscript] = useState("");
  const [debugLog, setDebugLog] = useState([]);
  const [position, setPosition] = useState(null); // {x, y} | null (null = default bottom-right)
  const [dragging, setDragging] = useState(false);

  const { speak } = useTextToSpeech();
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const resumeTimerRef = useRef(null);
  const stateRef = useRef("idle");
  const enabledRef = useRef(false);
  const langRef = useRef("en-US");
  const conversationRef = useRef([]); // [{role:"user"|"assistant", content}]
  const manualStopRef = useRef(false);
  const micGrantedRef = useRef(false);
  const gestureBoundRef = useRef(false);
  const startWakeWordRef = useRef(null);
  const buttonRef = useRef(null);
  const dragStateRef = useRef({
    isPointerDown: false,
    didDrag: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });

  const isSupported = typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const setState = useCallback((s) => {
    stateRef.current = s;
    setVoiceState(s);
  }, []);

  const addDebug = useCallback((msg) => {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setDebugLog((prev) => [`[${time}] ${msg}`, ...prev].slice(0, 20));
    console.log(`[Voice] ${msg}`);
  }, []);

  const addToHistory = useCallback((command) => {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setHistory((prev) => [{ command, time }, ...prev].slice(0, 5));
  }, []);

  const playChime = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } catch {}
  }, []);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const armSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      if (stateRef.current === "listening") {
        addDebug("No command heard - back to wake word");
        setState("waiting");
        setTranscript("");
      }
    }, SILENCE_TIMEOUT);
  }, [clearSilenceTimer, addDebug, setState]);

  // Ask for mic permission once. Browsers need a user gesture the first time.
  const ensureMicPermission = useCallback(async () => {
    if (micGrantedRef.current) return true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      micGrantedRef.current = true;
      addDebug("Microphone permission granted");
      return true;
    } catch (err) {
      addDebug(`Microphone not available yet: ${err.name || err.message}`);
      return false;
    }
  }, [addDebug]);

  // Fully stop the recognition stream (used when disabling or during processing/TTS)
  const stopRecognition = useCallback(() => {
    manualStopRef.current = true;
    clearSilenceTimer();
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
  }, [clearSilenceTimer]);

  const processCommand = useCallback(async (text) => {
    addToHistory(text);
    setState("processing");
    setPanelOpen(true);
    addDebug(`Processing: "${text}"`);

    // Stop listening while we talk back, so we don't hear ourselves
    stopRecognition();

    const finish = (res, { navigate } = {}) => {
      setResult(res);
      if (res && MODAL_TYPES.has(res.type)) setModalOpen(true);
      if (res?.speech) speak(res.speech, res.language || langRef.current);
      // Remember this exchange so follow-up questions have context
      if (res?.speech) {
        conversationRef.current = [
          ...conversationRef.current,
          { role: "user", content: text },
          { role: "assistant", content: res.speech },
        ].slice(-MAX_HISTORY);
      }
      if (navigate) router.push(navigate);
      setState("idle");
      // Re-arm background wake word after the spoken reply
      if (enabledRef.current) {
        if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
        resumeTimerRef.current = setTimeout(() => {
          if (enabledRef.current) startWakeWordRef.current?.();
        }, RESUME_DELAY);
      }
    };

    // English: try the free/instant local keyword match first.
    // Other languages: skip straight to the AI (keywords are English-only).
    const intent = langRef.current.startsWith("en") ? matchIntent(text) : null;

    if (intent) {
      addDebug(`Local intent: ${intent.type} - ${intent.command.label || "greeting"}`);

      if (intent.type === "navigate") {
        finish(
          { speech: `Opening ${intent.command.label}.`, label: intent.command.label, type: "navigate", data: null },
          { navigate: intent.command.route }
        );
        return;
      }
      if (intent.type === "greeting") {
        finish({ speech: intent.command.response, label: "MyTime Assistant", type: "greeting", data: null });
        return;
      }
      if (intent.type === "query") {
        try {
          const queryResult = await executeDataQuery(intent.command);
          addDebug(`Query result: ${queryResult.label}`);
          finish(queryResult);
        } catch (e) {
          addDebug(`Query error: ${e.message}`);
          finish({ speech: "Sorry, there was an error fetching that. Please try again.", data: null, label: "Error", type: "error" });
        }
        return;
      }
    }

    // AI fallback: understands any language, questions & guidance (Grok or Claude via backend).
    addDebug("Asking AI...");
    const ai = await aiInterpret(text, langRef.current, conversationRef.current);

    if (!ai || ai.kind === "none") {
      addDebug(ai ? "AI: no match" : "AI unavailable");
      finish({
        speech: ai?.speech || "Sorry, I didn't understand that. Try 'show today absent list' or 'open attendance'.",
        data: null,
        label: "Not Understood",
        type: "error",
        language: ai?.language,
      });
      return;
    }

    addDebug(`AI: ${ai.kind} ${ai.intent || ai.route || ""}`);

    if (ai.kind === "navigate" && ai.route) {
      finish(
        { speech: ai.speech, label: ai.label || "Page", type: "navigate", data: null, language: ai.language },
        { navigate: ai.route }
      );
      return;
    }
    if (ai.kind === "greeting") {
      finish({ speech: ai.speech, label: "MyTime Assistant", type: "greeting", data: null, language: ai.language });
      return;
    }
    if (ai.kind === "answer") {
      // Conversational guidance / how-to answer
      finish({ speech: ai.speech, label: "MyTime Assistant", type: "answer", data: null, language: ai.language });
      return;
    }
    if (ai.kind === "query" && ai.intent) {
      try {
        const queryResult = await executeDataQuery({ intent: ai.intent });
        addDebug(`AI query result: ${queryResult.label}`);
        // Show the data popup, but speak the AI's reply in the user's language.
        finish({ ...queryResult, speech: ai.speech || queryResult.speech, language: ai.language });
      } catch (e) {
        addDebug(`AI query error: ${e.message}`);
        finish({ speech: ai.speech || "Sorry, there was an error fetching that.", data: null, label: "Error", type: "error", language: ai.language });
      }
      return;
    }

    // Unknown shape -> treat as not understood
    finish({ speech: ai.speech || "Sorry, I didn't understand that.", data: null, label: "Not Understood", type: "error", language: ai.language });
  }, [addToHistory, addDebug, speak, router, setState, stopRecognition]);

  // Build a recognition instance wired to our handlers.
  const buildRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = langRef.current || "en-US";

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += text;
        else interimText += text;
      }
      const currentText = finalText || interimText;
      setTranscript(currentText);

      if (stateRef.current === "waiting") {
        const lower = currentText.toLowerCase().trim();
        const hit = WAKE_WORDS.find((w) => lower.includes(w));
        if (hit) {
          addDebug("Wake word detected!");
          playChime();
          setResult(null);
          setModalOpen(false);
          setState("listening");
          setPanelOpen(true);
          setTranscript("");

          // Did they say the command in the same breath? ("hey mytime, today absent list")
          const idx = lower.indexOf(hit);
          const tail = lower.substring(idx + hit.length).replace(/^[,.\s]+/, "").trim();
          if (tail.length > 2 && finalText) {
            clearSilenceTimer();
            processCommand(tail);
          } else {
            armSilenceTimer();
          }
        }
      } else if (stateRef.current === "listening") {
        if (finalText.trim().length > 2) {
          addDebug(`Heard: "${finalText.trim()}"`);
          clearSilenceTimer();
          processCommand(finalText.trim());
        } else {
          armSilenceTimer(); // reset timeout while they're still speaking
        }
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "no-speech" || event.error === "aborted") {
        return; // normal - onend will restart
      }
      addDebug(`Recognition error: ${event.error}`);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        micGrantedRef.current = false;
        manualStopRef.current = true;
        setState("idle");
      }
    };

    recognition.onend = () => {
      // Keep the background loop alive while hands-free is on
      if (!manualStopRef.current && enabledRef.current &&
          (stateRef.current === "waiting" || stateRef.current === "listening")) {
        try { recognition.start(); } catch {}
      }
    };

    return recognition;
  }, [addDebug, playChime, setState, armSilenceTimer, clearSilenceTimer, processCommand]);

  // Start (or restart) background listening for the wake word.
  const startWakeWord = useCallback(async () => {
    if (!isSupported || !enabledRef.current) return;
    const granted = await ensureMicPermission();
    if (!granted) {
      // Can't get the mic yet (needs a user gesture). Retry on first interaction.
      if (!gestureBoundRef.current) {
        gestureBoundRef.current = true;
        const retry = () => {
          gestureBoundRef.current = false;
          document.removeEventListener("pointerdown", retry);
          document.removeEventListener("keydown", retry);
          startWakeWordRef.current?.();
        };
        document.addEventListener("pointerdown", retry, { once: true });
        document.addEventListener("keydown", retry, { once: true });
        addDebug("Waiting for first click to enable hands-free voice...");
      }
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    manualStopRef.current = false;
    const recognition = buildRecognition();
    recognitionRef.current = recognition;
    setState("waiting");
    setTranscript("");
    try {
      recognition.start();
      addDebug("Listening for 'Hey MyTime'");
    } catch (e) {
      addDebug(`Failed to start: ${e.message}`);
    }
  }, [isSupported, ensureMicPermission, buildRecognition, setState, addDebug]);

  // Manual push-to-talk: skip the wake word and capture a command right away.
  const startCommand = useCallback(async () => {
    if (!isSupported) return;
    const granted = await ensureMicPermission();
    if (!granted) {
      setResult({ speech: "Microphone access was denied. Please allow the microphone and try again.", label: "Permission Needed", type: "error" });
      setModalOpen(true);
      return;
    }
    playChime();
    setResult(null);
    setModalOpen(false);

    if (recognitionRef.current && stateRef.current === "waiting") {
      // Reuse the live stream - just switch to command mode
      setState("listening");
      setPanelOpen(true);
      setTranscript("");
      armSilenceTimer();
      addDebug("Listening for command (tap)");
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    manualStopRef.current = false;
    const recognition = buildRecognition();
    recognitionRef.current = recognition;
    setState("listening");
    setPanelOpen(true);
    setTranscript("");
    armSilenceTimer();
    try {
      recognition.start();
      addDebug("Listening for command (tap)");
    } catch (e) {
      addDebug(`Failed to start: ${e.message}`);
    }
  }, [isSupported, ensureMicPermission, playChime, buildRecognition, setState, armSilenceTimer, addDebug]);

  // Keep refs pointed at the latest callbacks (avoids stale closures in timers/listeners)
  useEffect(() => { startWakeWordRef.current = startWakeWord; }, [startWakeWord]);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  // Hydrate the hands-free preference, then auto-start on load.
  useEffect(() => {
    if (!isSupported) return;
    let pref = false; // default OFF — hands-free only turns on if the user explicitly enabled it
    try {
      const raw = localStorage.getItem(ENABLED_STORAGE_KEY);
      if (raw !== null) pref = raw === "true";
      const savedLang = localStorage.getItem(LANG_STORAGE_KEY);
      if (savedLang) {
        setLanguage(savedLang);
        langRef.current = savedLang;
      }
    } catch {}
    setEnabled(pref);
    enabledRef.current = pref;
    if (pref) startWakeWordRef.current?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupported]);

  const toggleEnabled = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      enabledRef.current = next;
      try { localStorage.setItem(ENABLED_STORAGE_KEY, String(next)); } catch {}
      if (next) {
        addDebug("Hands-free enabled");
        startWakeWordRef.current?.();
      } else {
        addDebug("Hands-free disabled");
        stopRecognition();
        setState("idle");
        setTranscript("");
      }
      return next;
    });
  }, [addDebug, stopRecognition, setState]);

  const changeLanguage = useCallback((lang) => {
    setLanguage(lang);
    langRef.current = lang;
    try { localStorage.setItem(LANG_STORAGE_KEY, lang); } catch {}
    addDebug(`Language: ${lang}`);
    // Restart the mic so the new language takes effect for the wake word
    if (enabledRef.current) {
      stopRecognition();
      setTimeout(() => { if (enabledRef.current) startWakeWordRef.current?.(); }, 200);
    }
  }, [addDebug, stopRecognition]);

  // Cleanup
  useEffect(() => {
    return () => {
      clearSilenceTimer();
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      manualStopRef.current = true;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    };
  }, [clearSilenceTimer]);

  // Hydrate saved position from localStorage (post-mount to avoid SSR mismatch)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(POSITION_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (typeof parsed?.x !== "number" || typeof parsed?.y !== "number") return;
      const btnSize = 48;
      const x = Math.max(0, Math.min(parsed.x, window.innerWidth - btnSize));
      const y = Math.max(0, Math.min(parsed.y, window.innerHeight - btnSize));
      setPosition({ x, y });
    } catch {}
  }, []);

  // Re-clamp position on viewport resize so the button stays on-screen
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        if (!prev) return prev;
        const btn = buttonRef.current;
        const w = btn?.offsetWidth || 48;
        const h = btn?.offsetHeight || 48;
        const x = Math.max(0, Math.min(prev.x, window.innerWidth - w));
        const y = Math.max(0, Math.min(prev.y, window.innerHeight - h));
        if (x === prev.x && y === prev.y) return prev;
        try {
          localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify({ x, y }));
        } catch {}
        return { x, y };
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!isSupported) return null;

  const handleMicClick = () => {
    // Suppress click that fires immediately after a drag
    if (dragStateRef.current.didDrag) {
      dragStateRef.current.didDrag = false;
      return;
    }
    setPanelOpen(true);
    if (voiceState === "listening" || voiceState === "processing") {
      // Stop the current attempt; fall back to background wake word (or idle)
      clearSilenceTimer();
      setTranscript("");
      if (enabledRef.current) {
        startWakeWordRef.current?.();
      } else {
        stopRecognition();
        setState("idle");
      }
      return;
    }
    // idle or waiting -> talk now
    startCommand();
  };

  const handlePointerDown = (e) => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    dragStateRef.current = {
      isPointerDown: true,
      didDrag: false,
      startX: e.clientX,
      startY: e.clientY,
      originX: rect.left,
      originY: rect.top,
    };
    try { buttonRef.current.setPointerCapture(e.pointerId); } catch {}
  };

  const handlePointerMove = (e) => {
    const ds = dragStateRef.current;
    if (!ds.isPointerDown) return;
    const dx = e.clientX - ds.startX;
    const dy = e.clientY - ds.startY;
    if (!ds.didDrag && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
      ds.didDrag = true;
      setDragging(true);
    }
    if (ds.didDrag && buttonRef.current) {
      const w = buttonRef.current.offsetWidth;
      const h = buttonRef.current.offsetHeight;
      const x = Math.max(0, Math.min(ds.originX + dx, window.innerWidth - w));
      const y = Math.max(0, Math.min(ds.originY + dy, window.innerHeight - h));
      setPosition({ x, y });
    }
  };

  const handlePointerUp = (e) => {
    const ds = dragStateRef.current;
    if (!ds.isPointerDown) return;
    ds.isPointerDown = false;
    if (buttonRef.current?.hasPointerCapture?.(e.pointerId)) {
      try { buttonRef.current.releasePointerCapture(e.pointerId); } catch {}
    }
    if (ds.didDrag && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      try {
        localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify({ x: rect.left, y: rect.top }));
      } catch {}
    }
    setDragging(false);
  };

  const handleClosePanel = () => setPanelOpen(false);
  const handleCloseModal = () => setModalOpen(false);
  const handleAskAgain = () => {
    setModalOpen(false);
    startCommand();
  };

  const isListening = voiceState === "listening";
  const isActive = voiceState === "listening" || voiceState === "processing";
  // Calm "armed" glow when hands-free is on and idling in the background
  const isArmed = enabled && (voiceState === "waiting" || voiceState === "idle");

  const wrapperStyle = position
    ? { left: position.x, top: position.y }
    : { bottom: 24, right: 24 };

  return (
    <>
      {/* Centered result popup */}
      {modalOpen && (
        <VoiceResultModal
          result={result}
          wakeWordActive={enabled}
          onClose={handleCloseModal}
          onAskAgain={handleAskAgain}
        />
      )}

      <div className="fixed z-[9999]" style={wrapperStyle}>
        {/* Status / debug panel */}
        {panelOpen && (
          <VoicePanel
            state={voiceState}
            enabled={enabled}
            language={language}
            languages={LANGUAGES}
            transcript={transcript}
            history={history}
            debugLog={debugLog}
            onToggleEnabled={toggleEnabled}
            onLanguageChange={changeLanguage}
            onClose={handleClosePanel}
          />
        )}

        {/* Floating Mic Button */}
        <button
          ref={buttonRef}
          onClick={handleMicClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ touchAction: "none", cursor: dragging ? "grabbing" : "grab" }}
          className={`group relative w-12 h-12 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
            isActive
              ? "bg-red-500 hover:bg-red-600 shadow-red-500/30"
              : "bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-indigo-500/30"
          }`}
        >
          {voiceState === "idle" && !enabled ? (
            <MicOff size={18} className="text-white" />
          ) : (
            <Mic size={18} className="text-white" />
          )}

          {/* Active (post wake word) - strong red pulse */}
          {isActive && (
            <>
              <span className="absolute inset-0 rounded-full border-2 border-red-400/40 animate-ping" />
              <span className="absolute -inset-1 rounded-full border border-red-400/20 animate-pulse" />
            </>
          )}

          {/* Armed (background wake word) - calm emerald ring */}
          {isArmed && enabled && !isActive && (
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400/70 animate-ping" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400 border-2 border-[#0b1020]" />
            </span>
          )}

          {!panelOpen && !dragging && (
            <span className="absolute -top-10 right-0 bg-slate-900 text-white text-[10px] font-medium px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10">
              {isActive ? "Listening - tap to stop" : enabled ? "Tap to talk (or say 'Hey MyTime')" : "Voice off - tap to talk"}
            </span>
          )}
        </button>
      </div>
    </>
  );
}
