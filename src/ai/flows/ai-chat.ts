'use server';

/**
 * @fileOverview A simple AI chat flow.
 *
 * - aiChat - A function that handles the chat interaction.
 * - AiChatInput - The input type for the aiChat function.
 * - AiChatOutput - The return type for the aiChat function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiChatInputSchema = z.object({
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.array(z.object({ text: z.string() })),
  })),
  message: z.string(),
});
export type AiChatInput = z.infer<typeof AiChatInputSchema>;

const AiChatOutputSchema = z.object({
  response: z.string(),
});
export type AiChatOutput = z.infer<typeof AiChatOutputSchema>;


export async function aiChat(input: AiChatInput): Promise<AiChatOutput> {
    return aiChatFlow(input);
}

const chatPrompt = ai.definePrompt(
  {
    name: 'aiChatPrompt',
    input: { schema: AiChatInputSchema },
    output: { schema: AiChatOutputSchema },
    prompt: `You are a helpful AI assistant for a facilities management app. Your name is Goldie.
    Answer the user's questions based on the provided history.
    The role 'user' is the human user, and the role 'model' is you, Goldie.
    Be concise and helpful.
    
    History:
    {{#each history}}
    {{role}}: {{#each content}}{{text}}{{/each}}
    {{/each}}
    
    Current Question (from user): {{message}}
    Response (from Goldie):`,
  },
);

const aiChatFlow = ai.defineFlow(
    {
      name: 'aiChatFlow',
      inputSchema: AiChatInputSchema,
      outputSchema: AiChatOutputSchema,
    },
    async (input) => {
        const { output } = await chatPrompt(input);
        if (!output || !output.response) {
            return { response: "I'm sorry, I couldn't generate a response. Please try again." };
        }
        return { response: output.response };
    }
  );
