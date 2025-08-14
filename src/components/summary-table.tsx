
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
import { Download, Info } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Input } from "./ui/input";

interface SummaryRow {
  site_name: string;
  ingredient_name: string;
  totals: { [uom: string]: { qty: number; qty_gram: number } };
}

interface OverallTotalRow {
  ingredient_name: string;
  totals: { [uom: string]: { qty: number; qty_gram: number } };
}

const INSECT_WEIGHTS_G: { [key: string]: number } = {
  'ant eggs': 0.003,
  'caedicia major': 2.0,
  'cockroaches': 2.5,
  'crickets': 0.5,
  'house geckos': 5.0,
  'locusts': 2.0,
  'maggots': 0.03,
  'mealworms': 0.12,
  'superworms': 2.0,
  'silkworm': 1.0,
};

const isWeightUnit = (uom: string) => {
    if (!uom) return false;
    const lowerUom = uom.toLowerCase();
    return lowerUom === 'gram' || lowerUom === 'kg' || lowerUom === 'kilogram';
};

const isPieceUnit = (uom: string) => {
    if (!uom) return false;
    const lowerUom = uom.toLowerCase();
    return lowerUom.includes('piece') || lowerUom.includes('pc');
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

const formatSeparatedTotals = (totals: OverallTotalRow['totals']) => {
    let totalWeightGrams = 0;
    const pieceTotals: string[] = [];

    Object.entries(totals).forEach(([uom, values]) => {
        if (isWeightUnit(uom)) {
            totalWeightGrams += values.qty_gram;
        } else {
            pieceTotals.push(formatTotal(values.qty, values.qty_gram, uom));
        }
    });

    const weight = totalWeightGrams < 1000 
      ? `${totalWeightGrams.toLocaleString(undefined, { maximumFractionDigits: 2 })} g`
      : `${(totalWeightGrams / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} kg`;

    return {
        weight: totalWeightGrams > 0 ? weight : '-',
        pieces: pieceTotals.join(', ') || '-',
        rawWeightGrams: totalWeightGrams
    };
};
  
const getPcsToWeightInGrams = (ingredientName: string, totals: OverallTotalRow['totals']): number => {
    const lowerIngredientName = ingredientName.toLowerCase().trim();
    const avgWeight = INSECT_WEIGHTS_G[lowerIngredientName as keyof typeof INSECT_WEIGHTS_G];

    if (!avgWeight) return 0;
  
    let totalPieces = 0;
    Object.entries(totals).forEach(([uom, values]) => {
      if (isPieceUnit(uom)) {
        totalPieces += values.qty;
      }
    });
  
    return totalPieces * avgWeight;
};

const formatWeightFromGrams = (grams: number) => {
    if (grams === 0) return '-';
    if (grams < 1000) {
      return `${grams.toLocaleString(undefined, { maximumFractionDigits: 2 })} g`;
    }
    return `${(grams / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} kg`;
};

export function SummaryTable({ data }: {data: SheetDataRow[]}) {
  const [feedTypeFilter, setFeedTypeFilter] = useState<string>("");
  const [ingredientFilter, setIngredientFilter] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");


  const feedTypeOptions = useMemo(() => [...new Set(data.map(item => item['Feed type name']))].sort(), [data]);
  const ingredientOptions = useMemo(() => [...new Set(data.map(item => item.ingredient_name))].sort(), [data]);

  const filteredData = useMemo(() => {
    return data.filter(row => {
      const feedTypeMatch = feedTypeFilter ? row['Feed type name'] === feedTypeFilter : true;
      const ingredientMatch = ingredientFilter.length > 0 ? ingredientFilter.includes(row.ingredient_name) : true;
      
      const dateMatch = (() => {
        if (!startDate && !endDate) return true;
        // @ts-ignore
        if (!row.feeding_date) return true; // If row has no date, don't filter it out when dates are set

        // @ts-ignore
        const rowDate = new Date(row.feeding_date);
        if (isNaN(rowDate.getTime())) return true; // Invalid date in data, don't filter out

        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        if (start && end) return rowDate >= start && rowDate <= end;
        if (start) return rowDate >= start;
        if (end) return rowDate <= end;
        return true;
      })();
      
      return feedTypeMatch && ingredientMatch && dateMatch;
    });
  }, [data, feedTypeFilter, ingredientFilter, startDate, endDate]);

  const summaryData = useMemo(() => {
    if (filteredData.length === 0) return [];
  
    const summaryMap = new Map<string, { [uom: string]: { qty: number; qty_gram: number } }>();
  
    filteredData.forEach(row => {
      const key = `${row.site_name}|${row.ingredient_name}`;
      const current = summaryMap.get(key) || {};
      
      const uom = row.base_uom_name || 'N/A';
      if (!current[uom]) {
        current[uom] = { qty: 0, qty_gram: 0 };
      }
      
      current[uom].qty += row.ingredient_qty || 0;
      current[uom].qty_gram += row.ingredient_qty_gram || 0;
      
      summaryMap.set(key, current);
    });
  
    const summary: SummaryRow[] = Array.from(summaryMap.entries()).map(([key, totals]) => {
      const [site_name, ingredient_name] = key.split('|');
      return { 
        site_name, 
        ingredient_name, 
        totals
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
        ingredients: { name: string; totals: { [uom: string]: { qty: number; qty_gram: number } } }[], 
        siteTotals: { [uom: string]: number },
    }>();
    
    summaryData.forEach(row => {
      if (!groups.has(row.site_name)) {
        groups.set(row.site_name, { ingredients: [], siteTotals: {} });
      }
      const group = groups.get(row.site_name)!;
      group.ingredients.push({ name: row.ingredient_name, totals: row.totals });

      Object.entries(row.totals).forEach(([uom, values]) => {
        const uomKey = uom.toLowerCase();
        const value = isWeightUnit(uomKey) ? values.qty_gram : values.qty;
        group.siteTotals[uomKey] = (group.siteTotals[uomKey] || 0) + value;
      });
    });
    
    return groups;
  }, [summaryData]);

  const overallTotals = useMemo(() => {
    const totalsMap = new Map<string, { [uom: string]: { qty: number; qty_gram: number } }>();
    summaryData.forEach(row => {
        const key = row.ingredient_name;
        const current = totalsMap.get(key) || {};
        
        Object.entries(row.totals).forEach(([uom, values]) => {
            if (!current[uom]) {
                current[uom] = { qty: 0, qty_gram: 0 };
            }
            current[uom].qty += values.qty;
            current[uom].qty_gram += values.qty_gram;
        });

        totalsMap.set(key, current);
    });

    const unsortedTotals: OverallTotalRow[] = Array.from(totalsMap.entries()).map(([ingredient_name, totals]) => ({ ingredient_name, totals }));

    return unsortedTotals.sort((a, b) => {
      const { rawWeightGrams: rawA } = formatSeparatedTotals(a.totals);
      const pcsToWeightA = getPcsToWeightInGrams(a.ingredient_name, a.totals);
      const totalA = rawA + pcsToWeightA;

      const { rawWeightGrams: rawB } = formatSeparatedTotals(b.totals);
      const pcsToWeightB = getPcsToWeightInGrams(b.ingredient_name, b.totals);
      const totalB = rawB + pcsToWeightB;
      
      return totalB - totalA;
    });
  }, [summaryData]);
  
  const grandTotals = useMemo(() => {
    const totals: { [uom: string]: number } = {};
    summaryData.forEach(row => {
        Object.entries(row.totals).forEach(([uom, values]) => {
            const uomKey = uom.toLowerCase();
            const value = isWeightUnit(uomKey) ? values.qty_gram : values.qty;
            totals[uomKey] = (totals[uomKey] || 0) + value;
        });
    });
    return totals;
  }, [summaryData]);

  const formatCombinedTotal = (totals: { [uom: string]: number }) => {
    return Object.entries(totals).map(([unit, total]) => {
      if (!total || total === 0) return null;

      let displayUnit = unit;
      let displayTotal = total;

      if (isWeightUnit(unit)) {
        if (total < 1000 && (unit === 'gram' || unit === 'g')) {
            displayTotal = total;
            displayUnit = 'gram';
        } else {
            displayTotal = total / 1000;
            displayUnit = 'kg';
        }
      } else {
        displayUnit = total === 1 ? unit.replace(/s$/,'') : unit;
      }
      
      const totalString = displayTotal.toLocaleString(undefined, { maximumFractionDigits: 2 });

      return `${totalString} ${displayUnit}`;
    }).filter(Boolean).join(', ');
  };

  const formatTotalsForDisplay = (totals: SummaryRow['totals']) => {
    return Object.entries(totals).map(([uom, values]) => {
        return formatTotal(values.qty, values.qty_gram, uom);
    }).join(', ');
  };

  const handleDownload = async (type: 'summary' | 'overall' | 'all') => {
    setIsDownloading(true);
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
    });
    const pageMargin = 10;
    
    const addSummaryTable = () => {
        doc.text("Ingredient Summary by Site", pageMargin, 15);
        
        const body: (string|number)[][] = [];

        Array.from(groupedData.entries()).forEach(([siteName, { ingredients, siteTotals }]) => {
            body.push([{ content: siteName, colSpan: 2, styles: { fontStyle: 'bold', fillColor: [230, 230, 230], textColor: 20 } }]);

            ingredients.forEach(ing => {
                body.push([ing.name, formatTotalsForDisplay(ing.totals)]);
            });
            body.push([{ content: `${siteName} Total`, styles: {fontStyle: 'bold'}}, {content: formatCombinedTotal(siteTotals), styles: {fontStyle: 'bold'}}]);
        });
        
        body.push([{ content: 'Grand Total', colSpan: 1, styles: { fontStyle: 'bold', fillColor: '#5B8DAE', textColor: '#FFFFFF', fontSize: 11 } }, { content: formatCombinedTotal(grandTotals), styles: { fontStyle: 'bold', fillColor: '#5B8DAE', textColor: '#FFFFFF', fontSize: 11 } }]);
        
        autoTable(doc, {
            head: [['Ingredient Name', 'Total']],
            body: body,
            startY: 20,
            theme: 'grid',
            headStyles: { fontStyle: 'bold', fillColor: [200, 200, 200], textColor: 0, fontSize: 10 },
            styles: { fontSize: 9, cellPadding: 1.5 },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            margin: { left: pageMargin, right: pageMargin }
        });
    };

    const addOverallTable = () => {
        if (type === 'all' && doc.internal.getNumberOfPages() > 0) {
            doc.addPage();
        }
        doc.text("Overall Ingredient Totals", pageMargin, 15);
        const head = [['Ingredient', 'Total (Weight)', 'Total (Pieces)', 'Pcs into Weight', 'Total Weight Req.']];
        const body = overallTotals.map(item => {
            const { weight, pieces, rawWeightGrams } = formatSeparatedTotals(item.totals);
            const pcsToWeightGrams = getPcsToWeightInGrams(item.ingredient_name, item.totals);
            const totalWeightGrams = rawWeightGrams + pcsToWeightGrams;
            
            return [
              item.ingredient_name, 
              weight, 
              pieces, 
              formatWeightFromGrams(pcsToWeightGrams),
              formatWeightFromGrams(totalWeightGrams)
            ]
        });

        autoTable(doc, {
            head,
            body,
            startY: 20,
            theme: 'grid',
            headStyles: { fontStyle: 'bold', fillColor: [200, 200, 200], textColor: 0, fontSize: 10 },
            styles: { fontSize: 9, cellPadding: 1.5, halign: 'right' },
            columnStyles: { 0: { halign: 'left' } },
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

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
        <Input 
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full sm:w-auto bg-background"
            aria-label="Start Date"
        />
        <Input 
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full sm:w-auto bg-background"
            aria-label="End Date"
        />
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
      
      <Accordion type="single" collapsible className="w-full mb-6">
        <AccordionItem value="item-1">
          <AccordionTrigger>
            <div className="flex items-center gap-2 text-sm">
                <Info className="h-4 w-4" />
                <span>Reference for average weight per piece</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="p-4 bg-muted/50 rounded-lg">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-8 gap-y-2 text-sm text-muted-foreground">
                    {Object.entries(INSECT_WEIGHTS_G).map(([name, weight]) => (
                        <div key={name} className="flex justify-between border-b border-dashed">
                            <span className="capitalize">{name}</span>
                            <span>~{weight}g</span>
                        </div>
                    ))}
                </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>


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
                    {groupedData.size > 0 ? (
                      <>
                        {Array.from(groupedData.entries()).map(([siteName, { ingredients, siteTotals }]) => (
                          <React.Fragment key={siteName}>
                            {ingredients.map((ing, index) => (
                              <TableRow key={`${siteName}-${ing.name}`}>
                                <TableCell className="align-top font-medium">{index === 0 ? siteName : ''}</TableCell>
                                <TableCell className="align-top">{ing.name}</TableCell>
                                <TableCell className="text-right align-top">{formatTotalsForDisplay(ing.totals)}</TableCell>
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
                          <TableCell className="text-right">{formatCombinedTotal(grandTotals)}</TableCell>
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
                      <TableHead className="text-right">Total (Weight)</TableHead>
                      <TableHead className="text-right">Total (Pieces)</TableHead>
                      <TableHead className="text-right">Pcs into Weight</TableHead>
                      <TableHead className="text-right font-bold">Total Weight Req.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overallTotals.length > 0 ? (
                      overallTotals.map((item) => {
                        const { weight, pieces, rawWeightGrams } = formatSeparatedTotals(item.totals);
                        const pcsToWeightGrams = getPcsToWeightInGrams(item.ingredient_name, item.totals);
                        const totalWeightGrams = rawWeightGrams + pcsToWeightGrams;
                        return (
                            <TableRow key={`${item.ingredient_name}`}>
                            <TableCell className="font-medium">{item.ingredient_name}</TableCell>
                            <TableCell className="text-right">{weight}</TableCell>
                            <TableCell className="text-right">{pieces}</TableCell>
                            <TableCell className="text-right">{formatWeightFromGrams(pcsToWeightGrams)}</TableCell>
                            <TableCell className="text-right font-bold">{formatWeightFromGrams(totalWeightGrams)}</TableCell>
                            </TableRow>
                        )
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
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
