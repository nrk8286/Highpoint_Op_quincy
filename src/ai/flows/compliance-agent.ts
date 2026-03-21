'use server';

/**
 * @fileOverview Compliance & Research Agent - Claude-powered compliance monitoring
 *
 * Uses Claude's reasoning capabilities to monitor regulatory requirements,
 * generate compliance reports, and interpret legal updates.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Monitor Compliance Requirements
const MonitorComplianceInputSchema = z.object({
  regulatoryBodies: z.array(z.string()).describe('Regulatory bodies to monitor (e.g., IDPH, OSHA, CMS)'),
  categories: z.array(z.string()).optional().describe('Specific categories to focus on'),
  existingRequirements: z.array(z.object({
    title: z.string(),
    status: z.string(),
    dueDate: z.string().optional(),
  })).optional(),
});
export type MonitorComplianceInput = z.infer<typeof MonitorComplianceInputSchema>;

const MonitorComplianceOutputSchema = z.object({
  updates: z.array(z.object({
    title: z.string(),
    description: z.string(),
    regulatoryBody: z.string(),
    category: z.string(),
    effectiveDate: z.string().optional(),
    actionRequired: z.string(),
    urgency: z.enum(['Low', 'Medium', 'High', 'Critical']),
  })),
  recommendations: z.array(z.string()),
  summary: z.string(),
});
export type MonitorComplianceOutput = z.infer<typeof MonitorComplianceOutputSchema>;

export async function monitorCompliance(input: MonitorComplianceInput): Promise<MonitorComplianceOutput> {
  return monitorComplianceFlow(input);
}

const monitorCompliancePrompt = ai.definePrompt({
  name: 'monitorCompliancePrompt',
  input: { schema: MonitorComplianceInputSchema },
  output: { schema: MonitorComplianceOutputSchema },
  prompt: `You are the Compliance & Research Agent, specializing in regulatory compliance for healthcare facilities.

Your responsibilities include:
- Monitoring regulatory requirements from various bodies
- Identifying upcoming compliance deadlines
- Recommending actions to maintain compliance
- Interpreting regulatory changes and their impact

Regulatory Bodies to Monitor:
{{#each regulatoryBodies}}
- {{this}}
{{/each}}

{{#if categories}}
Focus Categories:
{{#each categories}}
- {{this}}
{{/each}}
{{/if}}

{{#if existingRequirements}}
Current Requirements Status:
{{#each existingRequirements}}
- {{title}}: {{status}}{{#if dueDate}} (Due: {{dueDate}}){{/if}}
{{/each}}
{{/if}}

Generate a comprehensive compliance monitoring report including:
1. Any regulatory updates or changes
2. Upcoming deadlines and required actions
3. Risk assessment and recommendations
4. Priority levels for each item

Focus on Illinois Department of Public Health (IDPH) Long-Term Care requirements, OSHA safety standards, and CMS regulations as primary sources.`,
});

const monitorComplianceFlow = ai.defineFlow(
  {
    name: 'monitorComplianceFlow',
    inputSchema: MonitorComplianceInputSchema,
    outputSchema: MonitorComplianceOutputSchema,
  },
  async (input) => {
    const { output } = await monitorCompliancePrompt(input);
    if (!output) {
      return {
        updates: [],
        recommendations: ['Unable to retrieve compliance updates. Please try again.'],
        summary: 'Compliance monitoring failed.',
      };
    }
    return output;
  }
);

// Generate Compliance Report
const GenerateComplianceReportInputSchema = z.object({
  reportType: z.enum(['Safety Inspection', 'Environmental', 'Training', 'Full Audit']),
  dateRange: z.object({
    start: z.string(),
    end: z.string(),
  }),
  dataPoints: z.object({
    inspections: z.array(z.object({
      location: z.string(),
      status: z.string(),
      date: z.string(),
    })).optional(),
    workOrders: z.array(z.object({
      issueType: z.string(),
      status: z.string(),
      priority: z.string(),
    })).optional(),
    trainingCompletions: z.array(z.object({
      moduleTitle: z.string(),
      completionRate: z.number(),
    })).optional(),
    incidents: z.array(z.object({
      type: z.string(),
      severity: z.string(),
      resolved: z.boolean(),
    })).optional(),
  }),
});
export type GenerateComplianceReportInput = z.infer<typeof GenerateComplianceReportInputSchema>;

const GenerateComplianceReportOutputSchema = z.object({
  report: z.string().describe('Formatted compliance report'),
  complianceScore: z.number().describe('Overall compliance score (0-100)'),
  findings: z.array(z.object({
    category: z.string(),
    status: z.enum(['Compliant', 'Non-Compliant', 'Needs Attention']),
    details: z.string(),
  })),
  recommendations: z.array(z.string()),
});
export type GenerateComplianceReportOutput = z.infer<typeof GenerateComplianceReportOutputSchema>;

export async function generateComplianceReport(input: GenerateComplianceReportInput): Promise<GenerateComplianceReportOutput> {
  return generateComplianceReportFlow(input);
}

const generateComplianceReportPrompt = ai.definePrompt({
  name: 'generateComplianceReportPrompt',
  input: { schema: GenerateComplianceReportInputSchema },
  output: { schema: GenerateComplianceReportOutputSchema },
  prompt: `You are the Compliance & Research Agent generating a detailed compliance report.

Report Type: {{reportType}}
Date Range: {{dateRange.start}} to {{dateRange.end}}

Data Available:
{{#if dataPoints.inspections}}
Inspections Conducted: {{dataPoints.inspections.length}}
{{/if}}
{{#if dataPoints.workOrders}}
Work Orders: {{dataPoints.workOrders.length}}
{{/if}}
{{#if dataPoints.trainingCompletions}}
Training Modules: {{dataPoints.trainingCompletions.length}}
{{/if}}
{{#if dataPoints.incidents}}
Incidents Reported: {{dataPoints.incidents.length}}
{{/if}}

Generate a comprehensive compliance report that:
1. Analyzes all provided data points
2. Assesses compliance status across categories
3. Calculates an overall compliance score (0-100)
4. Identifies specific findings (compliant, non-compliant, needs attention)
5. Provides actionable recommendations

Format the report for submission to regulatory bodies (IDPH format for Illinois long-term care facilities).`,
});

const generateComplianceReportFlow = ai.defineFlow(
  {
    name: 'generateComplianceReportFlow',
    inputSchema: GenerateComplianceReportInputSchema,
    outputSchema: GenerateComplianceReportOutputSchema,
  },
  async (input) => {
    const { output } = await generateComplianceReportPrompt(input);
    if (!output) {
      return {
        report: 'Failed to generate compliance report.',
        complianceScore: 0,
        findings: [],
        recommendations: ['Unable to generate report. Please verify data and try again.'],
      };
    }
    return output;
  }
);

// Interpret Regulatory Update
const InterpretRegulatoryUpdateInputSchema = z.object({
  updateText: z.string().describe('Text of the regulatory update or legal document'),
  source: z.string().describe('Source of the update (e.g., IDPH Bulletin 2026-03)'),
  currentPolicies: z.array(z.string()).optional().describe('Current facility policies that might be affected'),
});
export type InterpretRegulatoryUpdateInput = z.infer<typeof InterpretRegulatoryUpdateInputSchema>;

const InterpretRegulatoryUpdateOutputSchema = z.object({
  summary: z.string().describe('Plain language summary of the update'),
  impact: z.string().describe('Impact on facility operations'),
  affectedAreas: z.array(z.string()).describe('Departments or processes affected'),
  requiredActions: z.array(z.object({
    action: z.string(),
    deadline: z.string().optional(),
    responsible: z.string().describe('Who should handle this action'),
  })),
  policyChangesNeeded: z.array(z.string()).optional(),
});
export type InterpretRegulatoryUpdateOutput = z.infer<typeof InterpretRegulatoryUpdateOutputSchema>;

export async function interpretRegulatoryUpdate(input: InterpretRegulatoryUpdateInput): Promise<InterpretRegulatoryUpdateOutput> {
  return interpretRegulatoryUpdateFlow(input);
}

const interpretRegulatoryUpdatePrompt = ai.definePrompt({
  name: 'interpretRegulatoryUpdatePrompt',
  input: { schema: InterpretRegulatoryUpdateInputSchema },
  output: { schema: InterpretRegulatoryUpdateOutputSchema },
  prompt: `You are the Compliance & Research Agent with expertise in interpreting regulatory updates.

Source: {{source}}

Regulatory Update Text:
{{updateText}}

{{#if currentPolicies}}
Current Facility Policies:
{{#each currentPolicies}}
- {{this}}
{{/each}}
{{/if}}

Your task is to:
1. Summarize the regulatory update in clear, plain language
2. Analyze its impact on facility operations
3. Identify which departments or processes are affected
4. List specific actions required to comply, with deadlines if mentioned
5. Recommend policy changes needed to align with the update

Be thorough but practical. Focus on actionable guidance for facility staff.`,
});

const interpretRegulatoryUpdateFlow = ai.defineFlow(
  {
    name: 'interpretRegulatoryUpdateFlow',
    inputSchema: InterpretRegulatoryUpdateInputSchema,
    outputSchema: InterpretRegulatoryUpdateOutputSchema,
  },
  async (input) => {
    const { output } = await interpretRegulatoryUpdatePrompt(input);
    if (!output) {
      return {
        summary: 'Failed to interpret regulatory update.',
        impact: 'Unknown',
        affectedAreas: [],
        requiredActions: [],
      };
    }
    return output;
  }
);
