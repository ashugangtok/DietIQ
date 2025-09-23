
"use client";

import * as React from "react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

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

export function DetailedReport({ data }: DetailedReportProps) {
  const [siteFilter, setSiteFilter] = useState('');
  const [commonNameFilter, setCommonNameFilter] = useState('');
  const [dayFilter, setDayFilter] = useState('');

  const filterOptions = useMemo(() => {
    const sites = [...new Set(data.map(row => row.site_name).filter(Boolean))].sort();
    const commonNames = [...new Set(data.map(row => row.common_name).filter(Boolean))].sort();
    const days = [...new Set(data.map(row => row.feeding_date).filter(Boolean))].sort();
    return { sites, commonNames, days };
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter(row => {
      const siteMatch = !siteFilter || row.site_name === siteFilter;
      const commonNameMatch = !commonNameFilter || row.common_name === commonNameFilter;
      const dayMatch = !dayFilter || row.feeding_date === dayFilter;
      return siteMatch && commonNameMatch && dayMatch;
    });
  }, [data, siteFilter, commonNameFilter, dayFilter]);
  
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

  const formatQuantity = (ingredient: { sumOfKilogram: number; sumOfPiece: number; sumOfLitre: number }) => {
    const parts: string[] = [];
    
    const formatNumber = (num: number) => {
      if (num % 1 === 0) {
        return num.toLocaleString();
      }
      return num.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
    }

    if (ingredient.sumOfKilogram > 0) {
      if (ingredient.sumOfKilogram < 1) {
        const grams = ingredient.sumOfKilogram * 1000;
        parts.push(`${formatNumber(grams)} g`);
      } else {
        parts.push(`${formatNumber(ingredient.sumOfKilogram)} kg`);
      }
    }
    if (ingredient.sumOfPiece > 0) {
      parts.push(`${formatNumber(ingredient.sumOfPiece)} pcs`);
    }
    if (ingredient.sumOfLitre > 0) {
      parts.push(`${formatNumber(ingredient.sumOfLitre)} ltr`);
    }
    return parts.join(', ') || '-';
  };

  const hasData = useMemo(() => Object.keys(processedData).length > 0, [processedData]);

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
            <Select value={siteFilter} onValueChange={(value) => setSiteFilter(value === 'all' ? '' : value)}>
                <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Filter by Site" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Sites</SelectItem>
                    {filterOptions.sites.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select value={commonNameFilter} onValueChange={(value) => setCommonNameFilter(value === 'all' ? '' : value)}>
                <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Filter by Common Name" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Common Names</SelectItem>
                    {filterOptions.commonNames.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select value={dayFilter} onValueChange={(value) => setDayFilter(value === 'all' ? '' : value)}>
                <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Filter by Day" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Days</SelectItem>
                    {filterOptions.days.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                </SelectContent>
            </Select>
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
                <TableHead className="text-right w-1/5">Total Quantity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hasData ? (
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
