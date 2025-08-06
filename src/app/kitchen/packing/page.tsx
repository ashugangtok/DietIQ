
"use client";

import { useContext, useMemo, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataContext, PackingItem } from "@/context/data-context";
import { type SheetDataRow } from "@/types";
import { Sun, Sunrise, Moon } from "lucide-react";

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

type TimeFilter = 'all' | 'morning' | 'afternoon' | 'evening';

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

const getTimeSlot = (time: string): TimeFilter => {
    if (!time || typeof time !== 'string') return 'all';
    try {
        const hour = parseInt(time.split(':')[0], 10);
        if (hour >= 6 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 18) return 'afternoon';
        if (hour >= 18 || hour < 6) return 'evening'; // includes after 6pm and before 6am
        return 'all'; 
    } catch {
        return 'all';
    }
}

export default function PackingDashboardPage() {
  const { data, packingList, setPackingList } = useContext(DataContext);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');

  const allProcessedItems = useMemo(() => {
    if (data.length === 0) return [];

    const sortedData = [...data].sort((a, b) => {
      const siteCompare = a.site_name.localeCompare(b.site_name);
      if (siteCompare !== 0) return siteCompare;
      const enclosureCompare = a.user_enclosure_name.localeCompare(b.user_enclosure_name);
      if (enclosureCompare !== 0) return enclosureCompare;
      return a.common_name.localeCompare(b.common_name);
    });

    const animalCounts = new Map<string, number>();
    sortedData.forEach(row => {
      const groupKey = `${row.site_name}|${row.user_enclosure_name}|${row.common_name}`;
      if (!animalCounts.has(groupKey)) {
        const animalSet = new Set(data.filter(d =>
          d.site_name === row.site_name &&
          d.user_enclosure_name === row.user_enclosure_name &&
          d.common_name === row.common_name
        ).map(d => d.animal_id));
        animalCounts.set(groupKey, animalSet.size);
      }
    });

    const aggregationMap = new Map<string, Omit<AggregatedRow, 'status' | 'rowSpans' | 'id'> & { id: string }>();

    sortedData.forEach(row => {
        const commonGroupKey = `${row.site_name}|${row.user_enclosure_name}|${row.common_name}`;
        const aggregationKey = `${commonGroupKey}|${row['Feed type name']}|${row.type === 'Recipe' || row.type === 'Combo' ? row.type_name : row.ingredient_name}`;

        let existing = aggregationMap.get(aggregationKey);

        if (!existing) {
            const animalCount = animalCounts.get(commonGroupKey) || 0;
            existing = {
                id: aggregationKey,
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
                    total_uom: row.base_uom_name,
                    preparation_type_name: row.preparation_type_name,
                    meal_start_time: row.meal_start_time,
                    cut_size_name: row.cut_size_name,
                },
            };
            aggregationMap.set(aggregationKey, existing);
        }

        existing.groupData.total_qty += row.ingredient_qty;
        existing.groupData.total_qty_gram += row.ingredient_qty_gram;
    });

    aggregationMap.forEach(aggRow => {
        if (aggRow.groupData.type === 'Recipe' || aggRow.groupData.type === 'Combo') {
            const recipeIngredients = sortedData
                .filter(r => 
                    r.site_name === aggRow.groupData.site_name &&
                    r.user_enclosure_name === aggRow.groupData.user_enclosure_name &&
                    r.common_name === aggRow.groupData.common_name &&
                    r['Feed type name'] === aggRow.groupData.feed_type_name &&
                    r.type_name === aggRow.groupData.type_name
                )
                .map(r => r.ingredient_name);
            const uniqueIngredients = [...new Set(recipeIngredients)];
            aggRow.groupData.ingredients = `${aggRow.groupData.type_name}: ${uniqueIngredients.join(', ')}`;
        } else {
            aggRow.groupData.ingredients = aggRow.groupData.type_name; // This was the bug, should be ingredient_name
        }
    });

    return Array.from(aggregationMap.values());

  }, [data]);

  const packingListWithDetails = useMemo(() => {
    const timeFilteredData = timeFilter === 'all'
      ? allProcessedItems
      : allProcessedItems.filter(row => getTimeSlot(row.groupData.meal_start_time) === timeFilter);

    if (timeFilteredData.length === 0) return [];
    
    const packingStatusMap = new Map(packingList.map(item => [item.id, item.status]));

    const siteNameCache: { [key: string]: number } = {};
    const enclosureCache: { [key: string]: number } = {};
    const commonNameCache: { [key: string]: number } = {};

    timeFilteredData.forEach(row => {
        const siteKey = row.groupData.site_name;
        const enclosureKey = `${siteKey}|${row.groupData.user_enclosure_name}`;
        const commonNameKey = `${enclosureKey}|${row.groupData.common_name}`;

        siteNameCache[siteKey] = (siteNameCache[siteKey] || 0) + 1;
        enclosureCache[enclosureKey] = (enclosureCache[enclosureKey] || 0) + 1;
        commonNameCache[commonNameKey] = (commonNameCache[commonNameKey] || 0) + 1;
    });
    
    const processedSiteNames = new Set();
    const processedEnclosures = new Set();
    const processedCommonNames = new Set();

    return timeFilteredData.map(row => {
        const siteKey = row.groupData.site_name;
        const enclosureKey = `${siteKey}|${row.groupData.user_enclosure_name}`;
        const commonNameKey = `${enclosureKey}|${row.groupData.common_name}`;

        const siteNameSpan = !processedSiteNames.has(siteKey) ? siteNameCache[siteKey] : 0;
        if(siteNameSpan > 0) processedSiteNames.add(siteKey);

        const enclosureSpan = !processedEnclosures.has(enclosureKey) ? enclosureCache[enclosureKey] : 0;
        if(enclosureSpan > 0) processedEnclosures.add(enclosureKey);

        const commonNameSpan = !processedCommonNames.has(commonNameKey) ? commonNameCache[commonNameKey] : 0;
        if(commonNameSpan > 0) processedCommonNames.add(commonNameKey);

        const rowSpans = {
            siteName: siteNameSpan,
            enclosure: enclosureSpan,
            commonName: commonNameSpan,
        };
        
        const status = packingStatusMap.get(row.id) || 'Pending';

        return { ...row, rowSpans, status };
    });
  }, [allProcessedItems, timeFilter, packingList]);

  const allItemIds = useMemo(() => {
    return new Set(allProcessedItems.map(item => item.id));
  }, [allProcessedItems]);

  useEffect(() => {
    if (data.length > 0) {
        setPackingList(currentList => {
            const currentMap = new Map(currentList.map(item => [item.id, item]));
            
            const updatedList: PackingItem[] = currentList.filter(item => allItemIds.has(item.id));
            const updatedMap = new Map(updatedList.map(item => [item.id, item]));

            allItemIds.forEach(id => {
                if (!updatedMap.has(id)) {
                    updatedList.push({ id, status: 'Pending' });
                }
            });
            
            return updatedList;
        });
    } else {
        setPackingList([]);
    }
  }, [data, allItemIds, setPackingList]);

  const handleToggleStatus = (id: string) => {
    setPackingList((currentList: PackingItem[]) =>
      currentList.map((item) =>
        item.id === id
          ? { ...item, status: item.status === "Pending" ? "Packed" : "Pending" }
          : item
      )
    );
  };
  
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

  const TimeFilterButton = ({ value, current, onClick, children }: { value: TimeFilter, current: TimeFilter, onClick: (value: TimeFilter) => void, children: React.ReactNode }) => (
    <Button
      variant={current === value ? "default" : "outline"}
      onClick={() => onClick(value)}
      className="flex-1 sm:flex-none"
    >
      {children}
    </Button>
  );

  return (
    <div>
        <Card>
            <CardHeader className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle>Packing Dashboard</CardTitle>
                        <CardDescription>
                            Today&apos;s required ingredients. Mark items as &quot;Packed&quot; once they are ready.
                        </CardDescription>
                    </div>
                     <Button variant="outline" onClick={() => setTimeFilter('all')}>Show All</Button>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2 p-2 bg-muted/50 rounded-lg">
                    <TimeFilterButton value="morning" current={timeFilter} onClick={setTimeFilter}>
                        <Sun className="mr-2 h-4 w-4" /> 6 AM to 12 PM
                    </TimeFilterButton>
                    <TimeFilterButton value="afternoon" current={timeFilter} onClick={setTimeFilter}>
                        <Sunrise className="mr-2 h-4 w-4" /> 12 PM to 6 PM
                    </TimeFilterButton>
                    <TimeFilterButton value="evening" current={timeFilter} onClick={setTimeFilter}>
                        <Moon className="mr-2 h-4 w-4" /> After 6 PM
                    </TimeFilterButton>
                </div>
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
                                                <div className="font-bold whitespace-pre-wrap">{rowData.ingredients}</div>
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
                                No results found for the selected time slot.
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

    