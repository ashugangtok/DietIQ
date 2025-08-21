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


export function TableReport({ data }: { data: SheetDataRow[] }) {
    const [selectedAnimal, setSelectedAnimal] = useState<string>("");

    const animalOptions = useMemo(() => {
        const uniqueAnimals = [...new Set(data.map(row => row.common_name))];
        return uniqueAnimals.sort();
    }, [data]);

    const animalData = useMemo(() => {
        if (!selectedAnimal) return [];
        return data.filter(row => row.common_name === selectedAnimal);
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
                    <Select value={selectedAnimal} onValueChange={setSelectedAnimal}>
                        <SelectTrigger className="w-full sm:w-[280px] bg-background">
                            <SelectValue placeholder="Select an animal to view its diet plan" />
                        </SelectTrigger>
                        <SelectContent>
                            {animalOptions.map(animal => (
                                <SelectItem key={animal} value={animal}>
                                    {animal}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
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
