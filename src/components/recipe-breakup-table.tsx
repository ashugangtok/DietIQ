
"use client";

import { useMemo, useState } from "react";
import { type SheetDataRow } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "./ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "./ui/badge";

interface RecipeBreakdown {
  ingredientName: string;
  totalQty: number;
  totalQtyGram: number;
  uom: string;
}

const isWeightUnit = (uom: string) => {
    if (!uom) return false;
    const lowerUom = uom.toLowerCase();
    return lowerUom === 'gram' || lowerUom === 'kg' || lowerUom === 'kilogram';
};

const formatAmount = (quantity: number, quantityGram: number, uom: string) => {
    if (!uom) return "0";
    const uomLower = uom.toLowerCase();
    
    if (isWeightUnit(uom)) {
        if ((uomLower === 'kilogram' || uomLower === 'kg') && quantity < 1 && quantity > 0) {
            return `${(quantityGram || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} gram`;
        }
        return `${(quantity || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${uom}`;
    }
     if (quantity === 1) {
      return `${(quantity || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} ${uom}`;
    }
    return `${(quantity || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${uom}`;
};

export function RecipeBreakupTable({ data }: { data: SheetDataRow[] }) {
  const [selectedRecipe, setSelectedRecipe] = useState<string>("");
  const [selectedGroup, setSelectedGroup] = useState<string>("");

  const recipeOptions = useMemo(
    () =>
      [
        ...new Set(
          data
            .filter((item) => {
              const typeLower = item.type?.toLowerCase();
              return typeLower === "recipe" || typeLower === "combo";
            })
            .map((item) => item.type_name)
        ),
      ].sort(),
    [data]
  );

  const groupOptionsForSelectedRecipe = useMemo(() => {
    if (!selectedRecipe) return [];
    return [
      ...new Set(
        data
          .filter(row => row.type_name === selectedRecipe && row.group_name)
          .map(row => row.group_name)
      )
    ].sort();
  }, [data, selectedRecipe]);
  
  // Reset selected group when recipe changes
  React.useEffect(() => {
    setSelectedGroup("");
  }, [selectedRecipe]);

  const recipeData = useMemo(() => {
    if (!selectedRecipe) return { breakdown: [], grandTotalGrams: 0, usedByGroups: [] };
    
    const recipeRows = data.filter(row => 
      row.type_name === selectedRecipe &&
      (!selectedGroup || row.group_name === selectedGroup)
    );
    
    const ingredientMap = new Map<string, { qty: number; qty_gram: number; uom: string }>();
    
    recipeRows.forEach(row => {
      const { ingredient_name, ingredient_qty, ingredient_qty_gram, base_uom_name } = row;
      
      if (!ingredientMap.has(ingredient_name)) {
        ingredientMap.set(ingredient_name, { qty: 0, qty_gram: 0, uom: base_uom_name });
      }
      const current = ingredientMap.get(ingredient_name)!;
      current.qty += ingredient_qty;
      current.qty_gram += ingredient_qty_gram;
    });

    const breakdown: RecipeBreakdown[] = Array.from(ingredientMap.entries()).map(
      ([ingredientName, totals]) => ({
        ingredientName,
        totalQty: totals.qty,
        totalQtyGram: totals.qty_gram,
        uom: totals.uom,
      })
    ).sort((a,b) => b.totalQtyGram - a.totalQtyGram);

    const grandTotalGrams = breakdown.reduce((sum, item) => sum + item.totalQtyGram, 0);

    return { breakdown, grandTotalGrams, usedByGroups: groupOptionsForSelectedRecipe };

  }, [data, selectedRecipe, selectedGroup, groupOptionsForSelectedRecipe]);

  const formatGrandTotal = (grams: number) => {
    if (grams < 1000) {
        return `${grams.toLocaleString(undefined, { maximumFractionDigits: 2})} g`;
    }
    return `${(grams / 1000).toLocaleString(undefined, { maximumFractionDigits: 2})} kg`;
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl">
          Recipe Breakup
        </CardTitle>
        <CardDescription>
          Select a recipe or combo to see the total quantity of its constituent ingredients.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
          <div className="flex flex-wrap gap-4">
            <Select
              value={selectedRecipe}
              onValueChange={setSelectedRecipe}
            >
              <SelectTrigger className="w-full sm:w-[280px] bg-background">
                <SelectValue placeholder="Select a Recipe or Combo..." />
              </SelectTrigger>
              <SelectContent>
                {recipeOptions.map((option, index) => (
                  <SelectItem key={`${option}-${index}`} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedRecipe && (
              <Select
                value={selectedGroup}
                onValueChange={(value) => setSelectedGroup(value === 'all' ? '' : value)}
              >
                <SelectTrigger className="w-full sm:w-[280px] bg-background">
                  <SelectValue placeholder="Filter by Group..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Groups</SelectItem>
                  {groupOptionsForSelectedRecipe.map((option, index) => (
                    <SelectItem key={`${option}-${index}`} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          
          {selectedRecipe && !selectedGroup && recipeData.usedByGroups.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Used by Groups:</span>
                {recipeData.usedByGroups.map(group => (
                    <Badge key={group} variant="secondary">{group}</Badge>
                ))}
            </div>
          )}
        </div>

        <div className="relative overflow-x-auto rounded-md border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Ingredient</TableHead>
                <TableHead className="text-right">Total Quantity Required</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedRecipe && recipeData.breakdown.length > 0 ? (
                recipeData.breakdown.map((row) => (
                  <TableRow key={row.ingredientName}>
                    <TableCell className="font-medium">{row.ingredientName}</TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      {formatAmount(row.totalQty, row.totalQtyGram, row.uom)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {selectedRecipe ? "No data for this recipe/group combination." : "Please select a recipe to see its breakdown."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            {selectedRecipe && recipeData.breakdown.length > 0 && (
                <TableFooter>
                    <TableRow className="bg-primary/10">
                        <TableHead className="text-right font-bold text-lg">Grand Total</TableHead>
                        <TableHead className="text-right font-bold text-lg text-primary">
                            {formatGrandTotal(recipeData.grandTotalGrams)}
                        </TableHead>
                    </TableRow>
                </TableFooter>
            )}
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
