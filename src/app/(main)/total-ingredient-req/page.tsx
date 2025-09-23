
"use client";

import { useContext, useMemo, useState } from "react";
import { DataContext } from "@/context/data-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type SheetDataRow } from "@/types";

interface AggregatedIngredient {
  name: string;
  totalQty: number;
  totalGram: number;
  uom: string;
}

const formatAmount = (quantity: number, quantityGram: number, uom: string) => {
    if (!uom) return "0";
    const uomLower = uom.toLowerCase();
    
    if (uomLower === 'kilogram' || uomLower === 'kg') {
        const totalGrams = quantityGram > 0 ? quantityGram : quantity * 1000;
        if (totalGrams < 1000) {
            return `${totalGrams.toLocaleString(undefined, { maximumFractionDigits: 2 })} g`;
        }
        return `${(totalGrams / 1000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`;
    }
    
    if (quantity === 1) {
      return `${quantity.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${uom}`;
    }
    return `${quantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${uom}`;
};


export default function TotalIngredientReqPage() {
  const { data } = useContext(DataContext);
  const [siteFilter, setSiteFilter] = useState<string>("");
  const [ingredientFilter, setIngredientFilter] = useState<string>("");

  const siteOptions = useMemo(
    () => [...new Set(data.map((item) => item.site_name))].sort(),
    [data]
  );
  
  const ingredientOptions = useMemo(
    () => [...new Set(data.map((item) => item.ingredient_name))].sort(),
    [data]
  );

  const filteredData = useMemo(() => {
    return data.filter((row) => {
      const siteMatch = !siteFilter || row.site_name === siteFilter;
      const ingredientMatch = !ingredientFilter || row.ingredient_name === ingredientFilter;
      return siteMatch && ingredientMatch;
    });
  }, [data, siteFilter, ingredientFilter]);

  const aggregatedIngredients = useMemo(() => {
    if (filteredData.length === 0) return [];

    const ingredientMap = new Map<string, { qty: number; qty_gram: number; uom: string }>();

    filteredData.forEach((row) => {
      const { ingredient_name, ingredient_qty, ingredient_qty_gram, base_uom_name } = row;

      if (!ingredientMap.has(ingredient_name)) {
        ingredientMap.set(ingredient_name, { qty: 0, qty_gram: 0, uom: base_uom_name });
      }

      const current = ingredientMap.get(ingredient_name)!;
      current.qty += ingredient_qty || 0;
      current.qty_gram += ingredient_qty_gram || 0;
    });

    const result: AggregatedIngredient[] = Array.from(ingredientMap.entries()).map(
      ([name, totals]) => ({
        name,
        totalQty: totals.qty,
        totalGram: totals.qty_gram,
        uom: totals.uom,
      })
    );
    
    return result.sort((a,b) => a.name.localeCompare(b.name));

  }, [filteredData]);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl">
          Total Ingredient Requirements
        </CardTitle>
        <CardDescription>
          A summary of the total quantity required for each ingredient.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
          <Select
            value={siteFilter}
            onValueChange={(value) => setSiteFilter(value === "all" ? "" : value)}
          >
            <SelectTrigger className="w-full sm:w-[240px]">
              <SelectValue placeholder="Filter by Site" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sites</SelectItem>
              {siteOptions.map((option, index) => (
                <SelectItem key={`${option}-${index}`} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={ingredientFilter}
            onValueChange={(value) => setIngredientFilter(value === "all" ? "" : value)}
          >
            <SelectTrigger className="w-full sm:w-[240px]">
              <SelectValue placeholder="Filter by Ingredient" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ingredients</SelectItem>
              {ingredientOptions.map((option, index) => (
                <SelectItem key={`${option}-${index}`} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="relative overflow-x-auto rounded-md border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Ingredient Name</TableHead>
                <TableHead className="text-right">Total Quantity Required</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aggregatedIngredients.length > 0 ? (
                aggregatedIngredients.map((row) => (
                  <TableRow key={row.name}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      {formatAmount(row.totalQty, row.totalGram, row.uom)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No data available for the selected filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
