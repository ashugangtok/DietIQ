
'use client';

import { useContext, useMemo, useState } from 'react';
import { DataContext } from '@/context/data-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { generateDietSummary, DietSummaryGenerateInput, DietSummaryGenerateOutput } from '@/ai/flows/generate-diet-summary-flow';
import styles from '../../reporting.module.css';
import { SheetDataRow } from '@/types';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const formatAmount = (quantity: number, uom: string) => {
    if (!uom || isNaN(quantity)) return `0 ${uom || ''}`.trim();
    const uomLower = uom.toLowerCase();
    if ((uomLower === 'kg' || uomLower === 'kilogram') && quantity > 0 && quantity < 1) {
        const grams = quantity * 1000;
        return `${grams.toLocaleString(undefined, { maximumFractionDigits: 0 })} gram`;
    }
    return `${quantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${uom}`;
};

export default function GenerateSummaryPage() {
  const { data, addJournalEntry } = useContext(DataContext);
  const [selectedAnimal, setSelectedAnimal] = useState<string>('');
  const [generatedSummary, setGeneratedSummary] = useState<DietSummaryGenerateOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDetailed, setIsDetailed] = useState(false);

  const animalOptions = useMemo(() => {
    const animalSet = new Set(data.map(row => row.common_name));
    return Array.from(animalSet).sort();
  }, [data]);

  const handleGenerate = async () => {
    if (!selectedAnimal) {
      setError('Please select an animal.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedSummary(null);
    addJournalEntry("Summary Generation Started", `Generating a ${isDetailed ? 'detailed' : 'narrative'} summary for ${selectedAnimal}.`);


    try {
      const animalData = data.filter(row => row.common_name === selectedAnimal);
      if (animalData.length === 0) {
        throw new Error('No data found for the selected animal.');
      }

      // Aggregate data by meal time
      const mealMap = new Map<string, SheetDataRow[]>();
      animalData.forEach(row => {
        const timeKey = row.meal_start_time || "N/A";
        if (!mealMap.has(timeKey)) {
          mealMap.set(timeKey, []);
        }
        mealMap.get(timeKey)!.push(row);
      });

      const dietDataForFlow: DietSummaryGenerateInput['dietData'] = [];
      mealMap.forEach((rows, timeKey) => {
        const typeNameGroup = new Map<string, { ingredients: string[], totalQty: number, totalGram: number, uom: string }>();
        rows.forEach(row => {
          const groupKey = row.type_name || row.ingredient_name;
          if (!typeNameGroup.has(groupKey)) {
            typeNameGroup.set(groupKey, { ingredients: [], totalQty: 0, totalGram: 0, uom: row.base_uom_name });
          }
          const group = typeNameGroup.get(groupKey)!;
          group.ingredients.push(row.ingredient_name);
          group.totalQty += row.ingredient_qty;
          group.totalGram += row.ingredient_qty_gram;
        });
        
        typeNameGroup.forEach((group, typeName) => {
            const quantity = formatAmount(group.totalGram > 0 ? group.totalGram / 1000 : group.totalQty, group.totalGram > 0 ? 'kg' : group.uom);
            dietDataForFlow.push({
                mealTime: timeKey,
                typeName: typeName,
                quantity: quantity,
                ingredients: [...new Set(group.ingredients)],
            });
        });
      });

      const input: DietSummaryGenerateInput = {
        commonName: selectedAnimal,
        scientificName: animalData[0].scientific_name,
        dietData: dietDataForFlow,
        generateDetailedSummary: isDetailed,
      };
      
      const result = await generateDietSummary(input);
      setGeneratedSummary(result);
      addJournalEntry("Summary Generation Successful", `Successfully generated summary titled "${result.title}" for ${selectedAnimal}.`);

    } catch (err) {
      console.error('Generation failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      addJournalEntry("Summary Generation Failed", `Error generating summary for ${selectedAnimal}: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl">Generate Narrative Summary</CardTitle>
        <CardDescription>
          Select an animal from your uploaded data to generate a detailed, narrative diet plan summary using AI.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg">
          <Select value={selectedAnimal} onValueChange={setSelectedAnimal}>
            <SelectTrigger className="w-full sm:w-[280px]">
              <SelectValue placeholder="Select an animal..." />
            </SelectTrigger>
            <SelectContent>
              {animalOptions.map(animal => (
                <SelectItem key={animal} value={animal}>{animal}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center space-x-2">
            <Switch id="detailed-summary" checked={isDetailed} onCheckedChange={setIsDetailed} />
            <Label htmlFor="detailed-summary">Detailed Summary</Label>
          </div>
          <Button onClick={handleGenerate} disabled={!selectedAnimal || isLoading}>
            {isLoading ? 'Generating...' : 'Generate Summary'}
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center p-12 border-2 border-dashed rounded-lg bg-background">
            <h2 className="text-lg font-semibold text-primary">Generating Narrative Summary</h2>
            <div className="text-sm text-muted-foreground mt-2 mb-4 space-y-1">
              <p><span className="font-semibold">Selected Animal:</span> {selectedAnimal}</p>
              <p><span className="font-semibold">Summary Type:</span> {isDetailed ? 'Detailed Summary' : 'Narrative Summary'}</p>
            </div>
            <p className="text-base mb-4">
              ✨ Hang tight! We’re carefully preparing the diet plan for the {selectedAnimal}.<br/>
              Your customized dietary summary will be ready in just a few moments...
            </p>
            <div className="text-xs bg-muted/50 p-2 rounded-md text-muted-foreground mb-4">
                <p>💬 Tip: While you wait, you can explore other animals or upload new diet data.</p>
            </div>
             <div className="flex items-center justify-center text-sm font-semibold text-primary">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                Generating summary...
            </div>
          </div>
        ) : error ? (
          <div className="p-4 text-red-600 bg-red-50 border border-red-200 rounded-md">
            <p className="font-bold">Error:</p>
            <p>{error}</p>
          </div>
        ) : generatedSummary ? (
          <div className="p-6 border rounded-lg bg-background font-sans whitespace-pre-wrap">
              <h1 className="font-headline text-2xl text-primary mb-4">{generatedSummary.title}</h1>
              {generatedSummary.meals.map((meal, index) => (
                <div key={index} className="mb-6">
                  <h2 className="text-xl font-semibold text-primary-dark">
                    {index + 1}. {meal.name} ({meal.time})
                  </h2>
                  <div className="pl-4 mt-2 space-y-2">
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
              <Separator className="my-6" />
              <div className="space-y-3 mb-6">
                <h2 className="text-xl font-semibold text-primary-dark">Seasonal Adjustments</h2>
                <div className="pl-4 space-y-2">
                  <p>
                    <span className="font-semibold">Summer &rarr;</span> {generatedSummary.seasonalAdjustments.summer}
                  </p>
                  <p>
                    <span className="font-semibold">Monsoon &rarr;</span> {generatedSummary.seasonalAdjustments.monsoon}
                  </p>
                  <p>
                    <span className="font-semibold">Winter &rarr;</span> {generatedSummary.seasonalAdjustments.winter}
                  </p>
                </div>
              </div>
              <Separator className="my-6" />
              <div className="space-y-3">
                <h2 className="text-xl font-semibold text-primary-dark">Food Enrichment</h2>
                <p className="pl-4">{generatedSummary.foodEnrichment}</p>
              </div>
          </div>
        ) : (
          <div className="text-center p-12 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">
              Your generated summary will appear here.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
