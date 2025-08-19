
"use client";

import { useState, useMemo, useEffect } from "react";
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
import styles from '../app/reporting.module.css';

export interface Filters {
  site_name: string;
  common_name: string;
  'Feed type name': string;
}
interface DataTableProps {
  data: SheetDataRow[];
  initialFilters?: Filters;
  onFiltersChange?: (filters: Filters) => void;
}

type AggregatedRow = {
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
        total_qty_gram: number;
        total_uom: string;
    };
    rowSpans: {
        siteName: number;
        enclosure: number;
        commonName: number;
    };
};


export function DataTable({ data, initialFilters, onFiltersChange }: DataTableProps) {
  const [filters, setFilters] = useState<Filters>(initialFilters || {
    site_name: "",
    common_name: "",
    'Feed type name': "",
  });
  const [processedData, setProcessedData] = useState<AggregatedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    if (initialFilters) {
        setFilters(initialFilters);
    }
  }, [initialFilters]);

  const siteNameOptions = useMemo(() => [...new Set(data.map(item => item.site_name))].sort(), [data]);
  const commonNameOptions = useMemo(() => [...new Set(data.map(item => item.common_name))].sort(), [data]);
  const feedTypeOptions = useMemo(() => [...new Set(data.map(item => item['Feed type name']))].sort(), [data]);

  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    const newFilters = { ...filters, [filterName]: value };
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  };
  
  const clearFilters = () => {
    const clearedFilters = {
      site_name: "",
      common_name: "",
      'Feed type name': "",
    };
    setFilters(clearedFilters);
    onFiltersChange?.(clearedFilters);
  };

  const filteredData = useMemo(() => {
    const sorted = [...data].sort((a, b) => {
        const siteCompare = a.site_name.localeCompare(b.site_name);
        if (siteCompare !== 0) return siteCompare;
        const enclosureCompare = a.user_enclosure_name.localeCompare(b.user_enclosure_name);
        if (enclosureCompare !== 0) return enclosureCompare;
        const commonNameCompare = a.common_name.localeCompare(b.common_name);
        if (commonNameCompare !== 0) return commonNameCompare;
        const feedTypeCompare = (a['Feed type name'] || '').localeCompare(b['Feed type name'] || '');
        if (feedTypeCompare !== 0) return feedTypeCompare;
        return (a.type || '').localeCompare(b.type || '');
    });

    return sorted.filter(row => {
      const siteNameMatch = filters.site_name ? row.site_name === filters.site_name : true;
      const commonNameMatch = filters.common_name ? row.common_name.toLowerCase().includes(filters.common_name.toLowerCase()) : true;
      const feedTypeMatch = filters['Feed type name'] ? row['Feed type name'] === filters['Feed type name'] : true;
      return siteNameMatch && commonNameMatch && feedTypeMatch;
    });
  }, [data, filters]);
  
  useEffect(() => {
    setIsProcessing(true);
    
    // Defer the heavy processing to allow the loader to render
    const timer = setTimeout(() => {
      if (filteredData.length === 0) {
        setProcessedData([]);
        setIsProcessing(false);
        return;
      };

      const aggregationMap = new Map<string, AggregatedRow>();

      filteredData.forEach(row => {
          const groupKey = `${row.site_name}|${row.user_enclosure_name}|${row.common_name}`;
          
          const animalSet = new Set(data.filter(d => 
              d.site_name === row.site_name && 
              d.user_enclosure_name === row.user_enclosure_name && 
              d.common_name === row.common_name
          ).map(d => d.animal_id));
          const animalCount = animalSet.size;

          if (row.type?.toLowerCase() === 'recipe' || row.type?.toLowerCase() === 'combo') {
              const recipeKey = `${groupKey}|${row['Feed type name']}|${row.type_name}`;
              let existing = aggregationMap.get(recipeKey);

              if (!existing) {
                  existing = {
                      groupData: {
                          site_name: row.site_name,
                          user_enclosure_name: row.user_enclosure_name,
                          common_name: row.common_name,
                          animalCount: animalCount,
                          feed_type_name: row['Feed type name'],
                          type: row.type,
                          type_name: row.type_name,
                          ingredients: '', 
                          total_qty: 0,
                          total_qty_gram: 0,
                          total_uom: '',
                      },
                      rowSpans: { siteName: 0, enclosure: 0, commonName: 0 },
                  };
                  aggregationMap.set(recipeKey, existing);
              }

              const allRecipeIngredients = filteredData.filter(
                (r) =>
                  `${r.site_name}|${r.user_enclosure_name}|${r.common_name}|${r['Feed type name']}|${r.type_name}` ===
                  `${row.site_name}|${row.user_enclosure_name}|${row.common_name}|${row['Feed type name']}|${row.type_name}` &&
                  (r.type?.toLowerCase() === 'recipe' || r.type?.toLowerCase() === 'combo')
              );

              const ingredientSums: { [key: string]: { qty: number, qty_gram: number, uom: string, uom_gram: string } } = {};
              allRecipeIngredients.forEach(ing => {
                  if (!ingredientSums[ing.ingredient_name]) {
                      ingredientSums[ing.ingredient_name] = { qty: 0, qty_gram: 0, uom: ing.base_uom_name, uom_gram: ing.base_uom_name_gram };
                  }
                  ingredientSums[ing.ingredient_name].qty += ing.ingredient_qty;
                  ingredientSums[ing.ingredient_name].qty_gram += ing.ingredient_qty_gram;
              });
              
              existing.groupData.ingredients = Object.entries(ingredientSums)
                  .map(([name, ingData]) => {
                      const uomLower = ingData.uom.toLowerCase();
                      let displayQty;
                      if ((uomLower === 'kilogram' || uomLower === 'kg') && ingData.qty < 1) {
                           displayQty = `${ingData.qty_gram.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${ingData.uom_gram}`;
                      } else {
                          const qtyString = ingData.qty.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                          displayQty = `${qtyString} ${ingData.uom}`;
                      }
                      return `${name} (${displayQty})`;
                  })
                  .join(', ');
              
              const totalQty = Object.values(ingredientSums).reduce((sum, ingData) => sum + ingData.qty, 0);
              const totalQtyGram = Object.values(ingredientSums).reduce((sum, ingData) => sum + ingData.qty_gram, 0);
              existing.groupData.total_qty = totalQty;
              existing.groupData.total_qty_gram = totalQtyGram;
              existing.groupData.total_uom = allRecipeIngredients[0]?.base_uom_name || '';


          } else { // Handle single ingredients
              const ingredientKey = `${groupKey}|${row.ingredient_name}`;
              let existing = aggregationMap.get(ingredientKey);

              if (!existing) {
                   existing = {
                      groupData: {
                          site_name: row.site_name,
                          user_enclosure_name: row.user_enclosure_name,
                          common_name: row.common_name,
                          animalCount: animalCount,
                          feed_type_name: row['Feed type name'],
                          type: row.type,
                          type_name: row.type_name,
                          ingredients: row.ingredient_name,
                          total_qty: 0,
                          total_qty_gram: 0,
                          total_uom: row.base_uom_name,
                      },
                      rowSpans: { siteName: 0, enclosure: 0, commonName: 0 },
                  };
                  aggregationMap.set(ingredientKey, existing);
              }
              existing.groupData.total_qty += row.ingredient_qty;
              existing.groupData.total_qty_gram += row.ingredient_qty_gram;
          }
      });

      const aggregatedResult = Array.from(aggregationMap.values());

      // Calculate rowSpans after aggregation
      let siteNameCache: { [key: string]: number } = {};
      let enclosureCache: { [key: string]: number } = {};
      let commonNameCache: { [key: string]: number } = {};

      aggregatedResult.forEach(row => {
          const siteKey = row.groupData.site_name;
          const enclosureKey = `${siteKey}|${row.groupData.user_enclosure_name}`;
          const commonNameKey = `${enclosureKey}|${row.groupData.common_name}`;
          
          siteNameCache[siteKey] = (siteNameCache[siteKey] || 0) + 1;
          enclosureCache[enclosureKey] = (enclosureCache[enclosureKey] || 0) + 1;
          commonNameCache[commonNameKey] = (commonNameCache[commonNameKey] || 0) + 1;
      });

      let processedSiteNames = new Set();
      let processedEnclosures = new Set();
      let processedCommonNames = new Set();

      for (let i = 0; i < aggregatedResult.length; i++) {
          const row = aggregatedResult[i];
          const siteKey = row.groupData.site_name;
          const enclosureKey = `${siteKey}|${row.groupData.user_enclosure_name}`;
          const commonNameKey = `${enclosureKey}|${row.groupData.common_name}`;
          
          const siteNameSpan = !processedSiteNames.has(siteKey) ? siteNameCache[siteKey] : 0;
          if(siteNameSpan > 0) processedSiteNames.add(siteKey);

          const enclosureSpan = !processedEnclosures.has(enclosureKey) ? enclosureCache[enclosureKey] : 0;
          if(enclosureSpan > 0) processedEnclosures.add(enclosureKey);

          const commonNameSpan = !processedCommonNames.has(commonNameKey) ? commonNameCache[commonNameKey] : 0;
          if(commonNameSpan > 0) processedCommonNames.add(commonNameKey);

          aggregatedResult[i].rowSpans = {
              siteName: siteNameSpan,
              enclosure: enclosureSpan,
              commonName: commonNameSpan,
          };
      }
      
      setProcessedData(aggregatedResult);
      setIsProcessing(false);
    }, 50); // Small timeout to allow UI to update

    return () => clearTimeout(timer);
  
  }, [filteredData, data]);

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

  const formatTotal = (quantity: number, quantityGram: number, uom: string) => {
    const uomLower = uom.toLowerCase();
    if (uomLower === 'kilogram' || uomLower === 'kg') {
      if (quantity < 1) {
        return `${quantityGram.toLocaleString(undefined, { maximumFractionDigits: 0 })} gram`;
      }
      return `${quantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${uom}`;
    }
    if (quantity === 1) {
      return `${quantity.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${uom}`;
    }
    return `${quantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${uom}`;
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
                        {siteNameOptions.map((option, index) => <SelectItem key={`${option}-${index}`} value={option}>{option}</SelectItem>)}
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
                        {feedTypeOptions.map((option, index) => <SelectItem key={`${option}-${index}`} value={option}>{option}</SelectItem>)}
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

            {isProcessing ? (
                <div className="flex flex-col items-center justify-center p-12">
                     <div className={styles['paw-loader-lg']}>
                        <div className={styles.paw}></div>
                        <div className={styles.paw}></div>
                        <div className={styles.paw}></div>
                    </div>
                    <span className="text-muted-foreground mt-2 font-semibold">We’re crunching the numbers for your animals</span>
                </div>
            ) : (
              <>
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
                                processedData.map(({ groupData, rowSpans }, index) => {
                                    const { siteName, enclosure, commonName } = rowSpans;
                                    const rowData = groupData;
                                    const totalDisplay = formatTotal(rowData.total_qty, rowData.total_qty_gram, rowData.total_uom);
                                    return (
                                        <TableRow key={index}>
                                            {siteName > 0 && <TableCell rowSpan={siteName} className="align-top font-medium">{rowData.site_name}</TableCell>}
                                            {enclosure > 0 && <TableCell rowSpan={enclosure} className="align-top">{rowData.user_enclosure_name}</TableCell>}
                                            {commonName > 0 && <TableCell rowSpan={commonName} className="align-top">{rowData.common_name} <span className="font-bold">({rowData.animalCount})</span></TableCell>}
                                            <TableCell className="align-top">{rowData.feed_type_name}</TableCell>
                                            <TableCell className="align-top">{rowData.type}</TableCell>
                                            <TableCell className="align-top">{rowData.type_name}</TableCell>
                                            <TableCell className="align-top font-bold">{rowData.ingredients}</TableCell>
                                            <TableCell className="text-right align-top font-bold">{totalDisplay}</TableCell>
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
              </>
            )}
        </CardContent>
    </Card>
  );
}
