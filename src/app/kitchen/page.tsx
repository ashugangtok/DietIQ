
"use client";

import { useContext, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataContext, PackingItem } from "@/context/data-context";
import { type SheetDataRow } from "@/types";

type AggregatedRow = {
    id: string;
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
        preparation_type_name: string;
        meal_start_time: string;
        cut_size_name: string;
    };
    rowSpans: {
        siteName: number;
        enclosure: number;
        commonName: number;
    };
    status: "Pending" | "Packed" | "Dispatched";
};

const formatTotal = (quantity: number, quantityGram: number, uom: string) => {
    const uomLower = uom.toLowerCase();
    const isWeight = uomLower === 'kilogram' || uomLower === 'kg' || uomLower === 'gram';

    if (isWeight) {
      if ((uomLower === 'kilogram' || uomLower === 'kg') && quantity < 1 && quantity > 0) {
        return `${quantityGram.toLocaleString(undefined, { maximumFractionDigits: 0 })} gram`;
      }
      return `${quantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${uom}`;
    }
    if (quantity === 1) {
      return `${quantity.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${uom}`;
    }
    return `${quantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${uom}`;
};

export default function PackingDashboardPage() {
  const { data, packingList, setPackingList } = useContext(DataContext);

  const processedData = useMemo(() => {
    if (data.length === 0) return [];

    const aggregationMap = new Map<string, Omit<AggregatedRow, 'status'>>();

    const sortedData = [...data].sort((a, b) => {
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

    sortedData.forEach(row => {
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
                    id: recipeKey,
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
                        preparation_type_name: row.preparation_type_name,
                        meal_start_time: row.meal_start_time,
                        cut_size_name: row.cut_size_name,
                    },
                    rowSpans: { siteName: 0, enclosure: 0, commonName: 0 },
                };
                aggregationMap.set(recipeKey, existing);
            }

            const allRecipeIngredients = data.filter(
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
                    if ((uomLower === 'kilogram' || uomLower === 'kg') && ingData.qty < 1 && ingData.qty > 0) {
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
                    id: ingredientKey,
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
                        preparation_type_name: row.preparation_type_name,
                        meal_start_time: row.meal_start_time,
                        cut_size_name: row.cut_size_name,
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

    return aggregatedResult.map(row => {
        const siteKey = row.groupData.site_name;
        const enclosureKey = `${siteKey}|${row.groupData.user_enclosure_name}`;
        const commonNameKey = `${enclosureKey}|${row.groupData.common_name}`;
        
        const siteNameSpan = !processedSiteNames.has(siteKey) ? siteNameCache[siteKey] : 0;
        if(siteNameSpan > 0) processedSiteNames.add(siteKey);

        const enclosureSpan = !processedEnclosures.has(enclosureKey) ? enclosureCache[enclosureKey] : 0;
        if(enclosureSpan > 0) processedEnclosures.add(enclosureKey);

        const commonNameSpan = !processedCommonNames.has(commonNameKey) ? commonNameCache[commonNameKey] : 0;
        if(commonNameSpan > 0) processedCommonNames.add(commonNameKey);

        row.rowSpans = {
            siteName: siteNameSpan,
            enclosure: enclosureSpan,
            commonName: commonNameSpan,
        };
        return { ...row, status: 'Pending' as const };
    });
  
  }, [data]);

  useEffect(() => {
    if (data.length > 0) {
        setPackingList(currentList => {
            if (currentList.length === 0) {
                // Initialize with new data
                return processedData.map(item => ({
                    id: item.id,
                    status: 'Pending',
                }));
            }

            // Update existing list: add new items, update existing, remove old ones
            const newProcessedMap = new Map(processedData.map(item => [item.id, item]));
            const currentMap = new Map(currentList.map(item => [item.id, item]));
            const updatedList: PackingItem[] = [];

            // Add or update items from new data
            for (const [id, item] of newProcessedMap.entries()) {
                const existingItem = currentMap.get(id);
                updatedList.push({
                    id: id,
                    // keep existing status if item still exists
                    status: existingItem ? existingItem.status : 'Pending', 
                });
            }
            
            return updatedList;
        });
    } else {
        setPackingList([]);
    }
  }, [data, processedData, setPackingList]);


  const handleToggleStatus = (id: string) => {
    setPackingList((currentList: PackingItem[]) =>
      currentList.map((item) =>
        item.id === id
          ? { ...item, status: item.status === "Pending" ? "Packed" : "Pending" }
          : item
      )
    );
  };
  
  const packingListWithDetails = useMemo(() => {
    const processedMap = new Map(processedData.map(item => [item.id, item]));
    return packingList.map(packingItem => {
        const details = processedMap.get(packingItem.id);
        if (!details) return null; // Should not happen if logic is correct
        return {
            ...details,
            status: packingItem.status,
        };
    }).filter(Boolean) as AggregatedRow[];
  }, [processedData, packingList]);

  if (data.length === 0) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Packing Dashboard</CardTitle>
                <CardDescription>
                    Today's required ingredients will appear here once an Excel file is uploaded.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-center p-12 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">
                        Please go to the <a href="/" className="text-primary underline">Sheet Insights</a> page to upload a file.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
  }

  return (
    <div>
        <Card>
            <CardHeader>
                <CardTitle>Packing Dashboard</CardTitle>
                <CardDescription>
                    Today&apos;s required ingredients. Mark items as &quot;Packed&quot; once they are ready.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="relative overflow-x-auto rounded-md border">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead>Site Name</TableHead>
                                <TableHead>Enclosure</TableHead>
                                <TableHead>Common Name</TableHead>
                                <TableHead>Ingredient</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {packingListWithDetails.length > 0 ? (
                                packingListWithDetails.map((item) => {
                                    const { siteName, enclosure, commonName } = item.rowSpans;
                                    const rowData = item.groupData;
                                    const totalDisplay = formatTotal(rowData.total_qty, rowData.total_qty_gram, rowData.total_uom);
                                    
                                    return (
                                        <TableRow key={item.id}>
                                            {siteName > 0 && <TableCell rowSpan={siteName} className="align-top font-medium">{rowData.site_name}</TableCell>}
                                            {enclosure > 0 && <TableCell rowSpan={enclosure} className="align-top">{rowData.user_enclosure_name}</TableCell>}
                                            {commonName > 0 && <TableCell rowSpan={commonName} className="align-top">{rowData.common_name} <span className="font-bold">({rowData.animalCount})</span></TableCell>}
                                            <TableCell className="align-top">
                                                <div className="font-bold">{rowData.ingredients}</div>
                                                <div className="text-xs text-muted-foreground space-x-2">
                                                    {rowData.preparation_type_name && <span>Prep: {rowData.preparation_type_name}</span>}
                                                    {rowData.cut_size_name && <span>Cut: {rowData.cut_size_name}</span>}
                                                    {rowData.meal_start_time && <span>Time: {rowData.meal_start_time}</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right align-top font-bold">{totalDisplay}</TableCell>
                                            <TableCell className="align-top">
                                                <Badge variant={item.status === "Packed" ? "default" : "secondary"}>
                                                    {item.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="align-top">
                                                <Button size="sm" onClick={() => handleToggleStatus(item.id)}>
                                                   {item.status === 'Packed' ? 'Mark as Pending' : 'Mark as Packed'}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
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
  );
}
