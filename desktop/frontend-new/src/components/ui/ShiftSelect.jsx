"use client";

import { useState, useEffect, useRef } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { getShiftDropDownList } from "@/lib/api";

export default function ShiftSelect({ selectedBranchId, value, onChange }) {
  const [shifts, setShifts] = useState([]);
  const [shiftOpen, setShiftOpen] = useState(false);

  const fetchShifts = async () => {
    if (!selectedBranchId) return;
    try {
      const list = await getShiftDropDownList(selectedBranchId);
      console.log("🚀 ~ fetchShifts ~ list:", list);

      let result = list.map((e) => ({
        shift_id: e.id,
        name: e.name,
        shift_type_id: e.shift_type_id,
        branch_id: e.branch_id,
      }));

      // result = [
      //   { shift_id: `0`, name: `Auto Shift`, isAutoShift: true },
      //   ...result,
      // ];

      setShifts(result);
    } catch (error) {
      console.error("Error fetching shifts:", error);
    }
  };

  const [popoverWidth, setPopoverWidth] = useState(0);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (triggerRef.current) {
      setPopoverWidth(triggerRef.current.offsetWidth);
    }
  }, [triggerRef.current?.offsetWidth, shiftOpen]);

  useEffect(() => {
    fetchShifts();
  }, [selectedBranchId]);

  const handleSelect = (currentValue) => {
    const selectedItem = shifts.find((d) => d.name === currentValue);
    console.log("🚀 ~ handleSelect ~ selectedItem:", selectedItem)
    onChange(selectedItem || {});
    setShiftOpen(false);
  };

  const selecteddeviceName =
    shifts.find((b) => b.shift_id === value)?.name || "Select Shift";

  return (
    <Popover open={shiftOpen} onOpenChange={setShiftOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          variant="outline"
          role="combobox"
          aria-expanded={shiftOpen}
          className="w-full justify-between text-gray-500 border border-gray-300 rounded-lg bg-white hover:bg-gray-100"
        >
          {selecteddeviceName}
          <span className="material-icons text-gray-400 ml-2 text-base">
            expand_more
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="p-0" style={{ width: popoverWidth }}>
        <Command>
          <CommandInput placeholder="Search shift..." />
          <CommandEmpty>No shift found.</CommandEmpty>
          <CommandGroup>
            {shifts.map((shift,index) => (
              <CommandItem
                key={index}
                value={shift.name}
                className="text-gray-600"
                onSelect={handleSelect}
              >
                {shift.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
