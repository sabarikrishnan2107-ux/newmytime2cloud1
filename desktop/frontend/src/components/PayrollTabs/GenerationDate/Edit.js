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

import { getBranches, updatePayrollGenerationDate } from "@/lib/api";
import { formatDateLocal, parseApiError } from "@/lib/utils";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

const Edit = ({
  pageTitle = "item",
  initialData = {},
  onSuccess = () => { },
  controlledOpen,
  controlledSetOpen,
}) => {
  const { t } = useTranslation();
  const isControlled = controlledOpen !== undefined;
  const [open, setOpen] = useState(false);
  const actualOpen = isControlled ? controlledOpen : open;
  const actualSetOpen = isControlled ? controlledSetOpen : setOpen;

  const [branches, setBranches] = useState([]);
  const [error, setError] = useState(null);

  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState(initialData);

  useEffect(() => {
    if (actualOpen) {
      fetchBranches();
      setForm(initialData);
    }
  }, [actualOpen, initialData]);

  const fetchBranches = async () => {
    try {
      setBranches(await getBranches());
    } catch (error) {
      setError(parseApiError(error));
    }
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await updatePayrollGenerationDate(initialData.id, { ...form, date: formatDateLocal(form.date) });
      onSuccess({ title: t("payroll.tabs.actions.successSaved", { title: pageTitle }), description: t("payroll.tabs.actions.successSavedDesc", { title: pageTitle }) }); actualSetOpen(false);
    } catch (error) {
      setError(parseApiError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={actualOpen} onOpenChange={actualSetOpen}>
      <DialogContent className="max-w-2xl p-6 rounded-2xl shadow-xl w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-800">
            {t("payroll.tabs.actions.edit", { title: pageTitle })}
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
                  {form.date ? formatDateLocal(form.date) : <span>{t("payroll.tabs.pickDate")}</span>}
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
        {error && (
          <div className="mt-5 p-3 border border-red-500 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
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
            {loading ? t("payroll.common.saving") : t("payroll.tabs.actions.saveShort")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default Edit;
