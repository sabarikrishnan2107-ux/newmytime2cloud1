"use client";

import { useState, useRef, useCallback, useEffect } from "react";

const WAKE_WORDS = ["hey mytime", "hi mytime", "hey my time", "hi my time"];
const SILENCE_TIMEOUT = 8000;
const MIN_CONFIDENCE = 0.7;

export default function useVoiceRecognition({ onCommand, onWakeWord, onTranscript }) {
  const [state, setState] = useState("idle"); // idle | waiting | listening | processing
  const [transcript, setTranscript] = useState("");
  const [language, setLanguage] = useState("en-US");

  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const stateRef = useRef("idle");
  const manualStopRef = useRef(false);

  // Keep stateRef in sync
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const startSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      if (stateRef.current === "listening") {
        stop();
      }
    }, SILENCE_TIMEOUT);
  }, [clearSilenceTimer]);

  const detectLanguage = useCallback((text) => {
    const tamil = /[\u0B80-\u0BFF]/;
    const arabic = /[\u0600-\u06FF]/;
    const french = /[àâçéèêëîïôûùüÿñæœ]/i;

    if (tamil.test(text)) return "ta-IN";
    if (arabic.test(text)) return "ar-SA";
    if (french.test(text)) return "fr-FR";
    return "en-US";
  }, []);

  const containsWakeWord = useCallback((text) => {
    const lower = text.toLowerCase().trim();
    return WAKE_WORDS.some((w) => lower.includes(w));
  }, []);

  const extractCommandAfterWakeWord = useCallback((text) => {
    const lower = text.toLowerCase().trim();
    for (const w of WAKE_WORDS) {
      const idx = lower.indexOf(w);
      if (idx !== -1) {
        return lower.substring(idx + w.length).trim();
      }
    }
    return "";
  }, []);

  const createRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    return recognition;
  }, []);

  const stop = useCallback(() => {
    manualStopRef.current = true;
    clearSilenceTimer();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setState("idle");
    stateRef.current = "idle";
  }, [clearSilenceTimer]);

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported");
      return;
    }

    // Stop any existing
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }

    manualStopRef.current = false;
    const recognition = createRecognition();
    if (!recognition) return;

    recognitionRef.current = recognition;
    setState("waiting");
    stateRef.current = "waiting";
    setTranscript("");

    recognition.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        const confidence = result[0].confidence;

        if (result.isFinal) {
          finalTranscript += text;
        } else {
          interimTranscript += text;
        }
      }

      const currentText = finalTranscript || interimTranscript;
      setTranscript(currentText);
      onTranscript?.(currentText);

      // Detect language
      if (currentText.length > 3) {
        const detected = detectLanguage(currentText);
        setLanguage(detected);
      }

      if (stateRef.current === "waiting") {
        // Looking for wake word
        if (containsWakeWord(currentText)) {
          setState("listening");
          stateRef.current = "listening";
          onWakeWord?.();

          const cmdAfterWake = extractCommandAfterWakeWord(finalTranscript);
          if (cmdAfterWake.length > 2) {
            // Command came with wake word
            setState("processing");
            stateRef.current = "processing";
            clearSilenceTimer();
            onCommand?.(cmdAfterWake, language);
            try { recognition.stop(); } catch {}
          } else {
            startSilenceTimer();
            setTranscript("");
          }
        }
      } else if (stateRef.current === "listening") {
        // We have wake word, now listening for command
        startSilenceTimer();

        if (finalTranscript.trim().length > 2) {
          const confidence = event.results[event.results.length - 1]?.[0]?.confidence || 0;
          if (confidence >= MIN_CONFIDENCE || confidence === 0) {
            // confidence 0 means the browser didn't provide it - still accept
            setState("processing");
            stateRef.current = "processing";
            clearSilenceTimer();
            onCommand?.(finalTranscript.trim(), language);
            try { recognition.stop(); } catch {}
          }
        }
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      console.warn("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        stop();
      }
    };

    recognition.onend = () => {
      // Auto-restart if still in waiting/listening mode (not manually stopped)
      if (!manualStopRef.current && (stateRef.current === "waiting" || stateRef.current === "listening")) {
        try {
          recognition.start();
        } catch {}
      }
    };

    try {
      recognition.start();
    } catch (e) {
      console.error("Failed to start recognition:", e);
    }
  }, [createRecognition, containsWakeWord, extractCommandAfterWakeWord, detectLanguage, onCommand, onWakeWord, onTranscript, startSilenceTimer, clearSilenceTimer, stop, language]);

  const setProcessingDone = useCallback(() => {
    setState("idle");
    stateRef.current = "idle";
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearSilenceTimer();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    };
  }, [clearSilenceTimer]);

  const isSupported = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

  return {
    state,
    transcript,
    language,
    isSupported,
    startListening,
    stop,
    setProcessingDone,
  };
}
