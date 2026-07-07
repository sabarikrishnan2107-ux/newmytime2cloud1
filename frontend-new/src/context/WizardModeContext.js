"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import axios from "axios";
import { API_BASE_URL, getUser } from "@/config/index";

// Shared wizard-mode state so the header button and the left-sidebar entry
// reflect (and toggle) the same value without going out of sync.
//
// Stored per-company on the backend (companies.wizard_mode) so the toggle is
// shared across every browser/device logged into that company. Refetched on
// window focus to pick up changes made on another machine.
const WizardModeContext = createContext(null);

export function WizardModeProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  const [wizardMode, setWizardMode] = useState(false);
  const [wizardReady, setWizardReady] = useState(false);

  const getCompanyId = useCallback(() => {
    try {
      const u = getUser();
      return u?.company_id || u?.company?.id || null;
    } catch {
      return null;
    }
  }, []);

  const fetchWizardMode = useCallback(async () => {
    const companyId = getCompanyId();
    if (!companyId) {
      setWizardReady(true);
      return;
    }
    try {
      const { data } = await axios.get(`${API_BASE_URL}/company/${companyId}/wizard-mode`);
      setWizardMode(Boolean(data?.wizard_mode));
    } catch (e) {
      // On error, leave current state untouched but mark ready so UI unblocks
    } finally {
      setWizardReady(true);
    }
  }, [getCompanyId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    fetchWizardMode();
    const onFocus = () => fetchWizardMode();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchWizardMode]);

  const toggleWizard = useCallback(async () => {
    const companyId = getCompanyId();
    if (!companyId) return;
    const next = !wizardMode;
    setWizardMode(next); // optimistic
    try {
      await axios.post(`${API_BASE_URL}/company/${companyId}/wizard-mode`, { wizard_mode: next });
    } catch (e) {
      setWizardMode(!next); // revert on failure
    }
  }, [wizardMode, getCompanyId]);

  // Redirect logic: when wizard is on, force the user to /setup
  useEffect(() => {
    if (!wizardReady || !wizardMode || !pathname) return;
    // Allow setup, login pages, and any auth-related routes
    const allow = pathname.startsWith("/setup") || pathname.startsWith("/login") || pathname === "/";
    if (!allow) router.replace("/setup");
  }, [wizardReady, wizardMode, pathname, router]);

  return (
    <WizardModeContext.Provider value={{ wizardMode, wizardReady, toggleWizard }}>
      {children}
    </WizardModeContext.Provider>
  );
}

export function useWizardMode() {
  const ctx = useContext(WizardModeContext);
  // Fallback keeps consumers rendered outside the provider inert instead of
  // crashing (wizard simply does nothing on those routes).
  return ctx || { wizardMode: false, wizardReady: true, toggleWizard: () => {} };
}
