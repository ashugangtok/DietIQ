"use client";

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

    const summaryMap = new Map<string, number>();

    filteredData.forEach(row => {
      const key = `${row.site_name}|${row.ingredient_name}`;
      const currentQty = summaryMap.get(key) || 0;
      summaryMap.set(key, currentQty + row.ingredient_qty_gram);
    });

    const summary: SummaryRow[] = Array.from(summaryMap.entries()).map(([key, total_qty_gram]) => {
      const [site_name, ingredient_name] = key.split('|');
      return { site_name, ingredient_name, total_qty_gram };
    });

    return summary.sort((a, b) => {
      const siteCompare = a.site_name.localeCompare(b.site_name);
      if (siteCompare !== 0) return siteCompare;
      return a.ingredient_name.localeCompare(b.ingredient_name);
    });
  }, [filteredData]);

  const groupedData = useMemo(() => {
    const groups = new Map<string, { ingredients: { name: string; total: number }[], siteTotal: number }>();
    let grandTotal = 0;

    summaryData.forEach(row => {
      if (!groups.has(row.site_name)) {
        groups.set(row.site_name, { ingredients: [], siteTotal: 0 });
      }
      const group = groups.get(row.site_name)!;
      group.ingredients.push({ name: row.ingredient_name, total: row.total_qty_gram });
      group.siteTotal += row.total_qty_gram;
      grandTotal += row.total_qty_gram;
    });

    return { groups, grandTotal };
  }, [summaryData]);

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
                <TableHead className="text-right">Total (grams)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedData.groups.size > 0 ? (
                <>
                  {Array.from(groupedData.groups.entries()).map(([siteName, { ingredients, siteTotal }]) => (
                    <React.Fragment key={siteName}>
                      {ingredients.map((ing, index) => (
                        <TableRow key={`${siteName}-${ing.name}`}>
                          <TableCell>{index === 0 ? siteName : ''}</TableCell>
                          <TableCell>{ing.name}</TableCell>
                          <TableCell className="text-right">{ing.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/30 font-bold">
                        <TableCell colSpan={2}>{siteName} Total</TableCell>
                        <TableCell className="text-right">{siteTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}
                  <TableRow className="bg-primary/80 text-primary-foreground font-bold text-base">
                    <TableCell colSpan={2}>Grand Total</TableCell>
                    <TableCell className="text-right">{groupedData.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
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
