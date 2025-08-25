
'use server';
/**
 * @fileOverview An AI flow to extract diet plan data from a PDF.
 *
 * - extractDietPlan - A function that handles the diet plan extraction.
 * - DietPlanExtractInput - The input type for the extractDietPlan function.
 * - DietPlanExtractOutput - The return type for the extractDietPlan function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const DietPlanExtractInputSchema = z.object({
  pdfDataUri: z.string().describe(
    "A PDF file of a diet plan, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:application/pdf;base64,<encoded_data>'."
  ),
});
export type DietPlanExtractInput = z.infer<typeof DietPlanExtractInputSchema>;

const MealSchema = z.object({
  name: z.string().describe("The name of the meal, e.g., 'Morning', 'Midday'."),
  time: z.string().describe("The time range for the meal, e.g., '7:00 am – 9:00 am'."),
  mix: z.string().describe("The type of mix for the meal, e.g., 'Vegetable Mix / Sprout Mix'."),
  quantity: z.string().describe("The quantity of the mix, e.g., '40–50 g'."),
  ingredients: z.string().describe("A list of ingredients for the mix."),
  nutritionalValue: z.string().describe("The nutritional information for the meal."),
  supplements: z.string().describe("A list of supplements, often given in rotation."),
});

const SeasonalAdjustmentsSchema = z.object({
  summer: z.string().describe("Dietary adjustments for the summer season."),
  monsoon: z.string().describe("Dietary adjustments for the monsoon season."),
  winter: z.string().describe("Dietary adjustments for the winter season."),
});

const DietPlanExtractOutputSchema = z.object({
  title: z.string().describe("The main title of the diet plan, usually 'Daily Diet Plan'."),
  meals: z.array(MealSchema).describe("An array of meals in the diet plan."),
  seasonalAdjustments: SeasonalAdjustmentsSchema.describe("Adjustments for different seasons."),
  foodEnrichment: z.string().describe("Details about food enrichment practices."),
});
export type DietPlanExtractOutput = z.infer<typeof DietPlanExtractOutputSchema>;

export async function extractDietPlan(input: DietPlanExtractInput): Promise<DietPlanExtractOutput> {
  return extractDietPlanFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractDietPlanPrompt',
  input: { schema: DietPlanExtractInputSchema },
  output: { schema: DietPlanExtractOutputSchema },
  prompt: `
    You are an expert data extractor specializing in animal diet plans.
    Your task is to analyze the provided PDF and extract the diet information into a structured JSON format.
    The PDF contains a daily diet plan with meals, ingredients, nutritional values, supplements, seasonal adjustments, and food enrichment details.
    
    Please extract the following information precisely as requested by the output schema.

    PDF Document:
    {{media url=pdfDataUri}}
  `,
});

const extractDietPlanFlow = ai.defineFlow(
  {
    name: 'extractDietPlanFlow',
    inputSchema: DietPlanExtractInputSchema,
    outputSchema: DietPlanExtractOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
        throw new Error("The AI model failed to extract the diet plan. The PDF might be in an unsupported format or corrupted.");
    }
    return output;
  }
);
