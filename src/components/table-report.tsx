
"use client";

import * as React from "react";
import { useMemo, useState, useRef } from "react";
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
import { Button } from "./ui/button";
import { Download } from "lucide-react";
import { MultiSelect } from "./ui/multi-select";
import jsPDF from "jspdf";
import html2canvas from 'html2canvas';


export function TableReport({ data }: { data: SheetDataRow[] }) {
    const [selectedClass, setSelectedClass] = useState<string>("");
    const [selectedOrder, setSelectedOrder] = useState<string>("");
    const [selectedFamily, setSelectedFamily] = useState<string>("");
    const [selectedGenus, setSelectedGenus] = useState<string>("");
    const [selectedAnimals, setSelectedAnimals] = useState<string[]>([]);
    
    const dietCardRefs = useRef<(HTMLDivElement | null)[]>([]);

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
            .map(animal => ({ value: animal, label: animal }));
            
        return { classOptions, orderOptions, familyOptions, genusOptions, animalOptions };
    }, [data, selectedClass, selectedOrder, selectedFamily, selectedGenus]);

    const animalData = useMemo(() => {
        if (selectedAnimals.length === 0) return [];
        return selectedAnimals.map(animalName => ({
            name: animalName,
            data: data.filter(row => row.common_name === animalName)
        }));
    }, [data, selectedAnimals]);
    
    // Reset dependent filters when a parent filter changes
    React.useEffect(() => { setSelectedOrder(""); setSelectedFamily(""); setSelectedGenus(""); setSelectedAnimals([]); }, [selectedClass]);
    React.useEffect(() => { setSelectedFamily(""); setSelectedGenus(""); setSelectedAnimals([]); }, [selectedOrder]);
    React.useEffect(() => { setSelectedGenus(""); setSelectedAnimals([]); }, [selectedFamily]);
    React.useEffect(() => { setSelectedAnimals([]); }, [selectedGenus]);

    const handleDownloadAll = async () => {
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        for (let i = 0; i < dietCardRefs.current.length; i++) {
            const element = dietCardRefs.current[i];
            if (element) {
                const buttons = element.querySelectorAll('.no-print');
                buttons.forEach(btn => (btn as HTMLElement).style.display = 'none');

                const canvas = await html2canvas(element, { scale: 2 });
                
                buttons.forEach(btn => (btn as HTMLElement).style.display = 'flex');

                const data = canvas.toDataURL('image/png');
                const imgProperties = pdf.getImageProperties(data);
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (imgProperties.height * pdfWidth) / imgProperties.width;

                if (i > 0) {
                    pdf.addPage();
                }
                pdf.addImage(data, 'PNG', 0, 0, pdfWidth, pdfHeight);
            }
        }
        pdf.save(`diet-plans-${new Date().toISOString().split('T')[0]}.pdf`);
    };

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

                    <MultiSelect
                        options={filteredOptions.animalOptions}
                        selectedValues={selectedAnimals}
                        onChange={setSelectedAnimals}
                        placeholder="Select animals..."
                        className="w-full sm:w-[280px]"
                        disabled={!selectedGenus}
                    />

                    {animalData.length > 1 && (
                        <Button onClick={handleDownloadAll}>
                            <Download className="mr-2" />
                            Download All ({animalData.length}) as PDF
                        </Button>
                    )}
                </div>
                
                <div className="space-y-4">
                    {animalData.length > 0 ? (
                        animalData.map((animal, index) => (
                            <DietCard 
                                key={animal.name} 
                                data={animal.data} 
                                ref={el => {
                                    if (dietCardRefs.current) {
                                        dietCardRefs.current[index] = el;
                                    }
                                }}
                            />
                        ))
                    ) : (
                        <div className="text-center p-12 border-2 border-dashed rounded-lg">
                            <p className="text-muted-foreground">
                               Please select an animal from the dropdown to see its diet plan.
                            </p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
