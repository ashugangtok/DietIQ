
"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type SheetDataRow } from "@/types";
import { PawPrint, Sprout, Building, PieChart as PieChartIcon } from "lucide-react";
import { type Filters } from "./data-table";

interface LiveDashboardProps {
  data: SheetDataRow[];
  onCardClick: (filters?: Partial<Filters>) => void;
}

const COLORS = ['#5B8DAE', '#9163A4', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];

const isWeightUnit = (uom: string) => {
    const lowerUom = uom.toLowerCase();
    return lowerUom === 'gram' || lowerUom === 'kg' || lowerUom === 'kilogram';
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 bg-card border rounded-md shadow-lg">
        <p className="font-bold">{label}</p>
        <p className="text-sm text-primary">{`${payload[0].name}: ${payload[0].value.toLocaleString()}`}</p>
      </div>
    );
  }
  return null;
};

export function LiveDashboard({ data, onCardClick }: LiveDashboardProps) {

  const stats = useMemo(() => {
    if (data.length === 0) return {
        animalCount: 0,
        siteCount: 0,
        ingredientCount: 0,
        feedTypeCount: 0,
        feedTypeDistribution: [],
        topIngredients: [],
        animalDistribution: []
    };
    
    const uniqueAnimalIds = new Set(data.map(row => row.animal_id));
    const uniqueSites = new Set(data.map(row => row.site_name));
    const uniqueIngredients = new Set(data.map(row => row.ingredient_name));
    const uniqueFeedTypes = new Set(data.map(row => row['Feed type name']));

    const feedTypes = new Map<string, number>();
    data.forEach(row => {
        const feedType = row['Feed type name'];
        feedTypes.set(feedType, (feedTypes.get(feedType) || 0) + 1);
    });
    const feedTypeDistribution = Array.from(feedTypes.entries()).map(([name, value]) => ({ name, value }));
    
    const ingredients = new Map<string, number>();
    data.forEach(row => {
        if (isWeightUnit(row.base_uom_name)) {
            const ingredientName = row.ingredient_name;
            const currentQty = ingredients.get(ingredientName) || 0;
            ingredients.set(ingredientName, currentQty + row.ingredient_qty_gram);
        }
    });
    const topIngredients = Array.from(ingredients.entries())
        .map(([name, totalGrams]) => ({ name, totalKg: parseFloat((totalGrams / 1000).toFixed(2)) }))
        .sort((a, b) => b.totalKg - a.totalKg)
        .slice(0, 5);
        
    const animalsByCommonName = new Map<string, Set<string>>();
    data.forEach(row => {
        if (!animalsByCommonName.has(row.common_name)) {
            animalsByCommonName.set(row.common_name, new Set());
        }
        animalsByCommonName.get(row.common_name)!.add(row.animal_id);
    });
    const animalDistribution = Array.from(animalsByCommonName.entries())
        .map(([name, ids]) => ({ name, count: ids.size }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    return {
        animalCount: uniqueAnimalIds.size,
        siteCount: uniqueSites.size,
        ingredientCount: uniqueIngredients.size,
        feedTypeCount: uniqueFeedTypes.size,
        feedTypeDistribution,
        topIngredients,
        animalDistribution
    };
  }, [data]);

  const handleBarClick = (payload: any) => {
    if (payload && payload.activePayload && payload.activePayload.length > 0) {
      const { name } = payload.activePayload[0].payload;
      onCardClick({ common_name: name });
    }
  };
  

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        
        <Card 
            className="shadow-lg hover:shadow-xl transition-shadow cursor-pointer relative bg-cover bg-center text-white" 
            onClick={() => onCardClick()}
            style={{ backgroundImage: "url('/Total Animal.jpg')" }}
        >
            <div className="absolute inset-0 bg-black/50 rounded-lg"></div>
            <div className="relative">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Animals</CardTitle>
                    <PawPrint className="w-5 h-5 text-accent" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold">{stats.animalCount.toLocaleString()}</div>
                    <p className="text-xs text-white/80">Unique animals recorded</p>
                </CardContent>
            </div>
        </Card>
        
        <Card 
            className="shadow-lg hover:shadow-xl transition-shadow cursor-pointer relative bg-cover bg-center text-white" 
            onClick={() => onCardClick()}
            style={{ backgroundImage: "url('/Total Sites.jpg')" }}
        >
            <div className="absolute inset-0 bg-black/50 rounded-lg"></div>
            <div className="relative">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Sites</CardTitle>
                    <Building className="w-5 h-5 text-accent" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold">{stats.siteCount.toLocaleString()}</div>
                    <p className="text-xs text-white/80">Locations providing data</p>
                </CardContent>
            </div>
        </Card>
        
        <Card 
            className="shadow-lg hover:shadow-xl transition-shadow cursor-pointer relative bg-cover bg-center text-white" 
            onClick={() => onCardClick()}
            style={{ backgroundImage: "url('/Ingredients.jpg')" }}
        >
            <div className="absolute inset-0 bg-black/50 rounded-lg"></div>
            <div className="relative">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Unique Ingredients</CardTitle>
                    <Sprout className="w-5 h-5 text-accent" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold">{stats.ingredientCount.toLocaleString()}</div>
                    <p className="text-xs text-white/80">Different ingredients used</p>
                </CardContent>
            </div>
        </Card>
        
        <Card 
            className="shadow-lg hover:shadow-xl transition-shadow cursor-pointer relative bg-cover bg-center text-white" 
            onClick={() => onCardClick()}
            style={{ backgroundImage: "url('/Feed types.jpg')" }}
        >
            <div className="absolute inset-0 bg-black/50 rounded-lg"></div>
            <div className="relative">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Feed Types</CardTitle>
                    <PieChartIcon className="w-5 h-5 text-accent" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold">{stats.feedTypeCount.toLocaleString()}</div>
                    <p className="text-xs text-white/80">Distinct feed categories</p>
                </CardContent>
            </div>
        </Card>
        
        <Card className="md:col-span-2 lg:col-span-2 shadow-lg">
            <CardHeader>
                <CardTitle className="font-headline text-xl">Top 5 Ingredients by Weight</CardTitle>
                 <CardDescription>
                    Total weight (kg) of the most used ingredients.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.topIngredients} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={100} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                        <Bar dataKey="totalKg" name="Weight (kg)" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={25} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-2 shadow-lg">
            <CardHeader>
                <CardTitle className="font-headline text-xl">Top 5 Animal Populations</CardTitle>
                <CardDescription>
                    Count of unique animals by their common name.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <ResponsiveContainer width="100%" height={300}>
                    <BarChart 
                        data={stats.animalDistribution} 
                        layout="vertical" 
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        onClick={handleBarClick}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={100} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                        <Bar dataKey="count" name="Count" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} barSize={25} className="cursor-pointer" />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-4 shadow-lg">
            <CardHeader>
                <CardTitle className="font-headline text-xl">Feed Type Distribution</CardTitle>
                <CardDescription>
                    A breakdown of all feed types used across all sites.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
                <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                        <Pie
                            data={stats.feedTypeDistribution}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={150}
                            fill="#8884d8"
                            dataKey="value"
                            stroke="hsl(var(--background))"
                            strokeWidth={2}
                            onClick={(data) => onCardClick({ 'Feed type name': data.name })}
                            className="cursor-pointer"
                        >
                            {stats.feedTypeDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="focus:outline-none focus:ring-2 focus:ring-ring" />
                            ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            borderColor: 'hsl(var(--border))'
                          }}
                        />
                        <Legend wrapperStyle={{paddingTop: '20px'}}/>
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    </div>
  );
}

    
