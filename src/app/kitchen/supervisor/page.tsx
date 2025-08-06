
"use client";

import { useState, useMemo, useContext } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DataContext, PackingItem } from "@/context/data-context";
import { type SheetDataRow } from "@/types";

type SupervisorItem = {
    id: string;
    site_name: string;
    ingredient: string;
    quantity: string;
    status: 'Packed' | 'Dispatched';
}

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
        const itemDetailsMap = new Map<string, SheetDataRow[]>();

        // This is inefficient but necessary to reconstruct the details from the ID
        data.forEach(row => {
            const commonGroupKey = `${row.site_name}|${row.user_enclosure_name}|${row.common_name}`;
            const aggregationKey = `${commonGroupKey}|${row['Feed type name']}|${row.type === 'Recipe' || row.type === 'Combo' ? row.type_name : row.ingredient_name}`;
            
            if (!itemDetailsMap.has(aggregationKey)) {
                itemDetailsMap.set(aggregationKey, []);
            }
            itemDetailsMap.get(aggregationKey)!.push(row);
        });
        
        const result: SupervisorItem[] = [];

        packedOrDispatchedItems.forEach(item => {
            const details = itemDetailsMap.get(item.id);
            if (!details || details.length === 0) return;

            const firstDetail = details[0];
            let ingredientName = "";
            let totalQty = 0;
            let totalQtyGram = 0;

            if (firstDetail.type === 'Recipe' || firstDetail.type === 'Combo') {
                const recipeIngredients = [...new Set(details.map(d => d.ingredient_name))];
                ingredientName = `${firstDetail.type_name}: ${recipeIngredients.join(', ')}`;
            } else {
                ingredientName = firstDetail.ingredient_name;
            }

            details.forEach(d => {
                totalQty += d.ingredient_qty;
                totalQtyGram += d.ingredient_qty_gram;
            });
            
            result.push({
                id: item.id,
                site_name: firstDetail.site_name,
                ingredient: ingredientName,
                quantity: formatTotal(totalQty, totalQtyGram, firstDetail.base_uom_name),
                status: item.status as 'Packed' | 'Dispatched',
            });
        });
        
        return result;

    }, [data, packingList]);

    const filteredDispatchList = useMemo(() => {
        return dispatchList.filter(item => {
            const siteMatch = !siteFilter || item.site_name === siteFilter;
            const statusMatch = statusFilter === 'all' || item.status === statusFilter;
            return siteMatch && statusMatch;
        }).sort((a,b) => a.site_name.localeCompare(b.site_name));
    }, [dispatchList, siteFilter, statusFilter]);

    const handleToggleStatus = (id: string, currentStatus: 'Packed' | 'Dispatched') => {
        setPackingList(currentList => currentList.map(item => {
            if (item.id === id) {
                return { ...item, status: currentStatus === 'Packed' ? 'Dispatched' : 'Packed' };
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
                 <div className="relative overflow-x-auto rounded-md border">
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Site</TableHead>
                                <TableHead>Ingredient</TableHead>
                                <TableHead>Quantity Packed</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredDispatchList.length > 0 ? (
                                filteredDispatchList.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>{item.site_name}</TableCell>
                                        <TableCell>{item.ingredient}</TableCell>
                                        <TableCell>{item.quantity}</TableCell>
                                        <TableCell>
                                            <Badge variant={item.status === "Dispatched" ? "default" : "secondary"} className={item.status === "Dispatched" ? "bg-accent" : ""}>
                                                {item.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Button size="sm" variant="outline" onClick={() => handleToggleStatus(item.id, item.status)}>
                                                {item.status === 'Packed' ? 'Mark as Dispatched' : 'Mark as Packed'}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        No items are currently packed or dispatched.
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
