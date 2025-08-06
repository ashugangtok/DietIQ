
"use client";

import { useContext, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataContext, PackingItem } from "@/context/data-context";
import { type SheetDataRow } from "@/types";

const isWeightUnit = (uom: string) => {
    const lowerUom = uom.toLowerCase();
    return lowerUom === 'gram' || lowerUom === 'kg' || lowerUom === 'kilogram';
}

const formatQuantity = (quantity: number, quantityGram: number, uom: string) => {
    const uomLower = uom.toLowerCase();
    if (isWeightUnit(uom)) {
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

  const aggregatedPackingList = useMemo(() => {
    if (data.length === 0) return [];
    
    const summaryMap = new Map<string, { qty: number; qty_gram: number; uom: string; uom_gram: string }>();

    data.forEach((row: SheetDataRow) => {
        const key = `${row.site_name}|${row.ingredient_name}`;
        const current = summaryMap.get(key) || { qty: 0, qty_gram: 0, uom: row.base_uom_name, uom_gram: row.base_uom_name_gram };

        current.qty += row.ingredient_qty;
        current.qty_gram += row.ingredient_qty_gram;
        
        summaryMap.set(key, current);
    });
    
    const initialList = Array.from(summaryMap.entries()).map(([key, totals]) => {
        const [site, ingredient] = key.split('|');
        const formattedQuantity = formatQuantity(totals.qty, totals.qty_gram, totals.uom);

        return {
            id: key,
            site,
            ingredient,
            quantity: formattedQuantity,
            status: "Pending" as "Pending" | "Packed",
        };
    });

    if (packingList.length === 0 && initialList.length > 0) {
        setPackingList(initialList);
        return initialList;
    }

    return packingList.map(item => ({
        ...item,
        quantity: initialList.find(i => i.id === item.id)?.quantity || item.quantity
    })).filter(item => item.quantity); // Filter out items that are no longer in the uploaded data

  }, [data, packingList, setPackingList]);
  
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
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Site Name</TableHead>
                            <TableHead>Ingredient Name</TableHead>
                            <TableHead>Quantity Required</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {aggregatedPackingList.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell>{item.site}</TableCell>
                                <TableCell>{item.ingredient}</TableCell>
                                <TableCell>{item.quantity}</TableCell>
                                <TableCell>
                                    <Badge variant={item.status === "Packed" ? "default" : "secondary"}>
                                        {item.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Button size="sm" onClick={() => handleToggleStatus(item.id)}>
                                       {item.status === 'Packed' ? 'Mark as Pending' : 'Mark as Packed'}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  );
}
