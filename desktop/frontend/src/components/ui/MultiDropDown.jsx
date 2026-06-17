"use client";

import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox"; // Ensure this import exists
import { cn } from "@/lib/utils";

export default function MultiDropDown({
  items = [],
  value = [],
  onChange,
  placeholder = "Select...",
  badgesCount = 2,
  width = "w-full",
  portalled = true,
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const [popoverWidth, setPopoverWidth] = useState(0);

  useEffect(() => {
    const updatePopoverWidth = () => {
      setPopoverWidth(triggerRef.current?.offsetWidth || 0);
    };

    updatePopoverWidth();
    window.addEventListener("resize", updatePopoverWidth);

    return () => window.removeEventListener("resize", updatePopoverWidth);
  }, [open]);

  const handleSelect = (id) => {
    const isSelected = value.includes(id);
    let newSelection = [];

    if (id === "Select All") {
      newSelection =
        value.length === items.length ? [] : items.map((d) => d.id);
    } else if (isSelected) {
      newSelection = value.filter((v) => v !== id);
    } else {
      newSelection = [...value, id];
    }
    onChange(newSelection);
  };

  const handleRemove = (id) => {
    const newSelection = value.filter((v) => v !== id);
    onChange(newSelection);
  };

  const selectedItems = items.filter((d) => value.includes(d.id));
  const itemsToDisplay = selectedItems.slice(0, badgesCount);
  const overflowCount = selectedItems.length - badgesCount;

  // Logic for the Select All Checkbox state
  const isAllSelected = value.length === items.length && items.length > 0;
  const isSomeSelected = value.length > 0 && value.length < items.length;

  const getDisplayContent = () => {
    if (selectedItems.length === 0) {
      return (
        <span className="text-gray-800 dark:text-white">{placeholder}</span>
      );
    }

    // Collapse to a single "Select All" pill when every item is selected
    if (isAllSelected) {
      return (
        <div className="flex flex-wrap gap-1">
          <Badge variant="secondary" className="flex items-center gap-1">
            Select All
            <X
              className="h-3 w-3 cursor-pointer hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
            />
          </Badge>
        </div>
      );
    }

    // Multiple but not all selected → show first item + count pill, e.g. "Front Office (3)"
    if (selectedItems.length > 1) {
      const first = selectedItems[0];
      return (
        <div className="flex flex-wrap gap-1">
          <Badge variant="secondary" className="flex items-center gap-1">
            <span className="truncate max-w-[110px]">{first.name}</span>
            <span className="text-[10px] font-bold opacity-80">({selectedItems.length})</span>
            <X
              className="h-3 w-3 cursor-pointer hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
            />
          </Badge>
        </div>
      );
    }

    // Single selection — show with its own remove X
    const item = selectedItems[0];
    return (
      <div className="flex flex-wrap gap-1">
        <Badge variant="secondary" className="flex items-center gap-1">
          {item.name}
          <X
            className="h-3 w-3 cursor-pointer hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              handleRemove(item.id);
            }}
          />
        </Badge>
      </div>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            width,
            "flex h-auto min-h-10 justify-between border border-gray-300 px-3 py-2 text-left dark:border-white/10"
          )}
        >
          {getDisplayContent()}
          <span className="material-icons ml-2 shrink-0  text-gray-800 dark:text-white">
            expand_more
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        portalled={portalled}
        className="max-h-[260px] overflow-y-auto p-0 z-[60] bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 shadow-lg"
        side="bottom"
        sideOffset={6}
        align="start"
        style={{ width: popoverWidth || undefined }}
      >
        <Command className="bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100">
          <CommandInput
            placeholder={`Search ${placeholder.toLowerCase()}`}
            className="text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
          <CommandEmpty className="text-gray-500 dark:text-gray-400">No items found.</CommandEmpty>
          <CommandGroup>
            {/* Select All Option */}
            <CommandItem
              className="flex items-center gap-2 px-2 py-2 cursor-pointer text-gray-800 dark:text-gray-100 data-[selected=true]:bg-gray-100 dark:data-[selected=true]:bg-slate-700 data-[selected=true]:text-gray-900 dark:data-[selected=true]:text-white"
              onSelect={() => handleSelect("Select All")}
            >
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={() => handleSelect("Select All")}
              />
              <span className="font-medium">Select All ({items.length})</span>
            </CommandItem>

            <div className="h-[1px] bg-gray-200 dark:bg-white/10 my-1" />

            {/* Individual Items */}
            {items.map((item) => {
              const isSelected = value.includes(item.id);
              return (
                <CommandItem
                  key={item.id}
                  value={item.name}
                  className="flex items-center gap-2 px-2 py-2 cursor-pointer text-gray-800 dark:text-gray-100 data-[selected=true]:bg-gray-100 dark:data-[selected=true]:bg-slate-700 data-[selected=true]:text-gray-900 dark:data-[selected=true]:text-white"
                  onSelect={() => handleSelect(item.id)}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleSelect(item.id)}
                  />
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
