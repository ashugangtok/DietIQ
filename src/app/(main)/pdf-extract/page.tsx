
'use client';

import { useState, useRef, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { UploadCloud, AlertCircle } from 'lucide-react';
import { extractDietPlan } from '@/ai/flows/extract-diet-plan-flow';
import { DataContext } from '@/context/data-context';
import styles from '../../reporting.module.css';

export default function PdfExtractPage() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { setExtractedData, addJournalEntry } = useContext(DataContext);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile);
        setError(null);
      } else {
        setError('Invalid file type. Please upload a PDF file.');
        setFile(null);
      }
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const droppedFile = event.dataTransfer.files?.[0];
    if (droppedFile) {
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile);
        setError(null);
      } else {
        setError('Invalid file type. Please upload a PDF file.');
        setFile(null);
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleExtract = async () => {
    if (!file) {
      setError('Please select a file first.');
      return;
    }

    setIsLoading(true);
    setError(null);
    addJournalEntry("PDF Extraction Started", `Starting data extraction from ${file.name}.`);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const pdfDataUri = reader.result as string;
        
        const result = await extractDietPlan({ pdfDataUri });
        setExtractedData(result);
        addJournalEntry("PDF Extraction Successful", `Successfully extracted diet plan titled "${result.title}" from ${file.name}.`);
        
        router.push('/extracted-data');
      };
      reader.onerror = (err) => {
        throw new Error('Failed to read the file.');
      };
    } catch (err) {
        console.error('Extraction failed:', err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during extraction.';
        setError(errorMessage);
        addJournalEntry("PDF Extraction Failed", `Error extracting data from ${file.name}: ${errorMessage}`);
        setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">Extract Diet Plan from PDF</CardTitle>
        <CardDescription>
          Upload a PDF file containing a diet plan, and the AI will extract the information into a structured format.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
          onClick={handleUploadClick}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="application/pdf"
            disabled={isLoading}
          />
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <UploadCloud className="w-12 h-12 text-primary" />
            <p className="font-semibold">
              {file ? `Selected: ${file.name}` : 'Click to browse or drag & drop a PDF'}
            </p>
            <p className="text-sm">Supports .pdf files only</p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-4">
            <div className={styles['paw-loader-lg']}>
                <div className={styles.paw}></div>
                <div className={styles.paw}></div>
                <div className={styles.paw}></div>
            </div>
            <p className="mt-4 text-muted-foreground font-semibold">
              AI is analyzing the document... this may take a moment.
            </p>
          </div>
        ) : (
          <Button
            onClick={handleExtract}
            disabled={!file || isLoading}
            className="w-full"
            size="lg"
          >
            Extract Data
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
