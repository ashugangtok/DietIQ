
"use client";

import { useState, useContext, useMemo } from 'react';
import { DataContext } from '@/context/data-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SheetDataRow } from '@/types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';

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
        const species = [...new Set(speciesSiteData.map(row => row.common_name).filter(Boolean))].sort();
        const times = [...new Set(speciesSiteData.map(row => row.meal_start_time).filter(Boolean))].sort();
        return { sites, species, times };
    }, [speciesSiteData]);

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
                    <Select value={speciesFilter} onValueChange={(value) => setSpeciesFilter(value === 'all' ? '' : value)}>
                        <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Filter by Species" /></SelectTrigger>
                        <SelectContent>
                             <SelectItem value="all">All Species</SelectItem>
                            {filterOptions.species.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={timeFilter} onValueChange={(value) => setTimeFilter(value === 'all' ? '' : value)}>
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
