
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import styles from '../../reporting.module.css';
import { generateDiet, type DietGenerateInput, type DietGenerateOutput } from '@/ai/flows/generate-diet-flow';
import { getScientificName } from '@/ai/flows/get-scientific-name-flow';
import { Badge } from '@/components/ui/badge';
import { ChefHat } from 'lucide-react';

const formSchema = z.object({
  commonName: z.string().min(1, 'Common name is required.'),
  scientificName: z.string().min(1, 'Scientific name is required.'),
  dietaryNotes: z.string().optional(),
});

export default function GenerateDietPage() {
  const [generatedDiet, setGeneratedDiet] = useState<DietGenerateOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      commonName: '',
      scientificName: '',
      dietaryNotes: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setError(null);
    setGeneratedDiet(null);

    try {
      const input: DietGenerateInput = {
        commonName: values.commonName,
        scientificName: values.scientificName,
        dietaryNotes: values.dietaryNotes,
      };
      const result = await generateDiet(input);
      setGeneratedDiet(result);
    } catch (err) {
      console.error('Generation failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }
  
  const handleCommonNameBlur = async () => {
    const commonName = form.getValues('commonName');
    if (commonName && !form.getValues('scientificName')) {
      setIsLookingUp(true);
      try {
        const result = await getScientificName({ commonName });
        if (result.scientificName) {
          form.setValue('scientificName', result.scientificName, { shouldValidate: true });
        }
      } catch (err) {
        console.error('Scientific name lookup failed:', err);
        // Do not block user input if lookup fails, they can enter it manually
      } finally {
        setIsLookingUp(false);
      }
    }
  };

  const DietDisplay = () => {
    if (!generatedDiet) return null;
  
    return (
      <div className="p-6 border rounded-lg bg-background font-sans">
        <h1 className="font-headline text-2xl text-primary mb-4">{generatedDiet.title} for {form.getValues('commonName')}</h1>
        
        {generatedDiet.meals.map((meal, index) => (
          <div key={index} className="mb-6">
            <h2 className="text-xl font-semibold text-primary-dark">
              {index + 1}. {meal.name} ({meal.time})
            </h2>
            <div className="pl-4 mt-2 space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-muted-foreground">Ingredients:</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {meal.ingredients.map((ing, ingIndex) => (
                    <li key={ingIndex} className="text-sm">
                      <span className="font-semibold">{ing.name}</span>: {ing.quantity}
                      {ing.preparation && <span className="text-xs text-muted-foreground"> ({ing.preparation})</span>}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {ing.days.map(day => <Badge key={day} variant="secondary">{day.slice(0,3)}</Badge>)}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
        
        <Separator className="my-6" />
        
        <div className="space-y-3 mb-6">
          <h2 className="text-xl font-semibold text-primary-dark">Seasonal Adjustments</h2>
          <div className="pl-4 space-y-2 text-sm">
            <p><span className="font-semibold">Summer &rarr;</span> {generatedDiet.seasonalAdjustments.summer}</p>
            <p><span className="font-semibold">Monsoon &rarr;</span> {generatedDiet.seasonalAdjustments.monsoon}</p>
            <p><span className="font-semibold">Winter &rarr;</span> {generatedDiet.seasonalAdjustments.winter}</p>
          </div>
        </div>
        
        <Separator className="my-6" />
        
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-primary-dark">Food Enrichment</h2>
          <p className="pl-4 text-sm">{generatedDiet.foodEnrichment}</p>
        </div>
      </div>
    );
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl">Generate a New Diet Plan</CardTitle>
        <CardDescription>
          Provide animal details and let the AI nutritionist create a balanced diet plan.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-4 bg-muted/50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="commonName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Common Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Bengal Tiger" {...field} onBlur={handleCommonNameBlur} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="scientificName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scientific Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input placeholder="e.g., Panthera tigris tigris" {...field} />
                        {isLookingUp && (
                           <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                <div className="h-4 w-4 border-2 border-border border-t-primary rounded-full animate-spin"></div>
                           </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="dietaryNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dietary Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Pregnant female, requires low-fat diet, focus on poultry..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Generating...' : 'Generate Diet'}
            </Button>
          </form>
        </Form>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <div className={styles['chef-loader']}>
              <ChefHat size={80} strokeWidth={1.5} className={styles['chef-hat']} />
              <div className={styles['utensils']}>
                <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2a2.5 2.5 0 0 0-5 0v16a2.5 2.5 0 0 0 5 0V2Z"/><path d="M12 6h1.5a2.5 2.5 0 0 1 0 5H12V6Z"/></svg>
                <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v10"/><path d="M15.24 15.24a5 5 0 0 1-7.07 0 5 5 0 0 1-7.07 0Z"/><path d="M12 10V5c0-1.66-1.34-3-3-3s-3 1.34-3 3v5"/></svg>
              </div>
            </div>
            <p className="mt-4 text-muted-foreground font-semibold">
              Our AI chef is preparing your diet plan...
            </p>
          </div>
        ) : error ? (
          <div className="p-4 text-red-600 bg-red-50 border border-red-200 rounded-md">
            <p className="font-bold">Error:</p>
            <p>{error}</p>
          </div>
        ) : generatedDiet ? (
            <DietDisplay />
        ) : (
          <div className="text-center p-12 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">
              Your generated diet plan will appear here.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
