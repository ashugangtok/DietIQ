
'use server';
/**
 * @fileOverview An AI flow to retrieve the scientific name of an animal from its common name.
 *
 * - getScientificName - A function that handles the scientific name lookup.
 * - GetScientificNameInput - The input type for the getScientificName function.
 * - GetScientificNameOutput - The return type for the getScientificName function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GetScientificNameInputSchema = z.object({
  commonName: z.string().describe("The common name of the animal (e.g., 'Bengal Tiger')."),
});
export type GetScientificNameInput = z.infer<typeof GetScientificNameInputSchema>;


const GetScientificNameOutputSchema = z.object({
  scientificName: z.string().describe("The scientific name of the animal (e.g., 'Panthera tigris tigris')."),
});
export type GetScientificNameOutput = z.infer<typeof GetScientificNameOutputSchema>;

export async function getScientificName(input: GetScientificNameInput): Promise<GetScientificNameOutput> {
  return getScientificNameFlow(input);
}

const getScientificNameTool = ai.defineTool(
    {
        name: 'getScientificNameTool',
        description: 'A tool to get the scientific name of an animal.',
        inputSchema: GetScientificNameInputSchema,
        outputSchema: GetScientificNameOutputSchema
    },
    async (input) => {
        // This is a placeholder. In a real application, you might query a database
        // or an external API like Wikipedia, IUCN Red List, or GBIF.
        // For this example, we'll use a simple AI call to simulate the lookup.
        const llmResponse = await ai.generate({
            prompt: `What is the scientific name for the following animal: ${input.commonName}? Please provide only the scientific name and nothing else.`,
            temperature: 0, // We want factual, deterministic output
        });
        
        return { scientificName: llmResponse.text.trim() };
    }
);


const getScientificNameFlow = ai.defineFlow(
  {
    name: 'getScientificNameFlow',
    inputSchema: GetScientificNameInputSchema,
    outputSchema: GetScientificNameOutputSchema,
  },
  async (input) => {
    return getScientificNameTool(input);
  }
);
