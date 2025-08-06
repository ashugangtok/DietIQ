
"use client";

import { useContext, useMemo, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataContext, PackingItem } from "@/context/data-context";
import { Sun, Sunrise, Moon, Check, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";

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
        ingredients: IngredientDetail[];
        total_qty: number;
        total_qty_gram: number;
        total_uom: string;
        meal_start_time: string;
    };
};

type IngredientDetail = {
    name: string;
    qty: number;
    qty_gram: number;
    uom: string;
    preparation: string;
    cut_size: string;
    percentage: number;
};


type ProcessedRow = AggregatedRow & {
    status: "Pending" | "Packed" | "Dispatched";
}


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
        if (hour >= 18 || hour < 6) return 'evening';
        return 'all'; 
    } catch {
        return 'all';
    }
}

export default function PackingDashboardPage() {
  const { data, packingList, setPackingList } = useContext(DataContext);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');

  const allAggregatedItems = useMemo(() => {
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

    const aggregationMap = new Map<string, Omit<AggregatedRow, 'rowSpans'>>();
    
    sortedData.forEach(row => {
        const commonGroupKey = `${row.site_name}|${row.user_enclosure_name}|${row.common_name}`;
        
        // Key for aggregation: site, enclosure, animal, meal time, and what is being prepared (recipe name or single ingredient)
        const aggregationKey = `${commonGroupKey}|${row.meal_start_time}|${row.type === 'Recipe' || row.type === 'Combo' ? row.type_name : row.ingredient_name}`;

        if (!aggregationMap.has(aggregationKey)) {
             aggregationMap.set(aggregationKey, {
                id: aggregationKey,
                groupData: {
                    site_name: row.site_name,
                    user_enclosure_name: row.user_enclosure_name,
                    common_name: row.common_name,
                    animalCount: animalCounts.get(commonGroupKey) || 0,
                    feed_type_name: row['Feed type name'],
                    type: row.type,
                    type_name: row.type_name,
                    ingredients: [],
                    total_qty: 0,
                    total_qty_gram: 0,
                    total_uom: row.base_uom_name,
                    meal_start_time: row.meal_start_time,
                }
            });
        }
    });

    aggregationMap.forEach(aggItem => {
        const { site_name, user_enclosure_name, common_name, meal_start_time, type, type_name } = aggItem.groupData;

        const relevantRows = sortedData.filter(r => 
            r.site_name === site_name &&
            r.user_enclosure_name === user_enclosure_name &&
            r.common_name === common_name &&
            r.meal_start_time === meal_start_time &&
            ( (type === 'Recipe' || type === 'Combo') ? r.type_name === type_name : r.ingredient_name === aggItem.id.split('|').pop() )
        );

        const totalRecipeGrams = relevantRows.reduce((sum, r) => sum + r.ingredient_qty_gram, 0);

        const ingredientsDetails = new Map<string, IngredientDetail>();
        relevantRows.forEach(r => {
            let detail = ingredientsDetails.get(r.ingredient_name);
            if (!detail) {
                detail = {
                    name: r.ingredient_name,
                    qty: 0,
                    qty_gram: 0,
                    uom: r.base_uom_name,
                    preparation: r.preparation_type_name,
                    cut_size: r.cut_size_name,
                    percentage: 0
                };
                ingredientsDetails.set(r.ingredient_name, detail);
            }
            detail.qty += r.ingredient_qty;
            detail.qty_gram += r.ingredient_qty_gram;
        });

        ingredientsDetails.forEach(detail => {
            detail.percentage = totalRecipeGrams > 0 ? (detail.qty_gram / totalRecipeGrams) * 100 : 0;
        });

        aggItem.groupData.ingredients = Array.from(ingredientsDetails.values());
        aggItem.groupData.total_qty = relevantRows.reduce((sum, r) => sum + r.ingredient_qty, 0);
        aggItem.groupData.total_qty_gram = totalRecipeGrams;
        aggItem.groupData.total_uom = relevantRows[0]?.base_uom_name || '';
    });
    
    return Array.from(aggregationMap.values());
  }, [data]);

  const packingListWithDetails = useMemo(() => {
    // 1. Filter by time
    const timeFilteredData = timeFilter === 'all'
      ? allAggregatedItems
      : allAggregatedItems.filter(row => getTimeSlot(row.groupData.meal_start_time) === timeFilter);

    if (timeFilteredData.length === 0) return [];
    
    // 2. Get packing statuses
    const packingStatusMap = new Map(packingList.map(item => [item.id, item.status]));

    // 3. Sort by site etc.
    const sortedFilteredData = [...timeFilteredData].sort((a,b) => {
         const siteCompare = a.groupData.site_name.localeCompare(b.groupData.site_name);
         if (siteCompare !== 0) return siteCompare;
         const enclosureCompare = a.groupData.user_enclosure_name.localeCompare(b.groupData.user_enclosure_name);
         if (enclosureCompare !== 0) return enclosureCompare;
         return a.groupData.common_name.localeCompare(b.groupData.common_name);
    });
    
    return sortedFilteredData.map(row => {
        const status = packingStatusMap.get(row.id) || 'Pending';
        return { ...row, status };
    });
  }, [allAggregatedItems, timeFilter, packingList]);


  useEffect(() => {
    if (data.length > 0 && allAggregatedItems.length > 0) {
        setPackingList(currentList => {
            const currentMap = new Map(currentList.map(item => [item.id, item]));
            const allItemIds = new Set(allAggregatedItems.map(item => item.id));

            const updatedList: PackingItem[] = [];

            allItemIds.forEach(id => {
                if (currentMap.has(id)) {
                    updatedList.push(currentMap.get(id)!);
                } else {
                    updatedList.push({ id, status: 'Pending' });
                }
            });
            
            return updatedList;
        });
    } else if (data.length === 0) {
        setPackingList([]);
    }
  }, [data, allAggregatedItems, setPackingList]);


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
    <div className="space-y-6">
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
        </Card>
        
        {packingListWithDetails.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packingListWithDetails.map((item) => {
              const rowData = item.groupData;
              const totalDisplay = formatTotal(rowData.total_qty, rowData.total_qty_gram, rowData.total_uom);
              const isPacked = item.status === 'Packed';
              return (
                <Card key={item.id} className={`shadow-lg transition-all ${isPacked ? 'bg-green-50' : 'bg-card'}`}>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardDescription>{rowData.site_name} | {rowData.user_enclosure_name} | {rowData.common_name} ({rowData.animalCount})</CardDescription>
                                <CardTitle className="text-xl font-bold">{rowData.type_name}</CardTitle>
                                <CardDescription className="font-semibold">{rowData.type}</CardDescription>
                            </div>
                            <Badge variant={isPacked ? "default" : "secondary"} className={isPacked ? 'bg-green-600' : ''}>
                                {item.status}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Separator />
                        <div className="flex justify-between items-center">
                             <div>
                                <h4 className="text-sm font-semibold text-muted-foreground mb-2">Ingredients Used</h4>
                                <div className="space-y-1">
                                    {rowData.ingredients.map(ing => (
                                        <div key={ing.name} className="flex items-center text-sm p-1.5 rounded-md bg-muted/50">
                                            <span className="font-semibold min-w-[100px]">{ing.name}</span>
                                            <Separator orientation="vertical" className="h-4 mx-2" />
                                            <span className="text-muted-foreground text-xs">{ing.preparation}</span>
                                            <Separator orientation="vertical" className="h-4 mx-2" />
                                            <span className="text-muted-foreground text-xs">{ing.cut_size}</span>
                                            <Separator orientation="vertical" className="h-4 mx-2" />
                                            <span className="font-bold">{ing.percentage.toFixed(0)}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="text-right flex-shrink-0 pl-4">
                                <p className="text-2xl font-bold text-primary">{totalDisplay}</p>
                            </div>
                        </div>
                        <Button
                          size="sm"
                          className="w-full"
                          variant={isPacked ? 'destructive' : 'default'}
                          onClick={() => handleToggleStatus(item.id)}
                        >
                          {isPacked ? <X className="mr-2" /> : <Check className="mr-2" />}
                          {isPacked ? 'Mark as Pending' : 'Mark as Packed'}
                        </Button>
                    </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card>
            <CardContent>
              <div className="text-center p-12 text-muted-foreground">
                  No results found for the selected time slot.
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
}

    