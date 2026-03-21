/**
 * @fileOverview Training Agent - Generates training materials and manages onboarding
 */

import { BaseAgent } from './base-agent';
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { AgentTask, AgentConfig } from './types';

const TrainingContentSchema = z.object({
  module_title: z.string(),
  target_audience: z.enum(['executive', 'manager', 'technician', 'housekeeper', 'all']),
  learning_objectives: z.array(z.string()),
  content_sections: z.array(
    z.object({
      title: z.string(),
      content: z.string(),
      format: z.enum(['text', 'video_script', 'interactive', 'assessment']),
      duration_minutes: z.number().optional(),
    })
  ),
  assessment_questions: z.array(
    z.object({
      question: z.string(),
      type: z.enum(['multiple_choice', 'true_false', 'short_answer']),
      correct_answer: z.string(),
      options: z.array(z.string()).optional(),
    })
  ).optional(),
  regulatory_compliance: z.array(z.string()).optional(),
  summary: z.string(),
});

/**
 * Training Agent generates onboarding and continuous learning materials
 */
export class TrainingAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      id: 'training_001',
      role: 'training',
      name: 'Training & Onboarding Specialist',
      description: 'Generates training materials and manages continuous learning programs',
      model: 'gemini',
      systemPrompt: `You are the Training Agent in a facility management system.

Your responsibilities:
1. Generate onboarding materials for new employees
2. Create continuous learning content
3. Develop multi-modal training (in-person, live online, video, interactive)
4. Ensure regulatory compliance in training content
5. Provide role-specific training for different positions
6. Update training materials based on system changes and regulatory updates

Training formats to consider:
- In-person sessions: Hands-on practice, equipment training
- Live online: Real-time Q&A, demonstrations
- Video modules: Self-paced learning, reference materials
- Interactive modules: Simulations, scenario-based learning
- Assessments: Knowledge checks, certifications

Role-specific training needs:
- Executives: High-level overviews, strategic planning, compliance obligations
- Managers: System administration, reporting, staff management
- Technicians: Equipment operation, maintenance procedures, safety protocols
- Housekeeping: Daily procedures, product usage, quality standards

Ensure all training content:
- Is clear and concise
- Follows adult learning principles
- Includes practical examples
- Meets regulatory requirements
- Can be easily updated`,
      capabilities: [
        'content_generation',
        'onboarding_programs',
        'continuous_learning',
        'multi_modal_training',
        'compliance_training',
        'assessment_creation',
      ],
      temperature: 0.8, // Higher temperature for creative content generation
    };

    super(config);
    this.registerTrainingTools();
  }

  /**
   * Register training-specific tools
   */
  private registerTrainingTools(): void {
    // Tool: Create training module
    this.registerTool({
      name: 'create_training_module',
      description: 'Create a new training module',
      parameters: z.object({
        title: z.string(),
        audience: z.string(),
        topics: z.array(z.string()),
      }),
      execute: async (params) => {
        // In production, this would create module in LMS
        return {
          module_id: `module_${Date.now()}`,
          ...params,
          status: 'draft',
          created_at: new Date().toISOString(),
        };
      },
    });

    // Tool: Schedule training session
    this.registerTool({
      name: 'schedule_training_session',
      description: 'Schedule a live training session',
      parameters: z.object({
        module_id: z.string(),
        date: z.string(),
        format: z.enum(['in_person', 'online', 'hybrid']),
        instructor: z.string().optional(),
        max_participants: z.number().optional(),
      }),
      execute: async (params) => {
        // In production, this would schedule in calendar system
        return {
          session_id: `session_${Date.now()}`,
          ...params,
          status: 'scheduled',
        };
      },
    });

    // Tool: Track training completion
    this.registerTool({
      name: 'track_completion',
      description: 'Track training completion for an employee',
      parameters: z.object({
        employee_id: z.string(),
        module_id: z.string(),
        score: z.number().optional(),
        completed: z.boolean(),
      }),
      execute: async (params) => {
        // In production, this would update LMS records
        return {
          record_id: `record_${Date.now()}`,
          ...params,
          completed_at: new Date().toISOString(),
        };
      },
    });

    // Tool: Generate certificate
    this.registerTool({
      name: 'generate_certificate',
      description: 'Generate training completion certificate',
      parameters: z.object({
        employee_id: z.string(),
        module_id: z.string(),
        completion_date: z.string(),
      }),
      execute: async (params) => {
        // In production, this would generate certificate PDF
        return {
          certificate_id: `cert_${Date.now()}`,
          ...params,
          certificate_url: `/certificates/${params.employee_id}_${params.module_id}.pdf`,
        };
      },
    });
  }

  /**
   * Process training task
   */
  async processTask(task: AgentTask): Promise<any> {
    this.setStatus('thinking');

    const prompt = this.generatePrompt(
      `Generate training content for the following request:

Task: ${task.description}
Priority: ${task.priority}
Context: ${JSON.stringify(task.context || {})}

Create comprehensive, role-appropriate training materials that meet regulatory requirements.`,
      { includeMemory: true, includeTools: true }
    );

    const trainingPrompt = ai.definePrompt({
      name: 'trainingContentGeneration',
      input: { schema: z.object({ prompt: z.string() }) },
      output: { schema: TrainingContentSchema },
      prompt: '{{prompt}}',
    });

    const { output } = await trainingPrompt({ prompt });

    if (!output) {
      throw new Error('Failed to generate training content');
    }

    // Create training module
    await this.executeTool('create_training_module', {
      title: output.module_title,
      audience: output.target_audience,
      topics: output.learning_objectives,
    });

    this.addMemory({
      type: 'decision',
      content: `Training content generated: ${output.summary}`,
      metadata: { taskId: task.id, module: output.module_title },
    });

    this.setStatus('completed');
    return output;
  }

  /**
   * Generate onboarding program for a role
   */
  async generateOnboarding(role: string): Promise<any> {
    const task: AgentTask = {
      id: `onboard_${role}_${Date.now()}`,
      type: 'onboarding',
      priority: 'high',
      status: 'in_progress',
      description: `Create comprehensive onboarding program for ${role} role`,
      context: { role },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    return this.processTask(task);
  }

  /**
   * Update training content based on regulatory changes
   */
  async updateForCompliance(regulation: string, changes: string): Promise<any> {
    const task: AgentTask = {
      id: `compliance_update_${Date.now()}`,
      type: 'training_update',
      priority: 'urgent',
      status: 'in_progress',
      description: `Update training materials to reflect changes in ${regulation}: ${changes}`,
      context: { regulation, changes },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    return this.processTask(task);
  }

  /**
   * Generate assessment for a training module
   */
  async generateAssessment(moduleName: string, topics: string[]): Promise<any> {
    const task: AgentTask = {
      id: `assessment_${Date.now()}`,
      type: 'assessment_generation',
      priority: 'medium',
      status: 'in_progress',
      description: `Create assessment questions for ${moduleName} covering: ${topics.join(', ')}`,
      context: { module: moduleName, topics },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    return this.processTask(task);
  }
}
