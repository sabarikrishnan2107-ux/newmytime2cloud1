"use client";

import { Download, ShieldCheck, Cpu, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const SETUP_FILE = "/downloads/EmiratesIDReaderSetup-1.0.0.exe";
const SETUP_FILENAME = "EmiratesIDReaderSetup-1.0.0.exe";
const SETUP_VERSION = "1.0.0";
const SETUP_SIZE = "124 MB";

export default function EmirateIdSettingsPage() {
  return (
    <div className="p-4 md:p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-80px)]">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-600 dark:text-white flex items-center gap-2">
          Emirates ID Setup
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Install the Emirates ID Reader to scan and auto-fill employee details from physical Emirates ID cards.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/30 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <FileDown className="w-6 h-6" />
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-900 dark:text-white">
                Emirates ID Reader Setup
              </div>
              <div className="text-sm text-slate-500 mt-1">
                Version {SETUP_VERSION} &middot; {SETUP_SIZE} &middot; Windows installer (.exe)
              </div>
              <div className="text-xs text-slate-400 mt-2">
                Required on any workstation that connects to an Emirates ID card reader device.
              </div>
            </div>
          </div>

          <a href={SETUP_FILE} download={SETUP_FILENAME}>
            <Button className="gap-2">
              <Download className="w-4 h-4" />
              Download Installer
            </Button>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/30 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white mb-2">
            <Cpu className="w-4 h-4" /> System Requirements
          </div>
          <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-1.5 list-disc pl-5">
            <li>Windows 10 or later (64-bit)</li>
            <li>USB port for the Emirates ID card reader</li>
            <li>Administrator privileges to install drivers</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/30 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white mb-2">
            <ShieldCheck className="w-4 h-4" /> Installation Steps
          </div>
          <ol className="text-sm text-slate-600 dark:text-slate-300 space-y-1.5 list-decimal pl-5">
            <li>Click <span className="font-medium">Download Installer</span> above.</li>
            <li>Run the downloaded <span className="font-medium">{SETUP_FILENAME}</span>.</li>
            <li>Follow the on-screen prompts and approve the driver install.</li>
            <li>Plug in your Emirates ID reader and reload the employee form.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
