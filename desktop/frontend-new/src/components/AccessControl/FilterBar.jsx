"use client";

import { RotateCcw, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import DropDown from "@/components/ui/DropDown";
import DateRangeSelect from "@/components/ui/DateRange";

export function FilterBar({
  filters,
  onChange,
  onReset,
  onSubmit,
  branches,
  devices,
  employees,
  isLoading,
}) {
  const { t } = useTranslation();
  const set = (patch) => onChange({ ...filters, ...patch });

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <div className="flex-1 min-w-[180px]">
        <DropDown
          multi
          placeholder={t("accessControl.filters.allBranches")}
          items={[{ id: null, name: t("accessControl.filters.allBranches") }, ...branches]}
          value={filters.branchIds}
          onChange={(v) => set({ branchIds: v, deviceIds: [], employeeIds: [] })}
        />
      </div>

      <div className="flex-1 min-w-[180px]">
        <DropDown
          multi
          placeholder={t("accessControl.filters.allDevices")}
          items={[{ id: null, name: t("accessControl.filters.allDevices") }, ...devices]}
          value={filters.deviceIds}
          onChange={(v) => set({ deviceIds: v })}
        />
      </div>

      <div className="flex-1 min-w-[180px]">
        <DropDown
          placeholder={t("accessControl.filters.allUserTypes")}
          items={[
            { id: null, name: t("accessControl.filters.allUserTypes") },
            { id: "Employee", name: t("accessControl.filters.employee") },
            { id: "Visitor", name: t("accessControl.filters.visitor") },
          ]}
          value={filters.userType}
          onChange={(v) => set({ userType: v })}
        />
      </div>

      <div className="flex-1 min-w-[180px]">
        <DropDown
          multi
          placeholder={t("accessControl.filters.allEmployees")}
          items={[{ id: null, name: t("accessControl.filters.allEmployees") }, ...employees]}
          value={filters.employeeIds}
          onChange={(v) => set({ employeeIds: v })}
        />
      </div>

      <DateRangeSelect
        value={{ from: filters.fromDate, to: filters.toDate }}
        onChange={({ from, to }) => set({ fromDate: from, toDate: to })}
      />

      <Button onClick={onSubmit} disabled={isLoading} className="bg-gradient-primary text-primary-foreground hover:opacity-95">
        <RefreshCw className={`mr-1.5 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        {t("accessControl.filters.submit")}
      </Button>

      <Button variant="outline" onClick={onReset}>
        <RotateCcw className="mr-1.5 h-4 w-4" /> {t("accessControl.filters.reset")}
      </Button>
    </div>
  );
}
