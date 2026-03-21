'use server';

/**
 * @fileOverview Critic/Quality Agent - Evaluates outputs and provides feedback
 *
 * Evaluates outputs from other agents against quality criteria,
 * provides constructive feedback, and triggers refinements.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Evaluate Agent Output
const EvaluateAgentOutputInputSchema = z.object({
  agentRole: z.string().describe('Role of the agent that produced this output'),
  taskDescription: z.string().describe('Description of the task that was performed'),
  output: z.any().describe('The output to evaluate'),
  qualityCriteria: z.array(z.object({
    criterion: z.string(),
    weight: z.number().describe('Importance weight 1-10'),
  })),
  expectedFormat: z.string().optional().describe('Expected output format or structure'),
});
export type EvaluateAgentOutputInput = z.infer<typeof EvaluateAgentOutputInputSchema>;

const EvaluateAgentOutputOutputSchema = z.object({
  overallScore: z.number().describe('Overall quality score 0-100'),
  passed: z.boolean().describe('Whether output meets minimum standards'),
  criteriaScores: z.array(z.object({
    criterion: z.string(),
    score: z.number().describe('Score 0-100'),
    feedback: z.string(),
  })),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  recommendations: z.array(z.string()),
  requiresRefinement: z.boolean(),
  refinementInstructions: z.string().optional(),
});
export type EvaluateAgentOutputOutput = z.infer<typeof EvaluateAgentOutputOutputSchema>;

export async function evaluateAgentOutput(input: EvaluateAgentOutputInput): Promise<EvaluateAgentOutputOutput> {
  return evaluateAgentOutputFlow(input);
}

const evaluateAgentOutputPrompt = ai.definePrompt({
  name: 'evaluateAgentOutputPrompt',
  input: { schema: EvaluateAgentOutputInputSchema },
  output: { schema: EvaluateAgentOutputOutputSchema },
  prompt: `You are the Critic/Quality Agent, responsible for evaluating work from other agents.

Agent Role: {{agentRole}}
Task: {{taskDescription}}

Output to Evaluate:
{{output}}

{{#if expectedFormat}}
Expected Format: {{expectedFormat}}
{{/if}}

Quality Criteria (with weights):
{{#each qualityCriteria}}
- {{criterion}} (Weight: {{weight}}/10)
{{/each}}

Evaluate this output thoroughly:
1. Score each criterion 0-100 based on how well it's met
2. Calculate weighted overall score
3. Determine if output passes (score >= 70)
4. Identify specific strengths
5. Identify specific weaknesses
6. Provide actionable recommendations
7. Decide if refinement is needed (score < 70 or critical flaws)
8. If refinement needed, provide clear instructions

Be constructive but thorough. Focus on specific, actionable feedback.
Consider:
- Accuracy and correctness
- Completeness
- Clarity and readability
- Relevance to task
- Practical applicability
- Format and structure`,
});

const evaluateAgentOutputFlow = ai.defineFlow(
  {
    name: 'evaluateAgentOutputFlow',
    inputSchema: EvaluateAgentOutputInputSchema,
    outputSchema: EvaluateAgentOutputOutputSchema,
  },
  async (input) => {
    const { output } = await evaluateAgentOutputPrompt(input);
    if (!output) {
      return {
        overallScore: 0,
        passed: false,
        criteriaScores: [],
        strengths: [],
        weaknesses: ['Failed to evaluate output.'],
        recommendations: ['Please try evaluation again.'],
        requiresRefinement: true,
        refinementInstructions: 'Unable to provide refinement instructions due to evaluation failure.',
      };
    }
    return output;
  }
);

// Review Compliance Report
const ReviewComplianceReportInputSchema = z.object({
  report: z.string(),
  reportType: z.string(),
  regulatoryStandards: z.array(z.string()),
  requiredSections: z.array(z.string()),
});
export type ReviewComplianceReportInput = z.infer<typeof ReviewComplianceReportInputSchema>;

const ReviewComplianceReportOutputSchema = z.object({
  approved: z.boolean(),
  completeness: z.number().describe('Completeness score 0-100'),
  missingElements: z.array(z.string()),
  accuracyIssues: z.array(z.string()),
  formatIssues: z.array(z.string()),
  recommendations: z.array(z.string()),
  readyForSubmission: z.boolean(),
});
export type ReviewComplianceReportOutput = z.infer<typeof ReviewComplianceReportOutputSchema>;

export async function reviewComplianceReport(input: ReviewComplianceReportInput): Promise<ReviewComplianceReportOutput> {
  return reviewComplianceReportFlow(input);
}

const reviewComplianceReportPrompt = ai.definePrompt({
  name: 'reviewComplianceReportPrompt',
  input: { schema: ReviewComplianceReportInputSchema },
  output: { schema: ReviewComplianceReportOutputSchema },
  prompt: `You are the Critic/Quality Agent reviewing a compliance report for accuracy and completeness.

Report Type: {{reportType}}

Regulatory Standards to Check Against:
{{#each regulatoryStandards}}
- {{this}}
{{/each}}

Required Sections:
{{#each requiredSections}}
- {{this}}
{{/each}}

Report to Review:
{{report}}

Conduct a thorough review:
1. Check if all required sections are present
2. Verify compliance with regulatory standards
3. Identify any inaccuracies or unsupported claims
4. Review format and structure
5. Assess if report is ready for submission to regulators
6. Provide specific recommendations for improvement

Approve only if:
- Completeness >= 90%
- No critical accuracy issues
- No missing required sections
- Format meets regulatory standards`,
});

const reviewComplianceReportFlow = ai.defineFlow(
  {
    name: 'reviewComplianceReportFlow',
    inputSchema: ReviewComplianceReportInputSchema,
    outputSchema: ReviewComplianceReportOutputSchema,
  },
  async (input) => {
    const { output } = await reviewComplianceReportPrompt(input);
    if (!output) {
      return {
        approved: false,
        completeness: 0,
        missingElements: ['Unable to review report.'],
        accuracyIssues: [],
        formatIssues: [],
        recommendations: ['Please retry review.'],
        readyForSubmission: false,
      };
    }
    return output;
  }
);

// Validate Training Content
const ValidateTrainingContentInputSchema = z.object({
  moduleTitle: z.string(),
  content: z.string(),
  targetRoles: z.array(z.string()),
  learningObjectives: z.array(z.string()),
  assessmentQuestions: z.array(z.object({
    question: z.string(),
    options: z.array(z.string()),
    correctAnswer: z.number(),
  })),
});
export type ValidateTrainingContentInput = z.infer<typeof ValidateTrainingContentInputSchema>;

const ValidateTrainingContentOutputSchema = z.object({
  validated: z.boolean(),
  contentQuality: z.number().describe('Content quality score 0-100'),
  alignmentWithObjectives: z.number().describe('Alignment score 0-100'),
  assessmentQuality: z.number().describe('Assessment quality score 0-100'),
  issues: z.array(z.object({
    severity: z.enum(['Critical', 'Major', 'Minor']),
    category: z.enum(['Accuracy', 'Clarity', 'Relevance', 'Completeness', 'Assessment']),
    description: z.string(),
    suggestion: z.string(),
  })),
  readyForDeployment: z.boolean(),
  recommendations: z.array(z.string()),
});
export type ValidateTrainingContentOutput = z.infer<typeof ValidateTrainingContentOutputSchema>;

export async function validateTrainingContent(input: ValidateTrainingContentInput): Promise<ValidateTrainingContentOutput> {
  return validateTrainingContentFlow(input);
}

const validateTrainingContentPrompt = ai.definePrompt({
  name: 'validateTrainingContentPrompt',
  input: { schema: ValidateTrainingContentInputSchema },
  output: { schema: ValidateTrainingContentOutputSchema },
  prompt: `You are the Critic/Quality Agent validating training content before deployment.

Module: {{moduleTitle}}
Target Roles: {{#each targetRoles}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}

Learning Objectives:
{{#each learningObjectives}}
- {{this}}
{{/each}}

Content:
{{content}}

Assessment Questions: {{assessmentQuestions.length}} questions provided

Validate the training content:
1. Assess overall content quality (accuracy, clarity, engagement)
2. Check alignment with learning objectives
3. Evaluate assessment questions (clear, relevant, appropriate difficulty)
4. Identify issues by severity and category
5. Determine if ready for deployment
6. Provide recommendations for improvement

Validate (approve for deployment) only if:
- Content Quality >= 80
- Alignment >= 85
- Assessment Quality >= 75
- No critical or major issues

Be thorough but practical. Training should be accurate, engaging, and effective.`,
});

const validateTrainingContentFlow = ai.defineFlow(
  {
    name: 'validateTrainingContentFlow',
    inputSchema: ValidateTrainingContentInputSchema,
    outputSchema: ValidateTrainingContentOutputSchema,
  },
  async (input) => {
    const { output } = await validateTrainingContentPrompt(input);
    if (!output) {
      return {
        validated: false,
        contentQuality: 0,
        alignmentWithObjectives: 0,
        assessmentQuality: 0,
        issues: [{
          severity: 'Critical',
          category: 'Completeness',
          description: 'Failed to validate training content.',
          suggestion: 'Retry validation process.',
        }],
        readyForDeployment: false,
        recommendations: ['Unable to complete validation.'],
      };
    }
    return output;
  }
);

// Assess Schedule Optimality
const AssessScheduleOptimalityInputSchema = z.object({
  schedule: z.array(z.object({
    taskId: z.string(),
    taskName: z.string(),
    assignedTo: z.string(),
    scheduledTime: z.string(),
    duration: z.number(),
  })),
  constraints: z.array(z.string()),
  optimizationGoals: z.array(z.string()),
});
export type AssessScheduleOptimalityInput = z.infer<typeof AssessScheduleOptimalityInputSchema>;

const AssessScheduleOptimalityOutputSchema = z.object({
  optimalityScore: z.number().describe('How optimal the schedule is, 0-100'),
  conflictsDetected: z.array(z.object({
    type: z.string(),
    description: z.string(),
    affectedTasks: z.array(z.string()),
  })),
  inefficiencies: z.array(z.string()),
  suggestions: z.array(z.string()),
  approved: z.boolean(),
});
export type AssessScheduleOptimalityOutput = z.infer<typeof AssessScheduleOptimalityOutputSchema>;

export async function assessScheduleOptimality(input: AssessScheduleOptimalityInput): Promise<AssessScheduleOptimalityOutput> {
  return assessScheduleOptimalityFlow(input);
}

const assessScheduleOptimalityPrompt = ai.definePrompt({
  name: 'assessScheduleOptimalityPrompt',
  input: { schema: AssessScheduleOptimalityInputSchema },
  output: { schema: AssessScheduleOptimalityOutputSchema },
  prompt: `You are the Critic/Quality Agent assessing a generated schedule.

Schedule:
{{#each schedule}}
- {{taskName}} (ID: {{taskId}})
  Assigned to: {{assignedTo}}
  Time: {{scheduledTime}}
  Duration: {{duration}} minutes
{{/each}}

Constraints:
{{#each constraints}}
- {{this}}
{{/each}}

Optimization Goals:
{{#each optimizationGoals}}
- {{this}}
{{/each}}

Assess the schedule:
1. Check for conflicts (double bookings, overlapping tasks, resource unavailability)
2. Identify inefficiencies (poor time utilization, suboptimal sequencing)
3. Verify constraints are met
4. Evaluate against optimization goals
5. Calculate optimality score
6. Provide specific suggestions for improvement
7. Approve if score >= 75 and no critical conflicts

Be practical - perfect schedules are rare, but critical issues must be addressed.`,
});

const assessScheduleOptimalityFlow = ai.defineFlow(
  {
    name: 'assessScheduleOptimalityFlow',
    inputSchema: AssessScheduleOptimalityInputSchema,
    outputSchema: AssessScheduleOptimalityOutputSchema,
  },
  async (input) => {
    const { output } = await assessScheduleOptimalityPrompt(input);
    if (!output) {
      return {
        optimalityScore: 0,
        conflictsDetected: [],
        inefficiencies: ['Unable to assess schedule.'],
        suggestions: ['Retry assessment.'],
        approved: false,
      };
    }
    return output;
  }
);
