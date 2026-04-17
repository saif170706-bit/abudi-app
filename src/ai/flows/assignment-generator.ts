// src/ai/flows/assignment-generator.ts
'use server';
/**
 * @fileOverview A flow to generate tailored homework assignments for students based on their performance.
 *
 * - generateAssignment - A function that generates homework assignments.
 * - AssignmentGeneratorInput - The input type for the generateAssignment function.
 * - AssignmentGeneratorOutput - The return type for the generateAssignment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AssignmentGeneratorInputSchema = z.object({
  studentPerformance: z.string().describe('A description of the student\'s performance and learning gaps.'),
  desiredOutcomes: z.string().describe('The specific learning outcomes the assignment should achieve.'),
});
export type AssignmentGeneratorInput = z.infer<typeof AssignmentGeneratorInputSchema>;

const AssignmentGeneratorOutputSchema = z.object({
  assignmentDescription: z.string().describe('A detailed description of the tailored homework assignment.'),
  suggestedTools: z.array(z.string()).describe('A list of suggested tools (multimedia, summaries, multiple choice questions, etc.) to support the assignment.'),
});
export type AssignmentGeneratorOutput = z.infer<typeof AssignmentGeneratorOutputSchema>;

export async function generateAssignment(input: AssignmentGeneratorInput): Promise<AssignmentGeneratorOutput> {
  return assignmentGeneratorFlow(input);
}

const assignmentGeneratorPrompt = ai.definePrompt({
  name: 'assignmentGeneratorPrompt',
  input: {schema: AssignmentGeneratorInputSchema},
  output: {schema: AssignmentGeneratorOutputSchema},
  prompt: `You are an AI assistant helping teachers generate tailored homework assignments for their students.

  Based on the student's performance and desired outcomes, suggest a detailed homework assignment and appropriate tools to support the student.

  Student Performance: {{{studentPerformance}}}
  Desired Outcomes: {{{desiredOutcomes}}}

  Assignment Description:
  Suggested Tools:`, // Ensure that output includes both assignment description and list of tools
});

const assignmentGeneratorFlow = ai.defineFlow(
  {
    name: 'assignmentGeneratorFlow',
    inputSchema: AssignmentGeneratorInputSchema,
    outputSchema: AssignmentGeneratorOutputSchema,
  },
  async input => {
    const {output} = await assignmentGeneratorPrompt(input);
    return output!;
  }
);
