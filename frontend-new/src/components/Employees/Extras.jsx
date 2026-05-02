"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getBranches, uploadEmployee, downloadEmployeeSampleTemplate, exportEmployeesExcel } from "@/lib/api";
import { FileDown, Upload, FileSpreadsheet } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";

import { Button } from "@/components/ui/button";
import axios from "axios";

import { getUser } from "@/config/index";
import Input from "../Theme/Input";

export function EmployeeExtras({ data, onUploadSuccess }) {
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [files, setFiles] = useState(null);
  const [btnLoader, setBtnLoader] = useState(false);
  const [errors, setErrors] = useState([]);
  const [snackbar, setSnackbar] = useState(null);

  // Fetch branches
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        setBranches(await getBranches());
      } catch (error) {
        console.error("Error fetching branches:", error);
        setBranches([]);
      }
    };
    fetchBranches();
  }, []);

  const handleSelectBranch = (currentValue) => {
    if (currentValue === "Select All") {
      setSelectedBranch(null);
    } else {
      const selectedBranchItem = branches.find((b) => b.name === currentValue);
      if (selectedBranchItem) {
        setSelectedBranch(
          selectedBranchItem.id === selectedBranch
            ? null
            : selectedBranchItem.id,
        );
      }
    }
    setPopoverOpen(false);
  };

  const handleDownloadSample = async () => {
    try {
      await downloadEmployeeSampleTemplate();
    } catch (e) {
      alert("Failed to download sample template. Please try again.");
    }
  };

  const handleExportEmployees = async () => {
    try {
      await exportEmployeesExcel();
    } catch (e) {
      alert("Failed to export employees. Please try again.");
    }
  };

  const importEmployee = async () => {
    setSnackbar(null);
    setErrors([]);

    if (!selectedBranch) {
      alert("Please select a branch.");
      return;
    }
    if (!files) {
      alert("Please choose an Excel or CSV file.");
      return;
    }

    const user = await getUser();
    if (!user) {
      alert("Session expired. Please log in again.");
      return;
    }

    const payload = new FormData();
    payload.append("employees", files);
    payload.append("company_id", user.company_id || 0);
    payload.append("branch_id", selectedBranch);

    setBtnLoader(true);
    try {
      const data = await uploadEmployee(payload);
      setBtnLoader(false);

      const importErrors = data.errors || [];
      const skipped = data.skipped || [];
      const created = data.created || 0;

      if (data.record) {
        if (onUploadSuccess) onUploadSuccess();
        setErrors([...skipped, ...importErrors]);
        setSnackbar(data.message || `Imported ${created} employee(s).`);
        if (importErrors.length === 0 && skipped.length === 0) {
          setDialogOpen(false);
          setFiles(null);
        }
      } else {
        setErrors(importErrors.length ? importErrors : ["Could not import any rows. Check the file and try again."]);
        setSnackbar(null);
      }
    } catch (e) {
      setBtnLoader(false);
      if (e.toString().includes("Network Error")) {
        setErrors(["Network error. Please check your connection and try again."]);
      } else {
        setErrors([e.message || "Upload failed."]);
      }
    }
  };

  const btnBase = "p-2 transition-all duration-200 rounded-xl border glass-card !bg-white border-gray-200 dark:!bg-slate-900 dark:border-white/10 active:scale-95";

  return (
    <>
      {/* Inline action buttons */}
      <div className="flex items-center gap-1.5">
        <button
          title="Download Sample File"
          onClick={handleDownloadSample}
          className={`${btnBase} text-sky-600 hover:bg-sky-50 hover:border-sky-300 dark:text-sky-400 dark:hover:bg-sky-500/10 dark:hover:border-sky-500/40`}
        >
          <FileDown className="w-5 h-5" />
        </button>
        <button
          title="Import Employees"
          onClick={() => setDialogOpen(true)}
          className={`${btnBase} text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 dark:text-emerald-400 dark:hover:bg-emerald-500/10 dark:hover:border-emerald-500/40`}
        >
          <Upload className="w-5 h-5" />
        </button>
        <button
          title="Export Employees"
          onClick={handleExportEmployees}
          className={`${btnBase} text-rose-600 hover:bg-rose-50 hover:border-rose-300 dark:text-rose-400 dark:hover:bg-rose-500/10 dark:hover:border-rose-500/40`}
        >
          <FileSpreadsheet className="w-5 h-5" />
        </button>
      </div>
      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md w-[90%] p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle>Upload Employees</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-gray-500 mb-4">
            Select a branch and upload an Excel (.xlsx) or CSV file. Profile
            photos are not required — add them later from each employee profile.
          </p>

          {/* Branch Dropdown */}
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={popoverOpen}
                className="w-full justify-between mb-4"
              >
                {selectedBranch
                  ? branches.find((b) => b.id === selectedBranch)?.name
                  : "Select Branch"}
                <span className="material-icons text-gray-400">
                  expand_more
                </span>
              </Button>
            </PopoverTrigger>

            <PopoverContent className="w-[320px] p-0">
              <Command>
                <CommandInput placeholder="Search branch..." />
                <CommandEmpty>No branch found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem value="Select All" onSelect={handleSelectBranch}>
                    Select All
                  </CommandItem>
                  {branches.map((branch) => (
                    <CommandItem
                      key={branch.id}
                      value={branch.name}
                      onSelect={handleSelectBranch}
                    >
                      {branch.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>

          {/* File input */}
          <Input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => setFiles(e.target.files[0])}
            className="mb-4"
          />

          {errors.length > 0 && (
            <div className="text-red-500 text-xs mb-2 max-h-40 overflow-y-auto border border-red-200 rounded p-2 bg-red-50 dark:bg-red-950/20">
              {errors.map((err, idx) => (
                <p key={idx} className="leading-tight mb-1">• {err}</p>
              ))}
            </div>
          )}

          <Button
            onClick={importEmployee}
            disabled={btnLoader}
            className="w-full"
          >
            {btnLoader ? "Uploading..." : "Upload"}
          </Button>

          {snackbar && (
            <p className={`text-${snackbar ? "green" : "red"}-500 mt-2`}>
              {snackbar}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
