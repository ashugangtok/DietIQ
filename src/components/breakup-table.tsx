
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

interface BreakupRow {
  ingredient: string;
  speciesCount: number;
  animalCount: number;
  enclosureCount: number;
  siteCount: number;
  totals: { [uom: string]: { qty: number; qty_gram: number } };
}

const isWeightUnit = (uom: string) => {
    if (!uom) return false;
    const lowerUom = uom.toLowerCase();
    return lowerUom === 'gram' || lowerUom === 'kg' || lowerUom === 'kilogram';
};

const isPieceUnit = (uom: string) => {
    if (!uom) return false;
    const lowerUom = uom.toLowerCase();
    return lowerUom.includes('piece') || lowerUom.includes('pc');
};

const INSECT_WEIGHTS_G: { [key: string]: number } = {
  'ant eggs': 0.003,
  'caedicia major': 2.0,
  'cockroaches': 2.5,
  'crickets': 0.5,
  'house geckos': 5.0,
  'locusts': 2.0,
  'maggots': 0.03,
  'mealworms': 0.12,
  'superworms': 2.0,
  'silkworm': 1.0,
};

const formatTotal = (quantity: number, quantityGram: number, uom: string) => {
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

const formatSeparatedTotals = (totals: BreakupRow['totals']) => {
    let totalWeightGrams = 0;
    const pieceTotals: string[] = [];

    Object.entries(totals).forEach(([uom, values]) => {
        if (isWeightUnit(uom)) {
            totalWeightGrams += values.qty_gram;
        } else {
            pieceTotals.push(formatTotal(values.qty, values.qty_gram, uom));
        }
    });

    const weight = totalWeightGrams < 1000 
      ? `${totalWeightGrams.toLocaleString(undefined, { maximumFractionDigits: 2 })} g`
      : `${(totalWeightGrams / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} kg`;

    return {
        weight: totalWeightGrams > 0 ? weight : '-',
        pieces: pieceTotals.join(', ') || '-',
        rawWeightGrams: totalWeightGrams
    };
};
  
const getPcsToWeightInGrams = (ingredientName: string, totals: BreakupRow['totals']): number => {
    const lowerIngredientName = ingredientName.toLowerCase();
    const avgWeight = INSECT_WEIGHTS_G[lowerIngredientName];
    if (!avgWeight) return 0;
  
    let totalPieces = 0;
    Object.entries(totals).forEach(([uom, values]) => {
      if (isPieceUnit(uom)) {
        totalPieces += values.qty;
      }
    });
  
    return totalPieces * avgWeight;
};

const formatWeightFromGrams = (grams: number) => {
    if (grams === 0) return '-';
    if (grams < 1000) {
      return `${grams.toLocaleString(undefined, { maximumFractionDigits: 2 })} g`;
    }
    return `${(grams / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} kg`;
};

export function BreakupTable({ data }: { data: SheetDataRow[] }) {
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

    const ingredientMap = new Map<
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

      const uom = base_uom_name || "N/A";
      if (!ingredientEntry.totals[uom]) {
        ingredientEntry.totals[uom] = { qty: 0, qty_gram: 0 };
      }
      ingredientEntry.totals[uom].qty += ingredient_qty || 0;
      ingredientEntry.totals[uom].qty_gram += ingredient_qty_gram || 0;
    });

    const result: BreakupRow[] = Array.from(ingredientMap.entries()).map(
      ([ingredient, counts]) => ({
        ingredient,
        speciesCount: counts.species.size,
        animalCount: counts.animals.size,
        enclosureCount: counts.enclosures.size,
        siteCount: counts.sites.size,
        totals: counts.totals,
      })
    );

    return result.sort((a, b) => {
      const { rawWeightGrams: rawA } = formatSeparatedTotals(a.totals);
      const pcsToWeightA = getPcsToWeightInGrams(a.ingredient, a.totals);
      const totalA = rawA + pcsToWeightA;

      const { rawWeightGrams: rawB } = formatSeparatedTotals(b.totals);
      const pcsToWeightB = getPcsToWeightInGrams(b.ingredient, b.totals);
      const totalB = rawB + pcsToWeightB;
      
      return totalB - totalA;
    });
  }, [filteredData]);


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
                <TableHead>Ingredient</TableHead>
                <TableHead className="text-right">Total (Weight)</TableHead>
                <TableHead className="text-right">Total (Pieces)</TableHead>
                <TableHead className="text-right">Pcs into Weight</TableHead>
                <TableHead className="text-right">Total Weight Req.</TableHead>
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
                breakupData.map((row) => {
                  const { weight, pieces, rawWeightGrams } = formatSeparatedTotals(row.totals);
                  const pcsToWeightGrams = getPcsToWeightInGrams(row.ingredient, row.totals);
                  const totalWeightGrams = rawWeightGrams + pcsToWeightGrams;
                  return (
                    <TableRow key={row.ingredient}>
                      <TableCell className="font-medium">
                        {row.ingredient}
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        {weight}
                      </TableCell>
                       <TableCell className="text-right font-bold text-primary">
                        {pieces}
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        {formatWeightFromGrams(pcsToWeightGrams)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        {formatWeightFromGrams(totalWeightGrams)}
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
                  )
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={9}
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

