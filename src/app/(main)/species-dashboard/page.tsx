
"use client";

import { useState, useContext, useMemo, useEffect } from 'react';
import { DataContext } from '@/context/data-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SheetDataRow } from '@/types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { PawPrint, Wheat } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-2 bg-card border rounded-md shadow-lg text-sm">
          <p className="font-bold mb-1">{label}</p>
          <p className="text-primary">{`Total Quantity (kg): ${payload[0].value.toLocaleString()}`}</p>
        </div>
      );
    }
    return null;
};

export default function SpeciesDashboardPage() {
    const { speciesSiteData } = useContext(DataContext);
    const [siteFilter, setSiteFilter] = useState('');
    const [speciesFilter, setSpeciesFilter] = useState('');
    const [timeFilter, setTimeFilter] = useState('');

    const filterOptions = useMemo(() => {
        const sites = [...new Set(speciesSiteData.map(row => row.site_name).filter(Boolean))].sort();

        const speciesData = siteFilter ? speciesSiteData.filter(row => row.site_name === siteFilter) : speciesSiteData;
        const species = [...new Set(speciesData.map(row => row.common_name).filter(Boolean))].sort();
        
        const timeData = speciesData.filter(row => !speciesFilter || row.common_name === speciesFilter);
        const times = [...new Set(timeData.map(row => row.meal_start_time).filter(Boolean))].sort();

        return { sites, species, times };
    }, [speciesSiteData, siteFilter, speciesFilter]);

    // Reset dependent filters when a parent filter changes
    useEffect(() => {
        setSpeciesFilter('');
        setTimeFilter('');
    }, [siteFilter]);

    useEffect(() => {
        setTimeFilter('');
    }, [speciesFilter]);


    const filteredData = useMemo(() => {
        return speciesSiteData.filter(row => {
            const siteMatch = !siteFilter || row.site_name === siteFilter;
            const speciesMatch = !speciesFilter || row.common_name === speciesFilter;
            const timeMatch = !timeFilter || row.meal_start_time === timeFilter;
            return siteMatch && speciesMatch && timeMatch;
        });
    }, [speciesSiteData, siteFilter, speciesFilter, timeFilter]);
    
    const chartData = useMemo(() => {
        const ingredientMap = new Map<string, number>();
        filteredData.forEach(row => {
            const currentQty = ingredientMap.get(row.ingredient_name) || 0;
            // Assuming Kilogram is the primary unit, otherwise convert from gram
            const quantityInKg = row.ingredient_qty || (row.ingredient_qty_gram / 1000) || 0;
            ingredientMap.set(row.ingredient_name, currentQty + quantityInKg);
        });
        
        return Array.from(ingredientMap.entries())
            .map(([name, totalKg]) => ({ name, totalKg: parseFloat(totalKg.toFixed(2)) }))
            .sort((a, b) => b.totalKg - a.totalKg);

    }, [filteredData]);

    const stats = useMemo(() => {
        const animalCountMap = new Map<string, number>();
        filteredData.forEach(row => {
            // animal_id is used for TotalAnimal from the sheet
            const key = `${row.site_name}-${row.common_name}`;
            if (!animalCountMap.has(key)) {
                animalCountMap.set(key, Number(row.animal_id) || 0);
            }
        });
        const totalAnimals = Array.from(animalCountMap.values()).reduce((sum, count) => sum + count, 0);

        const totalIngredientsKg = chartData.reduce((sum, item) => sum + item.totalKg, 0);

        return { totalAnimals, totalIngredientsKg };
    }, [filteredData, chartData]);

    if (speciesSiteData.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Species Site Diet Dashboard</CardTitle>
                    <CardDescription>
                        No data available. Please upload a Species Site Diet Report.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center p-12 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">
                           Upload a file on the <a href="/upload" className="text-primary underline">Upload Page</a> to see this dashboard.
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
             <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Animals</CardTitle>
                        <PawPrint className="w-5 h-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalAnimals.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            Total number of animals based on filters.
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Ingredients Required</CardTitle>
                        <Wheat className="w-5 h-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalIngredientsKg.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg</div>
                         <p className="text-xs text-muted-foreground">
                            Total weight of all ingredients.
                        </p>
                    </CardContent>
                </Card>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Species Site Diet Dashboard</CardTitle>
                    <CardDescription>
                        Analyze the ingredient consumption based on the uploaded Species Site Diet Report.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <Select value={siteFilter} onValueChange={(value) => setSiteFilter(value === 'all' ? '' : value)}>
                        <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Filter by Site" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Sites</SelectItem>
                            {filterOptions.sites.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={speciesFilter} onValueChange={(value) => setSpeciesFilter(value === 'all' ? '' : value)} disabled={!siteFilter}>
                        <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Filter by Species" /></SelectTrigger>
                        <SelectContent>
                             <SelectItem value="all">All Species</SelectItem>
                            {filterOptions.species.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={timeFilter} onValueChange={(value) => setTimeFilter(value === 'all' ? '' : value)} disabled={!speciesFilter}>
                        <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Filter by Meal Time" /></SelectTrigger>
                        <SelectContent>
                             <SelectItem value="all">All Meal Times</SelectItem>
                            {filterOptions.times.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Ingredient Consumption</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={chartData} layout="vertical" margin={{ left: 100 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis dataKey="name" type="category" width={100}/>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Bar dataKey="totalKg" name="Total (kg)" fill="hsl(var(--primary))" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    )
}
