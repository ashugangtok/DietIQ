
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
  Bot,
  BookText,
  Lightbulb,
  ListTodo,
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
import { useContext, useRef, useState, useEffect } from 'react';
import * as XLSX from "xlsx";
import { type SheetDataRow } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import styles from '../reporting.module.css';
import Image from 'next/image';

const dietFacts = [
    "A balanced carnivore diet should mimic prey: muscle, bone, and organs.",
    "Herbivores have complex digestive systems to break down tough plant cellulose.",
    "Omnivores, like bears, adapt their diet to available plants and animals.",
    "Insects are a crucial protein source for many species (insectivory).",
    "A giraffe's long neck allows it to browse on leaves others can't reach.",
    "Pandas almost exclusively eat bamboo, despite having a carnivore's digestive system.",
    "Foraging enrichment, making animals search for food, is vital for their well-being.",
    "Seasonal diet changes help animals build fat for winter and eat lighter in summer.",
    "Koalas specialize in eucalyptus leaves, which are toxic to most other animals.",
    "Vultures have highly acidic stomachs to safely consume carcasses.",
];


export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data, setData, addJournalEntry } = useContext(DataContext);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentFactIndex, setCurrentFactIndex] = useState(0);

  const isShowingLoadingScreen = data.length === 0 || isLoading;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isShowingLoadingScreen) {
      interval = setInterval(() => {
        setCurrentFactIndex((prevIndex) => (prevIndex + 1) % dietFacts.length);
      }, 3000); // Change fact every 3 seconds
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isShowingLoadingScreen]);


  const isActive = (path: string) => {
    return pathname === path;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const MAX_FILE_SIZE_MB = 20;
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setError(`File size exceeds ${MAX_FILE_SIZE_MB} MB. Please upload a smaller file.`);
        addJournalEntry("Excel File Error", `Upload failed: File size is larger than ${MAX_FILE_SIZE_MB} MB.`);
        if (event.target) {
            event.target.value = "";
        }
        return;
    }

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
          
          const rowsAsArrays = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
          
          let headerRowIndex = -1;
          let headers: string[] = [];

          for (let i = 0; i < rowsAsArrays.length; i++) {
            const row = rowsAsArrays[i];
            if (row && row.length > 0 && requiredColumns.some(col => {
                const normalizedRow = row.map(header => String(header).trim().toLowerCase());
                return normalizedRow.includes(col.trim().toLowerCase());
            })) {
                headers = row.map(header => String(header).trim());
                headerRowIndex = i;
                break;
            }
          }
          
          if (headerRowIndex === -1) {
            throw new Error("A valid header row could not be found. Please ensure the required columns are present.");
          }

          const normalizedHeaders = headers.map(h => h.toLowerCase());
          const missingColumns = requiredColumns.filter(col => !normalizedHeaders.includes(col.toLowerCase()));

          if (missingColumns.length > 0) {
            throw new Error(`The following required columns are missing: ${missingColumns.join(', ')}`);
          }
          
          const jsonData = XLSX.utils.sheet_to_json<SheetDataRow>(worksheet, { range: headerRowIndex });

          if (jsonData.length === 0) {
            throw new Error("The Excel sheet contains headers but no data rows.");
          }
          
          setData(jsonData);
          addJournalEntry("Excel File Uploaded", `Successfully loaded ${jsonData.length} rows from ${file.name}.`);

        } catch (err) {
          console.error(err);
          const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred during file parsing.";
          setError(errorMessage);
          addJournalEntry("Excel File Error", `Failed to parse ${file.name}: ${errorMessage}`);
        } finally {
          setIsLoading(false);
        }
      };
      reader.onerror = () => {
        const errorMessage = "Failed to read the file.";
        setError(errorMessage);
        setIsLoading(false);
        addJournalEntry("Excel File Error", `Failed to read ${file.name}: An unknown error occurred.`);
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
          <Image src="/logo.png" alt="Sheet Insights" width={180} height={32} />
        </header>
        <main className="flex-1 flex flex-col">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-4">
                <div className={styles['paw-loader-lg']}>
                    <div className={styles.paw}></div>
                    <div className={styles.paw}></div>
                    <div className={styles.paw}></div>
                </div>
              <span className="text-muted-foreground mt-4 font-semibold text-center">Transforming diet data into animal intelligence</span>
              <div className="text-muted-foreground mt-4 text-center max-w-md h-12 flex items-center justify-center p-2 bg-muted/50 rounded-lg">
                 <Lightbulb className="w-5 h-5 mr-2 text-primary flex-shrink-0" />
                 <p>
                    <span className="font-semibold text-primary/80">Tip:</span> {dietFacts[currentFactIndex]}
                 </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-4">
              <Card className="w-full max-w-5xl shadow-lg">
                  <CardHeader>
                  <CardTitle>Upload Your Excel File</CardTitle>
                  <CardDescription>
                      Upload your Excel and unlock instant insights.
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
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2">
            <Image src="/logo.png" alt="Sheet Insights" width={180} height={32} />
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
                <Link href="/summary-report-check" passHref>
                    <SidebarMenuButton tooltip="Summary Report Check" isActive={isActive('/summary-report-check')}>
                        <ListTodo />
                        <span>Summary Report Check</span>
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
              <Link href="/journal" passHref>
                <SidebarMenuButton tooltip="Journal" isActive={isActive('/journal')}>
                  <BookText />
                  <span>Journal</span>
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
              <Link href="/generate-summary" passHref>
                <SidebarMenuButton tooltip="Generate Summary" isActive={isActive('/generate-summary')}>
                  <FileSpreadsheet />
                  <span>Generate Summary</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/generate-diet" passHref>
                <SidebarMenuButton tooltip="Generate Diet" isActive={isActive('/generate-diet')}>
                  <Bot />
                  <span>Generate Diet</span>
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
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
