
"use client";

import { useState, useMemo, useContext } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataContext, PackingItem } from "@/context/data-context";
import { Separator } from "@/components/ui/separator";
import { Check, Truck, X } from "lucide-react";

type SupervisorItem = {
    id: string; // Composite key for the group
    itemIds: string[]; // Original item IDs in this group
    groupData: {
        site_name: string;
        user_enclosure_name: string;
        common_name: string;
        animalCount: number;
        type_name: string;
    };
    status: 'Packed' | 'Dispatched';
}


export default function SupervisorDashboardPage() {
    const { data, packingList, setPackingList } = useContext(DataContext);
    const [siteFilter, setSiteFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'Packed' | 'Dispatched'>('all');

    const siteOptions = useMemo(() => {
        const sites = new Set(data.map(item => item.site_name));
        return Array.from(sites).sort();
    }, [data]);

    const dispatchList = useMemo(() => {
        if (data.length === 0 || packingList.length === 0) return [];
    
        // 1. Filter the raw packing list for items that are 'Packed' or 'Dispatched'
        const packedOrDispatchedItemIds = new Set(
            packingList.filter(item => item.status === 'Packed' || item.status === 'Dispatched').map(item => item.id)
        );
        
        if (packedOrDispatchedItemIds.size === 0) return [];

        // 2. Aggregate the raw data similar to the packing dashboard
        const aggregationMap = new Map<string, Omit<SupervisorItem, 'status'>>();

        data.forEach(row => {
            const originalItemId = `${row.site_name}|${row.user_enclosure_name}|${row.common_name}|${row.meal_start_time}|${row.type === 'Recipe' || row.type === 'Combo' ? row.type_name : row.ingredient_name}`;

            // Only consider items that are in the packed or dispatched list
            if (packedOrDispatchedItemIds.has(originalItemId)) {
                const groupKey = `${row.site_name}|${row.user_enclosure_name}|${row.common_name}|${row.meal_start_time}|${row.type_name}`;
                
                let group = aggregationMap.get(groupKey);

                if (!group) {
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
                            type_name: row.type_name,
                        }
                    };
                    aggregationMap.set(groupKey, group);
                }

                if (!group.itemIds.includes(originalItemId)) {
                    group.itemIds.push(originalItemId);
                }
            }
        });

        const packingStatusMap = new Map(packingList.map(item => [item.id, item.status]));

        // 3. Map aggregated data to SupervisorItem and determine status
        return Array.from(aggregationMap.values()).map(group => {
            // If any item in the group is 'Packed', the whole group is 'Packed'. Otherwise, it's 'Dispatched'.
            const isDispatched = group.itemIds.every(id => packingStatusMap.get(id) === 'Dispatched');
            const status = isDispatched ? 'Dispatched' : 'Packed';
            
            return { ...group, status };
        });

    }, [data, packingList]);

    const filteredDispatchList = useMemo(() => {
        return dispatchList.filter(item => {
            const siteMatch = !siteFilter || item.groupData.site_name === siteFilter;
            const statusMatch = statusFilter === 'all' || item.status === statusFilter;
            return siteMatch && statusMatch;
        }).sort((a,b) => {
             const siteCompare = a.groupData.site_name.localeCompare(b.groupData.site_name);
             if (siteCompare !== 0) return siteCompare;
             const enclosureCompare = a.groupData.user_enclosure_name.localeCompare(b.groupData.user_enclosure_name);
             if (enclosureCompare !== 0) return enclosureCompare;
             return a.groupData.common_name.localeCompare(b.groupData.common_name);
        });
    }, [dispatchList, siteFilter, statusFilter]);
    
    const groupedBySite = useMemo(() => {
        return filteredDispatchList.reduce((acc, item) => {
          const siteName = item.groupData.site_name;
          if (!acc[siteName]) {
            acc[siteName] = [];
          }
          acc[siteName].push(item);
          return acc;
        }, {} as Record<string, SupervisorItem[]>);
    }, [filteredDispatchList]);

    const handleToggleGroupStatus = (itemIds: string[], currentStatus: "Packed" | "Dispatched") => {
        const newStatus = currentStatus === "Packed" ? "Dispatched" : "Packed";
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
                    <CardTitle>Supervisor Dashboard</CardTitle>
                    <CardDescription>
                        No data available. Please upload an Excel file on the Sheet Insights page first.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center p-12 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">
                            Items ready for dispatch will appear here once they are marked as "Packed".
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Supervisor Dashboard</CardTitle>
                <CardDescription>
                    Monitor what&apos;s packed and mark items as &quot;Dispatched&quot;.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
                    <Select value={siteFilter} onValueChange={(value) => setSiteFilter(value === 'all' ? '' : value)}>
                        <SelectTrigger className="w-full sm:w-[180px] bg-background">
                            <SelectValue placeholder="Filter by Site" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Sites</SelectItem>
                            {siteOptions.map(site => <SelectItem key={site} value={site}>{site}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
                        <SelectTrigger className="w-full sm:w-[180px] bg-background">
                            <SelectValue placeholder="Filter by Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="Packed">Packed</SelectItem>
                            <SelectItem value="Dispatched">Dispatched</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>
                 
                 <div className="space-y-8">
                    {Object.keys(groupedBySite).length > 0 ? (
                        Object.entries(groupedBySite).map(([siteName, items]) => (
                            <div key={siteName} className="p-4 border rounded-lg shadow-md">
                                <h2 className="text-2xl font-bold text-center mb-4 text-primary">{siteName}</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {items.map((item) => {
                                        const rowData = item.groupData;
                                        const isDispatched = item.status === 'Dispatched';
                                        
                                        return (
                                            <Card key={item.id} className={`shadow-lg transition-all ${isDispatched ? 'bg-accent/10' : 'bg-green-50'}`}>
                                                <CardHeader>
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-1 space-y-2">
                                                            <div className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                                                                <span className="font-semibold text-primary">{rowData.site_name}</span>
                                                                <Separator orientation="vertical" className="h-4 bg-border" />
                                                                <span>{rowData.user_enclosure_name}</span>
                                                                <Separator orientation="vertical" className="h-4 bg-border" />
                                                                <span>{rowData.common_name} ({rowData.animalCount})</span>
                                                            </div>
                                                            <CardTitle className="text-xl font-bold">{rowData.type_name}</CardTitle>
                                                        </div>
                                                        <Badge variant={isDispatched ? "default" : "secondary"} className={`ml-4 flex-shrink-0 ${isDispatched ? 'bg-accent' : 'bg-green-600'}`}>
                                                            {item.status}
                                                        </Badge>
                                                    </div>
                                                </CardHeader>
                                                <CardContent>
                                                    <Button
                                                      size="sm"
                                                      className="w-full"
                                                      variant={isDispatched ? 'destructive' : 'default'}
                                                      onClick={() => handleToggleGroupStatus(item.itemIds, item.status)}
                                                      style={{backgroundColor: isDispatched ? '' : 'hsl(var(--primary))'}}
                                                    >
                                                      {isDispatched ? <X className="mr-2" /> : <Truck className="mr-2" />}
                                                      {isDispatched ? 'Mark as Packed' : 'Mark as Dispatched'}
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                        )
                                    })}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center p-12 border-2 border-dashed rounded-lg">
                            <p className="text-muted-foreground">
                                No items match the current filters.
                            </p>
                        </div>
                    )}
                 </div>
            </CardContent>
        </Card>
    </div>
  );
}
