'use server';

/**
 * @fileOverview Suggests related controls based on a given control description.
 *
 * - suggestRelatedControls - A function that suggests related controls.
 * - SuggestRelatedControlsInput - The input type for the suggestRelatedControls function.
 * - SuggestRelatedControlsOutput - The return type for the suggestRelatedControls function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestRelatedControlsInputSchema = z.object({
  controlDescription: z
    .string()
    .describe('The description of the control for which to suggest related controls.'),
});

export type SuggestRelatedControlsInput = z.infer<typeof SuggestRelatedControlsInputSchema>;

const SuggestRelatedControlsOutputSchema = z.object({
  relatedControls: z
    .array(z.string())
    .describe('A list of descriptions of controls that are related to the input control description.'),
});

export type SuggestRelatedControlsOutput = z.infer<typeof SuggestRelatedControlsOutputSchema>;

export async function suggestRelatedControls(
  input: SuggestRelatedControlsInput
): Promise<SuggestRelatedControlsOutput> {
  return suggestRelatedControlsFlow(input);
}

const suggestRelatedControlsPrompt = ai.definePrompt({
  name: 'suggestRelatedControlsPrompt',
  input: {schema: SuggestRelatedControlsInputSchema},
  output: {schema: SuggestRelatedControlsOutputSchema},
  prompt: `You are an expert in internal controls and SOX compliance.
  Given the description of a control, suggest other controls that might be related to it. These related controls could have dependencies or overlaps.
  Return a list of control descriptions.
  Control Description: {{{controlDescription}}}`,
});

const suggestRelatedControlsFlow = ai.defineFlow(
  {
    name: 'suggestRelatedControlsFlow',
    inputSchema: SuggestRelatedControlsInputSchema,
    outputSchema: SuggestRelatedControlsOutputSchema,
  },
  async input => {
    const {output} = await suggestRelatedControlsPrompt(input);
    return output!;
  }
);
