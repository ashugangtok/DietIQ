
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
  totalKg: number;
  totalPcs: number;
  totalLtr: number;
}

const formatQuantity = (kg: number, pcs: number, ltr: number) => {
    const parts: string[] = [];
    
    const formatNumber = (num: number) => {
      // Check if the number is an integer
      if (num % 1 === 0) {
        return num.toLocaleString(); // Format with no decimal places
      }
      // For decimals, format with up to 2 decimal places
      return num.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
    }

    if (kg > 0) {
      if (kg < 1) {
        const grams = kg * 1000;
        parts.push(`${formatNumber(grams)} g`);
      } else {
        parts.push(`${formatNumber(kg)} kg`);
      }
    }
    if (pcs > 0) {
      parts.push(`${formatNumber(pcs)} pcs`);
    }
    if (ltr > 0) {
      parts.push(`${formatNumber(ltr)} ltr`);
    }
    return parts.join(', ') || '-';
};


export default function TotalIngredientReqPage() {
  const { data, speciesSiteData, uploadType } = useContext(DataContext);
  const [siteFilter, setSiteFilter] = useState<string>("");
  const [ingredientFilter, setIngredientFilter] = useState<string>("");

  const activeData = uploadType === 'species' ? speciesSiteData : data;

  const siteOptions = useMemo(
    () => [...new Set(activeData.map((item) => item.site_name))].sort(),
    [activeData]
  );
  
  const ingredientOptions = useMemo(
    () => [...new Set(activeData.map((item) => item.ingredient_name))].sort(),
    [activeData]
  );

  const filteredData = useMemo(() => {
    return activeData.filter((row) => {
      const siteMatch = !siteFilter || row.site_name === siteFilter;
      const ingredientMatch = !ingredientFilter || row.ingredient_name === ingredientFilter;
      return siteMatch && ingredientMatch;
    });
  }, [activeData, siteFilter, ingredientFilter]);

  const aggregatedIngredients = useMemo(() => {
    if (filteredData.length === 0) return [];

    const ingredientMap = new Map<string, { kg: number; pcs: number; ltr: number }>();

    filteredData.forEach((row) => {
      const { ingredient_name, Kilogram, Piece, Litre } = row;

      if (!ingredientMap.has(ingredient_name)) {
        ingredientMap.set(ingredient_name, { kg: 0, pcs: 0, ltr: 0 });
      }

      const current = ingredientMap.get(ingredient_name)!;
      current.kg += parseFloat(String(Kilogram)) || 0;
      current.pcs += parseFloat(String(Piece)) || 0;
      current.ltr += parseFloat(String(Litre)) || 0;
    });

    const result: AggregatedIngredient[] = Array.from(ingredientMap.entries()).map(
      ([name, totals]) => ({
        name,
        totalKg: totals.kg,
        totalPcs: totals.pcs,
        totalLtr: totals.ltr,
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
                      {formatQuantity(row.totalKg, row.totalPcs, row.totalLtr)}
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
