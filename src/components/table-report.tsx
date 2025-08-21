
"use client";

import { useMemo, useState } from "react";
import { type SheetDataRow } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { DietCard } from "./diet-card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "./ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";


export function TableReport({ data }: { data: SheetDataRow[] }) {
    const [selectedAnimal, setSelectedAnimal] = useState<string>("");
    const [open, setOpen] = useState(false)

    const animalOptions = useMemo(() => {
        const uniqueAnimals = [...new Set(data.map(row => row.common_name))];
        return uniqueAnimals.sort().map(animal => ({ value: animal.toLowerCase(), label: animal }));
    }, [data]);

    const animalData = useMemo(() => {
        if (!selectedAnimal) return [];
        return data.filter(row => row.common_name.toLowerCase() === selectedAnimal);
    }, [data, selectedAnimal]);

    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="font-headline text-xl">Diet Plan Report</CardTitle>
                <CardDescription>
                    Select an animal to view its detailed diet plan. You can print this plan or save it as a PDF.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                 <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
                    <Popover open={open} onOpenChange={setOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={open}
                          className="w-[280px] justify-between"
                        >
                          {selectedAnimal
                            ? animalOptions.find((animal) => animal.value === selectedAnimal)?.label
                            : "Select an animal..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[280px] p-0">
                        <Command>
                          <CommandInput placeholder="Search animal..." />
                          <CommandList>
                            <CommandEmpty>No animal found.</CommandEmpty>
                            <CommandGroup>
                              {animalOptions.map((animal) => (
                                <CommandItem
                                  key={animal.value}
                                  value={animal.value}
                                  onSelect={(currentValue) => {
                                    setSelectedAnimal(currentValue === selectedAnimal ? "" : currentValue)
                                    setOpen(false)
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedAnimal === animal.value ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {animal.label}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                </div>
                
                {selectedAnimal ? (
                    <DietCard data={animalData} />
                ) : (
                    <div className="text-center p-12 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">
                           Please select an animal from the dropdown to see its diet plan.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
