
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, PawPrint, PieChart, Users } from "lucide-react";
import Image from "next/image";

export default function ReportingPage() {
  return (
    <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
                <h1 className="text-2xl font-bold font-headline">Reporting Dashboard</h1>
                <p className="text-muted-foreground">
                    Analyze historical data and trends.
                </p>
            </div>
            <Button>
                <Download className="mr-2 h-4 w-4" />
                Export Full Report
            </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
            {/* Overview Card */}
            <Card className="shadow-lg">
                <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                    <PawPrint className="w-8 h-8 text-primary" />
                    <div>
                        <CardTitle className="font-bold text-xl">Overview</CardTitle>
                        <CardDescription>High-level summary stats and highlights.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="flex justify-center items-center h-20">
                    <Image src="/loader.gif" alt="Loading..." width={80} height={80} unoptimized />
                </CardContent>
            </Card>
            
            {/* Detailed Insights Card */}
            <Card className="shadow-lg">
                <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                     <Users className="w-8 h-8 text-accent" />
                     <div>
                        <CardTitle className="font-bold text-xl">Detailed Insights</CardTitle>
                        <CardDescription>Animal-specific diet and ingredient breakdowns.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="flex justify-center items-center h-20">
                    <Image src="/loader.gif" alt="Loading..." width={80} height={80} unoptimized />
                </CardContent>
            </Card>

            {/* Trends Card */}
            <Card className="shadow-lg">
                <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                    <PieChart className="w-8 h-8 text-primary" />
                     <div>
                        <CardTitle className="font-bold text-xl">Trends</CardTitle>
                        <CardDescription>Chart-based historical and comparative data.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="flex justify-center items-center h-20">
                    <Image src="/loader.gif" alt="Loading..." width={80} height={80} unoptimized />
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
