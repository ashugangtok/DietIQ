
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
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Download, FilterX } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ROW_FIELDS: (keyof SheetDataRow)[] = [
  "common_name",
  "Feed type name",
  "meal_start_time",
  "type",
  "type_name",
  "ingredient_name",
  "preparation_type_name",
  "cut_size_name",
];

interface PivotRow {
  keys: (string | number)[];
  values: { [uom: string]: number };
  rowSpans: number[];
}

export function PivotTableReport({ data }: { data: SheetDataRow[] }) {
  const [siteFilter, setSiteFilter] = useState("");
  const [commonNameFilter, setCommonNameFilter] = useState("");

  const siteOptions = useMemo(() => [...new Set(data.map(item => item.site_name))].sort(), [data]);
  const commonNameOptions = useMemo(() => [...new Set(data.map(item => item.common_name))].sort(), [data]);

  const filteredData = useMemo(() => {
    return data.filter(row => {
      const siteMatch = siteFilter ? row.site_name === siteFilter : true;
      const commonNameMatch = commonNameFilter ? row.common_name.toLowerCase().includes(commonNameFilter.toLowerCase()) : true;
      return siteMatch && commonNameMatch;
    });
  }, [data, siteFilter, commonNameFilter]);

  const { pivotData, dynamicColumns } = useMemo(() => {
    if (filteredData.length === 0) {
      return { pivotData: [], dynamicColumns: [] };
    }

    const dynamicColumns = [...new Set(filteredData.map(row => row.base_uom_name || "N/A"))].sort();

    const aggregationMap = new Map<string, { [uom: string]: number }>();

    filteredData.forEach(row => {
      const keyParts = ROW_FIELDS.map(field => row[field] || "N/A");
      const key = keyParts.join(" | ");
      
      if (!aggregationMap.has(key)) {
        aggregationMap.set(key, {});
      }

      const entry = aggregationMap.get(key)!;
      const uom = row.base_uom_name || "N/A";
      entry[uom] = (entry[uom] || 0) + (row.ingredient_qty || 0);
    });

    const sortedData = Array.from(aggregationMap.entries()).sort(([keyA], [keyB]) => keyA.localeCompare(keyB));

    const rowSpansCache: { [key: string]: number }[] = ROW_FIELDS.map(() => ({}));

    sortedData.forEach(([key]) => {
      const keyParts = key.split(" | ");
      for (let i = 0; i < ROW_FIELDS.length; i++) {
        const partialKey = keyParts.slice(0, i + 1).join(" | ");
        rowSpansCache[i][partialKey] = (rowSpansCache[i][partialKey] || 0) + 1;
      }
    });

    const processedKeysCache: string[] = ROW_FIELDS.map(() => "");
    
    const pivotData: PivotRow[] = sortedData.map(([key, values]) => {
      const keys = key.split(" | ");
      const rowSpans = keys.map((_, i) => {
        const partialKey = keys.slice(0, i + 1).join(" | ");
        if (processedKeysCache[i] !== partialKey) {
          processedKeysCache[i] = partialKey;
          return rowSpansCache[i][partialKey];
        }
        return 0;
      });
      return { keys, values, rowSpans };
    });

    return { pivotData, dynamicColumns };
  }, [filteredData]);
  
  const handleDownload = (type: 'pdf' | 'excel') => {
    if (pivotData.length === 0) return;

    const head = [
      ...ROW_FIELDS.map(f => f.replace(/_/g, ' ').replace(/(?:^|\s)\S/g, a => a.toUpperCase())),
      ...dynamicColumns
    ];

    const body = pivotData.map(row => {
      const rowData = [...row.keys];
      dynamicColumns.forEach(uom => {
        rowData.push(row.values[uom]?.toFixed(2) || "0.00");
      });
      return rowData;
    });

    if (type === 'pdf') {
      const doc = new jsPDF({ orientation: "landscape" });
      doc.text("Pivot Table Report", 14, 16);
      autoTable(doc, {
        head: [head],
        body: body,
        startY: 20,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 1 },
        headStyles: { fontStyle: 'bold', fillColor: [230, 230, 230], textColor: 0 },
      });
      doc.save(`pivot-report-${new Date().toISOString().split('T')[0]}.pdf`);
    } else {
      const worksheet = XLSX.utils.json_to_sheet(
        body.map(row => {
          const rowObj: { [key: string]: string } = {};
          head.forEach((h, i) => {
            rowObj[h] = row[i] as string;
          });
          return rowObj;
        })
      );
      const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
      const blob = new Blob([`\uFEFF${csvOutput}`], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `pivot-report-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };


  const clearFilters = () => {
    setSiteFilter("");
    setCommonNameFilter("");
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl">Pivot Table Report</CardTitle>
        <CardDescription>
          A dynamic pivot table to analyze ingredient quantities across different dimensions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
           <Select value={siteFilter} onValueChange={(value) => setSiteFilter(value === 'all' ? '' : value)}>
              <SelectTrigger className="w-full sm:w-[200px] bg-background">
                  <SelectValue placeholder="Filter by Site Name" />
              </SelectTrigger>
              <SelectContent>
                  <SelectItem value="all">All Sites</SelectItem>
                  {siteOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}
              </SelectContent>
          </Select>
          <Input 
            placeholder="Filter by Common Name..."
            value={commonNameFilter}
            onChange={(e) => setCommonNameFilter(e.target.value)}
            className="w-full sm:w-[200px] bg-background"
          />
          <Button variant="ghost" onClick={clearFilters} className="text-muted-foreground">
              <FilterX className="mr-2 h-4 w-4" />
              Clear Filters
          </Button>
          <div className="flex-grow"></div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={pivotData.length === 0}>
                <Download className="mr-2 h-4 w-4" /> Download
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Export Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => handleDownload('pdf')}>Download as PDF</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleDownload('excel')}>Download as CSV</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="relative overflow-x-auto rounded-md border" style={{maxHeight: '70vh'}}>
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10">
              <TableRow>
                {ROW_FIELDS.map(field => (
                  <TableHead key={field} className="whitespace-nowrap">
                    {field.replace(/_/g, ' ').replace(/(?:^|\s)\S/g, a => a.toUpperCase())}
                  </TableHead>
                ))}
                {dynamicColumns.map(uom => (
                  <TableHead key={uom} className="text-right whitespace-nowrap">{uom}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pivotData.length > 0 ? (
                pivotData.map((row, index) => (
                  <TableRow key={index}>
                    {row.keys.map((key, i) =>
                      row.rowSpans[i] > 0 ? (
                        <TableCell key={i} rowSpan={row.rowSpans[i]} className="align-top font-medium">
                          {key}
                        </TableCell>
                      ) : null
                    )}
                    {dynamicColumns.map(uom => (
                      <TableCell key={uom} className="text-right">
                        {row.values[uom]?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "-"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={ROW_FIELDS.length + dynamicColumns.length} className="h-24 text-center">
                    No results for the selected filters.
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
