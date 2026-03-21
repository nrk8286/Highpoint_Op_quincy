'use server';

/**
 * @fileOverview Training Agent - Generates training content and learning materials
 *
 * Creates onboarding and continuous learning materials.
 * Provides multi-modal training (live sessions, videos, interactive modules).
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Generate Training Module
const GenerateTrainingModuleInputSchema = z.object({
  topic: z.string().describe('Training topic or subject'),
  targetRoles: z.array(z.string()).describe('Target user roles'),
  format: z.enum(['In-Person', 'Live Online', 'Video', 'Interactive', 'Reading']),
  duration: z.number().describe('Target duration in minutes'),
  learningObjectives: z.array(z.string()).describe('What learners should know/do after training'),
  existingKnowledge: z.string().optional().describe('Assumed prerequisite knowledge'),
});
export type GenerateTrainingModuleInput = z.infer<typeof GenerateTrainingModuleInputSchema>;

const GenerateTrainingModuleOutputSchema = z.object({
  title: z.string(),
  description: z.string(),
  content: z.string().describe('Full training content/script'),
  outline: z.array(z.object({
    section: z.string(),
    duration: z.number(),
    activities: z.array(z.string()),
  })),
  assessmentQuestions: z.array(z.object({
    question: z.string(),
    options: z.array(z.string()),
    correctAnswer: z.number(),
    explanation: z.string(),
  })),
  resources: z.array(z.string()).optional().describe('Additional resources or references'),
});
export type GenerateTrainingModuleOutput = z.infer<typeof GenerateTrainingModuleOutputSchema>;

export async function generateTrainingModule(input: GenerateTrainingModuleInput): Promise<GenerateTrainingModuleOutput> {
  return generateTrainingModuleFlow(input);
}

const generateTrainingModulePrompt = ai.definePrompt({
  name: 'generateTrainingModulePrompt',
  input: { schema: GenerateTrainingModuleInputSchema },
  output: { schema: GenerateTrainingModuleOutputSchema },
  prompt: `You are the Training Agent, creating comprehensive training materials for facility staff.

Training Request:
- Topic: {{topic}}
- Target Roles: {{#each targetRoles}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
- Format: {{format}}
- Duration: {{duration}} minutes
{{#if existingKnowledge}}
- Existing Knowledge: {{existingKnowledge}}
{{/if}}

Learning Objectives:
{{#each learningObjectives}}
- {{this}}
{{/each}}

Create a complete training module that includes:
1. Engaging title and description
2. Full content/script appropriate for the format
3. Detailed outline with sections, timings, and activities
4. Assessment questions to verify learning (multiple choice)
5. Additional resources for deeper learning

For {{format}} format:
{{#if (eq format "In-Person")}}
- Include interactive activities, group discussions, and hands-on practice
- Provide facilitator notes and materials needed
{{/if}}
{{#if (eq format "Live Online")}}
- Include virtual engagement strategies (polls, breakout rooms, chat activities)
- Note technical requirements and platform features to use
{{/if}}
{{#if (eq format "Video")}}
- Write a video script with scene descriptions and visual cues
- Include timestamps for key segments
{{/if}}
{{#if (eq format "Interactive")}}
- Design interactive scenarios and decision points
- Include immediate feedback mechanisms
{{/if}}
{{#if (eq format "Reading")}}
- Structure for self-paced learning with clear headings
- Include reflection questions and checkpoints
{{/if}}

Ensure content is practical, engaging, and directly applicable to facility operations.`,
});

const generateTrainingModuleFlow = ai.defineFlow(
  {
    name: 'generateTrainingModuleFlow',
    inputSchema: GenerateTrainingModuleInputSchema,
    outputSchema: GenerateTrainingModuleOutputSchema,
  },
  async (input) => {
    const { output } = await generateTrainingModulePrompt(input);
    if (!output) {
      return {
        title: 'Training Module',
        description: 'Failed to generate training module.',
        content: '',
        outline: [],
        assessmentQuestions: [],
      };
    }
    return output;
  }
);

// Generate Onboarding Plan
const GenerateOnboardingPlanInputSchema = z.object({
  role: z.string().describe('Role being onboarded'),
  experienceLevel: z.enum(['Entry', 'Experienced', 'Expert']),
  departmentContext: z.string().optional(),
  companyPolicies: z.array(z.string()).optional(),
});
export type GenerateOnboardingPlanInput = z.infer<typeof GenerateOnboardingPlanInputSchema>;

const GenerateOnboardingPlanOutputSchema = z.object({
  onboardingTimeline: z.array(z.object({
    day: z.number(),
    phase: z.string(),
    activities: z.array(z.string()),
    milestones: z.array(z.string()),
  })),
  requiredTrainingModules: z.array(z.string()),
  checkpoints: z.array(z.object({
    day: z.number(),
    checkpoint: z.string(),
    successCriteria: z.string(),
  })),
  resources: z.array(z.string()),
  mentorGuidance: z.string(),
});
export type GenerateOnboardingPlanOutput = z.infer<typeof GenerateOnboardingPlanOutputSchema>;

export async function generateOnboardingPlan(input: GenerateOnboardingPlanInput): Promise<GenerateOnboardingPlanOutput> {
  return generateOnboardingPlanFlow(input);
}

const generateOnboardingPlanPrompt = ai.definePrompt({
  name: 'generateOnboardingPlanPrompt',
  input: { schema: GenerateOnboardingPlanInputSchema },
  output: { schema: GenerateOnboardingPlanOutputSchema },
  prompt: `You are the Training Agent creating a comprehensive onboarding plan.

New Hire Details:
- Role: {{role}}
- Experience Level: {{experienceLevel}}
{{#if departmentContext}}- Department Context: {{departmentContext}}{{/if}}

{{#if companyPolicies}}
Company Policies to Cover:
{{#each companyPolicies}}
- {{this}}
{{/each}}
{{/if}}

Create a structured onboarding plan (typically 30-90 days) that includes:
1. Day-by-day timeline with phases (Orientation, Training, Integration, Independence)
2. Daily activities and expectations
3. Key milestones to achieve
4. Required training modules
5. Checkpoints with success criteria
6. Resources and documentation needed
7. Mentor guidance and support structure

Adjust the pace and depth based on experience level:
- Entry: More guided, foundational content, frequent checkpoints
- Experienced: Faster pace, focus on facility-specific procedures
- Expert: Brief orientation, focus on systems and team integration`,
});

const generateOnboardingPlanFlow = ai.defineFlow(
  {
    name: 'generateOnboardingPlanFlow',
    inputSchema: GenerateOnboardingPlanInputSchema,
    outputSchema: GenerateOnboardingPlanOutputSchema,
  },
  async (input) => {
    const { output } = await generateOnboardingPlanPrompt(input);
    if (!output) {
      return {
        onboardingTimeline: [],
        requiredTrainingModules: [],
        checkpoints: [],
        resources: [],
        mentorGuidance: 'Failed to generate onboarding plan.',
      };
    }
    return output;
  }
);

// Assess Training Effectiveness
const AssessTrainingEffectivenessInputSchema = z.object({
  moduleId: z.string(),
  moduleTitle: z.string(),
  completionData: z.array(z.object({
    userId: z.string(),
    completedAt: z.string(),
    score: z.number().optional(),
    feedback: z.string().optional(),
  })),
  targetCompletionRate: z.number().describe('Target completion rate percentage'),
  targetPassRate: z.number().optional().describe('Target pass rate percentage'),
});
export type AssessTrainingEffectivenessInput = z.infer<typeof AssessTrainingEffectivenessInputSchema>;

const AssessTrainingEffectivenessOutputSchema = z.object({
  overallEffectiveness: z.enum(['Excellent', 'Good', 'Fair', 'Poor']),
  metrics: z.object({
    completionRate: z.number(),
    averageScore: z.number().optional(),
    passRate: z.number().optional(),
  }),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  recommendations: z.array(z.string()),
  nextSteps: z.array(z.string()),
});
export type AssessTrainingEffectivenessOutput = z.infer<typeof AssessTrainingEffectivenessOutputSchema>;

export async function assessTrainingEffectiveness(input: AssessTrainingEffectivenessInput): Promise<AssessTrainingEffectivenessOutput> {
  return assessTrainingEffectivenessFlow(input);
}

const assessTrainingEffectivenessPrompt = ai.definePrompt({
  name: 'assessTrainingEffectivenessPrompt',
  input: { schema: AssessTrainingEffectivenessInputSchema },
  output: { schema: AssessTrainingEffectivenessOutputSchema },
  prompt: `You are the Training Agent assessing the effectiveness of a training module.

Module: {{moduleTitle}} (ID: {{moduleId}})
Completions: {{completionData.length}}
Target Completion Rate: {{targetCompletionRate}}%
{{#if targetPassRate}}Target Pass Rate: {{targetPassRate}}%{{/if}}

Completion Data Summary:
{{#each completionData}}
- User {{userId}}: {{#if score}}Score {{score}}{{/if}}{{#if feedback}} - Feedback: {{feedback}}{{/if}}
{{/each}}

Analyze the training module's effectiveness by:
1. Calculating actual completion and pass rates
2. Comparing against targets
3. Identifying strengths (what worked well)
4. Identifying weaknesses (what needs improvement)
5. Providing specific recommendations for enhancement
6. Suggesting next steps (update content, change format, etc.)

Rate overall effectiveness as Excellent, Good, Fair, or Poor based on:
- Excellent: Exceeds targets, high engagement, positive feedback
- Good: Meets targets, satisfactory engagement
- Fair: Below targets, mixed feedback, room for improvement
- Poor: Significantly below targets, negative feedback`,
});

const assessTrainingEffectivenessFlow = ai.defineFlow(
  {
    name: 'assessTrainingEffectivenessFlow',
    inputSchema: AssessTrainingEffectivenessInputSchema,
    outputSchema: AssessTrainingEffectivenessOutputSchema,
  },
  async (input) => {
    const { output } = await assessTrainingEffectivenessPrompt(input);
    if (!output) {
      return {
        overallEffectiveness: 'Poor',
        metrics: {
          completionRate: 0,
        },
        strengths: [],
        weaknesses: ['Unable to assess training effectiveness.'],
        recommendations: ['Review data and try again.'],
        nextSteps: [],
      };
    }
    return output;
  }
);
