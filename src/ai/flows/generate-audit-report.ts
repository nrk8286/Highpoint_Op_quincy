'use server';

/**
 * @fileOverview Flow for generating a draft state audit compliance report.
 *
 * - generateAuditReport - A function that generates a draft state audit compliance report.
 * - GenerateAuditReportInput - The input type for the generateAuditReport function.
 * - GenerateAuditReportOutput - The return type for the generateAuditReport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateAuditReportInputSchema = z.object({
  dateRangeStart: z.string().describe('The start date for the audit report.'),
  dateRangeEnd: z.string().describe('The end date for the audit report.'),
});
export type GenerateAuditReportInput = z.infer<typeof GenerateAuditReportInputSchema>;

const GenerateAuditReportOutputSchema = z.object({
  report: z.string().describe('The generated audit report as a string.'),
});
export type GenerateAuditReportOutput = z.infer<typeof GenerateAuditReportOutputSchema>;

export async function generateAuditReport(input: GenerateAuditReportInput): Promise<GenerateAuditReportOutput> {
  return generateAuditReportFlow(input);
}

const generateAuditReportPrompt = ai.definePrompt({
  name: 'generateAuditReportPrompt',
  input: {schema: GenerateAuditReportInputSchema},
  output: {schema: GenerateAuditReportOutputSchema},
  prompt: `You are an AI assistant tasked with generating a draft state audit compliance report based on the provided data.

  Generate a comprehensive report covering the period from {{dateRangeStart}} to {{dateRangeEnd}}.
  The report should include sections for daily task completion rates, deep cleaning schedules adherence, and inventory management.
  Ensure the report is formatted according to Illinois IDPH Long-Term Care requirements.
  Use only the data provided, do not make up data.
  If certain data is not provided, clearly state that it is missing from the report, instead of making assumptions.
  The final result should be a draft report.
  Follow this format:
  ## Audit Compliance Report
  ### Date Range:
  Start Date: {{dateRangeStart}}
  End Date: {{dateRangeEnd}}

  ### Daily Task Completion Rates:
  [Summary of daily task completion rates during the specified period]

  ### Deep Cleaning Schedules Adherence:
  [Summary of deep cleaning schedule adherence during the specified period]

  ### Inventory Management:
  [Summary of inventory management, including supply levels and reorder alerts]
`,
});

const generateAuditReportFlow = ai.defineFlow(
  {
    name: 'generateAuditReportFlow',
    inputSchema: GenerateAuditReportInputSchema,
    outputSchema: GenerateAuditReportOutputSchema,
  },
  async input => {
    const {output} = await generateAuditReportPrompt(input);
    return output!;
  }
);
