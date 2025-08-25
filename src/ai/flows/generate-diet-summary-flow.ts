
'use server';
/**
 * @fileOverview An AI flow to generate a narrative diet summary from structured Excel data.
 *
 * - generateDietSummary - A function that handles the diet summary generation.
 * - DietSummaryGenerateInput - The input type for the generateDietSummary function.
 * - DietSummaryGenerateOutput - The return type for the generateDietSummary function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const MealItemSchema = z.object({
    mealTime: z.string().describe("The time of the meal, e.g., '7:00 am – 9:00 am'."),
    typeName: z.string().describe("The name of the mix or pellet, e.g., 'Vegetable Mix / Sprout Mix'."),
    ingredients: z.array(z.string()).describe("A list of ingredients for the mix."),
    quantity: z.string().describe("The total quantity of the mix for this meal, e.g., '40–50 g'."),
});

export const DietSummaryGenerateInputSchema = z.object({
  commonName: z.string().describe("The common name of the animal."),
  scientificName: z.string().describe("The scientific name of the animal."),
  dietData: z.array(MealItemSchema).describe("A list of meals with their items for the animal."),
});
export type DietSummaryGenerateInput = z.infer<typeof DietSummaryGenerateInputSchema>;

export const DietSummaryGenerateOutputSchema = z.object({
  title: z.string().describe("The main title of the diet plan, usually 'Daily Diet Plan'."),
  meals: z.array(
    z.object({
      name: z.string().describe("The name of the meal, e.g., 'Morning', 'Midday'."),
      time: z.string().describe("The time range for the meal, e.g., '7:00 am – 9:00 am'."),
      mix: z.string().describe("The type of mix for the meal, e.g., 'Vegetable Mix / Sprout Mix'."),
      quantity: z.string().describe("The quantity of the mix, e.g., '40–50 g'."),
      ingredients: z.string().describe("A comma-separated list of ingredients for the mix."),
      nutritionalValue: z.string().describe("Plausible nutritional information for the meal."),
      supplements: z.string().describe("A plausible list of supplements, often given in rotation."),
    })
  ).describe("An array of meals in the diet plan."),
  seasonalAdjustments: z.object({
    summer: z.string().describe("Plausible dietary adjustments for the summer season."),
    monsoon: z.string().describe("Plausible dietary adjustments for the monsoon season."),
    winter: z.string().describe("Plausible dietary adjustments for the winter season."),
  }).describe("Plausible adjustments for different seasons."),
  foodEnrichment: z.string().describe("Plausible details about food enrichment practices."),
});
export type DietSummaryGenerateOutput = z.infer<typeof DietSummaryGenerateOutputSchema>;

export async function generateDietSummary(input: DietSummaryGenerateInput): Promise<DietSummaryGenerateOutput> {
  return generateDietSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDietSummaryPrompt',
  input: { schema: DietSummaryGenerateInputSchema },
  output: { schema: DietSummaryGenerateOutputSchema },
  prompt: `
    You are an expert animal nutritionist. Your task is to generate a detailed, narrative-style diet plan for an animal based on structured data.
    The output must be in the format requested by the output schema.
    For fields like Nutritional Value, Supplements, Seasonal Adjustments, and Food Enrichment, you must generate plausible and realistic information based on the animal's species and the provided ingredients.

    Animal Information:
    - Common Name: {{{commonName}}}
    - Scientific Name: {{{scientificName}}}

    Meal and Ingredient Data:
    {{#each dietData}}
    - Meal Time: {{mealTime}}
      - Mix/Pellet Name: {{typeName}}
      - Quantity: {{quantity}}
      - Ingredients: {{#each ingredients}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
    {{/each}}

    Please generate a complete diet plan based on this data. Be creative but realistic in the generated fields.
  `,
});

const generateDietSummaryFlow = ai.defineFlow(
  {
    name: 'generateDietSummaryFlow',
    inputSchema: DietSummaryGenerateInputSchema,
    outputSchema: DietSummaryGenerateOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
        throw new Error("The AI model failed to generate the diet summary.");
    }
    return output;
  }
);
