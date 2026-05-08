"use client";

import { RotateCcw, RefreshCw } from "lucide-react";
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
  const set = (patch) => onChange({ ...filters, ...patch });

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <div className="flex-1 min-w-[180px]">
        <DropDown
          multi
          placeholder={"All Branches"}
          items={[{ id: null, name: "All Branches" }, ...branches]}
          value={filters.branchIds}
          onChange={(v) => set({ branchIds: v, deviceIds: [], employeeIds: [] })}
        />
      </div>

      <div className="flex-1 min-w-[180px]">
        <DropDown
          multi
          placeholder={"All Devices"}
          items={[{ id: null, name: "All Devices" }, ...devices]}
          value={filters.deviceIds}
          onChange={(v) => set({ deviceIds: v })}
        />
      </div>

      <div className="flex-1 min-w-[180px]">
        <DropDown
          placeholder={"All User Types"}
          items={[
            { id: null, name: "All User Types" },
            { id: "Employee", name: "Employee" },
            { id: "Visitor", name: "Visitor" },
          ]}
          value={filters.userType}
          onChange={(v) => set({ userType: v })}
        />
      </div>

      <div className="flex-1 min-w-[180px]">
        <DropDown
          multi
          placeholder={"All Employees"}
          items={[{ id: null, name: "All Employees" }, ...employees]}
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
        Submit
      </Button>

      <Button variant="outline" onClick={onReset}>
        <RotateCcw className="mr-1.5 h-4 w-4" /> Reset
      </Button>
    </div>
  );
}
