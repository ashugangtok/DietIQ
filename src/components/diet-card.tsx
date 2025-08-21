
"use client";

import * as React from "react";
import { useMemo, useRef } from "react";
import { type SheetDataRow } from "@/types";
import { Button } from "./ui/button";
import { Download, Printer } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from 'html2canvas';
import Image from "next/image";

interface DietCardProps {
    data: SheetDataRow[];
}

const formatAmount = (quantity: number, uom: string) => {
    if (!uom) return `${quantity}`;
    const uomLower = uom.toLowerCase();
    
    // Handle gram conversion for small kg quantities
    if ((uomLower === 'kg' || uomLower === 'kilogram') && quantity > 0 && quantity < 1) {
        const grams = quantity * 1000;
        return `${grams.toLocaleString(undefined, { maximumFractionDigits: 0 })} gram`;
    }
    
    // Handle gram amounts directly
    if (uomLower === 'gram') {
        return `${quantity.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${uom}`;
    }

    const formattedQty = quantity.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${formattedQty} ${uom}`;
};


export function DietCard({ data }: DietCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const animalName = data.length > 0 ? data[0].common_name : "";
    
    const dietName = data.length > 0 ? (data[0] as any).diet_name : "";
    const dietNo = data.length > 0 ? (data[0] as any).diet_no : "";
    const scientificName = data.length > 0 ? (data[0] as any).scientific_name : "";
    const subheading = dietNo 
        ? `Diet Name: ${dietName} and Diet_Number: ${dietNo}` 
        : `Diet Name: ${dietName}`;

    const animalCount = useMemo(() => {
        if (data.length === 0) return 0;
        const animalIds = new Set(data.map(row => row.animal_id));
        return animalIds.size;
    }, [data]);


    const dietData = useMemo(() => {
        if (data.length === 0) return [];
        
        const mealMap = new Map<string, SheetDataRow[]>();

        data.forEach(row => {
            const timeKey = `${row.meal_start_time || "N/A"}|${row.meal_end_time || "N/A"}`;
            if (!mealMap.has(timeKey)) {
                mealMap.set(timeKey, []);
            }
            mealMap.get(timeKey)!.push(row);
        });

        return Array.from(mealMap.entries()).map(([timeKey, rows]) => {
            const [startTime, endTime] = timeKey.split('|');
            const timeDisplay = (startTime !== "N/A" && endTime !== "N/A" && startTime !== endTime)
                ? `${startTime} - ${endTime}`
                : (startTime !== "N/A" ? startTime : "N/A");

            const typeNameGroup = new Map<string, { ingredients: SheetDataRow[], totalQty: number, uom: string }>();

            rows.forEach(row => {
                const isCombo = row.type?.toLowerCase() === 'recipe' || row.type?.toLowerCase() === 'combo';
                const groupKey = isCombo ? row.type_name : row.ingredient_name;

                if (!typeNameGroup.has(groupKey)) {
                    typeNameGroup.set(groupKey, { ingredients: [], totalQty: 0, uom: row.base_uom_name });
                }
                const group = typeNameGroup.get(groupKey)!;
                group.ingredients.push(row);
                group.totalQty += row.ingredient_qty;
            });

            const items = Array.from(typeNameGroup.values()).map(group => {
                const mainItem = group.ingredients[0];
                let itemName;
                let itemDetails = "";
                const isCombo = mainItem.type?.toLowerCase() === 'recipe' || mainItem.type?.toLowerCase() === 'combo';


                if (isCombo) {
                    itemName = mainItem.type_name;
                    
                    // Aggregate ingredients within the combo
                    const ingredientAggregator = new Map<string, { totalQty: number, uom: string }>();
                    group.ingredients.forEach(ing => {
                        const ingKey = ing.ingredient_name;
                        if (!ingredientAggregator.has(ingKey)) {
                            ingredientAggregator.set(ingKey, { totalQty: 0, uom: ing.base_uom_name });
                        }
                        const entry = ingredientAggregator.get(ingKey)!;
                        entry.totalQty += ing.ingredient_qty;
                    });

                    const breakdown = Array.from(ingredientAggregator.entries()).map(([name, data]) => {
                        return `${name} ${formatAmount(data.totalQty, data.uom)}`;
                    }).join(', ');

                    itemDetails = `(${breakdown})`;

                } else {
                    itemName = mainItem.ingredient_name;
                    itemDetails = "";
                }

                const amountPerAnimal = group.totalQty;
                const totalAmount = amountPerAnimal * animalCount;

                return {
                    id: mainItem.type_name || mainItem.ingredient_name,
                    item_name: itemName,
                    item_details: itemDetails,
                    amount_per_animal: formatAmount(amountPerAnimal, group.uom),
                    total_amount_required: formatAmount(totalAmount, group.uom)
                };
            });

            return { time: timeDisplay, items };
        }).sort((a, b) => a.time.localeCompare(b.time));

    }, [data, animalCount]);

    const handlePrint = async () => {
        const element = cardRef.current;
        if (element) {
            const buttons = element.querySelector('.no-print');
            if (buttons) (buttons as HTMLElement).style.display = 'none';
            
            const canvas = await html2canvas(element, { scale: 2 });
            
            if (buttons) (buttons as HTMLElement).style.display = 'flex';

            const printWindow = window.open('', '', 'height=800,width=800');
            if (printWindow) {
                printWindow.document.write('<html><head><title>Print Diet</title></head><body>');
                printWindow.document.write(`<img src="${canvas.toDataURL()}" style="width:100%;">`);
                printWindow.document.write('</body></html>');
                printWindow.document.close();
                printWindow.focus();
                
                // Use a timeout to ensure the image loads before printing
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

    if (data.length === 0) {
        return null;
    }

    return (
        <div className="border rounded-lg p-6 bg-white" ref={cardRef}>
            <div className="flex flex-col md:flex-row justify-between items-start mb-6">
                <div>
                    <h2 className="text-3xl font-bold capitalize text-gray-800">{animalName} ({animalCount})</h2>
                    <p className="text-lg text-gray-500">({scientificName})</p>
                </div>
                <div className="w-full md:w-1/3 mt-4 md:mt-0">
                    <Image 
                        src="https://placehold.co/600x400.png" 
                        alt={animalName}
                        width={600}
                        height={400} 
                        data-ai-hint="animal" 
                        className="rounded-lg shadow-md w-full"
                    />
                </div>
            </div>

            <h3 className="text-xl font-semibold mb-4" style={{color: '#166534'}}>{subheading}</h3>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr>
                            <th className="p-3 font-bold uppercase bg-green-800 text-white border border-green-700 w-1/6">Time</th>
                            <th className="p-3 font-bold uppercase bg-green-800 text-white border border-green-700">Item</th>
                            <th className="p-3 font-bold uppercase bg-green-800 text-white border border-green-700 w-1/6 text-right">Qty Required (per animal)</th>
                            <th className="p-3 font-bold uppercase bg-green-800 text-white border border-green-700 w-1/6 text-right">Total Qty Required</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                       {dietData.map((mealGroup, groupIndex) => (
                         <React.Fragment key={groupIndex}>
                           {mealGroup.items.map((item, itemIndex) => (
                             <tr key={`${groupIndex}-${item.id}`} className="[&>td]:border [&>td]:border-gray-300 [&>td]:p-3">
                               {itemIndex === 0 && (
                                 <td rowSpan={mealGroup.items.length} className="align-top font-medium">{mealGroup.time}</td>
                               )}
                               <td className="align-top">
                                 <div className="font-bold">{item.item_name}</div>
                                 {item.item_details && <div className="text-sm text-gray-600">{item.item_details}</div>}
                               </td>
                               <td className="text-right align-top font-bold">{item.amount_per_animal}</td>
                               <td className="text-right align-top font-bold">{item.total_amount_required}</td>
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
