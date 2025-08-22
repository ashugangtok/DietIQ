
"use client";

import * as React from "react";
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
    const [selectedClass, setSelectedClass] = useState<string>("");
    const [selectedOrder, setSelectedOrder] = useState<string>("");
    const [selectedFamily, setSelectedFamily] = useState<string>("");
    const [selectedGenus, setSelectedGenus] = useState<string>("");
    const [selectedAnimal, setSelectedAnimal] = useState<string>("");
    const [open, setOpen] = useState(false)

    const filteredOptions = useMemo(() => {
        let filteredData = data;
        if (selectedClass) filteredData = filteredData.filter(row => row.class_name === selectedClass);
        if (selectedOrder) filteredData = filteredData.filter(row => row.order_name === selectedOrder);
        if (selectedFamily) filteredData = filteredData.filter(row => row.family_name === selectedFamily);
        if (selectedGenus) filteredData = filteredData.filter(row => row.genus_name === selectedGenus);

        const classOptions = [...new Set(data.map(row => row.class_name).filter(Boolean))].sort();

        const orderOptions = [...new Set(data.filter(row => !selectedClass || row.class_name === selectedClass).map(row => row.order_name).filter(Boolean))].sort();

        const familyOptions = [...new Set(filteredData.map(row => row.family_name).filter(Boolean))].sort();

        const genusOptions = [...new Set(filteredData.map(row => row.genus_name).filter(Boolean))].sort();
        
        const animalOptions = [...new Set(filteredData.map(row => row.common_name))]
            .sort()
            .map(animal => ({ value: animal.toLowerCase(), label: animal }));
            
        return { classOptions, orderOptions, familyOptions, genusOptions, animalOptions };
    }, [data, selectedClass, selectedOrder, selectedFamily, selectedGenus]);

    const animalData = useMemo(() => {
        if (!selectedAnimal) return [];
        return data.filter(row => row.common_name.toLowerCase() === selectedAnimal);
    }, [data, selectedAnimal]);
    
    // Reset dependent filters when a parent filter changes
    React.useEffect(() => { setSelectedOrder(""); setSelectedFamily(""); setSelectedGenus(""); setSelectedAnimal(""); }, [selectedClass]);
    React.useEffect(() => { setSelectedFamily(""); setSelectedGenus(""); setSelectedAnimal(""); }, [selectedOrder]);
    React.useEffect(() => { setSelectedGenus(""); setSelectedAnimal(""); }, [selectedFamily]);
    React.useEffect(() => { setSelectedAnimal(""); }, [selectedGenus]);


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
                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                        <SelectTrigger className="w-full sm:w-auto min-w-[180px]"><SelectValue placeholder="Select Class" /></SelectTrigger>
                        <SelectContent>
                            {filteredOptions.classOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={selectedOrder} onValueChange={setSelectedOrder} disabled={!selectedClass}>
                        <SelectTrigger className="w-full sm:w-auto min-w-[180px]"><SelectValue placeholder="Select Order" /></SelectTrigger>
                        <SelectContent>
                            {filteredOptions.orderOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                        </SelectContent>
                    </Select>
                     <Select value={selectedFamily} onValueChange={setSelectedFamily} disabled={!selectedOrder}>
                        <SelectTrigger className="w-full sm:w-auto min-w-[180px]"><SelectValue placeholder="Select Family" /></SelectTrigger>
                        <SelectContent>
                           {filteredOptions.familyOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={selectedGenus} onValueChange={setSelectedGenus} disabled={!selectedFamily}>
                        <SelectTrigger className="w-full sm:w-auto min-w-[180px]"><SelectValue placeholder="Select Genus" /></SelectTrigger>
                        <SelectContent>
                           {filteredOptions.genusOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <Popover open={open} onOpenChange={setOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={open}
                          className="w-[280px] justify-between"
                          disabled={!selectedGenus}
                        >
                          {selectedAnimal
                            ? filteredOptions.animalOptions.find((animal) => animal.value === selectedAnimal)?.label
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
                              {filteredOptions.animalOptions.map((animal, index) => (
                                <CommandItem
                                  key={`${animal.value}-${index}`}
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
