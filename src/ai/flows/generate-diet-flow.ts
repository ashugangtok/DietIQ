
'use server';
/**
 * @fileOverview An AI flow to generate a new diet plan from scratch based on animal characteristics.
 *
 * - generateDiet - A function that handles the diet plan generation.
 * - DietGenerateInput - The input type for the generateDiet function.
 * - DietGenerateOutput - The return type for the generateDiet function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

export const DietGenerateInputSchema = z.object({
  commonName: z.string().describe("The common name of the animal (e.g., 'Bengal Tiger')."),
  scientificName: z.string().describe("The scientific name of the animal (e.g., 'Panthera tigris tigris')."),
  dietaryNotes: z.string().optional().describe("Any specific notes or constraints for the diet, such as 'low-fat', 'pregnant female', 'focus on poultry', etc."),
});
export type DietGenerateInput = z.infer<typeof DietGenerateInputSchema>;

export const DietGenerateOutputSchema = z.object({
  title: z.string().describe("The main title of the diet plan, usually 'Daily Diet Plan'."),
  meals: z.array(
    z.object({
      name: z.string().describe("The name of the meal, e.g., 'Morning', 'Midday'."),
      time: z.string().describe("The plausible time range for the meal, e.g., '7:00 am – 9:00 am'."),
      mix: z.string().describe("The type of mix for the meal, e.g., 'Meat Mix'."),
      quantity: z.string().describe("A plausible quantity for the mix, e.g., '5-7 kg'."),
      ingredients: z.string().describe("A comma-separated list of appropriate ingredients for the mix."),
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
export type DietGenerateOutput = z.infer<typeof DietGenerateOutputSchema>;

export async function generateDiet(input: DietGenerateInput): Promise<DietGenerateOutput> {
  return generateDietFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDietPrompt',
  input: { schema: DietGenerateInputSchema },
  output: { schema: DietGenerateOutputSchema },
  prompt: `
    You are an expert animal nutritionist and zookeeper. Your task is to create a complete and plausible daily diet plan for a given animal.
    The diet plan should be balanced, appropriate for the species, and include considerations for enrichment and seasonal changes.
    The output must be in the structured format requested by the output schema. Generate concise, realistic, and well-researched information for all fields.

    Animal Information:
    - Common Name: {{{commonName}}}
    - Scientific Name: {{{scientificName}}}
    
    {{#if dietaryNotes}}
    Specific Dietary Considerations:
    - {{{dietaryNotes}}}
    Please ensure the generated diet plan strictly adheres to these notes.
    {{/if}}

    Generate a complete, structured diet plan now.
  `,
});

const generateDietFlow = ai.defineFlow(
  {
    name: 'generateDietFlow',
    inputSchema: DietGenerateInputSchema,
    outputSchema: DietGenerateOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
        throw new Error("The AI model failed to generate the diet plan. Please try again with more specific details.");
    }
    return output;
  }
);
