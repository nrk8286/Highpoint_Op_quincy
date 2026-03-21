import { config } from 'dotenv';
config();

import '@/ai/flows/generate-audit-report.ts';
import '@/ai/flows/ai-chat.ts';
import '@/ai/flows/manager-agent.ts';
import '@/ai/flows/compliance-agent.ts';
import '@/ai/flows/operations-agent.ts';
import '@/ai/flows/training-agent.ts';
import '@/ai/flows/critic-agent.ts';
