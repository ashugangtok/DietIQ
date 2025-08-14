
"use client";

import { useMemo, useState } from "react";
import { type SheetDataRow } from "@/types";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "./ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "./ui/button";
import { Download } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


interface MealGroupBreakupRow {
  ingredientName: string;
  groupName: string;
  speciesCount: number;
  animalCount: number;
  enclosureCount: number;
  siteCount: number;
  totals: { [uom: string]: { qty: number; qty_gram: number } };
  rowSpan?: number;
}

export function MealGroupBreakupTable({ data }: { data: SheetDataRow[] }) {
  const [feedTypeFilter, setFeedTypeFilter] = useState<string>("");
  const [isDownloading, setIsDownloading] = useState(false);

  const feedTypeOptions = useMemo(
    () => [...new Set(data.map((item) => item["Feed type name"]))].sort(),
    [data]
  );

  const filteredData = useMemo(() => {
    if (!feedTypeFilter) return data;
    return data.filter(
      (row) => row["Feed type name"] === feedTypeFilter
    );
  }, [data, feedTypeFilter]);

  const formatTotals = (totals: {
    [uom: string]: { qty: number; qty_gram: number };
  }) => {
    if (Object.keys(totals).length === 0) return "-";

    return Object.entries(totals)
      .map(([uom, values]) => {
        const uomLower = uom.toLowerCase();
        const isWeight =
          uomLower === "kilogram" || uomLower === "kg" || uomLower === "gram";

        if (isWeight) {
          if (
            (uomLower === "kilogram" || uomLower === "kg") &&
            values.qty < 1 &&
            values.qty > 0
          ) {
            return `${values.qty_gram.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })} gram`;
          }
          return `${values.qty.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} ${uom}`;
        }

        const uomDisplay =
          values.qty === 1 && uom.endsWith("s") ? uom.slice(0, -1) : uom;
        const qtyDisplay = Number.isInteger(values.qty)
          ? values.qty.toLocaleString()
          : values.qty.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });

        return `${qtyDisplay} ${uomDisplay}`;
      })
      .join(", ");
  };

  const breakupData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];

    const groupMap = new Map<
      string,
      {
        species: Set<string>;
        animals: Set<string>;
        enclosures: Set<string>;
        sites: Set<string>;
        totals: { [uom: string]: { qty: number; qty_gram: number } };
      }
    >();

    filteredData.forEach((row) => {
      const {
        group_name,
        ingredient_name,
        common_name,
        animal_id,
        user_enclosure_name,
        site_name,
        ingredient_qty,
        ingredient_qty_gram,
        base_uom_name,
      } = row;
      
      if (!group_name) return;

      const key = `${ingredient_name}|${group_name}`;

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          species: new Set(),
          animals: new Set(),
          enclosures: new Set(),
          sites: new Set(),
          totals: {},
        });
      }

      const groupEntry = groupMap.get(key)!;
      groupEntry.species.add(common_name);
      groupEntry.animals.add(animal_id);
      groupEntry.enclosures.add(user_enclosure_name);
      groupEntry.sites.add(site_name);

      const uom = base_uom_name || "N/A";
      if (!groupEntry.totals[uom]) {
        groupEntry.totals[uom] = { qty: 0, qty_gram: 0 };
      }
      groupEntry.totals[uom].qty += ingredient_qty || 0;
      groupEntry.totals[uom].qty_gram += ingredient_qty_gram || 0;
    });

    const initialResult: Omit<MealGroupBreakupRow, 'rowSpan'>[] = Array.from(groupMap.entries()).map(
      ([key, counts]) => {
        const [ingredientName, groupName] = key.split('|');
        return {
          ingredientName,
          groupName,
          speciesCount: counts.species.size,
          animalCount: counts.animals.size,
          enclosureCount: counts.enclosures.size,
          siteCount: counts.sites.size,
          totals: counts.totals,
        }
      }
    );

    const sortedResult = initialResult.sort((a, b) => a.ingredientName.localeCompare(b.ingredientName) || (a.groupName || "").localeCompare(b.groupName || ""));
    
    // Calculate row spans
    const finalResult: MealGroupBreakupRow[] = [];
    const ingredientNameCache: { [key: string]: number } = {};

    sortedResult.forEach(row => {
      ingredientNameCache[row.ingredientName] = (ingredientNameCache[row.ingredientName] || 0) + 1;
    });

    const processedIngredientNames = new Set<string>();

    for (const row of sortedResult) {
        const ingredientNameSpan = !processedIngredientNames.has(row.ingredientName) ? ingredientNameCache[row.ingredientName] : 0;
        if(ingredientNameSpan > 0) processedIngredientNames.add(row.ingredientName);

        finalResult.push({ ...row, rowSpan: ingredientNameSpan });
    }

    return finalResult;
    
  }, [filteredData]);

  const handleDownload = (type: 'pdf' | 'excel') => {
    setIsDownloading(true);

    if (type === 'pdf') {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });
      const pageMargin = 10;
      doc.text("Meal Group Breakup Details", pageMargin, 15);

      const head = [[
        'Ingredient', 'Group Name', 'Total Qty Required', 
        'Species', 'Animals', 'Enclosures', 'Sites'
      ]];
      const body = breakupData.map(row => [
        row.ingredientName,
        row.groupName,
        formatTotals(row.totals),
        row.speciesCount,
        row.animalCount,
        row.enclosureCount,
        row.siteCount
      ]);

      autoTable(doc, {
        head,
        body,
        startY: 20,
        theme: 'grid',
        headStyles: { fontStyle: 'bold', fillColor: [200, 200, 200], textColor: 0, fontSize: 10 },
        styles: { fontSize: 9, cellPadding: 1.5 },
        margin: { left: pageMargin, right: pageMargin }
      });

      doc.save(`meal-group-breakup-${new Date().toISOString().split('T')[0]}.pdf`);
    } else if (type === 'excel') {
      const dataToExport = breakupData.map(row => ({
        'Ingredient': row.ingredientName,
        'Group Name': row.groupName,
        'Total Qty Required': formatTotals(row.totals),
        'Count of Species': row.speciesCount,
        'Count of Animals': row.animalCount,
        'Count of Enclosures': row.enclosureCount,
        'Count of Sites': row.siteCount,
      }));
      
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const csvOutput = XLSX.utils.sheet_to_csv(worksheet);

      const blob = new Blob([`\uFEFF${csvOutput}`], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `meal-group-breakup-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    
    setIsDownloading(false);
  };


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl">
          Meal Group Breakup Details
        </CardTitle>
        <CardDescription>
          A detailed breakdown of ingredients within each meal group. Filter by feed type or export the data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
          <Select
            value={feedTypeFilter}
            onValueChange={(value) =>
              setFeedTypeFilter(value === "all" ? "" : value)
            }
          >
            <SelectTrigger className="w-full sm:w-[240px] bg-background">
              <SelectValue placeholder="Filter by Feed Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Feed Types</SelectItem>
              {feedTypeOptions.map((option, index) => (
                <SelectItem key={`${option}-${index}`} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex-grow" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={isDownloading || breakupData.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                {isDownloading ? "Downloading..." : "Download"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Export Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => handleDownload('pdf')}>
                Download as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleDownload('excel')}>
                Download as Excel (CSV)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="relative overflow-x-auto rounded-md border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Ingredient</TableHead>
                <TableHead>Group Name</TableHead>
                <TableHead className="text-right">Total Qty Required</TableHead>
                <TableHead className="text-center">Count of Species</TableHead>
                <TableHead className="text-center">Count of Animals</TableHead>
                <TableHead className="text-center">
                  Count of Enclosures
                </TableHead>
                <TableHead className="text-center">Count of Sites</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {breakupData.length > 0 ? (
                breakupData.map((row, index) => (
                  <TableRow key={`${row.ingredientName}-${row.groupName}-${index}`}>
                    {row.rowSpan && row.rowSpan > 0 ? (
                       <TableCell className="font-medium align-top" rowSpan={row.rowSpan}>
                          {row.ingredientName}
                        </TableCell>
                    ) : null}
                    <TableCell>{row.groupName}</TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      {formatTotals(row.totals)}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.speciesCount}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.animalCount}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.enclosureCount}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.siteCount}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No data available for the selected filter.
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
