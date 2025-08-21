
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

type MealItem = {
    isCombo: boolean;
    comboName?: string;
    comboTotal?: string;
    ingredients: {
        item: string;
        details?: string;
        amount: string;
    }[];
};

const formatIngredientAmount = (quantity: number, uom: string) => {
    if (!uom) return `${quantity}`;
    const formattedQty = quantity.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${formattedQty} ${uom}`;
};

export function DietPlan({ data }: DietPlanProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const animalName = data.length > 0 ? data[0].common_name : "";
    const dietName = data.length > 0 ? data[0]['Feed type name'] : "Diet";

    const dietData = useMemo(() => {
        if (data.length === 0) return [];
        
        const mealMap = new Map<string, SheetDataRow[]>();

        data.forEach(row => {
            const time = row.meal_start_time || "N/A";
            if (!mealMap.has(time)) {
                mealMap.set(time, []);
            }
            mealMap.get(time)!.push(row);
        });

        return Array.from(mealMap.entries()).map(([time, rows]) => {
            const items: MealItem[] = [];
            const processedRecipeIds = new Set<string>();

            rows.forEach(row => {
                const isComboOrRecipe = (row.type === 'Recipe' || row.type === 'Combo') && row.type_name;
                const recipeId = `${time}|${row.type_name}`;

                if (isComboOrRecipe) {
                    if (processedRecipeIds.has(recipeId)) return;

                    const recipeRows = rows.filter(r => r.type_name === row.type_name);
                    const totalQty = recipeRows.reduce((sum, r) => sum + r.ingredient_qty, 0);

                    items.push({
                        isCombo: true,
                        comboName: row.type_name,
                        comboTotal: formatIngredientAmount(totalQty, row.base_uom_name),
                        ingredients: recipeRows.map(ing => {
                            let detailsParts: string[] = [];
                            if (ing.cut_size_name) detailsParts.push(`cutting size ${ing.cut_size_name}`);
                            if (ing.preparation_type_name) detailsParts.push(ing.preparation_type_name);
                            
                            return {
                                item: ing.ingredient_name,
                                details: detailsParts.length > 0 ? `(${detailsParts.join(', ')})` : undefined,
                                amount: formatIngredientAmount(ing.ingredient_qty, ing.base_uom_name)
                            };
                        }),
                    });
                    processedRecipeIds.add(recipeId);
                } else {
                     let detailsParts: string[] = [];
                    if (row.cut_size_name) detailsParts.push(`cutting size ${row.cut_size_name}`);
                    if (row.preparation_type_name) detailsParts.push(row.preparation_type_name);

                    items.push({
                        isCombo: false,
                        ingredients: [{
                            item: row.ingredient_name,
                            details: detailsParts.length > 0 ? `(${detailsParts.join(', ')})` : undefined,
                            amount: formatIngredientAmount(row.ingredient_qty, row.base_uom_name)
                        }]
                    });
                }
            });

            return { time, items };
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
                        .combo-title td { background-color: #f0f0f0; font-weight: bold; }
                        .ingredient-row td:first-child { padding-left: 2rem; }
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
                    <p className="text-lg text-gray-500">({(data[0] as any).latin_name || "Psittacus erithacus"})</p>
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
                           const totalRowsForTime = mealGroup.items.reduce((acc, item) => {
                               return acc + (item.isCombo ? item.ingredients.length + 1 : 1);
                           }, 0);
                           let isFirstRowOfTime = true;

                           return (
                             <React.Fragment key={groupIndex}>
                               {mealGroup.items.map((item, itemIndex) => (
                                 <React.Fragment key={itemIndex}>
                                   {item.isCombo ? (
                                     <>
                                       <tr className="combo-title bg-gray-100 font-bold [&>td]:border [&>td]:border-gray-300 [&>td]:p-3">
                                         {isFirstRowOfTime && <td rowSpan={totalRowsForTime} className="align-top font-medium">{mealGroup.time}</td>}
                                         <td>{item.comboName}</td>
                                         <td className="text-right">{item.comboTotal}</td>
                                       </tr>
                                       {item.ingredients.map((ing, ingIndex) => {
                                            if (isFirstRowOfTime) isFirstRowOfTime = false;
                                            return (
                                              <tr key={ingIndex} className="ingredient-row [&>td]:border [&>td]:border-gray-300 [&>td]:p-3">
                                                <td className="pl-8">
                                                    <div className="font-semibold">{ing.item}</div>
                                                    {ing.details && <div className="text-sm text-gray-600">{ing.details}</div>}
                                                </td>
                                                <td className="text-right">{ing.amount}</td>
                                              </tr>
                                            )
                                       })}
                                     </>
                                   ) : (
                                     <tr className="[&>td]:border [&>td]:border-gray-300 [&>td]:p-3">
                                       {isFirstRowOfTime && <td rowSpan={totalRowsForTime} className="align-top font-medium">{mealGroup.time}</td>}
                                       <td>
                                         <div className="font-bold">{item.ingredients[0].item}</div>
                                         {item.ingredients[0].details && <div className="text-sm text-gray-600">{item.ingredients[0].details}</div>}
                                       </td>
                                       <td className="text-right">{item.ingredients[0].amount}</td>
                                     </tr>
                                   )}
                                   {(isFirstRowOfTime = false)}
                                 </React.Fragment>
                               ))}
                             </React.Fragment>
                           );
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
