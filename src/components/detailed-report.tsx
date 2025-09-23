
"use client";

import * as React from "react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

interface DetailedReportProps {
  data: SheetDataRow[];
}

interface ReportRow {
  siteName: string;
  commonName: string;
  totalAnimal: number;
  day: string;
  ingredientName: string;
  sumOfKilogram: number;
  sumOfPiece: number;
  sumOfLitre: number;
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

export function DetailedReport({ data }: DetailedReportProps) {

  const processedData = useMemo(() => {
    const grouped: GroupedData = {};

    data.forEach(row => {
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
  }, [data]);

  const formatQuantity = (ingredient: { sumOfKilogram: number; sumOfPiece: number; sumOfLitre: number }) => {
    const parts: string[] = [];
    if (ingredient.sumOfKilogram > 0) {
      parts.push(`${ingredient.sumOfKilogram.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`);
    }
    if (ingredient.sumOfPiece > 0) {
        parts.push(`${ingredient.sumOfPiece.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pcs`);
    }
    if (ingredient.sumOfLitre > 0) {
        parts.push(`${ingredient.sumOfLitre.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ltr`);
    }
    return parts.join(', ') || '-';
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl">Detailed Report</CardTitle>
        <CardDescription>
          A detailed breakdown of ingredient consumption by site, animal, and day.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative overflow-x-auto rounded-md border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-1/5">Site Name</TableHead>
                <TableHead className="w-1/5">Common Name</TableHead>
                <TableHead className="w-[10%]">Total Animal</TableHead>
                <TableHead className="w-[10%]">Day</TableHead>
                <TableHead className="w-1/5">Ingredient Name</TableHead>
                <TableHead className="text-right w-1/5">Total Quantity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.keys(processedData).length > 0 ? (
                Object.entries(processedData).map(([siteName, animals]) => (
                  Object.entries(animals).map(([commonName, animalData]) => (
                    Object.entries(animalData.days).map(([day, dayData]) => (
                      dayData.ingredients.map((ingredient, index) => (
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
                          <TableCell className="text-right font-bold">{formatQuantity(ingredient)}</TableCell>
                        </TableRow>
                      ))
                    ))
                  ))
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No data available for this report.
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
