
"use client";

import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { Download, FilterX, Blend } from "lucide-react";
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

type AggregatedRow = {
    isGroupHeader: true;
    groupData: {
        site_name: string;
        user_enclosure_name: string;
        common_name: string;
        animalCount: number;
        feed_type_name: string;
        type: string;
        type_name: string;
        ingredients: string;
        total_qty: number;
    };
    rowSpans: {
        siteName: number;
        enclosure: number;
        commonName: number;
    };
} | {
    isGroupHeader: false;
    groupData: SheetDataRow;
    rowSpans: {
        siteName: number;
        enclosure: number;
        commonName: number;
    };
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
    const sorted = data.sort((a, b) => {
        const sortOrder = [
            a.site_name.localeCompare(b.site_name),
            a.user_enclosure_name.localeCompare(b.user_enclosure_name),
            a.common_name.localeCompare(b.common_name),
            a['Feed type name'].localeCompare(b['Feed type name']),
        ];
        return sortOrder.find(val => val !== 0) || 0;
    });

    return sorted.filter(row => {
      const siteNameMatch = filters.site_name ? row.site_name === filters.site_name : true;
      const commonNameMatch = filters.common_name ? row.common_name.toLowerCase().includes(filters.common_name.toLowerCase()) : true;
      const feedTypeMatch = filters['Feed type name'] ? row['Feed type name'] === filters['Feed type name'] : true;
      return siteNameMatch && commonNameMatch && feedTypeMatch;
    });
  }, [data, filters]);
  
  const processedData = useMemo(() => {
    if (filteredData.length === 0) return [];
  
    const aggregatedResult: AggregatedRow[] = [];
    let i = 0;
    while (i < filteredData.length) {
      const currentRow = filteredData[i];
      if (currentRow.type?.toLowerCase() === 'recipe' || currentRow.type?.toLowerCase() === 'combo') {
        const groupKey = `${currentRow.site_name}|${currentRow.user_enclosure_name}|${currentRow.common_name}|${currentRow['Feed type name']}|${currentRow.type_name}`;
  
        const groupIngredients = filteredData.filter(
          (row) =>
            `${row.site_name}|${row.user_enclosure_name}|${row.common_name}|${row['Feed type name']}|${row.type_name}` === groupKey &&
            (row.type?.toLowerCase() === 'recipe' || row.type?.toLowerCase() === 'combo')
        );

        const ingredientSums: { [key: string]: number } = {};
        groupIngredients.forEach(ing => {
            ingredientSums[ing.ingredient_name] = (ingredientSums[ing.ingredient_name] || 0) + ing.ingredient_qty;
        });

        const ingredientsStr = Object.entries(ingredientSums)
            .map(([name, qty]) => `${name} (${qty.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`)
            .join(', ');

        const totalQty = groupIngredients.reduce((sum, ing) => sum + ing.ingredient_qty, 0);
  
        const animalSet = new Set(filteredData.filter(d => d.common_name === currentRow.common_name).map(d => d.animal_id));

        aggregatedResult.push({
          isGroupHeader: true,
          groupData: {
            site_name: currentRow.site_name,
            user_enclosure_name: currentRow.user_enclosure_name,
            common_name: currentRow.common_name,
            animalCount: animalSet.size,
            feed_type_name: currentRow['Feed type name'],
            type: currentRow.type,
            type_name: currentRow.type_name,
            ingredients: ingredientsStr,
            total_qty: totalQty,
          },
          rowSpans: { siteName: 0, enclosure: 0, commonName: 0 },
        });
        i += groupIngredients.length;
      } else {
        aggregatedResult.push({
            isGroupHeader: false,
            groupData: currentRow,
            rowSpans: { siteName: 0, enclosure: 0, commonName: 0 }
        });
        i++;
      }
    }
  
    // Calculate rowSpans
    for (let i = 0; i < aggregatedResult.length; i++) {
        const getRowSpan = (key: keyof AggregatedRow['groupData']) => {
            let span = 0;
            const currentGroupValue = aggregatedResult[i].groupData[key as keyof typeof aggregatedResult[i]['groupData']];
            for (let j = i; j < aggregatedResult.length; j++) {
                if (aggregatedResult[j].groupData[key as keyof typeof aggregatedResult[j]['groupData']] === currentGroupValue) {
                    span++;
                } else {
                    break;
                }
            }
            return span;
        };
        const isFirstSite = i === 0 || aggregatedResult[i].groupData.site_name !== aggregatedResult[i-1].groupData.site_name;
        const isFirstEnclosure = i === 0 || aggregatedResult[i].groupData.user_enclosure_name !== aggregatedResult[i-1].groupData.user_enclosure_name || isFirstSite;
        const isFirstCommonName = i === 0 || aggregatedResult[i].groupData.common_name !== aggregatedResult[i-1].groupData.common_name || isFirstEnclosure;

        aggregatedResult[i].rowSpans = {
            siteName: isFirstSite ? getRowSpan('site_name') : 0,
            enclosure: isFirstEnclosure ? getRowSpan('user_enclosure_name') : 0,
            commonName: isFirstCommonName ? getRowSpan('common_name') : 0,
        };
    }
    
    return aggregatedResult;
  
  }, [filteredData]);

  const handleDownload = () => {
    if (filteredData.length === 0) return;
    
    const animalCountsByCommonName: Record<string, Set<string>> = {};

    data.forEach(row => {
      const name = row.common_name;
      const id = row.animal_id;
    
      if (!animalCountsByCommonName[name]) {
        animalCountsByCommonName[name] = new Set();
      }
    
      animalCountsByCommonName[name].add(id);
    });

    const dataToDownload = filteredData.map(row => ({
      ...row,
      common_name: `${row.common_name} (${animalCountsByCommonName[row.common_name]?.size || 0})`
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
                            <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {processedData.length > 0 ? (
                            processedData.map(({ isGroupHeader, groupData, rowSpans }, index) => {
                                if (isGroupHeader) {
                                    const { siteName, enclosure, commonName } = rowSpans;
                                    return (
                                        <TableRow key={index}>
                                            {siteName > 0 && <TableCell rowSpan={siteName} className="align-top font-medium">{groupData.site_name}</TableCell>}
                                            {enclosure > 0 && <TableCell rowSpan={enclosure} className="align-top">{groupData.user_enclosure_name}</TableCell>}
                                            {commonName > 0 && <TableCell rowSpan={commonName} className="align-top">{groupData.common_name} ({groupData.animalCount})</TableCell>}
                                            <TableCell>{groupData.feed_type_name}</TableCell>
                                            <TableCell>{groupData.type}</TableCell>
                                            <TableCell>{groupData.type_name}</TableCell>
                                            <TableCell>{groupData.ingredients}</TableCell>
                                            <TableCell className="text-right">{groupData.total_qty.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                        </TableRow>
                                    );
                                }
                                // Fallback for non-grouped rows (if any)
                                const { siteName, enclosure, commonName } = rowSpans;
                                const rowData = groupData as SheetDataRow;
                                return (
                                    <TableRow key={index}>
                                        {siteName > 0 && <TableCell rowSpan={siteName} className="align-top font-medium">{rowData.site_name}</TableCell>}
                                        {enclosure > 0 && <TableCell rowSpan={enclosure} className="align-top">{rowData.user_enclosure_name}</TableCell>}
                                        {commonName > 0 && <TableCell rowSpan={commonName} className="align-top">{rowData.common_name}</TableCell>}
                                        <TableCell>{rowData['Feed type name']}</TableCell>
                                        <TableCell>{rowData.type}</TableCell>
                                        <TableCell>{rowData.type_name}</TableCell>
                                        <TableCell>{rowData.ingredient_name}</TableCell>
                                        <TableCell className="text-right">{rowData.ingredient_qty.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                    </TableRow>
                                );
                            })
                        ) : (
                        <TableRow>
                            <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
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
