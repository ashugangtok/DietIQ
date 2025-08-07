
"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { type SheetDataRow } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { MultiSelect } from "./ui/multi-select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "./ui/button";
import { Download } from "lucide-react";

interface SummaryTableProps {
  data: SheetDataRow[];
}

interface SummaryRow {
  site_name: string;
  ingredient_name: string;
  total_qty_gram: number;
  total_qty: number;
  uom: string;
}

const isWeightUnit = (uom: string) => {
    if (!uom) return false;
    const lowerUom = uom.toLowerCase();
    return lowerUom === 'gram' || lowerUom === 'kg' || lowerUom === 'kilogram';
}

export function SummaryTable({ data }: SummaryTableProps) {
  const [feedTypeFilter, setFeedTypeFilter] = useState<string>("");
  const [ingredientFilter, setIngredientFilter] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);

  const feedTypeOptions = useMemo(() => [...new Set(data.map(item => item['Feed type name']))].sort(), [data]);
  const ingredientOptions = useMemo(() => [...new Set(data.map(item => item.ingredient_name))].sort(), [data]);

  const filteredData = useMemo(() => {
    return data.filter(row => {
      const feedTypeMatch = feedTypeFilter ? row['Feed type name'] === feedTypeFilter : true;
      const ingredientMatch = ingredientFilter.length > 0 ? ingredientFilter.includes(row.ingredient_name) : true;
      return feedTypeMatch && ingredientMatch;
    });
  }, [data, feedTypeFilter, ingredientFilter]);

  const summaryData = useMemo(() => {
    if (filteredData.length === 0) return [];

    const summaryMap = new Map<string, { qty: number; qty_gram: number; uom: string }>();

    filteredData.forEach(row => {
      const key = `${row.site_name}|${row.ingredient_name}`;
      const current = summaryMap.get(key) || { qty: 0, qty_gram: 0, uom: row.base_uom_name };
      
      current.qty += row.ingredient_qty || 0;
      current.qty_gram += row.ingredient_qty_gram || 0;
      
      summaryMap.set(key, current);
    });

    const summary: SummaryRow[] = Array.from(summaryMap.entries()).map(([key, totals]) => {
      const [site_name, ingredient_name] = key.split('|');
      return { 
        site_name, 
        ingredient_name, 
        total_qty: totals.qty,
        total_qty_gram: totals.qty_gram,
        uom: totals.uom
      };
    });

    return summary.sort((a, b) => {
      const siteCompare = a.site_name.localeCompare(b.site_name);
      if (siteCompare !== 0) return siteCompare;
      return a.ingredient_name.localeCompare(b.ingredient_name);
    });
  }, [filteredData]);

  const groupedData = useMemo(() => {
    const groups = new Map<string, { 
        ingredients: { name: string; total_qty: number; total_qty_gram: number; uom: string; }[], 
        siteTotals: { [uom: string]: number },
    }>();
    
    const grandTotals: { [uom: string]: number } = {};

    summaryData.forEach(row => {
      if (!groups.has(row.site_name)) {
        groups.set(row.site_name, { ingredients: [], siteTotals: {} });
      }
      const group = groups.get(row.site_name)!;
      group.ingredients.push({ name: row.ingredient_name, total_qty: row.total_qty, total_qty_gram: row.total_qty_gram, uom: row.uom });

      if (isWeightUnit(row.uom)) {
          group.siteTotals['weight'] = (group.siteTotals['weight'] || 0) + (row.total_qty_gram || 0);
          grandTotals['weight'] = (grandTotals['weight'] || 0) + (row.total_qty_gram || 0);
      } else {
          const uomKey = row.uom && row.uom.toLowerCase().endsWith('s') ? row.uom.slice(0, -1) : row.uom || 'unit';
          group.siteTotals[uomKey] = (group.siteTotals[uomKey] || 0) + (row.total_qty || 0);
          grandTotals[uomKey] = (grandTotals[uomKey] || 0) + (row.total_qty || 0);
      }
    });
    
    return { groups, grandTotals };
  }, [summaryData]);

  const overallTotals = useMemo(() => {
    const totals = new Map<string, { [uom: string]: number }>();
    summaryData.forEach(row => {
      if (!totals.has(row.ingredient_name)) {
        totals.set(row.ingredient_name, {});
      }
      const ingredientTotals = totals.get(row.ingredient_name)!;
      if (isWeightUnit(row.uom)) {
        ingredientTotals['weight'] = (ingredientTotals['weight'] || 0) + (row.total_qty_gram || 0);
      } else {
        const uomKey = row.uom && row.uom.toLowerCase().endsWith('s') ? row.uom.slice(0, -1) : row.uom || 'unit';
        ingredientTotals[uomKey] = (ingredientTotals[uomKey] || 0) + (row.total_qty || 0);
      }
    });
    return Array.from(totals.entries()).sort(([nameA], [nameB]) => nameA.localeCompare(nameB));
  }, [summaryData]);

  const addContentToPdf = async (pdf: jsPDF, elementId: string, isFirstPage: boolean) => {
    const element = document.getElementById(elementId);
    if (!element) return;
  
    if (!isFirstPage) {
      pdf.addPage();
    }
  
    const canvas = await html2canvas(element, {
      scale: 1.5, // Reduced scale for better text size
      useCORS: true,
      logging: false,
    });
    
    const imgData = canvas.toDataURL('image/png');
    const imgProps = pdf.getImageProperties(imgData);
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const pageMargin = 10;
    
    const imgWidth = pdfWidth - pageMargin * 2;
    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
    
    let heightLeft = imgHeight;
    let position = 0;
  
    pdf.addImage(imgData, 'PNG', pageMargin, position + pageMargin, imgWidth, imgHeight);
    heightLeft -= (pdfHeight - pageMargin * 2);
  
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', pageMargin, position + pageMargin, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - pageMargin * 2);
    }
  };


  const handleDownload = async (type: 'summary' | 'overall' | 'all') => {
    setIsDownloading(true);
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    if (type === 'summary' || type === 'all') {
      await addContentToPdf(pdf, 'ingredient-summary-card', true);
    }
    
    if (type === 'overall' || type === 'all') {
      await addContentToPdf(pdf, 'overall-totals-card', type !== 'all');
    }

    pdf.save(`summary-report-${type}.pdf`);
    setIsDownloading(false);
  };
  
  const formatTotal = (quantity: number, quantityGram: number, uom: string) => {
    if (!uom) return "0";
    const uomLower = uom.toLowerCase();
    if (isWeightUnit(uom)) {
        if ((uomLower === 'kilogram' || uomLower === 'kg') && quantity < 1 && quantity > 0) {
            return `${(quantityGram || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} gram`;
        }
        return `${(quantity || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${uom}`;
    }
     if (quantity === 1) {
      return `${(quantity || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} ${uom}`;
    }
    return `${(quantity || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${uom}`;
  };

  const formatCombinedTotal = (totals: { [uom: string]: number }) => {
    return Object.entries(totals).map(([unit, total]) => {
      if (!total || total === 0) return null;

      if (unit === 'weight') {
        if (total < 1000) {
          return `${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} gram`;
        }
        const kg = total / 1000;
        return `${kg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kilogram`;
      }
      const unitLabel = total === 1 ? unit : `${unit}s`;
      return `${total.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unitLabel}`;
    }).filter(Boolean).join(', ');
  };


  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
        <Select value={feedTypeFilter} onValueChange={(value) => setFeedTypeFilter(value === 'all' ? '' : value)}>
          <SelectTrigger className="w-full sm:w-[240px] bg-background">
            <SelectValue placeholder="Filter by Feed Type Name" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Feed Types</SelectItem>
            {feedTypeOptions.map((option, index) => (
              <SelectItem key={`${option}-${index}`} value={option}>{option}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <MultiSelect
          options={ingredientOptions.map(name => ({ label: name, value: name }))}
          selectedValues={ingredientFilter}
          onChange={setIngredientFilter}
          placeholder="Filter by ingredients..."
          className="w-full sm:w-[240px] bg-background"
        />
        <div className="flex-grow" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button disabled={isDownloading}>
              <Download className="mr-2 h-4 w-4" />
              {isDownloading ? "Downloading..." : "Download PDF"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Export Options</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => handleDownload('summary')}>
              Download Ingredient Summary
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleDownload('overall')}>
              Download Overall Totals
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleDownload('all')}>
              Download Full Report
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex flex-col lg:flex-row gap-8">
        <div id="ingredient-summary-card" className="lg:w-1/2">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-xl">Ingredient Summary by Site</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Site Name</TableHead>
                      <TableHead>Ingredient Name</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedData.groups.size > 0 ? (
                      <>
                        {Array.from(groupedData.groups.entries()).map(([siteName, { ingredients, siteTotals }]) => (
                          <React.Fragment key={siteName}>
                            {ingredients.map((ing, index) => (
                              <TableRow key={`${siteName}-${ing.name}`}>
                                <TableCell className="align-top font-medium">{index === 0 ? siteName : ''}</TableCell>
                                <TableCell className="align-top">{ing.name}</TableCell>
                                <TableCell className="text-right align-top">{formatTotal(ing.total_qty, ing.total_qty_gram, ing.uom)}</TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="bg-muted/30 font-bold">
                              <TableCell colSpan={2}>{siteName} Total</TableCell>
                              <TableCell className="text-right">{formatCombinedTotal(siteTotals)}</TableCell>
                            </TableRow>
                          </React.Fragment>
                        ))}
                        <TableRow className="bg-primary/80 text-primary-foreground font-bold text-base">
                          <TableCell colSpan={2}>Grand Total</TableCell>
                          <TableCell className="text-right">{formatCombinedTotal(groupedData.grandTotals)}</TableCell>
                        </TableRow>
                      </>
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                          No results found. Try adjusting your filter.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
        <div id="overall-totals-card" className="lg:w-1/2">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-xl">Overall Ingredient Totals</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="relative overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Ingredient</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overallTotals.length > 0 ? (
                      overallTotals.map(([name, totals]) => (
                        <TableRow key={name}>
                          <TableCell className="font-medium">{name}</TableCell>
                          <TableCell className="text-right">{formatCombinedTotal(totals)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                          No results found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
