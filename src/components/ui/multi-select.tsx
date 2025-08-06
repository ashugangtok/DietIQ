
"use client"

import * as React from "react";
import { X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuTrigger> {
  options: MultiSelectOption[];
  selectedValues: string[];
  onChange: React.Dispatch<React.SetStateAction<string[]>>;
  placeholder?: string;
}

export function MultiSelect({
  options,
  selectedValues,
  onChange,
  className,
  placeholder = "Select...",
  ...rest
}: MultiSelectProps) {
  const handleSelect = (value: string) => {
    onChange((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const handleClear = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-10 w-full justify-between px-3 py-2",
            selectedValues.length > 0 ? "text-foreground" : "text-muted-foreground",
            className
          )}
          {...rest}
        >
          <div className="flex items-center gap-1 overflow-x-auto">
            {selectedValues.length > 0 ? (
              options
                .filter((option) => selectedValues.includes(option.value))
                .map((option) => (
                  <Badge
                    key={option.value}
                    variant="secondary"
                    className="whitespace-nowrap"
                  >
                    {option.label}
                  </Badge>
                ))
            ) : (
              <span>{placeholder}</span>
            )}
          </div>
          {selectedValues.length > 0 && (
            <X
              className="ml-2 h-4 w-4 flex-shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
              onClick={handleClear}
            />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
        <DropdownMenuLabel>Select Ingredients</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={selectedValues.includes(option.value)}
            onSelect={(e) => {
              e.preventDefault();
              handleSelect(option.value);
            }}
          >
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
