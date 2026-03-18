'use server';

import { aiChat } from '@/ai/flows/ai-chat';
import { z } from 'zod';

export type ChatState = {
  messages: { role: 'user' | 'assistant'; content: string }[];
  error?: string;
};

const ChatEntry = z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
});

const ChatHistorySchema = z.array(ChatEntry);

export async function chatAction(
  prevState: ChatState,
  formData: FormData
): Promise<ChatState> {
  const message = formData.get('message');
  const historyRaw = formData.get('history');

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return { ...prevState, error: 'Message cannot be empty.' };
  }

  if (!historyRaw || typeof historyRaw !== 'string') {
    return { ...prevState, error: 'Chat history is missing.' };
  }

  let historyData;
  try {
    historyData = JSON.parse(historyRaw);
  } catch (e) {
    return { ...prevState, error: 'Invalid chat history format.' };
  }

  const parsedHistory = ChatHistorySchema.safeParse(historyData);
  if (!parsedHistory.success) {
      return { ...prevState, error: 'Invalid chat history data.' };
  }

  const currentMessages = [...parsedHistory.data, { role: 'user' as const, content: message }];

  try {
    const historyForApi = parsedHistory.data.map(m => ({
        role: m.role === 'user' ? 'user' as const : 'model' as const,
        content: [{ text: m.content }]
    }));

    const result = await aiChat({ history: historyForApi, message });
    
    if (result.response) {
      return {
        messages: [...currentMessages, { role: 'assistant', content: result.response }],
      };
    }
    return { 
        messages: currentMessages,
        error: 'The AI did not provide a response.' 
    };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
    return {
      messages: currentMessages,
      error: `Error communicating with AI: ${errorMessage}`,
    };
  }
}
