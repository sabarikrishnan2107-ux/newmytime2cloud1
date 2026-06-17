import React, { useState } from "react";
// Assuming the necessary UI components and icons are imported from their respective paths
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandEmpty,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils"; // Utility for combining class names
import { getBranches } from "@/lib/api";

// BranchCombobox Component
export function BranchCombobox({ form, name, label }) {
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    if (!user.company_id) return;
    const fetchBranches = async () => {
      setBranches(await getBranches(user.company_id));
    };
    fetchBranches();
  }, []);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // Get the current value from the form state
  const currentBranchId = form.getValues(name);

  // Find the currently selected branch's name for display
  const selectedBranchName =
    branches.find((branch) => branch.id === currentBranchId)?.name ||
    `Select ${label}...`;

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel>{label}</FormLabel>

          {/* Popover setup with controlled state */}
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  role="combobox"
                  className={cn(
                    "justify-between w-full",
                    !field.value && "text-muted-foreground"
                  )}
                  // You can optionally control the open state on click
                  onClick={() => setIsPopoverOpen(true)}
                >
                  {selectedBranchName}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>

            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
              <Command>
                <CommandInput placeholder={`Search ${label}...`} />
                <CommandEmpty>No {label.toLowerCase()} found.</CommandEmpty>
                <CommandGroup>
                  {branches.map((branch) => (
                    <CommandItem
                      value={branch.name}
                      key={branch.id}
                      // 1. Update form value with selected branch ID
                      // 2. Close the popover automatically
                      onSelect={() => {
                        form.setValue(name, branch.id);
                        // Optional: trigger validation immediately
                        form.trigger(name);
                        setIsPopoverOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          branch.id === field.value
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      {branch.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
