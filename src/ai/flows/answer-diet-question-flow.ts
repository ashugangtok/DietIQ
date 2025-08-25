
'use server';
/**
 * @fileOverview An AI flow to answer questions about a generated diet plan.
 *
 * - answerDietQuestion - A function that handles the question-answering process.
 * - AnswerDietQuestionInput - The input type for the answerDietQuestion function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const AnswerDietQuestionInputSchema = z.object({
  dietPlan: z.string().describe("The full text of the generated diet plan to be used as context."),
  question: z.string().describe("The user's question about the diet plan."),
});
export type AnswerDietQuestionInput = z.infer<typeof AnswerDietQuestionInputSchema>;

export async function answerDietQuestion(input: AnswerDietQuestionInput) {
  const stream = await answerDietQuestionFlow(input);
  return stream;
}

const answerDietQuestionFlow = ai.defineFlow(
  {
    name: 'answerDietQuestionFlow',
    inputSchema: AnswerDietQuestionInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    const { stream } = await ai.generateStream({
      prompt: `You are an expert animal nutritionist. Your task is to answer the user's question based *only* on the provided diet plan context. Do not use any external knowledge. If the answer is not in the context, say that you cannot find that information in the diet plan.

      Diet Plan Context:
      ---
      {{{dietPlan}}}
      ---

      User's Question:
      {{{question}}}
      `,
      input: input,
    });

    let response = '';
    for await (const chunk of stream) {
      response += chunk.text;
    }
    return response;
  }
);
