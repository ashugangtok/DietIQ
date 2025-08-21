
"use client";

import * as React from "react";
import { useMemo, useRef } from "react";
import { type SheetDataRow } from "@/types";
import { Button } from "./ui/button";
import { Download, Printer } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from 'html2canvas';

interface DietPlanProps {
    data: SheetDataRow[];
}

type Ingredient = {
    item: string;
    details?: string;
    amount: string;
};

type MealItem = {
    isCombo: boolean;
    comboName?: string;
    comboTotal?: string;
    ingredients: Ingredient[];
};

const formatIngredientAmount = (quantity: number, uom: string) => {
    if (!uom) return `${quantity}`;
    const formattedQty = quantity.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${formattedQty} ${uom}`;
};

const formatIngredientBreakdown = (name: string, quantity: number, uom: string) => {
    const formattedQty = quantity.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${name} (${formattedQty} ${uom})`;
}

export function DietPlan({ data }: DietPlanProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const animalName = data.length > 0 ? data[0].common_name : "";
    const dietName = data.length > 0 ? data[0]['Feed type name'] : "Diet";
    // @ts-ignore
    const scientificName = data.length > 0 ? data[0].latin_name || "Scientific Name Not Available" : "";

    const dietData = useMemo(() => {
        if (data.length === 0) return [];
        
        const mealMap = new Map<string, SheetDataRow[]>();

        // 1. Group all data rows by their meal time
        data.forEach(row => {
            const time = row.meal_start_time || "N/A";
            if (!mealMap.has(time)) {
                mealMap.set(time, []);
            }
            mealMap.get(time)!.push(row);
        });

        // 2. Process each meal group
        return Array.from(mealMap.entries()).map(([time, rows]) => {
            const mealItems: MealItem[] = [];
            const processedRecipeNames = new Set<string>();
            const singleIngredientMap = new Map<string, { totalQty: number, rows: SheetDataRow[] }>();

            // Separate combos from single ingredients
            rows.forEach(row => {
                if (row.type === 'Recipe' || row.type === 'Combo') {
                    const comboName = row.type_name;
                    if (processedRecipeNames.has(comboName)) return;

                    const comboRows = rows.filter(r => r.type_name === comboName);
                    const totalQty = comboRows.reduce((sum, r) => sum + r.ingredient_qty, 0);

                    const ingredientBreakdown = comboRows.map(ing => 
                        formatIngredientBreakdown(ing.ingredient_name, ing.ingredient_qty, ing.base_uom_name)
                    ).join(', ');

                    const prepDetails = new Set(comboRows.map(r => {
                        let parts = [];
                        if (r.cut_size_name) parts.push(`cut: ${r.cut_size_name}`);
                        if (r.preparation_type_name) parts.push(`prep: ${r.preparation_type_name}`);
                        return parts.join(', ');
                    }).filter(Boolean));


                    mealItems.push({
                        isCombo: true,
                        ingredients: [{
                            item: comboName,
                            details: `(${ingredientBreakdown}) ${Array.from(prepDetails).join(', ')}`.trim(),
                            amount: formatIngredientAmount(totalQty, comboRows[0]?.base_uom_name || '')
                        }]
                    });

                    processedRecipeNames.add(comboName);
                } else {
                    // It's a single ingredient, group them for summation
                    const key = row.ingredient_name;
                    if (!singleIngredientMap.has(key)) {
                        singleIngredientMap.set(key, { totalQty: 0, rows: [] });
                    }
                    const entry = singleIngredientMap.get(key)!;
                    entry.totalQty += row.ingredient_qty;
                    entry.rows.push(row);
                }
            });

            // Process the summed single ingredients
            singleIngredientMap.forEach((value, key) => {
                const firstRow = value.rows[0];
                 let detailsParts: string[] = [];
                if (firstRow.cut_size_name) detailsParts.push(`cut: ${firstRow.cut_size_name}`);
                if (firstRow.preparation_type_name) detailsParts.push(`prep: ${firstRow.preparation_type_name}`);

                mealItems.push({
                    isCombo: false,
                    ingredients: [{
                        item: key,
                        details: detailsParts.length > 0 ? `(${detailsParts.join(', ')})` : undefined,
                        amount: formatIngredientAmount(value.totalQty, firstRow.base_uom_name)
                    }]
                });
            });


            return { time, items: mealItems };
        }).sort((a, b) => a.time.localeCompare(b.time));

    }, [data]);

    const handlePrint = () => {
        const printContent = cardRef.current;
        if (printContent) {
            const printWindow = window.open('', '', 'height=800,width=800');
            if (printWindow) {
                printWindow.document.write('<html><head><title>Print Diet</title>');
                printWindow.document.write(`
                    <style>
                        body { font-family: sans-serif; }
                        .diet-card { border: 1px solid #eee; padding: 16px; margin: 16px; }
                        h2, h3 { color: #2c5282; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #166534; color: white; }
                        .no-print { display: none; }
                    </style>
                `);
                printWindow.document.write('</head><body>');
                printWindow.document.write(printContent.innerHTML);
                printWindow.document.write('</body></html>');
                printWindow.document.close();
                printWindow.focus();
                printWindow.print();
                printWindow.close();
            }
        }
    };
    
    const handleDownloadPdf = async () => {
        const element = cardRef.current;
        if (element) {
            const buttons = element.querySelector('.no-print');
            if (buttons) buttons.classList.add('hidden');
            
            const canvas = await html2canvas(element, { scale: 2 });
            const data = canvas.toDataURL('image/png');
            
            if (buttons) buttons.classList.remove('hidden');

            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgProperties = pdf.getImageProperties(data);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProperties.height * pdfWidth) / imgProperties.width;
            
            pdf.addImage(data, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`${animalName}-diet-plan.pdf`);
        }
    };

    return (
        <div className="border rounded-lg p-6 bg-white diet-card" ref={cardRef}>
            <div className="flex flex-col md:flex-row justify-between items-start mb-6">
                <div>
                    <h2 className="text-3xl font-bold capitalize text-gray-800">{animalName}</h2>
                    <p className="text-lg text-gray-500">({scientificName})</p>
                </div>
                <div className="w-full md:w-1/3 mt-4 md:mt-0">
                    <img src="https://placehold.co/600x400.png" alt={animalName} data-ai-hint="parrot bird" className="rounded-lg shadow-md w-full" />
                </div>
            </div>

            <h3 className="text-xl font-semibold mb-4" style={{color: '#166534'}}>Diet – {dietName}</h3>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr>
                            <th className="p-3 font-bold uppercase bg-green-800 text-white border border-green-700 w-1/4">Time</th>
                            <th className="p-3 font-bold uppercase bg-green-800 text-white border border-green-700 w-1/2">Item</th>
                            <th className="p-3 font-bold uppercase bg-green-800 text-white border border-green-700 w-1/4 text-right">Daily Amount (data per animal)</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                       {dietData.map((mealGroup, groupIndex) => {
                           const totalRowsForTime = mealGroup.items.length;
                           return (
                               <React.Fragment key={groupIndex}>
                                   {mealGroup.items.map((mealItem, itemIndex) => (
                                       <tr key={itemIndex} className="[&>td]:border [&>td]:border-gray-300 [&>td]:p-3">
                                           {itemIndex === 0 && (
                                               <td rowSpan={totalRowsForTime} className="align-top font-medium">{mealGroup.time}</td>
                                           )}
                                           <td>
                                               <div className="font-bold">{mealItem.ingredients[0].item}</div>
                                               {mealItem.ingredients[0].details && <div className="text-sm text-gray-600">{mealItem.ingredients[0].details}</div>}
                                           </td>
                                           <td className="text-right">{mealItem.ingredients[0].amount}</td>
                                       </tr>
                                   ))}
                               </React.Fragment>
                           )
                       })}
                    </tbody>
                </table>
            </div>
            
            <div className="mt-6 flex gap-4 no-print">
                <Button onClick={handlePrint}>
                    <Printer className="mr-2" />
                    Print
                </Button>
                <Button variant="outline" onClick={handleDownloadPdf}>
                    <Download className="mr-2" />
                    Download as PDF
                </Button>
            </div>
        </div>
    );
}
