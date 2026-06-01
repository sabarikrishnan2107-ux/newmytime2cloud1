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

import { getBranches, updatePayrollFormula } from "@/lib/api";
import { parseApiError } from "@/lib/utils";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
      await updatePayrollFormula(initialData.id, form);
      onSuccess({ title: t("payroll.tabs.actions.successSaved", { title: pageTitle }), description: t("payroll.tabs.actions.successSavedDesc", { title: pageTitle }) }); actualSetOpen(false);
    } catch (error) {
      setError(parseApiError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={actualOpen} onOpenChange={actualSetOpen}>
      <DialogContent className="max-w-2xl p-6 rounded-2xl shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-800">
            {t("payroll.tabs.actions.edit", { title: pageTitle })}
          </DialogTitle>
          <p className="text-sm text-gray-500 mt-1">
            {t("payroll.tabs.formula.dialogDesc")}
          </p>
        </DialogHeader>

        <div className="mt-6 space-y-6">
          <div>
            <Label className="text-sm mb-2 block">{t("payroll.tabs.selectBranch")}</Label>
            <DropDown
              placeholder={t("payroll.tabs.chooseBranch")}
              value={form.branch_id}
              items={branches}
              onChange={(val) => handleChange("branch_id", val)}
            />
          </div>

          <div className="border rounded-xl p-4 ">
            <Label className="block text-sm font-medium mb-3 text-gray-700">
              {t("payroll.tabs.salaryCalcType")}
            </Label>

            <RadioGroup
              value={form.salary_type}
              onValueChange={(val) => handleChange("salary_type", val)}
              className="flex items-center gap-8"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="basic_salary" id="basic" />
                <Label htmlFor="basic" className="text-sm cursor-pointer">
                  {t("payroll.fields.basicSalary")}
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <RadioGroupItem value="net_salary" id="net" />
                <Label htmlFor="net" className="text-sm cursor-pointer">
                  {t("payroll.fields.netSalary")}
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label className="block text-sm font-medium mb-2">{t("payroll.tabs.overtimeFormula")}</Label>
            <div className="flex items-center gap-3">
              <Input className="w-1/2" value={t("payroll.tabs.perHourSalary")} readOnly />
              <span className="text-lg text-gray-500">×</span>
              <Input
                className="w-1/2"
                placeholder={t("payroll.tabs.enterOtValue")}
                value={form.ot_value}
                onChange={(e) => handleChange("ot_value", e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label className="block text-sm font-medium mb-2">{t("payroll.tabs.lateDeductionFormula")}</Label>
            <div className="flex items-center gap-3">
              <Input className="w-1/2" value={t("payroll.tabs.perHourSalary")} readOnly />
              <span className="text-lg text-gray-500">×</span>
              <Input
                className="w-1/2"
                placeholder={t("payroll.tabs.enterDeductionValue")}
                value={form.deduction_value}
                onChange={(e) => handleChange("deduction_value", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Error message */}
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
            {loading ? t("payroll.common.saving") : t("payroll.tabs.actions.save", { title: pageTitle })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default Edit;
