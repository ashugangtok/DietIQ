
"use client";

import * as React from "react";
import { useMemo, useRef } from "react";
import { type SheetDataRow } from "@/types";
import { Button } from "./ui/button";
import { Download, Printer } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from 'html2canvas';

interface DietCardProps {
    data: SheetDataRow[];
}

type MealItem = {
    item: string;
    details?: string;
    amount: string;
};

const formatIngredientAmount = (quantity: number, uom: string) => {
    if (!uom) return `${quantity}`;
    const formattedQty = quantity.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${formattedQty} ${uom}`;
};

export function DietCard({ data }: DietCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const animalName = data.length > 0 ? data[0].common_name : "";
    const dietName = data.length > 0 ? data[0]['Feed type name'] : "Diet";

    const dietData = useMemo(() => {
        if (data.length === 0) return [];

        const aggregatedMealMap = new Map<string, MealItem[]>();

        data.forEach(row => {
            const time = row.meal_start_time || "N/A";
            if (!aggregatedMealMap.has(time)) {
                aggregatedMealMap.set(time, []);
            }
            const itemsForTime = aggregatedMealMap.get(time)!;

            if (row.type === 'Recipe' || row.type === 'Combo') {
                if (itemsForTime.some(i => i.item === row.type_name)) return;

                const ingredientsForRecipe = data.filter(d => d.type_name === row.type_name && d.meal_start_time === time);
                const totalQty = ingredientsForRecipe.reduce((sum, ing) => sum + ing.ingredient_qty, 0);
                const amount = formatIngredientAmount(totalQty, row.base_uom_name);

                const details = ingredientsForRecipe
                    .map(ing => `${ing.ingredient_name} (${formatIngredientAmount(ing.ingredient_qty, ing.base_uom_name)})`)
                    .join(', ');

                itemsForTime.push({
                    item: row.type_name,
                    details: details ? `(${details})` : undefined,
                    amount
                });

            } else {
                if (itemsForTime.some(i => i.item === row.ingredient_name)) return;

                const ingredientRows = data.filter(d => 
                    d.meal_start_time === time && 
                    d.ingredient_name === row.ingredient_name && 
                    d.type !== 'Recipe' && 
                    d.type !== 'Combo'
                );
                
                if (ingredientRows.length === 0) return;

                const totalQty = ingredientRows.reduce((sum, ing) => sum + ing.ingredient_qty, 0);
                const firstRow = ingredientRows[0];
                const amount = formatIngredientAmount(totalQty, firstRow.base_uom_name);
                
                let details = "";
                 if (firstRow.cut_size_name) {
                    details += `cutting size ${firstRow.cut_size_name}`;
                }
                if (firstRow.preparation_type_name) {
                    details += `${details ? ', ' : ''}${firstRow.preparation_type_name}`;
                }

                itemsForTime.push({
                    item: firstRow.ingredient_name,
                    details: details ? `(${details})` : undefined,
                    amount
                });
            }
        });


        return Array.from(aggregatedMealMap.entries()).map(([time, items]) => ({
            time,
            items,
        })).sort((a,b) => a.time.localeCompare(b.time));

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
                       {dietData.map((mealGroup, groupIndex) => (
                         <React.Fragment key={groupIndex}>
                           {mealGroup.items.map((item, itemIndex) => (
                             <tr key={`${groupIndex}-${itemIndex}`} className="[&>td]:border [&>td]:border-gray-300 [&>td]:p-3">
                               {itemIndex === 0 && (
                                 <td rowSpan={mealGroup.items.length} className="align-top font-medium">{mealGroup.time}</td>
                               )}
                               <td>
                                 <div className="font-bold">{item.item}</div>
                                 {item.details && <div className="text-sm text-gray-600">{item.details}</div>}
                               </td>
                               <td className="text-right">{item.amount}</td>
                             </tr>
                           ))}
                         </React.Fragment>
                       ))}
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
