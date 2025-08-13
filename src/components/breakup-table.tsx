
"use client";

import { useMemo } from "react";
import { type SheetDataRow } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";

interface BreakupRow {
  ingredient: string;
  speciesCount: number;
  animalCount: number;
  enclosureCount: number;
  siteCount: number;
  totals: { [uom: string]: { qty: number; qty_gram: number } };
}

export function BreakupTable({ data }: { data: SheetDataRow[] }) {
  const breakupData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const ingredientMap = new Map<
      string,
      {
        species: Set<string>;
        animals: Set<string>;
        enclosures: Set<string>;
        sites: Set<string>;
        totals: { [uom: string]: { qty: number, qty_gram: number } };
      }
    >();

    data.forEach((row) => {
      const {
        ingredient_name,
        common_name,
        animal_id,
        user_enclosure_name,
        site_name,
        ingredient_qty,
        ingredient_qty_gram,
        base_uom_name,
      } = row;

      if (!ingredientMap.has(ingredient_name)) {
        ingredientMap.set(ingredient_name, {
          species: new Set(),
          animals: new Set(),
          enclosures: new Set(),
          sites: new Set(),
          totals: {},
        });
      }

      const ingredientEntry = ingredientMap.get(ingredient_name)!;
      ingredientEntry.species.add(common_name);
      ingredientEntry.animals.add(animal_id);
      ingredientEntry.enclosures.add(user_enclosure_name);
      ingredientEntry.sites.add(site_name);

      const uom = base_uom_name || 'N/A';
      if (!ingredientEntry.totals[uom]) {
        ingredientEntry.totals[uom] = { qty: 0, qty_gram: 0 };
      }
      ingredientEntry.totals[uom].qty += (ingredient_qty || 0);
      ingredientEntry.totals[uom].qty_gram += (ingredient_qty_gram || 0);

    });

    const result: BreakupRow[] = Array.from(
      ingredientMap.entries()
    ).map(([ingredient, counts]) => ({
      ingredient,
      speciesCount: counts.species.size,
      animalCount: counts.animals.size,
      enclosureCount: counts.enclosures.size,
      siteCount: counts.sites.size,
      totals: counts.totals,
    }));

    return result.sort((a, b) => a.ingredient.localeCompare(b.ingredient));
  }, [data]);

  const formatTotals = (totals: { [uom: string]: { qty: number; qty_gram: number } }) => {
    if (Object.keys(totals).length === 0) return "-";
    
    return Object.entries(totals)
      .map(([uom, values]) => {
        const uomLower = uom.toLowerCase();
        const isWeight = uomLower === 'kilogram' || uomLower === 'kg';

        if (isWeight) {
          if (values.qty < 1 && values.qty > 0) {
            return `${values.qty_gram.toLocaleString(undefined, { maximumFractionDigits: 0 })} gram`;
          }
          return `${values.qty.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${uom}`;
        }
        
        const uomDisplay = values.qty === 1 && uom.endsWith('s') ? uom.slice(0, -1) : uom;
        const qtyDisplay = Number.isInteger(values.qty) 
          ? values.qty.toLocaleString() 
          : values.qty.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        return `${qtyDisplay} ${uomDisplay}`;
      })
      .join(', ');
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl">
          Ingredient Breakup Details
        </CardTitle>
        <CardDescription>
          A detailed breakdown of how each ingredient is distributed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative overflow-x-auto rounded-md border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Ingredient</TableHead>
                <TableHead className="text-right">Total Qty Required</TableHead>
                <TableHead className="text-center">Count of Species</TableHead>
                <TableHead className="text-center">Count of Animals</TableHead>
                <TableHead className="text-center">Count of Enclosures</TableHead>
                <TableHead className="text-center">Count of Sites</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {breakupData.length > 0 ? (
                breakupData.map((row) => (
                  <TableRow key={row.ingredient}>
                    <TableCell className="font-medium">
                      {row.ingredient}
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      {formatTotals(row.totals)}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.speciesCount}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.animalCount}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.enclosureCount}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.siteCount}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No data available to display breakup details.
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
