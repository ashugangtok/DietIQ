
"use client";

import * as React from "react";
import { useMemo, useRef, useState } from "react";
import { type SheetDataRow } from "@/types";
import { Button } from "./ui/button";
import { Download, Printer } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from 'html2canvas';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface DietReportProps {
    data: SheetDataRow[];
}

const formatAmount = (quantity: number, uom: string) => {
    if (!uom || isNaN(quantity)) return `0 ${uom || ''}`.trim();

    const uomLower = uom.toLowerCase();
    
    if ((uomLower === 'kg' || uomLower === 'kilogram') && quantity > 0 && quantity < 0.001) { 
        const grams = quantity * 1000;
        return `${grams.toLocaleString(undefined, { maximumFractionDigits: 2 })} gram`;
    }
     if ((uomLower === 'kg' || uomLower === 'kilogram') && quantity > 0 && quantity < 1) {
        const grams = quantity * 1000;
        return `${grams.toLocaleString(undefined, { maximumFractionDigits: 0 })} gram`;
    }
    
    if (uomLower === 'gram') {
        return `${quantity.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${uom}`;
    }

    const formattedQty = quantity.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${formattedQty} ${uom}`;
};

interface SiteReport {
    siteName: string;
    meals: Meal[];
}

interface Meal {
    time: string;
    animals: AnimalDiet[];
}

interface AnimalDiet {
    name: string;
    scientificName: string;
    dietName: string;
    dietNo: string | number;
    count: number;
    items: DietItem[];
}

interface DietItem {
    id: string;
    itemName: string;
    itemDetails: string;
    amountPerAnimal: string;
    totalAmountRequired: string;
}

const processReportData = (data: SheetDataRow[]): SiteReport[] => {
    if (data.length === 0) return [];
    
    // Group rows by site
    const siteMap = new Map<string, SheetDataRow[]>();
    data.forEach(row => {
        if (!siteMap.has(row.site_name)) siteMap.set(row.site_name, []);
        siteMap.get(row.site_name)!.push(row);
    });

    const sites: SiteReport[] = [];

    // For each site, group by meal time
    siteMap.forEach((siteRows, siteName) => {
        const mealMap = new Map<string, SheetDataRow[]>();
        siteRows.forEach(row => {
            const time = row.meal_start_time || "N/A";
            if (!mealMap.has(time)) mealMap.set(time, []);
            mealMap.get(time)!.push(row);
        });

        const meals: Meal[] = [];
        
        // For each meal time, group by animal
        mealMap.forEach((mealRows, time) => {
            const animalMap = new Map<string, SheetDataRow[]>();
            mealRows.forEach(row => {
                const animalKey = `${row.common_name}|${row.scientific_name}|${row.diet_name}|${row.diet_no}`;
                if (!animalMap.has(animalKey)) animalMap.set(animalKey, []);
                animalMap.get(animalKey)!.push(row);
            });

            const animals: AnimalDiet[] = [];

            // For each animal, process their diet items
            animalMap.forEach((animalRows, animalKey) => {
                const [name, scientificName, dietName, dietNo] = animalKey.split('|');
                const animalCount = new Set(animalRows.map(r => r.animal_id)).size;

                const itemMap = new Map<string, { ingredients: SheetDataRow[], totalQty: number, totalGram: number, uom: string }>();
                animalRows.forEach(row => {
                    const isCombo = row.type?.toLowerCase() === 'recipe' || row.type?.toLowerCase() === 'combo';
                    const groupKey = isCombo ? row.type_name : row.ingredient_name;

                    if (!itemMap.has(groupKey)) {
                        itemMap.set(groupKey, { ingredients: [], totalQty: 0, totalGram: 0, uom: row.base_uom_name });
                    }
                    const group = itemMap.get(groupKey)!;
                    group.ingredients.push(row);
                    group.totalQty += row.ingredient_qty;
                    group.totalGram += row.ingredient_qty_gram;
                });
                
                const items: DietItem[] = Array.from(itemMap.values()).map(group => {
                    const mainItem = group.ingredients[0];
                    let itemName;
                    let itemDetails = "";
                    const isCombo = mainItem.type?.toLowerCase() === 'recipe' || mainItem.type?.toLowerCase() === 'combo';

                    let totalAmountForAllAnimals = 0;
                    let uomForTotals = group.uom;

                    if (isCombo) {
                        itemName = mainItem.type_name;
                        const ingredientAggregator = new Map<string, { totalQty: number, totalGram: number, uom: string }>();
                        group.ingredients.forEach(ing => {
                            const ingKey = ing.ingredient_name;
                            if (!ingredientAggregator.has(ingKey)) {
                                ingredientAggregator.set(ingKey, { totalQty: 0, totalGram: 0, uom: ing.base_uom_name });
                            }
                            const entry = ingredientAggregator.get(ingKey)!;
                            entry.totalQty += ing.ingredient_qty;
                            entry.totalGram += ing.ingredient_qty_gram;
                        });
                        
                        totalAmountForAllAnimals = Array.from(ingredientAggregator.values()).reduce((sum, ing) => sum + ing.totalGram, 0);
                        uomForTotals = 'gram';
                        const totalAmountPerAnimal = totalAmountForAllAnimals / animalCount;
                        const breakdown = Array.from(ingredientAggregator.entries()).map(([name, ingData]) => {
                            const ingredientAmountPerAnimal = ingData.totalGram / animalCount;
                            const percentage = totalAmountPerAnimal > 0 ? (ingredientAmountPerAnimal / totalAmountPerAnimal) * 100 : 0;
                            return `${percentage.toFixed(0)}% ${name}`;
                        }).join(', ');
                        itemDetails = `(${breakdown})`;
                    } else {
                        itemName = mainItem.ingredient_name;
                        totalAmountForAllAnimals = group.totalGram > 0 ? group.totalGram : group.totalQty;
                        uomForTotals = group.totalGram > 0 ? 'gram' : group.uom;
                    }
                    
                    const prepDetails = [mainItem.cut_size_name, mainItem.preparation_type_name].filter(Boolean).join(', ');
                    if (prepDetails) itemName += ` (${prepDetails})`;

                    const amountPerAnimal = totalAmountForAllAnimals / animalCount;
                    const totalUom = uomForTotals === 'gram' ? 'kilogram' : uomForTotals;
                    const totalAmountForDisplay = uomForTotals === 'gram' ? totalAmountForAllAnimals / 1000 : totalAmountForAllAnimals;

                    return {
                        id: mainItem.type_name || mainItem.ingredient_name,
                        itemName: itemName,
                        itemDetails: itemDetails,
                        amountPerAnimal: formatAmount(amountPerAnimal, uomForTotals),
                        totalAmountRequired: formatAmount(totalAmountForDisplay, totalUom),
                    };
                });
                
                animals.push({ name, scientificName, dietName, dietNo, count: animalCount, items });
            });
            meals.push({ time, animals });
        });
        sites.push({ siteName, meals: meals.sort((a,b) => a.time.localeCompare(b.time)) });
    });

    return sites.sort((a, b) => a.siteName.localeCompare(b.siteName));
}

const DietReportCard = React.forwardRef<HTMLDivElement, { groupName: string; reportData: SiteReport[] }>(({ groupName, reportData }, ref) => {
    return (
        <div className="border rounded-lg p-6 bg-white" ref={ref}>
            <div className="text-center mb-6">
                <h2 className="text-3xl font-bold capitalize text-gray-800">{groupName}</h2>
                <p className="text-lg text-gray-500">Diet Report</p>
                <p className="text-sm text-gray-400">Generated on: {new Date().toLocaleDateString()}</p>
            </div>
            {reportData.map((site, siteIndex) => (
                <div key={siteIndex} className="mb-8 last:mb-0">
                    <h3 className="text-2xl font-semibold mb-4 text-primary bg-primary/10 p-2 rounded-md">{site.siteName}</h3>
                    {site.meals.map((meal, mealIndex) => (
                         <div key={mealIndex} className="mb-8 last:mb-0 pl-4 border-l-2 border-primary/20">
                            <h4 className="text-xl font-semibold mb-4 text-green-700 bg-green-100 p-2 rounded-md">Meal Time: {meal.time}</h4>
                            {meal.animals.map((animal, animalIndex) => (
                                <div key={animalIndex} className="mb-6 border-b pb-4 last:border-b-0 last:pb-0">
                                    <div className="flex justify-between items-baseline mb-2">
                                        <h4 className="text-xl font-bold">{animal.name} ({animal.count})</h4>
                                        <p className="text-sm text-gray-600">Diet: {animal.dietName} (No: {animal.dietNo})</p>
                                    </div>
                                    <p className="text-md italic text-gray-500 mb-3">{animal.scientificName}</p>
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-100">
                                                <th className="p-2 font-semibold border w-2/5">Item</th>
                                                <th className="p-2 font-semibold border text-right">Qty/Animal</th>
                                                <th className="p-2 font-semibold border text-right">Total Qty</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {animal.items.map((item, itemIndex) => (
                                                <tr key={itemIndex} className="[&>td]:border [&>td]:p-2">
                                                    <td>
                                                        <div className="font-medium">{item.itemName}</div>
                                                        {item.itemDetails && <div className="text-xs text-gray-500">{item.itemDetails}</div>}
                                                    </td>
                                                    <td className="text-right font-mono">{item.amountPerAnimal}</td>
                                                    <td className="text-right font-mono">{item.totalAmountRequired}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
});
DietReportCard.displayName = "DietReportCard";

export function DietReport({ data }: DietReportProps) {
    const [selectedGroup, setSelectedGroup] = useState<string>("");
    const cardRef = useRef<HTMLDivElement>(null);
    
    const groupOptions = useMemo(() => {
        const groups = new Set(data.map(row => row.group_name).filter(Boolean));
        return Array.from(groups).sort();
    }, [data]);

    const groupData = useMemo(() => {
        if (!selectedGroup) return [];
        return data.filter(row => row.group_name === selectedGroup);
    }, [data, selectedGroup]);
    
    const reportData = useMemo(() => processReportData(groupData), [groupData]);
    
    const handlePrint = async () => {
        const element = cardRef.current;
        if (element) {
            const canvas = await html2canvas(element, { scale: 2 });
            const printWindow = window.open('', '', 'height=800,width=800');
            if (printWindow) {
                printWindow.document.write('<html><head><title>Print Diet Report</title></head><body>');
                printWindow.document.write(`<img src="${canvas.toDataURL()}" style="width:100%;">`);
                printWindow.document.write('</body></html>');
                printWindow.document.close();
                printWindow.focus();
                setTimeout(() => {
                    printWindow.print();
                    printWindow.close();
                }, 250);
            }
        }
    };
    
    const handleDownloadPdf = async () => {
        const element = cardRef.current;
        if (element) {
            const canvas = await html2canvas(element, { scale: 2 });
            const data = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgProperties = pdf.getImageProperties(data);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProperties.height * pdfWidth) / imgProperties.width;
            pdf.addImage(data, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`${selectedGroup}-diet-report.pdf`);
        }
    };

    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="font-headline text-xl">Diet Summary Report</CardTitle>
                <CardDescription>
                    Select a meal group to view its detailed diet report across all sites.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                 <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
                    <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                        <SelectTrigger className="w-full sm:w-[280px]">
                            <SelectValue placeholder="Select a group to generate a report" />
                        </SelectTrigger>
                        <SelectContent>
                            {groupOptions.map(group => (
                                <SelectItem key={group} value={group}>{group}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                     <div className="flex-grow" />
                    {selectedGroup && (
                         <div className="flex gap-2">
                             <Button onClick={handlePrint}>
                                <Printer className="mr-2" />
                                Print
                            </Button>
                            <Button variant="outline" onClick={handleDownloadPdf}>
                                <Download className="mr-2" />
                                Download as PDF
                            </Button>
                        </div>
                    )}
                </div>
                
                {selectedGroup ? (
                    <DietReportCard groupName={selectedGroup} reportData={reportData} ref={cardRef} />
                ) : (
                    <div className="text-center p-12 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">
                           Please select a meal group to view the report.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
