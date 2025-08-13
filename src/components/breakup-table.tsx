
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

interface BreakupTableProps {
  data: SheetDataRow[];
}

interface BreakupRow {
  ingredient: string;
  speciesCount: number;
  animalCount: number;
  enclosureCount: number;
  siteCount: number;
}

export function BreakupTable({ data }: BreakupTableProps) {
  const breakupData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const ingredientMap = new Map<
      string,
      {
        species: Set<string>;
        animals: Set<string>;
        enclosures: Set<string>;
        sites: Set<string>;
      }
    >();

    data.forEach((row) => {
      const {
        ingredient_name,
        common_name,
        animal_id,
        user_enclosure_name,
        site_name,
      } = row;

      if (!ingredientMap.has(ingredient_name)) {
        ingredientMap.set(ingredient_name, {
          species: new Set(),
          animals: new Set(),
          enclosures: new Set(),
          sites: new Set(),
        });
      }

      const ingredientEntry = ingredientMap.get(ingredient_name)!;
      ingredientEntry.species.add(common_name);
      ingredientEntry.animals.add(animal_id);
      ingredientEntry.enclosures.add(user_enclosure_name);
      ingredientEntry.sites.add(site_name);
    });

    const result: BreakupRow[] = Array.from(
      ingredientMap.entries()
    ).map(([ingredient, counts]) => ({
      ingredient,
      speciesCount: counts.species.size,
      animalCount: counts.animals.size,
      enclosureCount: counts.enclosures.size,
      siteCount: counts.sites.size,
    }));

    return result.sort((a, b) => a.ingredient.localeCompare(b.ingredient));
  }, [data]);

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
                    colSpan={5}
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
