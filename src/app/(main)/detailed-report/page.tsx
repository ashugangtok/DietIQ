
"use client";

import * as React from "react";
import { useMemo, useState, useContext } from "react";
import { DataContext } from "@/context/data-context";
import { type SheetDataRow } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";

interface DetailedReportProps {
  data: SheetDataRow[];
}

interface GroupedData {
  [site: string]: {
    [animal: string]: {
      totalAnimal: number;
      days: {
        [day: string]: {
          ingredients: {
            name: string;
            sumOfKilogram: number;
            sumOfPiece: number;
            sumOfLitre: number;
          }[];
        };
      };
    };
  };
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

export function DetailedReport({ data }: DetailedReportProps) {
  const [siteFilter, setSiteFilter] = useState('');
  const [commonNameFilter, setCommonNameFilter] = useState('');
  const [dayFilter, setDayFilter] = useState('');
  const [ingredientFilter, setIngredientFilter] = useState('');

  const filterOptions = useMemo(() => {
    const sites = [...new Set(data.map(row => row.site_name).filter(Boolean))].sort();
    const commonNames = [...new Set(data.map(row => row.common_name).filter(Boolean))].sort();
    const days = [...new Set(data.map(row => row.feeding_date).filter(Boolean))].sort();
    const ingredients = [...new Set(data.map(row => row.ingredient_name).filter(Boolean))].sort();
    return { sites, commonNames, days, ingredients };
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter(row => {
      const siteMatch = !siteFilter || row.site_name.toLowerCase() === siteFilter.toLowerCase();
      const commonNameMatch = !commonNameFilter || row.common_name.toLowerCase() === commonNameFilter.toLowerCase();
      const dayMatch = !dayFilter || row.feeding_date.toLowerCase() === dayFilter.toLowerCase();
      const ingredientMatch = !ingredientFilter || row.ingredient_name.toLowerCase() === ingredientFilter.toLowerCase();
      return siteMatch && commonNameMatch && dayMatch && ingredientMatch;
    });
  }, [data, siteFilter, commonNameFilter, dayFilter, ingredientFilter]);
  
  const processedData = useMemo(() => {
    const grouped: GroupedData = {};

    filteredData.forEach(row => {
      const site = row.site_name || 'N/A';
      const animal = row.common_name || 'N/A';
      const day = row.feeding_date || 'N/A';
      const ingredient = row.ingredient_name || 'N/A';
      const totalAnimal = Number(row.animal_id) || 0;

      if (!grouped[site]) grouped[site] = {};
      if (!grouped[site][animal]) grouped[site][animal] = { totalAnimal, days: {} };
      if (!grouped[site][animal].days[day]) grouped[site][animal].days[day] = { ingredients: [] };

      let ingredientEntry = grouped[site][animal].days[day].ingredients.find(i => i.name === ingredient);

      if (!ingredientEntry) {
        ingredientEntry = {
          name: ingredient,
          sumOfKilogram: 0,
          sumOfPiece: 0,
          sumOfLitre: 0
        };
        grouped[site][animal].days[day].ingredients.push(ingredientEntry);
      }
      
      ingredientEntry.sumOfKilogram += Number(row.Kilogram) || 0;
      ingredientEntry.sumOfPiece += Number(row.Piece) || 0;
      ingredientEntry.sumOfLitre += Number(row.Litre) || 0;
    });

    return grouped;
  }, [filteredData]);

  const hasData = useMemo(() => Object.keys(processedData).length > 0 && filteredData.length > 0, [processedData, filteredData]);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl">Detailed Report</CardTitle>
        <CardDescription>
          A detailed breakdown of ingredient consumption by site, animal, and day.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
            <Combobox
                options={filterOptions.sites.map(s => ({ value: s, label: s }))}
                value={siteFilter}
                onChange={(value) => setSiteFilter(value.toLowerCase() === siteFilter.toLowerCase() ? "" : value)}
                placeholder="Filter by Site"
                searchPlaceholder="Search sites..."
            />
            <Combobox
                options={filterOptions.commonNames.map(s => ({ value: s, label: s }))}
                value={commonNameFilter}
                onChange={(value) => setCommonNameFilter(value.toLowerCase() === commonNameFilter.toLowerCase() ? "" : value)}
                placeholder="Filter by Common Name"
                searchPlaceholder="Search names..."
            />
            <Combobox
                options={filterOptions.days.map(s => ({ value: s, label: s }))}
                value={dayFilter}
                onChange={(value) => setDayFilter(value.toLowerCase() === dayFilter.toLowerCase() ? "" : value)}
                placeholder="Filter by Day"
                searchPlaceholder="Search days..."
            />
            <Combobox
                options={filterOptions.ingredients.map(s => ({ value: s, label: s }))}
                value={ingredientFilter}
                onChange={(value) => setIngredientFilter(value.toLowerCase() === ingredientFilter.toLowerCase() ? "" : value)}
                placeholder="Filter by Ingredient"
                searchPlaceholder="Search ingredients..."
            />
        </div>
        <div className="relative overflow-x-auto rounded-md border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-1/5">Site Name</TableHead>
                <TableHead className="w-1/5">Common Name</TableHead>
                <TableHead className="w-[10%]">Total Animal</TableHead>
                <TableHead className="w-[10%]">Day</TableHead>
                <TableHead className="w-1/5">Ingredient Name</TableHead>
                <TableHead className="text-right w-1/5">Qty per Animal</TableHead>
                <TableHead className="text-right w-1/5">Total Quantity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hasData ? (
                Object.entries(processedData)
                  .sort((a, b) => a[0].localeCompare(b[0])) // Sort by Site Name
                  .map(([siteName, animals]) =>
                    Object.entries(animals)
                      .sort((a, b) => a[0].localeCompare(b[0])) // Sort by Common Name
                      .map(([commonName, animalData]) =>
                        Object.entries(animalData.days).map(([day, dayData]) =>
                          dayData.ingredients.map((ingredient, index) => {
                            const totalAnimals = animalData.totalAnimal > 0 ? animalData.totalAnimal : 1;
                            const qtyPerAnimalKg = ingredient.sumOfKilogram / totalAnimals;
                            const qtyPerAnimalPcs = ingredient.sumOfPiece / totalAnimals;
                            const qtyPerAnimalLtr = ingredient.sumOfLitre / totalAnimals;

                            return (
                                <TableRow key={`${siteName}-${commonName}-${day}-${ingredient.name}`}>
                                {index === 0 && (
                                    <>
                                    <TableCell rowSpan={dayData.ingredients.length} className="align-top font-medium">{siteName}</TableCell>
                                    <TableCell rowSpan={dayData.ingredients.length} className="align-top">{commonName}</TableCell>
                                    <TableCell rowSpan={dayData.ingredients.length} className="align-top">{animalData.totalAnimal}</TableCell>
                                    <TableCell rowSpan={dayData.ingredients.length} className="align-top">{day}</TableCell>
                                    </>
                                )}
                                <TableCell>{ingredient.name}</TableCell>
                                <TableCell className="text-right font-semibold text-primary">
                                    {formatQuantity(qtyPerAnimalKg, qtyPerAnimalPcs, qtyPerAnimalLtr)}
                                </TableCell>
                                <TableCell className="text-right font-bold">
                                    {formatQuantity(ingredient.sumOfKilogram, ingredient.sumOfPiece, ingredient.sumOfLitre)}
                                </TableCell>
                                </TableRow>
                            )
                          })
                        )
                      )
                  )
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
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

export default function DetailedReportPage() {
    const { speciesSiteData } = useContext(DataContext);
    return <DetailedReport data={speciesSiteData} />;
}
