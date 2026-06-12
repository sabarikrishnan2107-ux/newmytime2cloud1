"use client";

import { useState } from "react";
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
import { Check } from "lucide-react";

export default function DropDown({
  items = [],
  value,
  onChange,
  placeholder = "Select Item",
  width = "w-[230px]",
  portalled = true,
  multi = false,
  ...props
}) {
  const [itemOpen, setItemOpen] = useState(false);

  // Treat value as array when multi=true
  const selectedIds = multi ? (Array.isArray(value) ? value : []) : null;

  const handleSelect = (currentValue) => {
    const selectedItem = items.find((d) => d.name === currentValue);
    if (multi) {
      if (!selectedItem) return;
      // Toggle behavior: id=null means "All / clear"
      if (selectedItem.id == null) {
        onChange([]);
        return;
      }
      const exists = selectedIds.includes(selectedItem.id);
      const next = exists
        ? selectedIds.filter((id) => id !== selectedItem.id)
        : [...selectedIds, selectedItem.id];
      onChange(next);
      // Keep popover open in multi-select mode
    } else {
      onChange(selectedItem?.id ?? null);
      setItemOpen(false);
    }
  };

  // Display text in trigger
  let triggerText;
  if (multi) {
    if (selectedIds.length === 0) {
      triggerText = placeholder;
    } else if (selectedIds.length === 1) {
      triggerText = items.find((b) => b.id === selectedIds[0])?.name || placeholder;
    } else {
      triggerText = `${selectedIds.length} selected`;
    }
  } else {
    triggerText = items.find((b) => b.id === value)?.name || placeholder;
  }

  return (
    <Popover open={itemOpen} onOpenChange={setItemOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={itemOpen}
          className="w-full justify-between text-gray-800 dark:text-white border border-border"
          {...props}
        >
          {triggerText}
          <span className="material-icons ml-2">expand_more</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        portalled={portalled}
        side="bottom"
        align="start"
        sideOffset={6}
        className={`${width} overflow-y-auto max-h-80 p-0 z-[10001]`}
      >
        <Command>
          <CommandInput placeholder="Search item..." />
          <CommandEmpty>No item found.</CommandEmpty>
          <CommandGroup>
            {items.map((item) => {
              const isSelected = multi
                ? (item.id == null ? selectedIds.length === 0 : selectedIds.includes(item.id))
                : item.id === value;
              return (
                <CommandItem
                  key={item.id}
                  value={item.name}
                  onSelect={handleSelect}
                  className="flex items-center gap-2.5"
                >
                  <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    isSelected
                      ? "bg-primary border-primary text-white"
                      : "border-gray-300 dark:border-slate-600 bg-transparent"
                  }`}>
                    {isSelected && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                  <span className="flex-1">{item.name}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
