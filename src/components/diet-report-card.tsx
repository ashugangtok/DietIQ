
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
    diets: ConsolidatedDiet[];
}

interface ConsolidatedDiet {
    dietSignature: string;
    animals: { name: string; scientificName: string; count: number, dietName: string, dietNo: string | number }[];
    totalAnimalCount: number;
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

    const siteMap = new Map<string, SheetDataRow[]>();
    data.forEach(row => {
        if (!siteMap.has(row.site_name)) siteMap.set(row.site_name, []);
        siteMap.get(row.site_name)!.push(row);
    });

    const sites: SiteReport[] = [];

    siteMap.forEach((siteRows, siteName) => {
        const mealMap = new Map<string, SheetDataRow[]>();
        siteRows.forEach(row => {
            const time = row.meal_start_time || "N/A";
            if (!mealMap.has(time)) mealMap.set(time, []);
            mealMap.get(time)!.push(row);
        });

        const meals: Meal[] = [];
        
        mealMap.forEach((mealRows, time) => {
            const dietSignatureMap = new Map<string, SheetDataRow[]>();

            const animalMealData = new Map<string, SheetDataRow[]>();
            mealRows.forEach(row => {
                if (!animalMealData.has(row.animal_id)) animalMealData.set(row.animal_id, []);
                animalMealData.get(row.animal_id)!.push(row);
            });

            animalMealData.forEach((animalRows) => {
                const itemQuantities = new Map<string, number>();
                animalRows.forEach(row => {
                    const key = row.type === 'Recipe' || row.type === 'Combo' ? row.type_name : row.ingredient_name;
                    itemQuantities.set(key, (itemQuantities.get(key) || 0) + (row.ingredient_qty_gram || row.ingredient_qty));
                });
                
                const signature = Array.from(itemQuantities.entries())
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([name, qty]) => `${name}:${qty.toFixed(3)}`)
                    .join(';');

                if (!dietSignatureMap.has(signature) || dietSignatureMap.get(signature)!.length === 0) {
                    dietSignatureMap.set(signature, animalRows);
                }
            });

            const diets: ConsolidatedDiet[] = [];

            dietSignatureMap.forEach((representativeRows, dietSignature) => {
                const matchingAnimalIds = new Set<string>();
                animalMealData.forEach((rows, animalId) => {
                    const itemQuantities = new Map<string, number>();
                    rows.forEach(row => {
                        const key = row.type === 'Recipe' || row.type === 'Combo' ? row.type_name : row.ingredient_name;
                        itemQuantities.set(key, (itemQuantities.get(key) || 0) + (row.ingredient_qty_gram || row.ingredient_qty));
                    });
                    const currentSignature = Array.from(itemQuantities.entries())
                        .sort((a, b) => a[0].localeCompare(b[0]))
                        .map(([name, qty]) => `${name}:${qty.toFixed(3)}`)
                        .join(';');
                    if (currentSignature === dietSignature) {
                        matchingAnimalIds.add(animalId);
                    }
                });

                const allRowsForDiet = mealRows.filter(r => matchingAnimalIds.has(r.animal_id));

                const animalGroups = new Map<string, { scientificName: string, ids: Set<string>, dietName: string, dietNo: string | number }>();
                allRowsForDiet.forEach(r => {
                    if (!animalGroups.has(r.common_name)) {
                        animalGroups.set(r.common_name, { scientificName: r.scientific_name, ids: new Set(), dietName: r.diet_name, dietNo: r.diet_no });
                    }
                    animalGroups.get(r.common_name)!.ids.add(r.animal_id);
                });
                
                const animals = Array.from(animalGroups.entries()).map(([name, data]) => ({
                    name,
                    scientificName: data.scientificName,
                    count: data.ids.size,
                    dietName: data.dietName,
                    dietNo: data.dietNo
                })).sort((a,b) => a.name.localeCompare(b.name));
                
                const totalAnimalCount = animals.reduce((sum, animal) => sum + animal.count, 0);

                const itemMap = new Map<string, { ingredients: SheetDataRow[], totalQty: number, totalGram: number, uom: string }>();
                allRowsForDiet.forEach(row => {
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

                    const totalAmountForAllAnimalsInDiet = group.totalGram > 0 ? group.totalGram : group.totalQty;
                    const uomForTotals = group.totalGram > 0 ? 'gram' : group.uom;
                    
                    const amountPerAnimal = totalAmountForAllAnimalsInDiet / totalAnimalCount;

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
                        
                        const totalComboWeightPerAnimal = Array.from(ingredientAggregator.values()).reduce((sum, ing) => sum + ing.totalGram, 0) / totalAnimalCount;
                        
                        const breakdown = Array.from(ingredientAggregator.entries()).map(([name, ingData]) => {
                            const ingredientAmountPerAnimal = ingData.totalGram / totalAnimalCount;
                            const percentage = totalComboWeightPerAnimal > 0 ? (ingredientAmountPerAnimal / totalComboWeightPerAnimal) * 100 : 0;
                            return `${percentage.toFixed(0)}% ${name}`;
                        }).join(', ');

                        itemDetails = `(${breakdown})`;
                    } else {
                        itemName = mainItem.ingredient_name;
                    }
                    
                    const prepDetails = [mainItem.cut_size_name, mainItem.preparation_type_name].filter(Boolean).join(', ');
                    if (prepDetails) itemName += ` (${prepDetails})`;

                    const totalUom = uomForTotals === 'gram' ? 'kilogram' : uomForTotals;
                    const totalAmountForDisplay = uomForTotals === 'gram' ? totalAmountForAllAnimalsInDiet / 1000 : totalAmountForAllAnimalsInDiet;

                    return {
                        id: mainItem.type_name || mainItem.ingredient_name,
                        itemName: itemName,
                        itemDetails: itemDetails,
                        amountPerAnimal: formatAmount(amountPerAnimal, uomForTotals),
                        totalAmountRequired: formatAmount(totalAmountForDisplay, totalUom),
                    };
                });
                
                diets.push({ dietSignature, animals, totalAnimalCount, items });
            });

            meals.push({ time, diets });
        });
        sites.push({ siteName, meals: meals.sort((a,b) => a.time.localeCompare(b.time)) });
    });

    return sites.sort((a, b) => a.siteName.localeCompare(b.siteName));
}

