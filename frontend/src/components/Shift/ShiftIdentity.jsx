import { BadgeCheck } from "lucide-react";
import Input from "../Theme/Input";
import DropDown from "../ui/DropDown";
import ToggleCard from "../ui/ToggleCard";
import { SHIFT_TYPES } from "@/lib/dropdowns";

const ShiftIdentity = ({ shift = {}, handleChange = () => {} }) => {
  return (
    <section className="space-y-4">
      <h3 className="text-lg font-bold text-gray-600 dark:text-slate-300 flex items-center gap-2">
        <BadgeCheck className="w-5 h-5 text-emerald-400" />
        Shift Identity
      </h3>

      <div className="bg-white dark:bg-[#1e293b]/50 border dark:border-white/10 rounded-xl p-5 shadow-lg backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between">
          {/* Shift Name Input */}
          <label className="flex flex-col w-full sm:w-2/3 gap-2">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
              Shift Type
            </span>
            <DropDown
              items={SHIFT_TYPES}
              value={shift.shift_type_id}
              onChange={(id) => handleChange("shift_type_id", id)}
              placeholder="Select Shift Type"
              width="w-full"
            />
          </label>

          <label className="flex flex-col w-full sm:w-2/3 gap-2">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
              Shift Name
            </span>
            <Input
              defaultValue={shift.name}
              onChange={(e) => handleChange("name", e.target.value)} // ✅ fixed
              placeholder="Enter shift name"
            />
          </label>

          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
              Auto-Shift Mode
            </span>
            <ToggleCard
              label={shift.isAutoShift ? "Enabled" : "Disabled"}
              checked={shift.isAutoShift}
              onChange={(e) => handleChange("isAutoShift", e.target.checked)}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default ShiftIdentity;
