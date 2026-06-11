'use server';

/**
 * @fileOverview Operations & Scheduling Agent - Manages operations and scheduling
 *
 * Manages maintenance schedules, work orders, inventory, and resource allocation.
 * Interfaces with staff via natural language.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Optimize Maintenance Schedule
const OptimizeMaintenanceScheduleInputSchema = z.object({
  assets: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    lastMaintenance: z.string().optional(),
    nextDue: z.string().optional(),
    priority: z.enum(['Low', 'Medium', 'High', 'Critical']),
  })),
  availableStaff: z.array(z.object({
    id: z.string(),
    name: z.string(),
    skills: z.array(z.string()),
    availability: z.array(z.string()).describe('Available time slots'),
  })),
  constraints: z.object({
    maxTasksPerDay: z.number().optional(),
    preferredTimeWindows: z.array(z.string()).optional(),
  }).optional(),
});
export type OptimizeMaintenanceScheduleInput = z.infer<typeof OptimizeMaintenanceScheduleInputSchema>;

const OptimizeMaintenanceScheduleOutputSchema = z.object({
  schedule: z.array(z.object({
    assetId: z.string(),
    assetName: z.string(),
    maintenanceType: z.string(),
    assignedStaff: z.string(),
    scheduledDate: z.string(),
    scheduledTime: z.string(),
    estimatedDuration: z.number().describe('Duration in minutes'),
    priority: z.string(),
  })),
  conflicts: z.array(z.string()).optional().describe('Any scheduling conflicts detected'),
  recommendations: z.array(z.string()),
  reasoning: z.string(),
});
export type OptimizeMaintenanceScheduleOutput = z.infer<typeof OptimizeMaintenanceScheduleOutputSchema>;

export async function optimizeMaintenanceSchedule(input: OptimizeMaintenanceScheduleInput): Promise<OptimizeMaintenanceScheduleOutput> {
  return optimizeMaintenanceScheduleFlow(input);
}

const optimizeMaintenanceSchedulePrompt = ai.definePrompt({
  name: 'optimizeMaintenanceSchedulePrompt',
  input: { schema: OptimizeMaintenanceScheduleInputSchema },
  output: { schema: OptimizeMaintenanceScheduleOutputSchema },
  prompt: `You are the Operations & Scheduling Agent, optimizing maintenance schedules for maximum efficiency.

Assets Requiring Maintenance:
{{#each assets}}
- {{name}} ({{type}})
  Priority: {{priority}}
  {{#if lastMaintenance}}Last Maintenance: {{lastMaintenance}}{{/if}}
  {{#if nextDue}}Next Due: {{nextDue}}{{/if}}
{{/each}}

Available Staff:
{{#each availableStaff}}
- {{name}}
  Skills: {{#each skills}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
  Availability: {{#each availability}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
{{/each}}

{{#if constraints}}
Constraints:
{{#if constraints.maxTasksPerDay}}- Maximum {{constraints.maxTasksPerDay}} tasks per day{{/if}}
{{#if constraints.preferredTimeWindows}}
- Preferred time windows: {{#each constraints.preferredTimeWindows}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}
{{/if}}

Create an optimized maintenance schedule that:
1. Prioritizes high-priority and overdue maintenance
2. Matches staff skills to maintenance requirements
3. Respects availability and constraints
4. Minimizes downtime and conflicts
5. Balances workload across staff

Detect any scheduling conflicts and provide recommendations for resolution.`,
});

const optimizeMaintenanceScheduleFlow = ai.defineFlow(
  {
    name: 'optimizeMaintenanceScheduleFlow',
    inputSchema: OptimizeMaintenanceScheduleInputSchema,
    outputSchema: OptimizeMaintenanceScheduleOutputSchema,
  },
  async (input) => {
    const { output } = await optimizeMaintenanceSchedulePrompt(input);
    if (!output) {
      return {
        schedule: [],
        recommendations: ['Failed to optimize schedule. Please review input data.'],
        reasoning: 'Scheduling optimization failed.',
      };
    }
    return output;
  }
);

// Manage Work Order Assignment
const ManageWorkOrderInputSchema = z.object({
  workOrder: z.object({
    id: z.string(),
    location: z.string(),
    issueType: z.string(),
    description: z.string(),
    priority: z.enum(['Low', 'Medium', 'High', 'Urgent']),
    createdAt: z.string(),
  }),
  availableTechnicians: z.array(z.object({
    id: z.string(),
    name: z.string(),
    specialties: z.array(z.string()),
    currentTasks: z.number(),
    location: z.string().optional(),
  })),
  historicalData: z.object({
    averageCompletionTime: z.number().optional(),
    successRate: z.number().optional(),
  }).optional(),
});
export type ManageWorkOrderInput = z.infer<typeof ManageWorkOrderInputSchema>;

const ManageWorkOrderOutputSchema = z.object({
  recommendedAssignment: z.object({
    technicianId: z.string(),
    technicianName: z.string(),
    reasoning: z.string(),
    estimatedCompletionTime: z.number().describe('Estimated time in minutes'),
  }),
  alternativeAssignments: z.array(z.object({
    technicianId: z.string(),
    technicianName: z.string(),
    reasoning: z.string(),
  })).optional(),
  urgencyAssessment: z.string(),
  requiredResources: z.array(z.string()).optional(),
});
export type ManageWorkOrderOutput = z.infer<typeof ManageWorkOrderOutputSchema>;

export async function manageWorkOrder(input: ManageWorkOrderInput): Promise<ManageWorkOrderOutput> {
  return manageWorkOrderFlow(input);
}

const manageWorkOrderPrompt = ai.definePrompt({
  name: 'manageWorkOrderPrompt',
  input: { schema: ManageWorkOrderInputSchema },
  output: { schema: ManageWorkOrderOutputSchema },
  prompt: `You are the Operations & Scheduling Agent, managing work order assignments.

Work Order Details:
- ID: {{workOrder.id}}
- Location: {{workOrder.location}}
- Issue Type: {{workOrder.issueType}}
- Description: {{workOrder.description}}
- Priority: {{workOrder.priority}}
- Created: {{workOrder.createdAt}}

Available Technicians:
{{#each availableTechnicians}}
- {{name}} (ID: {{id}})
  Specialties: {{#each specialties}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
  Current Tasks: {{currentTasks}}
  {{#if location}}Location: {{location}}{{/if}}
{{/each}}

{{#if historicalData}}
Historical Data:
{{#if historicalData.averageCompletionTime}}- Average completion time for this issue type: {{historicalData.averageCompletionTime}} minutes{{/if}}
{{#if historicalData.successRate}}- Historical success rate: {{historicalData.successRate}}%{{/if}}
{{/if}}

Analyze the work order and recommend:
1. The best technician to assign based on skills, workload, and location
2. Alternative assignments if the primary choice is unavailable
3. Assessment of urgency and response time needed
4. Resources or materials likely needed for the job
5. Estimated completion time

Provide clear reasoning for your recommendation.`,
});

const manageWorkOrderFlow = ai.defineFlow(
  {
    name: 'manageWorkOrderFlow',
    inputSchema: ManageWorkOrderInputSchema,
    outputSchema: ManageWorkOrderOutputSchema,
  },
  async (input) => {
    const { output } = await manageWorkOrderPrompt(input);
    if (!output) {
      return {
        recommendedAssignment: {
          technicianId: '',
          technicianName: 'Unassigned',
          reasoning: 'Failed to determine best assignment.',
          estimatedCompletionTime: 0,
        },
        urgencyAssessment: 'Unable to assess urgency.',
      };
    }
    return output;
  }
);

// Forecast Resource Needs
const ForecastResourceNeedsInputSchema = z.object({
  timeframe: z.string().describe('Timeframe for forecast (e.g., "Q2 2026", "Next Month")'),
  historicalData: z.object({
    workOrdersPerMonth: z.array(z.number()),
    inventoryUsage: z.array(z.object({
      item: z.string(),
      averageMonthlyUsage: z.number(),
    })),
    staffUtilization: z.array(z.object({
      role: z.string(),
      averageHoursPerWeek: z.number(),
    })),
  }),
  upcomingEvents: z.array(z.string()).optional().describe('Planned events that might affect resources'),
});
export type ForecastResourceNeedsInput = z.infer<typeof ForecastResourceNeedsInputSchema>;

const ForecastResourceNeedsOutputSchema = z.object({
  forecasts: z.array(z.object({
    resourceType: z.enum(['Labor', 'Materials', 'Budget']),
    predictedDemand: z.number(),
    currentAllocation: z.number(),
    gap: z.number(),
    confidence: z.number().describe('Confidence score 0-100'),
  })),
  recommendations: z.array(z.string()),
  riskFactors: z.array(z.string()).optional(),
});
export type ForecastResourceNeedsOutput = z.infer<typeof ForecastResourceNeedsOutputSchema>;

export async function forecastResourceNeeds(input: ForecastResourceNeedsInput): Promise<ForecastResourceNeedsOutput> {
  return forecastResourceNeedsFlow(input);
}

const forecastResourceNeedsPrompt = ai.definePrompt({
  name: 'forecastResourceNeedsPrompt',
  input: { schema: ForecastResourceNeedsInputSchema },
  output: { schema: ForecastResourceNeedsOutputSchema },
  prompt: `You are the Operations & Scheduling Agent forecasting resource needs.

Timeframe: {{timeframe}}

Historical Data:
Work Orders per Month: {{#each historicalData.workOrdersPerMonth}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}

Inventory Usage:
{{#each historicalData.inventoryUsage}}
- {{item}}: {{averageMonthlyUsage}} units/month
{{/each}}

Staff Utilization:
{{#each historicalData.staffUtilization}}
- {{role}}: {{averageHoursPerWeek}} hours/week
{{/each}}

{{#if upcomingEvents}}
Upcoming Events:
{{#each upcomingEvents}}
- {{this}}
{{/each}}
{{/if}}

Based on historical trends and upcoming events, forecast:
1. Labor needs (staffing levels)
2. Material needs (inventory requirements)
3. Budget requirements
4. Identify gaps between predicted demand and current allocation
5. Assess confidence level for each forecast (0-100)
6. Highlight risk factors that could affect predictions

Provide actionable recommendations for resource planning.`,
});

const forecastResourceNeedsFlow = ai.defineFlow(
  {
    name: 'forecastResourceNeedsFlow',
    inputSchema: ForecastResourceNeedsInputSchema,
    outputSchema: ForecastResourceNeedsOutputSchema,
  },
  async (input) => {
    const { output } = await forecastResourceNeedsPrompt(input);
    if (!output) {
      return {
        forecasts: [],
        recommendations: ['Unable to generate forecast. Please verify historical data.'],
      };
    }
    return output;
  }
);
