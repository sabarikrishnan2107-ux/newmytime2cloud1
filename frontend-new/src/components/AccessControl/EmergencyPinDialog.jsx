"use client";

import { useState, useEffect } from "react";
import { LockOpen, X } from "lucide-react";
import { notify } from "@/lib/utils";

const PIN_LENGTH = 4;
const EMERGENCY_PIN = "0000";

export default function EmergencyPinDialog({ open, onCancel, onUnlock, deviceCount = 0 }) {
  const [pin, setPin] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) { setPin([]); setSubmitting(false); }
  }, [open]);

  const handleNumber = (n) => {
    if (pin.length < PIN_LENGTH) setPin([...pin, n]);
  };
  const handleBackspace = () => setPin(pin.slice(0, -1));
  const handleClear = () => setPin([]);

  const handleSubmit = async () => {
    if (pin.length !== PIN_LENGTH) return;
    if (pin.join("") !== EMERGENCY_PIN) {
      notify("Invalid PIN", "Wrong emergency code. Try again.", "error");
      setPin([]);
      return;
    }
    setSubmitting(true);
    await Promise.resolve(onUnlock?.());
  };

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 top-[72px] z-50 flex items-center justify-center px-4 bg-black/60">
      <div className="relative w-full max-w-md rounded-2xl bg-card shadow-elevated overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-foreground">Enter PIN to Unlock</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Will unlock {deviceCount} device{deviceCount !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* PIN Display */}
        <div className="p-6">
          <div className="flex justify-center gap-3 mb-7">
            {[...Array(PIN_LENGTH)].map((_, i) => (
              <div
                key={i}
                className={`w-12 h-12 flex items-center justify-center text-2xl font-bold rounded-full border-2 transition-all ${
                  pin[i]
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted/30"
                }`}
              >
                {pin[i] ? "•" : ""}
              </div>
            ))}
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handleNumber(num.toString())}
                disabled={submitting}
                className="h-14 flex items-center justify-center text-xl font-semibold text-foreground bg-muted/40 hover:bg-muted rounded-xl transition-colors active:scale-95 disabled:opacity-50"
              >
                {num}
              </button>
            ))}
            <button
              onClick={handleBackspace}
              disabled={submitting}
              className="h-14 flex items-center justify-center text-sm font-medium text-primary hover:text-primary/80 transition-colors active:scale-95 disabled:opacity-50"
            >
              Backspace
            </button>
            <button
              onClick={() => handleNumber("0")}
              disabled={submitting}
              className="h-14 flex items-center justify-center text-xl font-semibold text-foreground bg-muted/40 hover:bg-muted rounded-xl transition-colors active:scale-95 disabled:opacity-50"
            >
              0
            </button>
            <button
              onClick={handleClear}
              disabled={submitting}
              className="h-14 flex items-center justify-center text-sm font-bold tracking-wider text-primary hover:text-primary/80 transition-colors active:scale-95 disabled:opacity-50"
            >
              CLEAR
            </button>
          </div>

          {/* Submit */}
          <button
            disabled={pin.length < PIN_LENGTH || submitting}
            onClick={handleSubmit}
            className="w-full bg-primary disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-bold py-3.5 rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <LockOpen size={18} />
            {submitting ? "OPENING…" : "UNLOCK DOOR"}
          </button>
        </div>
      </div>
    </div>
  );
}
