
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
import { generateDiet, DietGenerateInput, DietGenerateOutput } from '@/ai/flows/generate-diet-flow';

const formSchema = z.object({
  commonName: z.string().min(1, 'Common name is required.'),
  scientificName: z.string().min(1, 'Scientific name is required.'),
  dietaryNotes: z.string().optional(),
});

export default function GenerateDietPage() {
  const [generatedDiet, setGeneratedDiet] = useState<DietGenerateOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
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
                      <Input placeholder="e.g., Bengal Tiger" {...field} />
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
                      <Input placeholder="e.g., Panthera tigris tigris" {...field} />
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
            <div className={styles['paw-loader-lg']}>
                <div className={styles.paw}></div>
                <div className={styles.paw}></div>
                <div className={styles.paw}></div>
            </div>
            <p className="mt-4 text-muted-foreground font-semibold">
              AI is crafting the new diet plan... this might take a moment.
            </p>
          </div>
        ) : error ? (
          <div className="p-4 text-red-600 bg-red-50 border border-red-200 rounded-md">
            <p className="font-bold">Error:</p>
            <p>{error}</p>
          </div>
        ) : generatedDiet ? (
          <div className="p-6 border rounded-lg bg-background font-sans whitespace-pre-wrap">
              <h1 className="font-headline text-2xl text-primary mb-4">{generatedDiet.title} for {form.getValues('commonName')}</h1>
              {generatedDiet.meals.map((meal, index) => (
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
                    <span className="font-semibold">Summer &rarr;</span> {generatedDiet.seasonalAdjustments.summer}
                  </p>
                  <p>
                    <span className="font-semibold">Monsoon &rarr;</span> {generatedDiet.seasonalAdjustments.monsoon}
                  </p>
                  <p>
                    <span className="font-semibold">Winter &rarr;</span> {generatedDiet.seasonalAdjustments.winter}
                  </p>
                </div>
              </div>
              <Separator className="my-6" />
              <div className="space-y-3">
                <h2 className="text-xl font-semibold text-primary-dark">Food Enrichment</h2>
                <p className="pl-4">{generatedDiet.foodEnrichment}</p>
              </div>
          </div>
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
