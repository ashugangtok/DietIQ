
"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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

    const summaryMap = new Map<string, { qty: number; qty_gram: number }>();

    filteredData.forEach(row => {
      const key = `${row.site_name}|${row.ingredient_name}|${row.base_uom_name}`;
      const current = summaryMap.get(key) || { qty: 0, qty_gram: 0 };
      
      current.qty += row.ingredient_qty || 0;
      current.qty_gram += row.ingredient_qty_gram || 0;
      
      summaryMap.set(key, current);
    });

    const summary: SummaryRow[] = Array.from(summaryMap.entries()).map(([key, totals]) => {
      const [site_name, ingredient_name, uom] = key.split('|');
      return { 
        site_name, 
        ingredient_name, 
        total_qty: totals.qty,
        total_qty_gram: totals.qty_gram,
        uom
      };
    });

    return summary.sort((a, b) => {
      const siteCompare = a.site_name.localeCompare(b.site_name);
      if (siteCompare !== 0) return siteCompare;
      const ingCompare = a.ingredient_name.localeCompare(b.ingredient_name);
      if(ingCompare !== 0) return ingCompare;
      return a.uom.localeCompare(b.uom);
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

      const uomKey = (row.uom || 'unit').toLowerCase();
      const value = isWeightUnit(uomKey) ? row.total_qty_gram : row.total_qty;

      group.siteTotals[uomKey] = (group.siteTotals[uomKey] || 0) + value;
      grandTotals[uomKey] = (grandTotals[uomKey] || 0) + value;
    });
    
    return { groups, grandTotals };
  }, [summaryData]);

  const overallTotals = useMemo(() => {
    const totals = new Map<string, { [uom: string]: number }>();
    summaryData.forEach(row => {
        const ingredientKey = `${row.ingredient_name}|${row.uom}`;
        if (!totals.has(ingredientKey)) {
            totals.set(ingredientKey, { qty: 0, qty_gram: 0 });
        }
        const ingredientTotals = totals.get(ingredientKey)!;
        ingredientTotals.qty = (ingredientTotals.qty || 0) + row.total_qty;
        ingredientTotals.qty_gram = (ingredientTotals.qty_gram || 0) + row.total_qty_gram;
    });

    return Array.from(totals.entries()).map(([key, values]) => {
        const [name, uom] = key.split('|');
        return { name, uom, ...values };
    }).sort((a, b) => {
        const nameCompare = a.name.localeCompare(b.name);
        if (nameCompare !== 0) return nameCompare;
        return a.uom.localeCompare(b.uom);
    });
  }, [summaryData]);

  const handleDownload = async (type: 'summary' | 'overall' | 'all') => {
    setIsDownloading(true);
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
    });
    const pageMargin = 10;
    const fontStyle = { font: "helvetica", fontSize: 10 };

    const addSummaryTable = () => {
        doc.text("Ingredient Summary by Site", pageMargin, 15);
        
        const body: (string|number)[][] = [];
        const grandTotals: {[uom: string]: number} = {};

        Array.from(groupedData.groups.entries()).forEach(([siteName, { ingredients }]) => {
            body.push([{ content: siteName, colSpan: 3, styles: { fontStyle: 'bold', fillColor: [230, 230, 230], textColor: 20 } }]);
            const siteTotals: {[uom: string]: number} = {};

            ingredients.forEach(ing => {
                body.push([ing.name, formatTotal(ing.total_qty, ing.total_qty_gram, ing.uom, true), ing.uom]);
                
                const value = isWeightUnit(ing.uom) ? ing.total_qty_gram : ing.total_qty;
                siteTotals[ing.uom] = (siteTotals[ing.uom] || 0) + value;
                grandTotals[ing.uom] = (grandTotals[ing.uom] || 0) + value;
            });
            body.push([{ content: `${siteName} Total`, colSpan: 1, styles: {fontStyle: 'bold'}}, {content: formatCombinedTotal(siteTotals, true), colSpan: 2, styles: {fontStyle: 'bold'}}]);
        });
        
        body.push([{ content: 'Grand Total', colSpan: 1, styles: { fontStyle: 'bold', fillColor: '#5B8DAE', textColor: '#FFFFFF', fontSize: 12 } }, { content: formatCombinedTotal(grandTotals, true), colSpan: 2, styles: { fontStyle: 'bold', fillColor: '#5B8DAE', textColor: '#FFFFFF', fontSize: 12 } }]);
        
        autoTable(doc, {
            head: [['Ingredient Name', 'Total', 'Unit']],
            body: body,
            startY: 20,
            theme: 'grid',
            headStyles: { fontStyle: 'bold', fillColor: [200, 200, 200], textColor: 0 },
            styles: { fontSize: 10, cellPadding: 1.5 },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            margin: { left: pageMargin, right: pageMargin }
        });
    };

    const addOverallTable = () => {
        if (type === 'all') {
            doc.addPage();
        }
        doc.text("Overall Ingredient Totals", pageMargin, 15);
        const head = [['Ingredient', 'Total', 'Unit']];
        const body = overallTotals.map(item => [item.name, formatTotal(item.qty, item.qty_gram, item.uom, true), item.uom]);

        autoTable(doc, {
            head,
            body,
            startY: 20,
            theme: 'grid',
            headStyles: { fontStyle: 'bold', fillColor: [200, 200, 200], textColor: 0 },
            styles: { fontSize: 10, cellPadding: 1.5 },
            margin: { left: pageMargin, right: pageMargin },
        });
    }

    if (type === 'summary') {
        addSummaryTable();
    } else if (type === 'overall') {
        addOverallTable();
    } else if (type === 'all') {
        addSummaryTable();
        addOverallTable();
    }

    doc.save(`summary-report-${type}-${new Date().toISOString().split('T')[0]}.pdf`);
    setIsDownloading(false);
  };
  
  const formatTotal = (quantity: number, quantityGram: number, uom: string, pdfMode = false) => {
    if (!uom) return "0";
    const uomLower = uom.toLowerCase();
    
    if (pdfMode) {
      const value = isWeightUnit(uomLower) ? quantityGram : quantity;
      return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }

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

  const formatCombinedTotal = (totals: { [uom: string]: number }, pdfMode = false) => {
    return Object.entries(totals).map(([unit, total]) => {
      if (!total || total === 0) return null;

      let displayUnit = unit;
      let displayTotal = total;

      if (isWeightUnit(unit)) {
        if (total < 1000) {
            displayTotal = total;
            displayUnit = 'gram';
        } else {
            displayTotal = total / 1000;
            displayUnit = 'kilogram';
        }
      } else {
        displayUnit = total === 1 ? unit.replace(/s$/,'') : unit;
      }
      
      const totalString = displayTotal.toLocaleString(undefined, { maximumFractionDigits: 2 });

      return `${totalString} ${displayUnit}`;
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
                              <TableRow key={`${siteName}-${ing.name}-${ing.uom}`}>
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
                      overallTotals.map((item) => (
                        <TableRow key={`${item.name}-${item.uom}`}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="text-right">{formatTotal(item.qty, item.qty_gram, item.uom)}</TableCell>
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

