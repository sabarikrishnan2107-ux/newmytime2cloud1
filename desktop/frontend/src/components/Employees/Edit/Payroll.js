import React, { useEffect, useState } from 'react';
import { Lock, Save } from 'lucide-react';
import Input from '@/components/Theme/Input';
import { notify } from '@/lib/utils';
import { api, buildQueryParams } from '@/lib/api-client';
import { useTranslation } from 'react-i18next';

const Payroll = ({ employee_id }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [structureId, setStructureId] = useState(null);
  const [form, setForm] = useState({
    basic_salary: 0,
    salary_mode: "gross_based",
    house_allowance: 0,
    transport_allowance: 0,
    food_allowance: 0,
    medical_allowance: 0,
    other_allowance: 0,
    overtime_eligible: false,
    loan_deduction: false,
    advance_deduction: false,
  });

  const fetchStructure = async () => {
    setLoading(true);
    try {
      const params = await buildQueryParams({});
      const { data } = await api.get(`/payroll-management/employee-salary/${employee_id}`, { params });
      if (data) {
        setStructureId(data.id);
        const mode = data.salary_mode || "basic_based";
        // For gross_based, show gross_salary in the main field so user sees what they entered
        const mainValue = mode === "gross_based"
          ? (parseFloat(data.gross_salary) || 0)
          : (parseFloat(data.basic_salary) || 0);
        setForm({
          basic_salary: mainValue,
          salary_mode: mode,
          house_allowance: parseFloat(data.house_allowance) || 0,
          transport_allowance: parseFloat(data.transport_allowance) || 0,
          food_allowance: parseFloat(data.food_allowance) || 0,
          medical_allowance: parseFloat(data.medical_allowance) || 0,
          other_allowance: parseFloat(data.other_allowance) || 0,
          overtime_eligible: !!data.overtime_eligible,
          loan_deduction: !!data.loan_deduction,
          advance_deduction: !!data.advance_deduction,
        });
      }
    } catch (e) {}
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (employee_id) fetchStructure();
  }, [employee_id]);

  const totalAllowances = Number(form.house_allowance || 0) + Number(form.transport_allowance || 0) +
    Number(form.food_allowance || 0) + Number(form.medical_allowance || 0) + Number(form.other_allowance || 0);

  // Calculate based on salary mode
  const isGrossBased = form.salary_mode === "gross_based";
  const isNetBased = form.salary_mode === "net_based";
  const grossTotal = isGrossBased ? Number(form.basic_salary || 0) : (Number(form.basic_salary || 0) + totalAllowances);
  const calculatedBasic = isGrossBased ? Math.max(0, Number(form.basic_salary || 0) - totalAllowances) : Number(form.basic_salary || 0);

  const handleSave = async () => {
    if (!form.basic_salary) { notify(t("payroll.employeeEdit.toastErrorPlain"), t("payroll.employeeEdit.basicRequired"), "error"); return; }
    setSaving(true);
    try {
      const params = await buildQueryParams({});
      await api.post(`/payroll-management/employee-salary/${employee_id}`, { ...params, ...form });
      notify(t("payroll.employeeEdit.toastSuccess"), t("payroll.employeeEdit.savedStructure"), "success");
      fetchStructure();
    } catch (e) {
      notify(t("payroll.employeeEdit.toastError"), e?.response?.data?.message || t("payroll.common.saveFailed"), "error");
    } finally { setSaving(false); }
  };

  const formatCurrency = (num) => `${Number(num).toFixed(2)}`;

  const updateField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  if (loading) return <div className="p-6 text-center text-gray-400 text-sm">{t("payroll.register.loadingData")}</div>;

  return (
    <div className="md:col-span-8 lg:col-span-9 space-y-6 p-4">

      {/* Salary Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {isGrossBased ? t("payroll.fields.grossSalary") : isNetBased ? t("payroll.fields.netSalary") : t("payroll.fields.basicSalary")}
          </h3>
          <Lock size={18} className="text-gray-400" />
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {isGrossBased ? t("payroll.employeeEdit.grossPayTotal") : isNetBased ? t("payroll.employeeEdit.netPayTakeHome") : t("payroll.employeeEdit.basicPay")}
              </label>
              <Input type="number" value={form.basic_salary || ""} placeholder="0"
                onChange={(e) => updateField('basic_salary', e.target.value)} />
              {isGrossBased && (
                <p className="text-[10px] text-blue-500 mt-1">{t("payroll.employeeEdit.basicAutoCalc", { value: calculatedBasic.toLocaleString() })}</p>
              )}
              {isNetBased && (
                <p className="text-[10px] text-purple-500 mt-1">{t("payroll.employeeEdit.netCalcNote")}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t("payroll.salaryStructures.salaryMode")}</label>
              <select value={form.salary_mode} onChange={(e) => updateField('salary_mode', e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="gross_based">{t("payroll.settings.general.salaryModeOptions.gross_based")}</option>
                <option value="basic_based">{t("payroll.settings.general.salaryModeOptions.basic_based")}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Allowances Card - Only for Gross Based */}
      {isGrossBased && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">{t("payroll.employeeEdit.allowancesBreakdown")}</h3>
            <p className="text-[10px] text-gray-400 mt-1">{t("payroll.employeeEdit.allowancesBreakdownDesc")}</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                { label: t("payroll.fields.houseAllowance"), key: "house_allowance" },
                { label: t("payroll.fields.transportAllowance"), key: "transport_allowance" },
                { label: t("payroll.fields.foodAllowance"), key: "food_allowance" },
                { label: t("payroll.fields.medicalAllowance"), key: "medical_allowance" },
                { label: t("payroll.fields.otherAllowance"), key: "other_allowance" },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{label}</label>
                  <Input type="number" value={form[key] || ""} placeholder="0"
                    onChange={(e) => updateField(key, e.target.value)} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Options Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">{t("payroll.employeeEdit.deductionOptions")}</h3>
        </div>
        <div className="p-6 flex flex-wrap gap-6">
          {[
            { label: t("payroll.salaryStructures.overtimeEligible"), key: "overtime_eligible" },
            { label: t("payroll.salaryStructures.loanDeduction"), key: "loan_deduction" },
            { label: t("payroll.salaryStructures.advanceDeduction"), key: "advance_deduction" },
          ].map(({ label, key }) => (
            <label key={key} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
              <input type="checkbox" checked={form[key] || false}
                onChange={(e) => updateField(key, e.target.checked)}
                className="rounded border-gray-300 dark:border-white/20 text-primary focus:ring-primary" />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* Summary + Save */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div className="md:w-1/2 lg:w-5/12">
          <div className="bg-primary bg-opacity-5 dark:bg-slate-900 border border-border rounded-xl p-6 shadow-sm">
            <h4 className="text-xs font-bold text-gray-600 dark:text-slate-300 uppercase tracking-widest mb-4">
              {t("payroll.employeeEdit.totalCompensation")}
            </h4>
            {isGrossBased ? (
              <>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t("payroll.employeeEdit.grossEntered")}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(form.basic_salary)}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t("payroll.fields.allowances")}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">- {formatCurrency(totalAllowances)}</span>
                </div>
                <div className="h-px bg-indigo-600/20 my-3"></div>
                <div className="flex justify-between items-end">
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{t("payroll.fields.basicSalary")}</span>
                  <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(calculatedBasic)}</span>
                </div>
              </>
            ) : isNetBased ? (
              <>
                <div className="flex justify-between items-end">
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{t("payroll.employeeEdit.netSalaryTakeHome")}</span>
                  <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{formatCurrency(form.basic_salary)}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-end">
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{t("payroll.fields.basicSalary")}</span>
                  <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(form.basic_salary)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-blue-600 transition shadow-sm disabled:opacity-50">
          <Save size={18} />
          {saving ? t("payroll.common.saving") : structureId ? t("payroll.employeeEdit.updateSalaryStructure") : t("payroll.employeeEdit.saveSalaryStructure")}
        </button>
      </div>
    </div>
  );
};

export default Payroll;
