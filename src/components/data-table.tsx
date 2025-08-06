
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

// A generic display row for the table
type DisplayRow = {
  rowType: 'data' | 'total';
  data: Partial<SheetDataRow> & { total_qty?: number };
  rowSpans: {
    siteName: number;
    enclosure: number;
    commonName: number;
    feedType: number;
  };
  isFirstOf: {
    siteName: boolean;
    enclosure: boolean;
    commonName: boolean;
    feedType: boolean;
  };
  isRecipeIngredient: boolean;
  commonNameAnimalCount: number;
};


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
    return data.filter(row => {
      const siteNameMatch = filters.site_name ? row.site_name === filters.site_name : true;
      const commonNameMatch = filters.common_name ? row.common_name.toLowerCase().includes(filters.common_name.toLowerCase()) : true;
      const feedTypeMatch = filters['Feed type name'] ? row['Feed type name'] === filters['Feed type name'] : true;
      return siteNameMatch && commonNameMatch && feedTypeMatch;
    });
  }, [data, filters]);
  
  const processedData = useMemo((): DisplayRow[] => {
    if (filteredData.length === 0) return [];
    
    // 1. Sort the data to ensure proper grouping
    const sortedData = [...filteredData].sort((a, b) => {
      const sortOrder = [
        a.site_name.localeCompare(b.site_name),
        a.user_enclosure_name.localeCompare(b.user_enclosure_name),
        a.common_name.localeCompare(b.common_name),
        a['Feed type name'].localeCompare(b['Feed type name']),
        a.type_name.localeCompare(b.type_name),
        a.ingredient_name.localeCompare(b.ingredient_name),
      ];
      return sortOrder.find(val => val !== 0) || 0;
    });

    // 2. Aggregate recipe ingredients
    const aggregatedData: SheetDataRow[] = [];
    const recipeTracker = new Set<string>();

    for (const row of sortedData) {
      if (row.type?.toLowerCase() === 'recipe' || row.type?.toLowerCase() === 'combo') {
        const recipeKey = `${row.site_name}|${row.user_enclosure_name}|${row.common_name}|${row['Feed type name']}|${row.type_name}`;
        if (!recipeTracker.has(recipeKey)) {
          // It's a new recipe group, let's find all its ingredients
          const ingredients = sortedData.filter(d => 
            d.site_name === row.site_name &&
            d.user_enclosure_name === row.user_enclosure_name &&
            d.common_name === row.common_name &&
            d['Feed type name'] === row['Feed type name'] &&
            d.type_name === row.type_name &&
            (d.type?.toLowerCase() === 'recipe' || d.type?.toLowerCase() === 'combo')
          );

          const ingredientSums: { [key: string]: SheetDataRow } = {};
          for(const ing of ingredients) {
              if (ingredientSums[ing.ingredient_name]) {
                  ingredientSums[ing.ingredient_name].ingredient_qty += ing.ingredient_qty;
              } else {
                  ingredientSums[ing.ingredient_name] = { ...ing };
              }
          }
          aggregatedData.push(...Object.values(ingredientSums));
          recipeTracker.add(recipeKey);
        }
      } else {
        // It's a regular item, not part of a recipe
        aggregatedData.push(row);
      }
    }
    
    // 3. Generate display rows with totals
    const displayRows: DisplayRow[] = [];
    let i = 0;
    while(i < aggregatedData.length) {
      const currentRow = aggregatedData[i];
      
      if (currentRow.type?.toLowerCase() === 'recipe' || currentRow.type?.toLowerCase() === 'combo') {
        const recipeKey = `${currentRow.site_name}|${currentRow.user_enclosure_name}|${currentRow.common_name}|${currentRow['Feed type name']}|${currentRow.type_name}`;
        
        const recipeIngredients = aggregatedData.filter(d => 
          `${d.site_name}|${d.user_enclosure_name}|${d.common_name}|${d['Feed type name']}|${d.type_name}` === recipeKey
        );
        
        let recipeTotal = 0;
        recipeIngredients.forEach((ingredient, index) => {
          recipeTotal += ingredient.ingredient_qty;
          displayRows.push({
            rowType: 'data',
            data: { ...ingredient, type: index === 0 ? 'combo' : '', type_name: index === 0 ? ingredient.type_name : '' },
            isRecipeIngredient: true,
            // Rowspans and other flags will be set later
            rowSpans: { siteName: 0, enclosure: 0, commonName: 0, feedType: 0 },
            isFirstOf: { siteName: false, enclosure: false, commonName: false, feedType: false },
            commonNameAnimalCount: 0,
          });
        });
        
        displayRows.push({
          rowType: 'total',
          data: { type_name: `${currentRow.type_name} Total`, total_qty: recipeTotal },
          isRecipeIngredient: false,
          rowSpans: { siteName: 0, enclosure: 0, commonName: 0, feedType: 0 },
          isFirstOf: { siteName: false, enclosure: false, commonName: false, feedType: false },
          commonNameAnimalCount: 0,
        });

        i += recipeIngredients.length;
      } else {
        displayRows.push({
            rowType: 'data',
            data: currentRow,
            isRecipeIngredient: false,
            rowSpans: { siteName: 0, enclosure: 0, commonName: 0, feedType: 0 },
            isFirstOf: { siteName: false, enclosure: false, commonName: false, feedType: false },
            commonNameAnimalCount: 0,
        });
        i++;
      }
    }

    // 4. Calculate row spans and animal counts
    const finalRows: DisplayRow[] = [];
    const groupingKeys = ['site_name', 'user_enclosure_name', 'common_name', 'Feed type name'];
    const rowSpanCache: Record<string, number> = {};

    for(let i = 0; i < displayRows.length; i++) {
        const row = displayRows[i];
        
        const isFirstOf = {
            siteName: i === 0 || row.data.site_name !== displayRows[i - 1].data.site_name,
            enclosure: i === 0 || row.data.site_name !== displayRows[i - 1].data.site_name || row.data.user_enclosure_name !== displayRows[i - 1].data.user_enclosure_name,
            commonName: i === 0 || row.data.site_name !== displayRows[i - 1].data.site_name || row.data.user_enclosure_name !== displayRows[i - 1].data.user_enclosure_name || row.data.common_name !== displayRows[i-1].data.common_name,
            feedType: i === 0 || row.data.site_name !== displayRows[i - 1].data.site_name || row.data.user_enclosure_name !== displayRows[i - 1].data.user_enclosure_name || row.data.common_name !== displayRows[i-1].data.common_name || row.data['Feed type name'] !== displayRows[i-1].data['Feed type name'],
        }
        
        const calcRowSpan = (key: string) => {
            const groupValue = (row.data as any)[key];
            if (!groupValue) return 1;

            let span = 0;
            for (let j = i; j < displayRows.length; j++) {
                const futureRow = displayRows[j];
                let match = true;
                // Check if future row belongs to the same group
                for(const k of groupingKeys) {
                    if((row.data as any)[k] !== (futureRow.data as any)[k]) {
                        match = false;
                        break;
                    }
                    if (k === key) break; // We only need to match up to the current key
                }

                if(match) span++;
                else break;
            }
            return span;
        }
        
        const rowSpans = {
            siteName: isFirstOf.siteName ? calcRowSpan('site_name') : 0,
            enclosure: isFirstOf.enclosure ? calcRowSpan('user_enclosure_name') : 0,
            commonName: isFirstOf.commonName ? calcRowSpan('common_name') : 0,
            feedType: isFirstOf.feedType ? calcRowSpan('Feed type name') : 0,
        }

        let commonNameAnimalCount = 0;
        if (isFirstOf.commonName) {
            const relevantData = filteredData.filter(d => 
                d.site_name === row.data.site_name &&
                d.user_enclosure_name === row.data.user_enclosure_name &&
                d.common_name === row.data.common_name
            );
            commonNameAnimalCount = new Set(relevantData.map(d => d.animal_id)).size;
        }
        
        finalRows.push({ ...row, rowSpans, isFirstOf, commonNameAnimalCount });
    }

    return finalRows;

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
                        processedData.map(({ data: rowData, rowSpans, isFirstOf, commonNameAnimalCount, rowType }, index) => {
                            if (rowType === 'total') {
                                return (
                                    <TableRow key={`${index}-total`} className="font-bold bg-muted/30">
                                        <TableCell colSpan={3} />
                                        <TableCell className="text-right">{rowData.type_name}</TableCell>
                                        <TableCell className="text-right">{rowData.total_qty?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                    </TableRow>
                                )
                            }
                            return (
                            <TableRow key={index} className="transition-colors duration-300">
                                {isFirstOf.siteName && <TableCell className="font-medium align-top" rowSpan={rowSpans.siteName}>{rowData.site_name}</TableCell>}
                                {isFirstOf.enclosure && <TableCell className="align-top" rowSpan={rowSpans.enclosure}>{rowData.user_enclosure_name}</TableCell>}
                                {isFirstOf.commonName && <TableCell className="align-top" rowSpan={rowSpans.commonName}>{rowData.common_name} ({commonNameAnimalCount})</TableCell>}
                                {isFirstOf.feedType && <TableCell className="align-top" rowSpan={rowSpans.feedType}>{rowData['Feed type name']}</TableCell>}
                                
                                <TableCell>{rowData.type}</TableCell>
                                <TableCell>{rowData.type_name}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <span>{rowData.ingredient_name}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">{rowData.ingredient_qty?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                            </TableRow>
                        )
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
