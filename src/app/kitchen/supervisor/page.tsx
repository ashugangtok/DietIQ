
"use client";

import { useState, useMemo, useContext } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataContext } from "@/context/data-context";
import { type SheetDataRow } from "@/types";

type SupervisorItem = {
    id: string;
    site_name: string;
    user_enclosure_name: string;
    common_name: string;
    animalCount: number;
    type_name: string;
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
        if (data.length === 0) return [];
    
        const packedOrDispatchedItems = packingList.filter(item => item.status === 'Packed' || item.status === 'Dispatched');
    
        const aggregationMap = new Map<string, {
            id: string; // The ID of the original packing item
            site_name: string;
            user_enclosure_name: string;
            common_name: string;
            animalCount: number;
            type_name: string;
            status: 'Packed' | 'Dispatched';
        }>();
        
        // This is a simplified aggregation just to get the display data for the supervisor view.
        // It relies on the packing list's aggregated IDs.
        const itemDetailsMap = new Map<string, SheetDataRow>();
        data.forEach(row => {
            const originalItemId = `${row.site_name}|${row.user_enclosure_name}|${row.common_name}|${row.meal_start_time}|${row.type === 'Recipe' || row.type === 'Combo' ? row.type_name : row.ingredient_name}`;
            if (!itemDetailsMap.has(originalItemId)) {
                itemDetailsMap.set(originalItemId, row);
            }
        });

        // Get animal counts
        const animalCounts = new Map<string, number>();
        data.forEach(row => {
            const key = `${row.site_name}|${row.user_enclosure_name}|${row.common_name}`;
            if (!animalCounts.has(key)) {
                const animalSet = new Set(data.filter(d => 
                    d.site_name === row.site_name && 
                    d.user_enclosure_name === row.user_enclosure_name && 
                    d.common_name === row.common_name
                ).map(d => d.animal_id));
                animalCounts.set(key, animalSet.size);
            }
        });

        packedOrDispatchedItems.forEach(item => {
            const [site, enclosure, commonName, mealTime, typeName] = item.id.split('|');
            const groupKey = `${site}|${enclosure}|${commonName}|${mealTime}|${typeName}`;

            if (aggregationMap.has(groupKey)) return;

            const animalCountKey = `${site}|${enclosure}|${commonName}`;
            
            aggregationMap.set(groupKey, {
                id: item.id,
                site_name: site,
                user_enclosure_name: enclosure,
                common_name: commonName,
                animalCount: animalCounts.get(animalCountKey) || 0,
                type_name: typeName,
                status: item.status,
            });
        });
        
        return Array.from(aggregationMap.values());

    }, [data, packingList]);

    const filteredDispatchList = useMemo(() => {
        return dispatchList.filter(item => {
            const siteMatch = !siteFilter || item.site_name === siteFilter;
            const statusMatch = statusFilter === 'all' || item.status === statusFilter;
            return siteMatch && statusMatch;
        });
    }, [dispatchList, siteFilter, statusFilter]);
    
    const groupedBySite = useMemo(() => {
        return filteredDispatchList.reduce((acc, item) => {
          const siteName = item.site_name;
          if (!acc[siteName]) {
            acc[siteName] = [];
          }
          acc[siteName].push(item);
          return acc;
        }, {} as Record<string, SupervisorItem[]>);
    }, [filteredDispatchList]);

    const handleToggleStatus = (id: string) => {
        setPackingList(currentList => currentList.map(item => {
            if (item.id === id) {
                return { ...item, status: item.status === 'Packed' ? 'Dispatched' : 'Packed' };
            }
            // Since supervisor actions might be on a group, we update all items of a group.
            // This is a simplified approach. A more robust solution might need to check group membership.
            const [site, enclosure, common, meal, type] = item.id.split('|');
            const [idSite, idEnclosure, idCommon, idMeal, idType] = id.split('|');
            if(site === idSite && enclosure === idEnclosure && common === idCommon && meal === idMeal && type === idType){
                 return { ...item, status: item.status === 'Packed' ? 'Dispatched' : 'Packed' };
            }

            return item;
        }));
    };
    
    // This is a bit of a hack to update all items in a group
    const handleToggleGroupStatus = (itemToUpdate: SupervisorItem) => {
        const newStatus = itemToUpdate.status === 'Packed' ? 'Dispatched' : 'Packed';

        setPackingList(currentList => currentList.map(item => {
            const [itemSite, itemEnclosure, itemCommon, itemMeal, itemType] = item.id.split('|');
            const match = 
                itemSite === itemToUpdate.site_name &&
                itemEnclosure === itemToUpdate.user_enclosure_name &&
                itemCommon === itemToUpdate.common_name &&
                itemType === itemToUpdate.type_name;
            
            if (match && item.status !== newStatus) {
                return { ...item, status: newStatus };
            }
            return item;
        }));
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
                                <div className="relative overflow-x-auto rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Enclosure</TableHead>
                                                <TableHead>Common Name</TableHead>
                                                <TableHead>Item</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {items.map((item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell>{item.user_enclosure_name}</TableCell>
                                                    <TableCell>{item.common_name} ({item.animalCount})</TableCell>
                                                    <TableCell>{item.type_name}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={item.status === "Dispatched" ? "default" : "secondary"} className={item.status === "Dispatched" ? "bg-accent" : ""}>
                                                            {item.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button size="sm" variant="outline" onClick={() => handleToggleGroupStatus(item)}>
                                                            {item.status === 'Packed' ? 'Mark as Dispatched' : 'Mark as Packed'}
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
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
