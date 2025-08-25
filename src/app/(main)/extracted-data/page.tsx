
'use client';

import { useContext } from 'react';
import { DataContext } from '@/context/data-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { FileSpreadsheet } from 'lucide-react';

export default function ExtractedDataPage() {
  const { extractedData } = useContext(DataContext);

  if (!extractedData) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Extracted Diet Plan</CardTitle>
          <CardDescription>
            A detailed, narrative summary of a diet plan extracted from a PDF will appear here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center p-12 border-2 border-dashed rounded-lg">
            <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">
              This view is for PDF data only and is not populated by Excel uploads.
            </p>
             <p className="mt-2 text-muted-foreground">
              To see this report, please go to the{' '}
              <a href="/pdf-extract" className="text-primary underline">
                Extract from PDF
              </a>{' '}
              page to upload a file.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg font-sans">
      <CardHeader>
        <CardTitle className="font-headline text-2xl text-primary">{extractedData.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {extractedData.meals.map((meal, index) => (
          <div key={index} className="space-y-3">
            <h2 className="text-xl font-semibold text-primary-dark">
              {index + 1}. {meal.name} ({meal.time})
            </h2>
            <div className="pl-4 space-y-2">
              <p>
                <span className="font-semibold">{meal.mix} &rarr;</span> {meal.quantity}
              </p>
              <p className="text-muted-foreground">{meal.ingredients}</p>
              <p className="font-medium">
                <span className="font-semibold">Nutritional Value:</span> {meal.nutritionalValue}
              </p>
              <p>
                <span className="font-semibold">Supplements (in rotation):</span> {meal.supplements}
              </p>
            </div>
          </div>
        ))}

        <Separator />

        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-primary-dark">Seasonal Adjustments</h2>
          <div className="pl-4 space-y-2">
            <p>
              <span className="font-semibold">Summer &rarr;</span> {extractedData.seasonalAdjustments.summer}
            </p>
            <p>
              <span className="font-semibold">Monsoon &rarr;</span> {extractedData.seasonalAdjustments.monsoon}
            </p>
            <p>
              <span className="font-semibold">Winter &rarr;</span> {extractedData.seasonalAdjustments.winter}
            </p>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-primary-dark">Food Enrichment</h2>
          <p className="pl-4">{extractedData.foodEnrichment}</p>
        </div>
      </CardContent>
    </Card>
  );
}
