
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

interface MealGroupBreakupRow {
  groupName: string;
  ingredient: string;
  speciesCount: number;
  animalCount: number;
  enclosureCount: number;
  siteCount: number;
  totals: { [uom: string]: { qty: number; qty_gram: number } };
}

export function MealGroupBreakupTable({ data }: { data: SheetDataRow[] }) {
  const [feedTypeFilter, setFeedTypeFilter] = useState<string>("");

  const feedTypeOptions = useMemo(
    () => [...new Set(data.map((item) => item["Feed type name"]))].sort(),
    [data]
  );

  const filteredData = useMemo(() => {
    if (!feedTypeFilter) return data;
    return data.filter(
      (row) => row["Feed type name"] === feedTypeFilter
    );
  }, [data, feedTypeFilter]);

  const breakupData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];

    const groupMap = new Map<
      string,
      {
        species: Set<string>;
        animals: Set<string>;
        enclosures: Set<string>;
        sites: Set<string>;
        totals: { [uom: string]: { qty: number; qty_gram: number } };
      }
    >();

    filteredData.forEach((row) => {
      const {
        type_name,
        ingredient_name,
        common_name,
        animal_id,
        user_enclosure_name,
        site_name,
        ingredient_qty,
        ingredient_qty_gram,
        base_uom_name,
      } = row;

      // Use a composite key of group name and ingredient name for aggregation
      const key = `${type_name}|${ingredient_name}`;

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          species: new Set(),
          animals: new Set(),
          enclosures: new Set(),
          sites: new Set(),
          totals: {},
        });
      }

      const groupEntry = groupMap.get(key)!;
      groupEntry.species.add(common_name);
      groupEntry.animals.add(animal_id);
      groupEntry.enclosures.add(user_enclosure_name);
      groupEntry.sites.add(site_name);

      const uom = base_uom_name || "N/A";
      if (!groupEntry.totals[uom]) {
        groupEntry.totals[uom] = { qty: 0, qty_gram: 0 };
      }
      groupEntry.totals[uom].qty += ingredient_qty || 0;
      groupEntry.totals[uom].qty_gram += ingredient_qty_gram || 0;
    });

    const result: MealGroupBreakupRow[] = Array.from(groupMap.entries()).map(
      ([key, counts]) => {
        const [groupName, ingredient] = key.split('|');
        return {
          groupName,
          ingredient,
          speciesCount: counts.species.size,
          animalCount: counts.animals.size,
          enclosureCount: counts.enclosures.size,
          siteCount: counts.sites.size,
          totals: counts.totals,
        }
      }
    );

    return result.sort((a, b) => a.groupName.localeCompare(b.groupName) || a.ingredient.localeCompare(b.ingredient));
  }, [filteredData]);

  const formatTotals = (totals: {
    [uom: string]: { qty: number; qty_gram: number };
  }) => {
    if (Object.keys(totals).length === 0) return "-";

    return Object.entries(totals)
      .map(([uom, values]) => {
        const uomLower = uom.toLowerCase();
        const isWeight =
          uomLower === "kilogram" || uomLower === "kg" || uomLower === "gram";

        if (isWeight) {
          if (
            (uomLower === "kilogram" || uomLower === "kg") &&
            values.qty < 1 &&
            values.qty > 0
          ) {
            return `${values.qty_gram.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })} gram`;
          }
          return `${values.qty.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} ${uom}`;
        }

        const uomDisplay =
          values.qty === 1 && uom.endsWith("s") ? uom.slice(0, -1) : uom;
        const qtyDisplay = Number.isInteger(values.qty)
          ? values.qty.toLocaleString()
          : values.qty.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });

        return `${qtyDisplay} ${uomDisplay}`;
      })
      .join(", ");
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl">
          Meal Group Breakup Details
        </CardTitle>
        <CardDescription>
          A detailed breakdown of ingredients within each meal group (recipe/combo).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
          <Select
            value={feedTypeFilter}
            onValueChange={(value) =>
              setFeedTypeFilter(value === "all" ? "" : value)
            }
          >
            <SelectTrigger className="w-full sm:w-[240px] bg-background">
              <SelectValue placeholder="Filter by Feed Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Feed Types</SelectItem>
              {feedTypeOptions.map((option, index) => (
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
                <TableHead>Group Name</TableHead>
                <TableHead>Ingredient</TableHead>
                <TableHead className="text-right">Total Qty Required</TableHead>
                <TableHead className="text-center">Count of Species</TableHead>
                <TableHead className="text-center">Count of Animals</TableHead>
                <TableHead className="text-center">
                  Count of Enclosures
                </TableHead>
                <TableHead className="text-center">Count of Sites</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {breakupData.length > 0 ? (
                breakupData.map((row, index) => (
                  <TableRow key={`${row.groupName}-${row.ingredient}-${index}`}>
                    <TableCell className="font-medium">
                      {row.groupName}
                    </TableCell>
                    <TableCell>{row.ingredient}</TableCell>
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
                    colSpan={7}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No data available for the selected filter.
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
