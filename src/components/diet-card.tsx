
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
    isCombo: boolean;
    item: string; // Ingredient name or Combo name
    typeName: string;
    details?: string; // Prep details for single items, ingredient breakdown for combos
    amount: string; // Total amount for this line item
};

const formatAmount = (quantity: number, uom: string) => {
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
        
        const mealMap = new Map<string, SheetDataRow[]>();

        // 1. Group all rows by mealtime
        data.forEach(row => {
            const time = row.meal_start_time || "N/A";
            if (!mealMap.has(time)) {
                mealMap.set(time, []);
            }
            mealMap.get(time)!.push(row);
        });

        // 2. Process each meal group
        return Array.from(mealMap.entries()).map(([time, rows]) => {
            const processedItems = new Map<string, MealItem>();
            const comboMap = new Map<string, SheetDataRow[]>();

            // Separate combos from single ingredients
            rows.forEach(row => {
                if (row.type === 'Recipe' || row.type === 'Combo') {
                    const comboKey = row.type_name;
                    if (!comboMap.has(comboKey)) {
                        comboMap.set(comboKey, []);
                    }
                    comboMap.get(comboKey)!.push(row);
                } else {
                    const singleItemKey = row.ingredient_name;
                    let existing = processedItems.get(singleItemKey);
                    if (!existing) {
                        const detailsParts: string[] = [];
                        if (row.cut_size_name) detailsParts.push(`cut: ${row.cut_size_name}`);
                        if (row.preparation_type_name) detailsParts.push(row.preparation_type_name);
                        
                        processedItems.set(singleItemKey, {
                            isCombo: false,
                            item: row.ingredient_name,
                            typeName: row.type_name,
                            details: detailsParts.length > 0 ? `(${detailsParts.join(', ')})` : undefined,
                            amount: formatAmount(row.ingredient_qty, row.base_uom_name)
                        });
                    } else {
                        // This assumes uom is the same; if not, more complex logic is needed.
                        const currentQty = parseFloat(existing.amount.split(' ')[0]);
                        const newQty = currentQty + row.ingredient_qty;
                        existing.amount = formatAmount(newQty, row.base_uom_name);
                    }
                }
            });

            // Process combos
            comboMap.forEach((comboRows, comboName) => {
                const totalAmount = comboRows.reduce((sum, r) => sum + r.ingredient_qty, 0);
                const firstRow = comboRows[0];

                const ingredientBreakdown = comboRows.map(r => 
                    `${r.ingredient_name} (${formatAmount(r.ingredient_qty, r.base_uom_name)})`
                ).join(', ');

                processedItems.set(comboName, {
                    isCombo: true,
                    item: comboName,
                    typeName: firstRow.type_name,
                    details: `(${ingredientBreakdown})`,
                    amount: formatAmount(totalAmount, firstRow.base_uom_name)
                });
            });

            return { time, items: Array.from(processedItems.values()) };
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
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
                        th { background-color: #166534; color: white; }
                        .no-print { display: none; }
                        .item-name { font-weight: bold; }
                        .item-details { font-size: 0.9em; color: #555; }
                    </style>
                `);
                printWindow.document.write('</head><body>');
                // Clone the element to modify it for printing
                const contentClone = printContent.cloneNode(true) as HTMLElement;
                // Remove buttons from clone
                const buttons = contentClone.querySelector('.no-print');
                if (buttons) buttons.remove();
                printWindow.document.write(contentClone.innerHTML);
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
            if (buttons) (buttons as HTMLElement).style.display = 'none';
            
            const canvas = await html2canvas(element, { scale: 2 });
            
            if (buttons) (buttons as HTMLElement).style.display = 'flex';

            const data = canvas.toDataURL('image/png');
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
                            <th className="p-3 font-bold uppercase bg-green-800 text-white border border-green-700 w-1/6">Time</th>
                            <th className="p-3 font-bold uppercase bg-green-800 text-white border border-green-700">Item</th>
                            <th className="p-3 font-bold uppercase bg-green-800 text-white border border-green-700 w-1/4">Type Name</th>
                            <th className="p-3 font-bold uppercase bg-green-800 text-white border border-green-700 w-1/6 text-right">Daily Amount (per animal)</th>
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
                               <td className="align-top">
                                 <div className="item-name font-bold">{item.item}</div>
                                 {item.details && <div className="item-details text-sm text-gray-600">{item.details}</div>}
                               </td>
                               <td className="align-top">{item.typeName}</td>
                               <td className="text-right align-top">{item.amount}</td>
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
