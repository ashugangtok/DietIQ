
"use client";

import { useState, useRef, useContext } from "react";
import * as XLSX from "xlsx";
import { UploadCloud, FileSpreadsheet, AlertCircle, TrendingUp, Table, BarChart2, ChefHat, Spline, Group } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DataTable, type Filters } from "@/components/data-table";
import { type SheetDataRow } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SummaryTable } from "@/components/summary-table";
import { LiveDashboard } from "@/components/live-dashboard";
import Link from "next/link";
import { DataContext } from "@/context/data-context";
import { BreakupTable } from "@/components/breakup-table";
import { MealGroupBreakupTable } from "@/components/meal-group-breakup-table";
import { MealGroupBreakupWithIngredientsTable } from "@/components/meal-group-breakup-with-ingredients-table";
import styles from './reporting.module.css';


export default function Home() {
  const { data, setData } = useContext(DataContext);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState("live-dashboard");
  const [filters, setFilters] = useState<Filters>({
    site_name: "",
    common_name: "",
    'Feed type name': "",
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setData([]);

    // Use a timeout to allow the loader to render before the heavy parsing starts
    setTimeout(() => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const fileData = e.target?.result;
          const workbook = XLSX.read(fileData, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          const requiredColumns = [
            'site_name', 'animal_id', 'common_name', 'section_name', 'user_enclosure_name', 
            'Feed type name', 'ingredient_name', 'type', 'type_name', 'group_name',
            'ingredient_qty', 'base_uom_name', 'ingredient_qty_gram', 'base_uom_name_gram',
            'preparation_type_name', 'meal_start_time', 'cut_size_name'
          ];
          
          const headers = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] as string[];
          const missingColumns = requiredColumns.filter(col => !headers.includes(col));

          if (missingColumns.length > 0) {
            throw new Error(`The following required columns are missing: ${missingColumns.join(', ')}`);
          }

          const jsonData = XLSX.utils.sheet_to_json<SheetDataRow>(worksheet);

          if (jsonData.length === 0) {
            throw new Error("The Excel sheet is empty or in an invalid format.");
          }
          
          setData(jsonData);
        } catch (err) {
          console.error(err);
          setError(err instanceof Error ? err.message : "An unexpected error occurred during file parsing.");
        } finally {
          setIsLoading(false);
        }
      };
      reader.onerror = () => {
        setError("Failed to read the file.");
        setIsLoading(false);
      };
      reader.readAsArrayBuffer(file);
    }, 50); // A small delay is enough to let the UI update.
    
    // Reset file input to allow re-uploading the same file
    if (event.target) {
        event.target.value = "";
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleCardClick = (newFilters: Partial<Filters> = {}) => {
    setFilters(prev => ({
        site_name: "",
        common_name: "",
        'Feed type name': "",
        ...newFilters
    }));
    setActiveTab("data-table");
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="py-4 px-6 border-b bg-card">
        <h1 className="text-2xl font-bold text-primary font-headline">Sheet Insights</h1>
      </header>
      <main className="flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className={styles['paw-loader-lg']}>
                <div className={styles.paw}></div>
                <div className={styles.paw}></div>
                <div className={styles.paw}></div>
            </div>
            <span className="text-muted-foreground mt-2 font-semibold">We’re crunching the numbers for your animals</span>
          </div>
        ) : data.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            <Card className="w-full max-w-5xl shadow-lg">
                <CardHeader>
                <CardTitle className="text-2xl font-headline">Upload Your Excel File</CardTitle>
                <CardDescription>
                    Select a .xlsx file to parse and visualize your data.
                </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                <div 
                    className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                    onClick={handleUploadClick}
                >
                    <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange}
                    className="hidden" 
                    accept=".xlsx"
                    disabled={isLoading}
                    />
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <UploadCloud className="w-12 h-12 text-primary" />
                    <p className="font-semibold">Click to browse or drag & drop</p>
                    <p className="text-sm">Supports .xlsx files only</p>
                    </div>
                </div>

                {error && (
                    <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                </CardContent>
            </Card>
            <div className="text-center p-12 text-muted-foreground">
                <FileSpreadsheet className="mx-auto h-12 w-12" />
                <p className="mt-4 text-lg">Your data will appear here</p>
            </div>
          </div>
        ) : (
          <div className="w-full p-4 md:p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="flex flex-wrap h-auto justify-center gap-1">
                <TabsTrigger value="live-dashboard">
                  <TrendingUp className="mr-2" />
                  Live Dashboard
                </TabsTrigger>
                <TabsTrigger value="data-table">
                  <Table className="mr-2" />
                  Data Table
                </TabsTrigger>
                <TabsTrigger value="summary">
                  <BarChart2 className="mr-2" />
                  Summary
                </TabsTrigger>
                 <TabsTrigger value="breakup">
                  <Spline className="mr-2" />
                  Breakup Details
                </TabsTrigger>
                <TabsTrigger value="meal-group-breakup">
                  <Group className="mr-2" />
                  Meal Group Breakup
                </TabsTrigger>
                <TabsTrigger value="meal-group-breakup-ingredients">
                  <Group className="mr-2" />
                  Meal Group Breakup with Ingredients
                </TabsTrigger>
                <TabsTrigger value="kitchen" asChild>
                  <Link href="/kitchen">
                    <ChefHat className="mr-2" />
                    Kitchen
                  </Link>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="live-dashboard" className="mt-6">
                 <LiveDashboard data={data} onCardClick={handleCardClick} />
              </TabsContent>
              <TabsContent value="data-table" className="mt-6">
                <DataTable data={data} initialFilters={filters} onFiltersChange={setFilters} />
              </TabsContent>
              <TabsContent value="summary" className="mt-6">
                <SummaryTable data={data} />
              </TabsContent>
               <TabsContent value="breakup" className="mt-6">
                <BreakupTable data={data} />
              </TabsContent>
              <TabsContent value="meal-group-breakup" className="mt-6">
                <MealGroupBreakupTable data={data} />
              </TabsContent>
              <TabsContent value="meal-group-breakup-ingredients" className="mt-6">
                <MealGroupBreakupWithIngredientsTable data={data} />
              </TabsContent>
            </Tabs>
          </div>
        )}
        
      </main>
      <footer className="text-center p-4 text-sm text-muted-foreground border-t">
          Built for Firebase Studio
      </footer>
    </div>
  );
}
