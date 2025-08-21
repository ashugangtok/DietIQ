
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

type MealItem = {
    ingredient_name: string;
    type_name: string;
    details: string;
    amount: string;
};

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
    
    // Use diet_name and diet_no for the subheading
    const dietName = data.length > 0 ? (data[0] as any).diet_name : "Diet";
    const dietNo = data.length > 0 ? (data[0] as any).diet_no : "";
    const subheading = dietNo ? `${dietName} (${dietNo})` : dietName;


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

            // Sum up quantities for duplicate ingredients within the same mealtime
            const summedItems = new Map<string, SheetDataRow>();
            rows.forEach(row => {
                const key = row.ingredient_name;
                if (summedItems.has(key)) {
                    const existing = summedItems.get(key)!;
                    existing.ingredient_qty += row.ingredient_qty;
                    existing.ingredient_qty_gram += row.ingredient_qty_gram;
                } else {
                    summedItems.set(key, { ...row });
                }
            });

            const items: MealItem[] = Array.from(summedItems.values()).map(row => {
                const detailsParts: string[] = [];
                if (row.cut_size_name) detailsParts.push(`cut: ${row.cut_size_name}`);
                if (row.preparation_type_name) detailsParts.push(row.preparation_type_name);

                return {
                    ingredient_name: row.ingredient_name,
                    type_name: row.type_name,
                    details: detailsParts.length > 0 ? `(${detailsParts.join(', ')})` : "",
                    amount: formatAmount(row.ingredient_qty, row.base_uom_name)
                };
            });

            return { time, items };
        }).sort((a, b) => a.time.localeCompare(b.time));

    }, [data]);

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
                    <h2 className="text-3xl font-bold capitalize text-gray-800">{animalName}</h2>
                    <p className="text-lg text-gray-500">({(data[0] as any).latin_name || "Psittacus erithacus"})</p>
                </div>
                <div className="w-full md:w-1/3 mt-4 md:mt-0">
                    <Image 
                        src="https://placehold.co/600x400.png" 
                        alt={animalName}
                        width={600}
                        height={400} 
                        data-ai-hint="coatimundi animal" 
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
                                 <div className="font-bold">{item.ingredient_name}</div>
                                 {item.details && <div className="text-sm text-gray-600">{item.details}</div>}
                               </td>
                               <td className="align-top">{item.type_name}</td>
                               <td className="text-right align-top font-bold">{item.amount}</td>
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
