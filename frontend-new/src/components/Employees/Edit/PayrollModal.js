import React, { useState } from 'react';
import { X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Input from '@/components/Theme/Input';
import { storePayroll, uploadEmployeeDocument } from '@/lib/api';
import { notify } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

const PayrollModel = ({ onSuccess = () => { }, employee_id, basic_salary = 0, allowances = [] }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    description: "",
    amount: "",
  });

  const toggleModal = () => setIsOpen(!isOpen);

  const onSubmit = async (e) => {
    e.preventDefault();

    let earnings = [
      {
        "label": form.description,
        "value": form.amount
      }
    ];

    let finalEarnings = earnings.concat(allowances)
    let payload = {
      "earnings": finalEarnings,
      "effective_date": "2026-02-01",
      "basic_salary": basic_salary,
      "net_salary": basic_salary + Number(form.amount),
      "employee_id": employee_id
    };

    setSubmitting(true);
    try {
      await storePayroll(payload);
      await notify(t("payroll.employeeEdit.toastSuccess"), t("payroll.employeeEdit.allowanceAdded"), "success");
      toggleModal();
      onSuccess(employee_id);
    } catch ({ response }) {
      await notify(t("payroll.employeeEdit.toastError"), response?.data?.message, "error");
      // Optionally show a toast here
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex justify-center">
      {/* Trigger Button - Styled like the Education Modal trigger */}
      <Button
        onClick={toggleModal}
      >
        <FileText size={20} />
        {t("payroll.employeeEdit.addNewAllowance")}
      </Button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-x-0 bottom-0 top-[72px] z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">

          {/* Modal Container - Reference style from Education Modal */}
          <div className="relative w-full max-w-[540px] max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 shrink-0">
              <h3 className="text-slate-900 dark:text-white text-xl font-bold tracking-tight">
                {t("payroll.employeeEdit.addNewAllowance")}
              </h3>
              <button
                onClick={toggleModal}
                className="flex items-center justify-center w-8 h-8 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-950/20">
              <form id="document-form" className="flex flex-col gap-6">

                {/* Description */}
                <div className="flex flex-col gap-2">
                  <label className="text-slate-900 dark:text-slate-200 text-sm font-semibold">{t("payroll.employeeEdit.description")}</label>
                  <Input
                    type="text"
                    placeholder={t("payroll.employeeEdit.descriptionPlaceholder")}
                    value={form.description || ""}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>

                {/* Amount */}
                <div className="flex flex-col gap-2">
                  <label className="text-slate-900 dark:text-slate-200 text-sm font-semibold">{t("payroll.common.amount")}</label>
                  <Input
                    type="text"
                    placeholder={t("payroll.employeeEdit.amountPlaceholder")}
                    value={form.amount || ""}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                </div>

              </form>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 shrink-0">
              <button
                onClick={toggleModal}
                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {t("payroll.common.cancel")}
              </button>
              <button
                onClick={onSubmit}
                type="submit"
                form="document-form"
                className="px-5 py-2.5 rounded-lg bg-primary text-white font-bold text-sm shadow-md hover:bg-blue-700 transition-all flex items-center gap-2"
              >
                {submitting ? t("payroll.employeeEdit.submitting") : t("payroll.employeeEdit.submit")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollModel;