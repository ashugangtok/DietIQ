
"use client";

import * as React from "react";
import { useState, useMemo } from "react";
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

export function SummaryTable({ data }: SummaryTableProps) {
  const [feedTypeFilter, setFeedTypeFilter] = useState<string>("");

  const feedTypeOptions = useMemo(() => [...new Set(data.map(item => item['Feed type name']))].sort(), [data]);

  const filteredData = useMemo(() => {
    return data.filter(row => {
      return feedTypeFilter ? row['Feed type name'] === feedTypeFilter : true;
    });
  }, [data, feedTypeFilter]);

  const summaryData = useMemo(() => {
    if (filteredData.length === 0) return [];

    const summaryMap = new Map<string, { qty: number; qty_gram: number; uom: string }>();

    filteredData.forEach(row => {
      const key = `${row.site_name}|${row.ingredient_name}`;
      const current = summaryMap.get(key) || { qty: 0, qty_gram: 0, uom: row.base_uom_name };
      
      current.qty += row.ingredient_qty;
      current.qty_gram += row.ingredient_qty_gram;
      
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
    const groups = new Map<string, { ingredients: { name: string; total_qty: number; total_qty_gram: number; uom: string; }[], siteTotalGram: number }>();
    let grandTotalGram = 0;

    summaryData.forEach(row => {
      if (!groups.has(row.site_name)) {
        groups.set(row.site_name, { ingredients: [], siteTotalGram: 0 });
      }
      const group = groups.get(row.site_name)!;
      group.ingredients.push({ name: row.ingredient_name, total_qty: row.total_qty, total_qty_gram: row.total_qty_gram, uom: row.uom });
      group.siteTotalGram += row.total_qty_gram;
      grandTotalGram += row.total_qty_gram;
    });

    return { groups, grandTotalGram };
  }, [summaryData]);
  
  const formatTotal = (quantity: number, quantityGram: number, uom: string) => {
    const uomLower = uom.toLowerCase();
    if (uomLower === 'kilogram' || uomLower === 'kg') {
        if (quantity < 1 && quantity > 0) { // If it's less than 1 kg but not 0
            return `${quantityGram.toLocaleString(undefined, { maximumFractionDigits: 2 })} gram`;
        }
        return `${quantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${uom}`;
    }
     if (quantity === 1) {
      return `${quantity.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${uom}`;
    }
    return `${quantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${uom}`;
  };

  const formatGramTotal = (totalGrams: number) => {
    if (totalGrams < 1000) {
      return `${totalGrams.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} gram`;
    }
    const kg = totalGrams / 1000;
    return `${kg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kilogram`;
  }


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl">Ingredient Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
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
        </div>

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
                  {Array.from(groupedData.groups.entries()).map(([siteName, { ingredients, siteTotalGram }]) => (
                    <React.Fragment key={siteName}>
                      {ingredients.map((ing, index) => (
                        <TableRow key={`${siteName}-${ing.name}`}>
                          <TableCell>{index === 0 ? siteName : ''}</TableCell>
                          <TableCell>{ing.name}</TableCell>
                          <TableCell className="text-right">{formatTotal(ing.total_qty, ing.total_qty_gram, ing.uom)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/30 font-bold">
                        <TableCell colSpan={2}>{siteName} Total</TableCell>
                        <TableCell className="text-right">{formatGramTotal(siteTotalGram)}</TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}
                  <TableRow className="bg-primary/80 text-primary-foreground font-bold text-base">
                    <TableCell colSpan={2}>Grand Total</TableCell>
                    <TableCell className="text-right">{formatGramTotal(groupedData.grandTotalGram)}</TableCell>
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
  );
}
