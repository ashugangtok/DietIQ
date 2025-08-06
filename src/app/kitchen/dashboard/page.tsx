
"use client";

import { useContext, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataContext } from "@/context/data-context";
import { Clock, CheckCircle, Truck } from "lucide-react";

const COLORS = {
    Pending: '#FFBB28', // Yellow
    Packed: '#00C49F',  // Green
    Dispatched: '#5B8DAE', // Blue
};
const STROKE_COLORS = {
    Pending: '#EAA_ADD800',
    Packed: '#00B08D',
    Dispatched: '#4A7C9D',
};


const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 bg-card border rounded-md shadow-lg">
        <p className="font-bold">{label}</p>
        {payload.map((entry: any, index: number) => (
             <p key={`item-${index}`} style={{ color: entry.color }}>
                {`${entry.name}: ${entry.value}`}
            </p>
        ))}
      </div>
    );
  }
  return null;
};


export default function KitchenDashboardPage() {
    const { packingList, data } = useContext(DataContext);

    const stats = useMemo(() => {
        if (packingList.length === 0 || data.length === 0) {
            return {
                pending: 0,
                packed: 0,
                dispatched: 0,
                total: 0,
                statusDistribution: [],
                siteDistribution: [],
            };
        }

        const statusCounts = {
            Pending: 0,
            Packed: 0,
            Dispatched: 0,
        };

        packingList.forEach(item => {
            if (statusCounts[item.status] !== undefined) {
                statusCounts[item.status]++;
            }
        });

        const statusDistribution = [
            { name: 'Pending', value: statusCounts.Pending },
            { name: 'Packed', value: statusCounts.Packed },
            { name: 'Dispatched', value: statusCounts.Dispatched },
        ];
        
        const siteStatusCounts: { [site: string]: { Pending: number, Packed: number, Dispatched: number } } = {};
        const siteNames = [...new Set(data.map(d => d.site_name))];
        siteNames.forEach(site => {
            siteStatusCounts[site] = { Pending: 0, Packed: 0, Dispatched: 0 };
        });

        packingList.forEach(item => {
            const siteName = item.id.split('|')[0];
            if (siteStatusCounts[siteName] && siteStatusCounts[siteName][item.status] !== undefined) {
                siteStatusCounts[siteName][item.status]++;
            }
        });

        const siteDistribution = Object.entries(siteStatusCounts).map(([name, counts]) => ({
            name,
            ...counts,
        }));
        
        return {
            pending: statusCounts.Pending,
            packed: statusCounts.Packed,
            dispatched: statusCounts.Dispatched,
            total: packingList.length,
            statusDistribution,
            siteDistribution,
        };
    }, [packingList, data]);

    if (data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Live Kitchen Dashboard</CardTitle>
                    <CardDescription>
                        No data available. Please upload a file on the Sheet Insights page.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center p-12 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">
                           Live metrics will appear here once data is loaded.
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }
    
    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Pending</CardTitle>
                    <Clock className="w-5 h-5 text-yellow-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold">{stats.pending}</div>
                    <p className="text-xs text-muted-foreground">Items waiting to be packed.</p>
                </CardContent>
            </Card>
            <Card className="shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Packed</CardTitle>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold">{stats.packed}</div>
                    <p className="text-xs text-muted-foreground">Items ready for dispatch.</p>
                </CardContent>
            </Card>
            <Card className="shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Dispatched</CardTitle>
                    <Truck className="w-5 h-5 text-blue-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold">{stats.dispatched}</div>
                    <p className="text-xs text-muted-foreground">Items on their way.</p>
                </CardContent>
            </Card>

            <Card className="md:col-span-1 lg:col-span-1 shadow-lg">
                <CardHeader>
                    <CardTitle className="font-headline text-xl">Overall Progress</CardTitle>
                    <CardDescription>
                       A summary of all items by status.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={stats.statusDistribution}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                                stroke="hsl(var(--background))"
                                strokeWidth={2}
                            >
                                {stats.statusDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{paddingTop: '20px'}}/>
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card className="md:col-span-2 lg:col-span-2 shadow-lg">
                <CardHeader>
                    <CardTitle className="font-headline text-xl">Progress by Site</CardTitle>
                     <CardDescription>
                        Status of packing and dispatching for each site.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={stats.siteDistribution} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={100} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                            <Legend />
                            <Bar dataKey="Pending" stackId="a" fill={COLORS.Pending} />
                            <Bar dataKey="Packed" stackId="a" fill={COLORS.Packed} />
                            <Bar dataKey="Dispatched" stackId="a" fill={COLORS.Dispatched} radius={[0, 4, 4, 0]}/>
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
