'use server';

/**
 * @fileOverview Manager Agent - Coordinates multi-agent operations
 *
 * The Manager Agent decomposes high-level objectives into subtasks,
 * assigns them to specialized agents, and monitors progress.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const DecomposeObjectiveInputSchema = z.object({
  objective: z.string().describe('The high-level objective to decompose'),
  context: z.object({
    availableAgents: z.array(z.string()).describe('List of available agent roles'),
    currentWorkload: z.record(z.number()).describe('Current task counts per agent'),
    priority: z.enum(['Low', 'Medium', 'High', 'Critical']),
  }),
});
export type DecomposeObjectiveInput = z.infer<typeof DecomposeObjectiveInputSchema>;

const DecomposeObjectiveOutputSchema = z.object({
  subtasks: z.array(z.object({
    title: z.string(),
    description: z.string(),
    assignedAgentRole: z.string(),
    priority: z.enum(['Low', 'Medium', 'High', 'Critical']),
    dependencies: z.array(z.string()).optional(),
    estimatedDuration: z.number().optional().describe('Estimated duration in minutes'),
  })),
  reasoning: z.string().describe('Explanation of task decomposition strategy'),
});
export type DecomposeObjectiveOutput = z.infer<typeof DecomposeObjectiveOutputSchema>;

export async function decomposeObjective(input: DecomposeObjectiveInput): Promise<DecomposeObjectiveOutput> {
  return decomposeObjectiveFlow(input);
}

const decomposeObjectivePrompt = ai.definePrompt({
  name: 'decomposeObjectivePrompt',
  input: { schema: DecomposeObjectiveInputSchema },
  output: { schema: DecomposeObjectiveOutputSchema },
  prompt: `You are the Manager Agent, responsible for coordinating a multi-agent facility management system.

Your role is to decompose high-level objectives into specific, actionable subtasks and assign them to the most appropriate specialized agents.

Available Agent Roles:
{{#each context.availableAgents}}
- {{this}}
{{/each}}

Current Workload (task counts):
{{#each context.currentWorkload}}
- {{@key}}: {{this}} tasks
{{/each}}

Objective to Decompose:
{{objective}}

Priority: {{context.priority}}

Guidelines:
1. Break down the objective into specific, measurable subtasks
2. Assign each subtask to the most appropriate agent based on their specialization:
   - Compliance: Regulatory monitoring, safety inspections, compliance reports
   - Operations: Maintenance scheduling, work orders, inventory, resource allocation
   - Training: Content generation, onboarding materials, learning modules
   - Critic: Quality evaluation, feedback generation, output validation
   - Analytics: Data analysis, forecasting, performance insights
3. Consider current workload when distributing tasks
4. Identify dependencies between tasks (tasks that must complete before others can start)
5. Estimate task duration realistically
6. Maintain the same priority level unless a subtask is clearly more/less urgent

Return a structured plan with subtasks, assignments, dependencies, and reasoning.`,
});

const decomposeObjectiveFlow = ai.defineFlow(
  {
    name: 'decomposeObjectiveFlow',
    inputSchema: DecomposeObjectiveInputSchema,
    outputSchema: DecomposeObjectiveOutputSchema,
  },
  async (input) => {
    const { output } = await decomposeObjectivePrompt(input);
    if (!output) {
      return {
        subtasks: [],
        reasoning: 'Failed to decompose objective. Please try again.',
      };
    }
    return output;
  }
);

// Consolidate Results
const ConsolidateResultsInputSchema = z.object({
  objective: z.string(),
  completedTasks: z.array(z.object({
    title: z.string(),
    output: z.any(),
    agent: z.string(),
  })),
});
export type ConsolidateResultsInput = z.infer<typeof ConsolidateResultsInputSchema>;

const ConsolidateResultsOutputSchema = z.object({
  summary: z.string().describe('Overall summary of objective completion'),
  results: z.record(z.any()).describe('Structured results from all tasks'),
  recommendations: z.array(z.string()).describe('Next steps or recommendations'),
});
export type ConsolidateResultsOutput = z.infer<typeof ConsolidateResultsOutputSchema>;

export async function consolidateResults(input: ConsolidateResultsInput): Promise<ConsolidateResultsOutput> {
  return consolidateResultsFlow(input);
}

const consolidateResultsPrompt = ai.definePrompt({
  name: 'consolidateResultsPrompt',
  input: { schema: ConsolidateResultsInputSchema },
  output: { schema: ConsolidateResultsOutputSchema },
  prompt: `You are the Manager Agent consolidating results from multiple specialized agents.

Original Objective:
{{objective}}

Completed Tasks:
{{#each completedTasks}}
Task: {{title}}
Agent: {{agent}}
Output: {{output}}

{{/each}}

Your job is to:
1. Synthesize all task outputs into a coherent summary
2. Extract key results and organize them logically
3. Provide actionable recommendations based on the completed work

Return a comprehensive summary, structured results, and next steps.`,
});

const consolidateResultsFlow = ai.defineFlow(
  {
    name: 'consolidateResultsFlow',
    inputSchema: ConsolidateResultsInputSchema,
    outputSchema: ConsolidateResultsOutputSchema,
  },
  async (input) => {
    const { output } = await consolidateResultsPrompt(input);
    if (!output) {
      return {
        summary: 'Failed to consolidate results.',
        results: {},
        recommendations: [],
      };
    }
    return output;
  }
);
