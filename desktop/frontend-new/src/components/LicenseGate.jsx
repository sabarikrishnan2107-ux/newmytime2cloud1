"use client";

// Desktop license gate. On load it asks the local backend for license status.
// - Valid & activated  -> renders the app (plus a slim banner when expiring soon).
// - Not activated / expired / wrong machine -> shows a blocking activation screen.
//
// This gate is UX only — the Laravel backend independently enforces the license
// on every add (employees/devices) and via the `licensed` middleware. So if the
// status call fails (transient), we fail OPEN and let the server be the gate.

import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date(new Date().toDateString());
  const exp = new Date(dateStr);
  return Math.round((exp - today) / 86400000);
}

export default function LicenseGate({ children }) {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);   // null when unreachable (fail open)
  const [token, setToken] = useState("");
  const [activating, setActivating] = useState(false);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/license/status");
      setStatus(data.record || null);
    } catch {
      setStatus(null);           // backend unreachable -> fail open (server still enforces)
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setToken(String(ev.target.result || "").trim());
    reader.readAsText(file);
  };

  const copyFp = async () => {
    const text = status?.machine_fp || "";
    if (!text) return;
    try {
      // navigator.clipboard only works in a secure context (https/localhost).
      // The desktop app is served over the LAN address (http://<ip>:3001), which
      // is NOT secure, so fall back to a hidden textarea + execCommand there.
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        if (!ok) throw new Error("execCommand copy failed");
      }
      toast.success("Activation code copied");
    } catch {
      toast.error("Copy failed — click the code, press Ctrl+A then Ctrl+C");
    }
  };

  const activate = async () => {
    if (!token.trim()) { toast.error("Paste your license key first"); return; }
    setActivating(true);
    try {
      const { data } = await api.post("/license/activate", { token: token.trim() });
      if (data.status) {
        toast.success("License activated");
        setToken("");
        await load();            // re-fetch -> unblocks if valid
      } else {
        toast.error(data.message || "Activation failed");
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || "Activation failed");
    } finally {
      setActivating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
      </div>
    );
  }

  // Fail open (unreachable) or fully valid -> show the app (with optional banner).
  const valid = status === null || (status.activated && status.valid);

  if (valid) {
    const dleft = status ? daysUntil(status.expiry) : null;
    const showBanner = dleft !== null && dleft <= 30;
    return (
      <>
        {showBanner && (
          <div className={`shrink-0 px-4 py-1.5 text-center text-xs font-medium ${dleft <= 7 ? "bg-red-600 text-white" : "bg-amber-500 text-black"}`}>
            License expires in {dleft} day{dleft === 1 ? "" : "s"} ({status.expiry}) ·
            {" "}{status.used_employees}/{status.max_employees} employees · {status.used_devices}/{status.max_devices} devices
          </div>
        )}
        {children}
      </>
    );
  }

  // Blocking activation screen.
  const fp = status?.machine_fp || "";
  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50 p-6 dark:bg-slate-900">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-slate-800 dark:text-slate-100">Activate MyTime2Cloud</CardTitle>
          <CardDescription>
            {status?.reason || "This desktop needs a license key to continue."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Activation Code (send this to your provider)
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={fp || "unavailable — restart the app"}
                onFocus={(e) => e.target.select()}
                onClick={(e) => e.target.select()}
                title={fp || ""}
                className="flex-1 cursor-text select-all rounded-md bg-slate-100 px-3 py-2 font-mono text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
              <Button type="button" variant="outline" size="sm" onClick={copyFp} disabled={!fp}>
                Copy
              </Button>
            </div>
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              License Key
            </div>
            <textarea
              rows={4}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste the license key you received…"
              className="w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-800 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <div className="mt-2">
              <input ref={fileRef} type="file" accept=".lic,.txt" className="hidden" onChange={onFile} />
              <Button type="button" variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
                Load .lic file
              </Button>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={load} disabled={activating}>
            Refresh
          </Button>
          <Button type="button" onClick={activate} disabled={activating}>
            {activating ? "Activating…" : "Activate"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
