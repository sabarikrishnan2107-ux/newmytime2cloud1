"use client";

import { useState, useEffect, useRef } from "react";
import { CheckIcon, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { getScheduleEmployees } from "@/lib/api";
import { cn, parseApiError } from "@/lib/utils";

const MAX_BADGES_TO_DISPLAY = 2;

export default function EmployeeMultiSelect({
  selectedBranchId,
  selectedDepartmentId,
  value,
  onChange,
  filterEmployeesByScheduleType = 0,
}) {
  const [employees, setEmployees] = useState([]);
  const [employeeOpen, setEmployeeOpen] = useState(false);

  // ... (Data Fetching and Popover Width Logic remains the same)

  const fetchEmployees = async () => {
    if (!selectedBranchId) {
      console.warn("Operation skipped: selectedBranchId is missing.");
      return;
    }

    const filterLogic = {
      0: (employee) => employee.schedule_active.id === null,
      1: (employee) => employee.schedule_active.id !== null,
      2: () => true,
    };

    try {
      const { data } = await getScheduleEmployees(
        selectedBranchId,
        selectedDepartmentId
      );
      const currentFilter = filterLogic[filterEmployeesByScheduleType];
      setEmployees(currentFilter ? data.filter(currentFilter) : data);
    } catch (error) {
      setGlobalError(parseApiError(error));
    }
  };

  const [popoverWidth, setPopoverWidth] = useState(0);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (triggerRef.current) {
      setPopoverWidth(triggerRef.current.offsetWidth);
    }
  }, [triggerRef.current?.offsetWidth, employeeOpen]);

  useEffect(() => {
    fetchEmployees();
  }, [selectedBranchId, selectedDepartmentId, filterEmployeesByScheduleType]);

  const handleSelect = (employeeId) => {
    const isSelected = value.includes(employeeId);
    let newSelection = [];

    if (employeeId === "Select All") {
      newSelection =
        value.length === employees.length
          ? []
          : employees.map((d) => d.system_user_id);
    } else if (isSelected) {
      newSelection = value.filter((id) => id !== employeeId);
    } else {
      newSelection = [...value, employeeId];
    }

    onChange(newSelection);
  };

  const handleRemove = (employeeId) => {
    const newSelection = value.filter((id) => id !== employeeId);
    onChange(newSelection);
  };

  // --- Display Logic ---

  const selectedEmployees = employees.filter((d) =>
    value.includes(d.system_user_id)
  );

  const employeesToDisplay = selectedEmployees.slice(0, MAX_BADGES_TO_DISPLAY);
  const overflowCount = selectedEmployees.length - MAX_BADGES_TO_DISPLAY;

  // Set the primary label based on the selection state
  const getDisplayContent = () => {
    if (selectedEmployees.length === 0) {
      return <span className="text-gray-500">Select Employee(s)</span>;
    }

    // Display the initial badges
    const badges = employeesToDisplay.map((employee) => (
      <Badge
        key={employee.system_user_id}
        variant="secondary"
        className="mr-1 hover:bg-gray-200"
      >
        {employee.full_name}
        <X
          className="ml-1 h-3 w-3 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            handleRemove(employee.system_user_id);
          }}
        />
      </Badge>
    ));

    // Add an overflow badge if necessary
    if (overflowCount > 0) {
      badges.push(
        <Badge
          key="overflow-count"
          variant="outline"
          className="ml-1 bg-gray-100 text-gray-700"
        >
          +{overflowCount} more
        </Badge>
      );
    }

    return <div className="flex flex-wrap gap-1">{badges}</div>;
  };

  return (
    <Popover open={employeeOpen} onOpenChange={setEmployeeOpen}>
      <PopoverTrigger asChild className="flex justify-between w-full">
        <Button
          ref={triggerRef}
          variant="outline"
          role="combobox"
          aria-expanded={employeeOpen}
          // The height property is crucial here to ensure a consistent look
          className="border border-gray-300 "
        >
          {/* Use the new function to render content */}
          {getDisplayContent()}

          <span className="material-icons text-gray-400 ml-2 text-base shrink-0">
            expand_more
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="p-0" style={{ width: popoverWidth }}>
        <Command>
          <CommandInput placeholder="Search employee..." />
          <CommandEmpty>No employee found.</CommandEmpty>
          <CommandGroup>
            {/* Select All Option */}
            <CommandItem
              className="text-gray-600 flex justify-between"
              value="Select All"
              onSelect={() => handleSelect("Select All")}
            >
              Select All ({employees.length})
              <CheckIcon
                className={cn(
                  "h-4 w-4",
                  value.length === employees.length && employees.length > 0
                    ? "opacity-100"
                    : "opacity-0"
                )}
              />
            </CommandItem>

            {/* Employee List */}
            {employees.map((employee) => (
              <CommandItem
                key={employee.system_user_id}
                value={employee.full_name}
                className="text-gray-600 flex justify-between"
                onSelect={() => handleSelect(employee.system_user_id)}
              >
                {employee.full_name}
                <CheckIcon
                  className={cn(
                    "h-4 w-4",
                    value.includes(employee.system_user_id)
                      ? "opacity-100"
                      : "opacity-0"
                  )}
                />
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
