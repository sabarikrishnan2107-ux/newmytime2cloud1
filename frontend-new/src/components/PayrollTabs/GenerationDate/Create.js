// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import DropDown from "@/components/ui/DropDown";

import { getBranches, createPayrollGenerationDate } from "@/lib/api";
import { formatDateDubai, parseApiError } from "@/lib/utils";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

const defaultPayload = {
  branch_id: "",
  date: new Date(),
};

const Create = ({ pageTitle = "Add Item", onSuccess = (e) => { e } }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [globalError, setGlobalError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(defaultPayload);
  const [branches, setBranches] = useState([]);

  const fetchBranches = async () => {
    try {
      setBranches(await getBranches());
    } catch (error) {
      setGlobalError(parseApiError(error));
    }
  };

  useEffect(() => {
    if (open) {
      fetchBranches();
      setForm(defaultPayload);
    }
  }, [open]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const onSubmit = async () => {
    setGlobalError(null);
    setLoading(true);
    try {

      await createPayrollGenerationDate({ ...form, date: formatDateDubai(form.date) });

      await new Promise((resolve) => setTimeout(resolve, 2000));

      onSuccess({
        title: t("payroll.tabs.actions.successSave", { title: pageTitle }),
        description: t("payroll.tabs.actions.successSaveDesc", { title: pageTitle }),
      });
      setOpen(false);
    } catch (error) {
      setGlobalError(parseApiError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>{t("payroll.tabs.actions.add", { title: pageTitle })}</Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl p-6 rounded-2xl shadow-xl w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-800">
              {t("payroll.tabs.actions.createNew", { title: pageTitle })}
            </DialogTitle>
            <p className="text-sm text-gray-500 mt-1">
              {t("payroll.tabs.generationDate.dialogDesc")}
            </p>
          </DialogHeader>

          <div className="mt-6 space-y-6">
            {/* Branch selection */}
            <div>
              <Label className="text-sm mb-2 block">{t("payroll.tabs.selectBranch")}</Label>
              <DropDown
                placeholder={t("payroll.tabs.chooseBranch")}
                value={form.branch_id}
                items={branches}
                onChange={(val) => handleChange("branch_id", val)}
              />
            </div>

            {/* Calendar Date Picker */}
            <div>
              <Label className="text-sm mb-2 block">{t("payroll.tabs.selectDate")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.date ? formatDateDubai(form.date) : <span>{t("payroll.tabs.pickDate")}</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0" align="start">
                  <Calendar className={'w-full'}
                    mode="single"
                    selected={form.date}
                    onSelect={(val) => handleChange("date", val)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Error Message */}
          {globalError && (
            <div className="mt-5 p-3 border border-red-500 bg-red-50 text-red-700 rounded-lg text-sm">
              {globalError}
            </div>
          )}

          {/* Footer */}
          <DialogFooter className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-lg">
              {t("payroll.common.cancel")}
            </Button>
            <Button
              onClick={onSubmit}
              disabled={loading}
              className="rounded-lg bg-primary text-white"
            >
              {loading ? t("payroll.common.saving") : t("payroll.tabs.actions.create", { title: pageTitle })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Create;
