"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type SheetDataRow } from "@/types";
import { PawPrint } from "lucide-react";

interface LiveDashboardProps {
  data: SheetDataRow[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF4560'];

const isWeightUnit = (uom: string) => {
    const lowerUom = uom.toLowerCase();
    return lowerUom === 'gram' || lowerUom === 'kg' || lowerUom === 'kilogram';
}

export function LiveDashboard({ data }: LiveDashboardProps) {

  const animalCount = useMemo(() => {
    if (data.length === 0) return 0;
    const uniqueAnimalIds = new Set(data.map(row => row.animal_id));
    return uniqueAnimalIds.size;
  }, [data]);

  const feedTypeDistribution = useMemo(() => {
    const feedTypes = new Map<string, number>();
    data.forEach(row => {
        const feedType = row['Feed type name'];
        feedTypes.set(feedType, (feedTypes.get(feedType) || 0) + 1);
    });
    return Array.from(feedTypes.entries()).map(([name, value]) => ({ name, value }));
  }, [data]);

  const topIngredients = useMemo(() => {
    const ingredients = new Map<string, number>();
    data.forEach(row => {
        if (isWeightUnit(row.base_uom_name)) {
            const ingredientName = row.ingredient_name;
            const currentQty = ingredients.get(ingredientName) || 0;
            ingredients.set(ingredientName, currentQty + row.ingredient_qty_gram);
        }
    });

    return Array.from(ingredients.entries())
        .map(([name, totalGrams]) => ({ name, totalGrams }))
        .sort((a, b) => b.totalGrams - a.totalGrams)
        .slice(0, 5)
        .map(item => ({...item, totalKg: parseFloat((item.totalGrams / 1000).toFixed(2)) }));

  }, [data]);
  

  return (
    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-1 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="space-y-1">
                    <CardTitle className="font-headline text-xl">Animal Count</CardTitle>
                    <CardDescription>
                        Total unique animals
                    </CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <PawPrint className="w-8 h-8 text-accent" />
                  <p className="text-4xl font-bold text-primary">{animalCount}</p>
                </div>
            </CardHeader>
        </Card>
        
        <Card className="lg:col-span-2 shadow-lg">
            <CardHeader>
                <CardTitle className="font-headline text-xl">Top 5 Ingredients by Weight</CardTitle>
                 <CardDescription>
                    Showing the total weight (kg) of the most used ingredients.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topIngredients} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            borderColor: 'hsl(var(--border))'
                          }}
                          labelStyle={{ color: 'hsl(var(--foreground))' }}
                          formatter={(value) => [`${value} kg`, 'Total Weight']}
                        />
                        <Bar dataKey="totalKg" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>

        <Card className="lg:col-span-3 shadow-lg">
            <CardHeader>
                <CardTitle className="font-headline text-xl">Feed Type Distribution</CardTitle>
                <CardDescription>
                    A breakdown of all feed types used across all sites.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                        <Pie
                            data={feedTypeDistribution}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={120}
                            fill="#8884d8"
                            dataKey="value"
                        >
                            {feedTypeDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            borderColor: 'hsl(var(--border))'
                          }}
                        />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    </div>
  );
}
