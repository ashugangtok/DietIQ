"use client";

import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { Download, FilterX } from "lucide-react";
import { type SheetDataRow } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";

interface DataTableProps {
  data: SheetDataRow[];
}

interface ProcessedRow {
  row: SheetDataRow;
  siteNameRowSpan: number;
  enclosureRowSpan: number;
  commonNameRowSpan: number;
}

export function DataTable({ data }: DataTableProps) {
  const [filters, setFilters] = useState({
    site_name: "",
    common_name: "",
    'Feed type name': "",
  });

  const siteNameOptions = useMemo(() => [...new Set(data.map(item => item.site_name))].sort(), [data]);
  const commonNameOptions = useMemo(() => [...new Set(data.map(item => item.common_name))].sort(), [data]);
  const feedTypeOptions = useMemo(() => [...new Set(data.map(item => item['Feed type name']))].sort(), [data]);

  const animalCountsByCommonName = useMemo(() => {
    const counts: Record<string, number> = {};
    const animalSets: Record<string, Set<string>> = {};

    data.forEach(row => {
      if (!animalSets[row.common_name]) {
        animalSets[row.common_name] = new Set();
      }
      animalSets[row.common_name].add(row.animal_id);
    });

    for (const commonName in animalSets) {
      counts[commonName] = animalSets[commonName].size;
    }
    return counts;
  }, [data]);

  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };
  
  const clearFilters = () => {
    setFilters({
      site_name: "",
      common_name: "",
      'Feed type name': "",
    });
  };

  const filteredData = useMemo(() => {
    return data.filter(row => {
      const siteNameMatch = filters.site_name ? row.site_name === filters.site_name : true;
      const commonNameMatch = filters.common_name ? row.common_name.toLowerCase().includes(filters.common_name.toLowerCase()) : true;
      const feedTypeMatch = filters['Feed type name'] ? row['Feed type name'] === filters['Feed type name'] : true;
      return siteNameMatch && commonNameMatch && feedTypeMatch;
    });
  }, [data, filters]);
  
  const processedData = useMemo((): ProcessedRow[] => {
    const result: ProcessedRow[] = [];
    if (filteredData.length === 0) return result;

    for (let i = 0; i < filteredData.length; i++) {
        const currentRow = filteredData[i];

        if (i > 0 && 
            currentRow.site_name === filteredData[i - 1].site_name &&
            currentRow.user_enclosure_name === filteredData[i - 1].user_enclosure_name &&
            currentRow.common_name === filteredData[i - 1].common_name
        ) {
            result.push({ row: currentRow, siteNameRowSpan: 0, enclosureRowSpan: 0, commonNameRowSpan: 0 });
            continue;
        }

        let rowSpan = 1;
        for (let j = i + 1; j < filteredData.length; j++) {
            if (
                filteredData[j].site_name === currentRow.site_name &&
                filteredData[j].user_enclosure_name === currentRow.user_enclosure_name &&
                filteredData[j].common_name === currentRow.common_name
            ) {
                rowSpan++;
            } else {
                break;
            }
        }
        result.push({ row: currentRow, siteNameRowSpan: rowSpan, enclosureRowSpan: rowSpan, commonNameRowSpan: rowSpan });
    }

    return result;
  }, [filteredData]);

  const handleDownload = () => {
    if (filteredData.length === 0) return;
    const dataToDownload = filteredData.map(row => ({
      ...row,
      common_name: `${row.common_name} (${animalCountsByCommonName[row.common_name] || 0})`
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToDownload);
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
    
    const blob = new Blob([`\uFEFF${csvOutput}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "sheet_insights_data.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="shadow-lg">
        <CardHeader>
            <CardTitle className="font-headline text-xl">Extracted Data</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
                <Select value={filters.site_name} onValueChange={(value) => handleFilterChange('site_name', value === 'all' ? '' : value)}>
                    <SelectTrigger className="w-full sm:w-[200px] bg-background">
                        <SelectValue placeholder="Filter by Site Name" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Sites</SelectItem>
                        {siteNameOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                    </SelectContent>
                </Select>

                <Input 
                  placeholder="Filter by Common Name..."
                  value={filters.common_name}
                  onChange={(e) => handleFilterChange('common_name', e.target.value)}
                  className="w-full sm:w-[200px] bg-background"
                />

                <Select value={filters['Feed type name']} onValueChange={(value) => handleFilterChange('Feed type name', value === 'all' ? '' : value)}>
                    <SelectTrigger className="w-full sm:w-[200px] bg-background">
                        <SelectValue placeholder="Filter by Feed Type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Feed Types</SelectItem>
                        {feedTypeOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                    </SelectContent>
                </Select>
                
                <Button variant="ghost" onClick={clearFilters} className="text-muted-foreground">
                    <FilterX className="mr-2 h-4 w-4" />
                    Clear Filters
                </Button>
                
                <div className="flex-grow"></div>
                
                <Button onClick={handleDownload} disabled={filteredData.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Download CSV
                </Button>
            </div>

            <div className="relative overflow-x-auto rounded-md border">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead>Site Name</TableHead>
                            <TableHead>Enclosure</TableHead>
                            <TableHead>Common Name</TableHead>
                            <TableHead>Feed Type Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Type Name</TableHead>
                            <TableHead>Ingredient</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead>UOM</TableHead>
                            <TableHead className="text-right">Quantity (grams)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {processedData.length > 0 ? (
                        processedData.map(({ row, siteNameRowSpan, enclosureRowSpan, commonNameRowSpan }, index) => (
                            <TableRow key={index} className="transition-colors duration-300">
                                {siteNameRowSpan > 0 && <TableCell className="font-medium align-top" rowSpan={siteNameRowSpan}>{row.site_name}</TableCell>}
                                {enclosureRowSpan > 0 && <TableCell className="align-top" rowSpan={enclosureRowSpan}>{row.user_enclosure_name}</TableCell>}
                                {commonNameRowSpan > 0 && <TableCell className="align-top" rowSpan={commonNameRowSpan}>{row.common_name} ({animalCountsByCommonName[row.common_name] || 0})</TableCell>}
                                <TableCell>{row['Feed type name']}</TableCell>
                                <TableCell>{row.type}</TableCell>
                                <TableCell>{row.type_name}</TableCell>
                                <TableCell>{row.ingredient_name}</TableCell>
                                <TableCell className="text-right">{row.ingredient_qty.toLocaleString()}</TableCell>
                                <TableCell>{row.base_uom_name}</TableCell>
                                <TableCell className="text-right">{row.ingredient_qty_gram.toLocaleString()}</TableCell>
                            </TableRow>
                        ))
                        ) : (
                        <TableRow>
                            <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                            No results found. Try adjusting your filters.
                            </TableCell>
                        </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <p className="text-sm text-muted-foreground mt-4">Showing {filteredData.length.toLocaleString()} of {data.length.toLocaleString()} rows.</p>
        </CardContent>
    </Card>
  );
}
