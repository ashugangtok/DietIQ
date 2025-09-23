
'use client';

import { useContext, useRef, useState, useEffect } from 'react';
import * as XLSX from "xlsx";
import { type SheetDataRow } from "@/types";
import { DataContext } from '@/context/data-context';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import styles from '../../reporting.module.css';
import Image from 'next/image';
import { AlertCircle, Lightbulb } from 'lucide-react';
import '../../hero.css';


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


export default function UploadPage() {
    const { setData, setSpeciesSiteData, addJournalEntry } = useContext(DataContext);
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [uploadTarget, setUploadTarget] = useState<'daily' | 'species' | null>(null);

    const dailyFileInputRef = useRef<HTMLInputElement>(null);
    const speciesFileInputRef = useRef<HTMLInputElement>(null);
    
    const [currentFactIndex, setCurrentFactIndex] = useState(0);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isLoading) {
        interval = setInterval(() => {
            setCurrentFactIndex((prevIndex) => (prevIndex + 1) % dietFacts.length);
        }, 3000); // Change fact every 3 seconds
        }
        return () => {
        if (interval) {
            clearInterval(interval);
        }
        };
    }, [isLoading]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setError(null);
        setData([]);
        setUploadTarget('daily');

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
            
            for (let i = 0; i < rowsAsArrays.length; i++) {
                const row = rowsAsArrays[i];
                if (row && row.length > 0) {
                    const normalizedRow = row.map(header => String(header).trim().toLowerCase());
                    const matchCount = requiredColumns.filter(col => normalizedRow.includes(col.toLowerCase())).length;
                    if (matchCount > requiredColumns.length / 2) {
                        headerRowIndex = i;
                        break;
                    }
                }
            }
            
            if (headerRowIndex === -1) {
                throw new Error("A valid header row could not be found. Please ensure the required columns are present.");
            }
            
            const jsonData = XLSX.utils.sheet_to_json<SheetDataRow>(worksheet, { range: headerRowIndex });

            if (jsonData.length === 0) {
                throw new Error("The Excel sheet contains headers but no data rows.");
            }
            
            setData(jsonData);
            addJournalEntry("Excel File Uploaded", `Successfully loaded ${jsonData.length} rows from ${file.name}.`);
            router.push('/dashboard');

            } catch (err) {
            console.error(err);
            const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred during file parsing.";
            setError(errorMessage);
            addJournalEntry("Excel File Error", `Failed to parse ${file.name}: ${errorMessage}`);
            } finally {
            setIsLoading(false);
            setUploadTarget(null);
            }
        };
        reader.onerror = () => {
            const errorMessage = "Failed to read the file.";
            setError(errorMessage);
            setIsLoading(false);
            addJournalEntry("Excel File Error", `Failed to read ${file.name}: An unknown error occurred.`);
            setUploadTarget(null);
        };
        reader.readAsArrayBuffer(file);
        }, 50);
        
        if (event.target) {
            event.target.value = "";
        }
    };

    const handleSpeciesSiteFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setError(null);
        setSpeciesSiteData([]);
        setUploadTarget('species');

        setTimeout(() => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const fileData = e.target?.result;
                    const workbook = XLSX.read(fileData, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];

                    const requiredColumns = ['ClassName', 'ScientificName', 'CommonName', 'MealStartTime', 'IngredientName', 'Kilogram'];
                    
                    const rowsAsArrays = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false }) as string[][];
                    
                    let headerRowIndex = -1;
                    for (let i = 0; i < rowsAsArrays.length; i++) {
                        const row = rowsAsArrays[i];
                        if (row && row.length > 0) {
                            const trimmedRow = row.map(header => String(header).trim());
                            const matchCount = requiredColumns.filter(col => trimmedRow.includes(col)).length;
                            if (matchCount >= 3) {
                                headerRowIndex = i;
                                break;
                            }
                        }
                    }

                    if (headerRowIndex === -1) {
                        throw new Error("A valid header row could not be found for the Species Site Diet Report. Please check the column names.");
                    }

                    const headerRow = rowsAsArrays[headerRowIndex];
                    const headerMapping: { [key: string]: keyof SheetDataRow } = {
                        'ClassName': 'class_name',
                        'ScientificName': 'scientific_name',
                        'CommonName': 'common_name',
                        'TotalAnimal': 'animal_id', // Re-using animal_id for count, can be adjusted
                        'MealStartTime': 'meal_start_time',
                        'MealEndTime': 'meal_end_time',
                        'Type': 'type',
                        'TypeName': 'type_name',
                        'IngredientName': 'ingredient_name',
                        'PreparationTypeName': 'preparation_type_name',
                        'FeedTypeName': 'Feed type name',
                        'Day': 'feeding_date',
                        'CutSizeName': 'cut_size_name',
                        'Kilogram': 'ingredient_qty',
                        'GramAverage': 'ingredient_qty_gram'
                        // Add other mappings as needed
                    };
                    
                    const normalizedHeaders = headerRow.map(header => headerMapping[String(header).trim()] || String(header).trim().toLowerCase());
                    
                    // Replace original header row with normalized one
                    rowsAsArrays[headerRowIndex] = normalizedHeaders;

                    const newWorksheet = XLSX.utils.aoa_to_sheet(rowsAsArrays);
                    const jsonData = XLSX.utils.sheet_to_json<SheetDataRow>(newWorksheet);

                    if (jsonData.length === 0) {
                        throw new Error("The Excel sheet contains headers but no data rows.");
                    }
                    
                    setSpeciesSiteData(jsonData);
                    addJournalEntry("Species Site Diet Report Uploaded", `Successfully loaded ${jsonData.length} rows from ${file.name}.`);
                    router.push('/species-dashboard');

                } catch (err) {
                    console.error(err);
                    const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred during file parsing.";
                    setError(errorMessage);
                    addJournalEntry("Species Site Diet Report Error", `Failed to parse ${file.name}: ${errorMessage}`);
                } finally {
                    setIsLoading(false);
                    setUploadTarget(null);
                }
            };
            reader.onerror = () => {
                const errorMessage = "Failed to read the file.";
                setError(errorMessage);
                setIsLoading(false);
                addJournalEntry("Species Site Diet Report Error", `Failed to read ${file.name}: An unknown error occurred.`);
                setUploadTarget(null);
            };
            reader.readAsArrayBuffer(file);
        }, 50);
        
        if (event.target) {
            event.target.value = "";
        }
    };


    const handleDailyUploadClick = () => {
        dailyFileInputRef.current?.click();
    };

    const handleSpeciesUploadClick = () => {
        speciesFileInputRef.current?.click();
    };

    return (
        <div className="flex flex-col min-h-screen">
            <header className="py-4 px-6 border-b flex items-center justify-between">
            <Image src="/logo.png" alt="Sheet Insights" width={100} height={100} />
            <div className="flex gap-2">
                <Button variant="outline" onClick={handleDailyUploadClick}>Upload Daily Diet Report</Button>
                <Button variant="outline" onClick={handleSpeciesUploadClick}>Upload Species Site Diet Report</Button>
            </div>
            </header>
            <main className="flex-1 flex flex-col">
            {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center p-4">
                    <div className={styles['paw-loader-lg']}>
                        <div className={styles.paw}></div>
                        <div className={styles.paw}></div>
                        <div className={styles.paw}></div>
                    </div>
                <span className="text-muted-foreground mt-4 font-semibold text-center">
                    We’re crunching the numbers for {uploadTarget === 'species' ? 'your new report' : 'your animals'}
                </span>
                <div className="text-muted-foreground mt-4 text-center max-w-md h-12 flex items-center justify-center p-2 bg-muted/50 rounded-lg">
                    <Lightbulb className="w-5 h-5 mr-2 text-primary flex-shrink-0" />
                    <p>
                        <span className="font-semibold text-primary/80">Tip:</span> {dietFacts[currentFactIndex]}
                    </p>
                </div>
                </div>
            ) : error ? (
                <div className="flex-1 flex flex-col items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                    <CardTitle>Upload Error</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                        </Alert>
                        <Button onClick={uploadTarget === 'species' ? handleSpeciesUploadClick : handleDailyUploadClick} className="mt-4 w-full">Try Again</Button>
                    </CardContent>
                </Card>
                </div>
            ) : (
                <section className="hero">
                    <div className="hero-grid">
                        <div>
                            <h1>Turn your diet data into insights</h1>
                            <p>
                                Select a report type to upload your Excel file and get instant nutrition summaries,
                                macro breakdowns, and exportable reports.
                            </p>
                            <div className="flex flex-wrap gap-4">
                                <button className="btn" onClick={handleDailyUploadClick}>
                                    Upload Daily Diet Report
                                </button>
                                <button className="btn" onClick={handleSpeciesUploadClick}>
                                    Upload Species Site Diet Report
                                </button>
                                <input 
                                    type="file" 
                                    ref={dailyFileInputRef} 
                                    onChange={handleFileChange}
                                    className="hidden" 
                                    accept=".xlsx, .xls"
                                    disabled={isLoading}
                                />
                                <input 
                                    type="file" 
                                    ref={speciesFileInputRef} 
                                    onChange={handleSpeciesSiteFileChange}
                                    className="hidden" 
                                    accept=".xlsx, .xls"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                    </div>
                    <Image 
                        src="/hero.png" 
                        alt="Animal diet analysis illustration"
                        width={480}
                        height={360}
                        className="hero-image"
                    />
                </section>
            )}
            </main>
        </div>
    );
}
