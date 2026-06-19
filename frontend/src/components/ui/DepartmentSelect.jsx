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
import { getDepartments } from "@/lib/api";

export default function DepartmentSelect({
  selectedBranchId = null,
  value,
  onChange,
}) {
  const [departments, setDepartments] = useState([]);
  const [departmentOpen, setdeviceOpen] = useState(false);

  const fetchDepartments = async () => {
    if (!selectedBranchId) return;
    try {
      const list = await getDepartments(selectedBranchId);
      console.log("🚀 ~ fetchDepartments ~ list:", list);
      setDepartments(list);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const [popoverWidth, setPopoverWidth] = useState(0);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (triggerRef.current) {
      setPopoverWidth(triggerRef.current.offsetWidth);
    }
  }, [triggerRef.current?.offsetWidth, departmentOpen]);

  useEffect(() => {
    fetchDepartments();
  }, [selectedBranchId]);

  const handleSelect = (currentValue) => {
    if (currentValue === "Select All") {
      onChange(null);
    } else {
      const selectedItem = departments.find((d) => d.name === currentValue);
      onChange(selectedItem?.id || null);
    }
    setdeviceOpen(false);
  };

  const selecteddeviceName =
    departments.find((b) => b.id === value)?.name || "Select Department";

  return (
    <Popover open={departmentOpen} onOpenChange={setdeviceOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          variant="outline"
          role="combobox"
          aria-expanded={departmentOpen}
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
          <CommandInput placeholder="Search department..." />
          <CommandEmpty>No employee found.</CommandEmpty>
          <CommandGroup>
            <CommandItem
              className="text-gray-600"
              value="Select All"
              onSelect={handleSelect}
            >
              Select All
            </CommandItem>
            {departments.map((department) => (
              <CommandItem
                key={department.id}
                value={department.name}
                className="text-gray-600"
                onSelect={handleSelect}
              >
                {department.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