const DietReportCard = React.forwardRef<HTMLDivElement, { groupName: string; reportData: SiteReport[] }>(({ groupName, reportData }, ref) => {
    return (
        <div className="border rounded-lg p-6 bg-white font-sans" ref={ref} style={{ fontFamily: "'Poppins', sans-serif" }}>
            <div className="text-center mb-6">
                <h2 className="text-3xl font-bold capitalize text-gray-800">{groupName}</h2>
                <p className="text-lg text-gray-500">Diet Report</p>
                <p className="text-sm text-gray-400">Generated on: {new Date().toLocaleDateString()}</p>
            </div>
            {reportData.map((site, siteIndex) => (
                <div key={siteIndex} className="mb-8 last:mb-0 page-break-before">
                    <h3 className="text-2xl font-semibold mb-4 text-primary bg-primary/10 p-3 rounded-md">{site.siteName}</h3>
                    {site.meals.map((meal, mealIndex) => (
                         <div key={mealIndex} className="mb-8 last:mb-0 pl-4">
                            <h4 className="text-xl font-semibold mb-4 text-green-800 bg-green-100 p-3 rounded-md" style={{backgroundColor: '#E6F4EA', color: '#166534'}}>Meal Time: {meal.time}</h4>
                            {meal.diets.map((diet, dietIndex) => (
                                <div key={`${diet.dietSignature}-${dietIndex}`} className="mb-6 border rounded-md p-4">
                                    <div className="grid grid-cols-[1fr_auto] items-start mb-3">
                                        <div>
                                            {diet.animals.map((animal, animalIndex) => (
                                                <div key={animalIndex} className="mb-1">
                                                    <h4 className="text-base font-bold">{animal.name} ({animal.count})</h4>
                                                    <p className="text-xs italic text-gray-500">{animal.scientificName}</p>
                                                </div>
                                            ))}
                                        </div>
                                         <div className="text-xs text-gray-600 text-right space-y-1">
                                            {diet.animals.map((animal, animalIndex) => (
                                                <div key={animalIndex}>
                                                    <p>Diet: {animal.dietName}</p>
                                                    <p>(No: {animal.dietNo})</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr style={{ backgroundColor: '#f2f2f2' }}>
                                                <th className="p-2 font-bold border w-2/5">Item</th>
                                                <th className="p-2 font-bold border text-right">Qty/Animal</th>
                                                <th className="p-2 font-bold border text-right">Total Qty</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {diet.items.map((item, itemIndex) => (
                                                <tr key={`${item.id}-${itemIndex}`} className="[&>td]:border [&>td]:p-2">
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
            <style jsx global>{`
                @media print {
                    .page-break-before {
                        page-break-before: always;
                    }
                }
            `}</style>
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
