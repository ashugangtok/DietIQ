
"use client";

import { useContext, useMemo, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataContext, PackingItem } from "@/context/data-context";
import { Sun, Sunrise, Moon, Check, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";

type AggregatedRow = {
    id: string; // Composite key for the group
    itemIds: string[]; // Original item IDs in this group
    groupData: {
        site_name: string;
        user_enclosure_name: string;
        common_name: string;
        animalCount: number;
        feed_type_name: string;
        type: string;
        type_name: string;
        ingredients: IngredientDetail[];
        meal_start_time: string;
    };
    status: "Pending" | "Packed" | "Dispatched";
};

type IngredientDetail = {
    name: string;
    qty: number;
    qty_gram: number;
    uom: string;
};


type TimeFilter = 'all' | 'morning' | 'afternoon' | 'evening';

const formatIngredient = (quantity: number, quantityGram: number, uom: string) => {
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
    
    // Create a map to hold the fully aggregated items.
    // The key will be for the *entire preparation*, not individual ingredients.
    const aggregationMap = new Map<string, Omit<AggregatedRow, 'status'>>();

    data.forEach(row => {
        // This key groups all ingredients for a single prep task together.
        const groupKey = `${row.site_name}|${row.user_enclosure_name}|${row.common_name}|${row.meal_start_time}|${row.type_name}`;
        
        // This is the unique ID for this specific ingredient row within the group.
        const originalItemId = `${row.site_name}|${row.user_enclosure_name}|${row.common_name}|${row.meal_start_time}|${row.type === 'Recipe' || row.type === 'Combo' ? row.type_name : row.ingredient_name}`;

        let group = aggregationMap.get(groupKey);

        if (!group) {
            // First time seeing this group, create it.
            const animalSet = new Set(data.filter(d => 
                d.site_name === row.site_name && 
                d.user_enclosure_name === row.user_enclosure_name && 
                d.common_name === row.common_name
            ).map(d => d.animal_id));

            group = {
                id: groupKey,
                itemIds: [],
                groupData: {
                    site_name: row.site_name,
                    user_enclosure_name: row.user_enclosure_name,
                    common_name: row.common_name,
                    animalCount: animalSet.size,
                    feed_type_name: row['Feed type name'],
                    type: row.type,
                    type_name: row.type_name,
                    ingredients: [],
                    meal_start_time: row.meal_start_time,
                }
            };
            aggregationMap.set(groupKey, group);
        }

        // Add the unique ID of the original row to the group
        if (!group.itemIds.includes(originalItemId)) {
            group.itemIds.push(originalItemId);
        }

        // Add or update the ingredient details for this group
        let ingredientDetail = group.groupData.ingredients.find(i => i.name === row.ingredient_name);
        if (ingredientDetail) {
            ingredientDetail.qty += row.ingredient_qty;
            ingredientDetail.qty_gram += row.ingredient_qty_gram;
        } else {
            group.groupData.ingredients.push({
                name: row.ingredient_name,
                qty: row.ingredient_qty,
                qty_gram: row.ingredient_qty_gram,
                uom: row.base_uom_name,
            });
        }
    });

    return Array.from(aggregationMap.values());
  }, [data]);


  const packingListWithDetails = useMemo(() => {
    // 1. Filter by time
    const timeFilteredData = timeFilter === 'all'
      ? allAggregatedItems
      : allAggregatedItems.filter(row => getTimeSlot(row.groupData.meal_start_time) === timeFilter);

    if (timeFilteredData.length === 0) return [];
    
    // 2. Get packing statuses for each original item
    const packingStatusMap = new Map(packingList.map(item => [item.id, item.status]));
    
    // 3. Map to final display structure
    return timeFilteredData.map(group => {
        // Determine the overall status of the group. If any item is not Packed, the group is Pending.
        const allItemsPacked = group.itemIds.every(id => packingStatusMap.get(id) === 'Packed');
        const status = allItemsPacked ? 'Packed' : 'Pending';

        return { ...group, status };
    }).sort((a,b) => { // Sort the final list of cards
         const siteCompare = a.groupData.site_name.localeCompare(b.groupData.site_name);
         if (siteCompare !== 0) return siteCompare;
         const enclosureCompare = a.groupData.user_enclosure_name.localeCompare(b.groupData.user_enclosure_name);
         if (enclosureCompare !== 0) return enclosureCompare;
         return a.groupData.common_name.localeCompare(b.groupData.common_name);
    });
  }, [allAggregatedItems, timeFilter, packingList]);


  useEffect(() => {
    if (data.length > 0 && allAggregatedItems.length > 0) {
        setPackingList(currentList => {
            const currentMap = new Map(currentList.map(item => [item.id, item]));
            
            // Get all unique *original* item IDs from all aggregated groups
            const allOriginalItemIds = new Set(allAggregatedItems.flatMap(group => group.itemIds));

            const updatedList: PackingItem[] = [];

            allOriginalItemIds.forEach(id => {
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


  const handleToggleGroupStatus = (itemIds: string[], currentStatus: "Pending" | "Packed") => {
    const newStatus = currentStatus === "Pending" ? "Packed" : "Pending";
    setPackingList((currentList: PackingItem[]) =>
      currentList.map((item) =>
        itemIds.includes(item.id)
          ? { ...item, status: newStatus }
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
              const isPacked = item.status === 'Packed';
              const groupTitle = `${rowData.site_name} | ${rowData.user_enclosure_name} | ${rowData.common_name} (${rowData.animalCount})`;
              
              return (
                <Card key={item.id} className={`shadow-lg transition-all ${isPacked ? 'bg-green-50' : 'bg-card'}`}>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <CardDescription>{groupTitle}</CardDescription>
                                <CardTitle className="text-xl font-bold">{rowData.type_name}</CardTitle>
                            </div>
                            <Badge variant={isPacked ? "default" : "secondary"} className={`ml-4 flex-shrink-0 ${isPacked ? 'bg-green-600' : ''}`}>
                                {item.status}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Separator />
                        <div>
                            <h4 className="text-sm font-semibold text-muted-foreground mb-2">Ingredients Used</h4>
                            <div className="space-y-2">
                                {rowData.ingredients.map(ing => (
                                    <div key={ing.name} className="flex justify-between items-center text-sm p-1.5 rounded-md bg-muted/50">
                                        <span className="font-semibold">{ing.name}</span>
                                        <span className="font-bold text-primary">{formatIngredient(ing.qty, ing.qty_gram, ing.uom)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <Button
                          size="sm"
                          className="w-full"
                          variant={isPacked ? 'destructive' : 'default'}
                          onClick={() => handleToggleGroupStatus(item.itemIds, item.status)}
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
