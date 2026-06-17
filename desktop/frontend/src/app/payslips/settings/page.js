"use client";

import PayrollSettings from "@/components/payroll/PayrollSettings";

export default function SettingsPage() {
  return (
    <div className="p-5 overflow-y-auto max-h-[calc(100vh-64px)]">
      <PayrollSettings />
    </div>
  );
}
