"use client";

import { useState, useEffect } from "react";
import { Siren } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function EmergencyExitDialog({ open, onCancel, onConfirm, deviceCount = 0 }) {
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setSubmitting(false);
  }, [open]);

  const handleConfirm = async () => {
    setSubmitting(true);
    await Promise.resolve(onConfirm?.());
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !submitting && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <Siren className="h-5 w-5 text-destructive" />
            <DialogTitle className="text-base font-semibold text-foreground">
              Open All Doors?
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed pt-1">
            This will send an unlock command to all{" "}
            <span className="font-semibold text-foreground tabular-nums">{deviceCount}</span> access
            terminal{deviceCount !== 1 ? "s" : ""} immediately. Use only in case of emergency or
            evacuation.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="sm:justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={submitting || deviceCount === 0}
            className="bg-destructive text-destructive-foreground hover:opacity-95 disabled:opacity-50"
          >
            {submitting ? "Opening…" : "Yes, Open All Doors"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
