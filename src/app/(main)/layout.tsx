
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart2,
  Table,
  TrendingUp,
  Spline,
  Group,
  ClipboardList,
  ChefHat,
  Home,
  UploadCloud,
  FileSpreadsheet,
  AlertCircle,
  Book,
  BookCopy,
  ClipboardCheck,
  FileText,
} from 'lucide-react';

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { DataContext } from '@/context/data-context';
import { useContext, useRef, useState } from 'react';
import * as XLSX from "xlsx";
import { type SheetDataRow } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import styles from '../reporting.module.css';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data, setData } = useContext(DataContext);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isActive = (path: string) => {
    return pathname === path;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setData([]);

    setTimeout(() => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const fileData = e.target?.result;
          const workbook = XLSX.read(fileData, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          const requiredColumns = [
            'site_name', 'animal_id', 'common_name', 'scientific_name', 'section_name', 'user_enclosure_name', 
            'Feed type name', 'diet_name', 'diet_no', 'ingredient_name', 'type', 'type_name', 'group_name',
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
    }, 50);
    
    if (event.target) {
        event.target.value = "";
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  if (data.length === 0) {
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
          ) : (
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
          )}
        </main>
        <footer className="text-center p-4 text-sm text-muted-foreground border-t">
            Built for Firebase Studio
        </footer>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2">
            <Home className="w-8 h-8 text-primary" />
            <h1 className="text-xl font-bold">Sheet Insights</h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
                <Link href="/dashboard" passHref>
                    <SidebarMenuButton tooltip="Live Dashboard" isActive={isActive('/dashboard')}>
                        <BarChart2 />
                        <span>Live Dashboard</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <Link href="/data-table" passHref>
                    <SidebarMenuButton tooltip="Data Table" isActive={isActive('/data-table')}>
                        <Table />
                        <span>Data Table</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <Link href="/summary" passHref>
                    <SidebarMenuButton tooltip="Summary" isActive={isActive('/summary')}>
                        <TrendingUp />
                        <span>Summary</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <Link href="/ingredient-breakup" passHref>
                    <SidebarMenuButton tooltip="Ingredient Breakup" isActive={isActive('/ingredient-breakup')}>
                        <Spline />
                        <span>Ingredient Breakup</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <Link href="/meal-group-breakup" passHref>
                    <SidebarMenuButton tooltip="Meal Group Breakup" isActive={isActive('/meal-group-breakup')}>
                        <Group />
                        <span>Meal Group Breakup</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <Link href="/diet-plan" passHref>
                    <SidebarMenuButton tooltip="Diet Plan" isActive={isActive('/diet-plan')}>
                        <ClipboardList />
                        <span>Diet Plan</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <Link href="/summary-report" passHref>
                    <SidebarMenuButton tooltip="Summary Report" isActive={isActive('/summary-report')}>
                        <Book />
                        <span>Summary Report</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
             <SidebarMenuItem>
                <Link href="/overall-report" passHref>
                    <SidebarMenuButton tooltip="Overall Report" isActive={isActive('/overall-report')}>
                        <BookCopy />
                        <span>Overall Report</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <Link href="/overall-report-check" passHref>
                    <SidebarMenuButton tooltip="Overall Report Check" isActive={isActive('/overall-report-check')}>
                        <ClipboardCheck />
                        <span>Overall Report Check</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/pdf-extract" passHref>
                <SidebarMenuButton tooltip="Extract from PDF" isActive={isActive('/pdf-extract')}>
                  <FileText />
                  <span>Extract from PDF</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <Link href="/extracted-data" passHref>
                <SidebarMenuButton tooltip="Extracted Data" isActive={isActive('/extracted-data')}>
                  <FileSpreadsheet />
                  <span>Extracted Data</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
            <Link href="/kitchen" passHref>
                <SidebarMenuButton tooltip="Go to Kitchen">
                    <ChefHat />
                    <span>Go to Kitchen</span>
                </SidebarMenuButton>
            </Link>
            <Button variant="ghost" onClick={() => {
                setData([]);
                setError(null);
            }}>Upload New File</Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
            <SidebarTrigger className="sm:hidden"/>
            <h1 className="text-xl font-semibold text-primary font-headline hidden md:block">
                Animal Diet Management
            </h1>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
