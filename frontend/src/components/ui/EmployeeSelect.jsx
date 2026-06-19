"use client";

import { useState, useEffect } from "react";
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
import { getEmployeeList } from "@/lib/api";

export default function EmployeeSelect({ selectedBranchId, value, onChange }) {
  const [employees, setEmployees] = useState([]);
  const [employeeOpen, setEmployeeOpen] = useState(false);

  const fetchEmployees = async () => {
    if (!selectedBranchId) return;
    try {
      const list = await getEmployeeList(selectedBranchId);
      setEmployees(list);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [selectedBranchId]);

  const handleSelect = (currentValue) => {
    
    if (currentValue === "Select All") {
      onChange(null);
    } else {
      const selectedItem = employees.find((d) => d.first_name === currentValue);
      onChange(selectedItem?.id || null);
    }
    setEmployeeOpen(false);
  };

  const selectedDeviceName =
    employees.find((b) => b.id === value)?.first_name || "Select Employee";

  return (
    <Popover open={employeeOpen} onOpenChange={setEmployeeOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={employeeOpen}
          className="w-full h-10 justify-between text-gray-500 border border-gray-300 rounded-lg bg-gray-100 hover:bg-gray-100"
        >
          {selectedDeviceName}
          <span className="material-icons text-gray-400 ml-2 text-base">
            expand_more
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[320px] max-w-full p-0">
        <Command>
          <CommandInput placeholder="Search device..." />
          <CommandEmpty>No employee found.</CommandEmpty>
          <CommandGroup>
            <CommandItem
              className="text-gray-600"
              value="Select All"
              onSelect={handleSelect}
            >
              Select All
            </CommandItem>
            {employees.map((e) => (
              <CommandItem
                key={e.id}
                value={e.first_name}
                className="text-gray-600"
                onSelect={handleSelect}
              >
                {e.first_name}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
