/**
 * @fileOverview Critic/Quality Agent - Evaluates outputs and provides feedback
 */

import { BaseAgent } from './base-agent';
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { AgentTask, AgentConfig, QualityCriteria, AgentFeedback } from './types';

const QualityEvaluationSchema = z.object({
  overall_score: z.number().min(0).max(100),
  criteria: z.object({
    accuracy: z.number().min(0).max(1).describe('Factual correctness and precision'),
    completeness: z.number().min(0).max(1).describe('Coverage of all required aspects'),
    compliance: z.boolean().describe('Meets regulatory and policy requirements'),
    clarity: z.number().min(0).max(1).describe('Clear and understandable'),
    efficiency: z.number().min(0).max(1).describe('Optimal use of resources'),
  }),
  strengths: z.array(z.string()).describe('What was done well'),
  issues: z.array(
    z.object({
      severity: z.enum(['minor', 'moderate', 'major', 'critical']),
      category: z.string(),
      description: z.string(),
    })
  ).describe('Problems identified'),
  suggestions: z.array(z.string()).describe('Specific recommendations for improvement'),
  approved: z.boolean().describe('Whether the output meets quality standards'),
  summary: z.string(),
});

/**
 * Critic Agent evaluates outputs from other agents
 */
export class CriticAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      id: 'critic_001',
      role: 'critic',
      name: 'Quality Assurance Specialist',
      description: 'Evaluates outputs against quality criteria and provides feedback',
      model: 'gemini',
      systemPrompt: `You are the Critic Agent in a facility management system.

Your responsibilities:
1. Evaluate outputs from other agents against quality criteria
2. Provide constructive feedback for improvements
3. Ensure compliance with standards and regulations
4. Trigger refinements when quality standards are not met
5. Track quality metrics over time
6. Identify patterns in quality issues

Quality Criteria:
- Accuracy (0-1): Is the information factually correct and precise?
- Completeness (0-1): Does it cover all required aspects?
- Compliance (boolean): Does it meet regulatory requirements?
- Clarity (0-1): Is it clear and easy to understand?
- Efficiency (0-1): Does it use resources optimally?

Evaluation approach:
- Be objective and thorough
- Provide specific, actionable feedback
- Identify both strengths and weaknesses
- Consider context and constraints
- Balance strictness with practicality
- Focus on continuous improvement

When evaluating:
- Check against relevant standards
- Verify factual accuracy
- Assess completeness
- Review for clarity
- Consider efficiency
- Identify risks`,
      capabilities: [
        'quality_evaluation',
        'feedback_generation',
        'compliance_verification',
        'pattern_recognition',
        'metrics_tracking',
      ],
      temperature: 0.4, // Moderate temperature for balanced evaluation
    };

    super(config);
    this.registerCriticTools();
  }

  /**
   * Register critic-specific tools
   */
  private registerCriticTools(): void {
    // Tool: Check standards compliance
    this.registerTool({
      name: 'check_standards',
      description: 'Check if output meets relevant standards',
      parameters: z.object({
        output_type: z.string(),
        output_content: z.string(),
        standards: z.array(z.string()),
      }),
      execute: async (params) => {
        // In production, this would check against standards database
        return {
          compliant: true,
          standards_checked: params.standards,
          issues: [],
        };
      },
    });

    // Tool: Record quality metrics
    this.registerTool({
      name: 'record_metrics',
      description: 'Record quality metrics for tracking',
      parameters: z.object({
        agent_id: z.string(),
        task_id: z.string(),
        metrics: z.object({
          accuracy: z.number(),
          completeness: z.number(),
          clarity: z.number(),
          efficiency: z.number(),
        }),
      }),
      execute: async (params) => {
        // In production, this would store metrics in database
        return {
          recorded_at: new Date().toISOString(),
          ...params,
        };
      },
    });

    // Tool: Request refinement
    this.registerTool({
      name: 'request_refinement',
      description: 'Request refinement from an agent',
      parameters: z.object({
        agent_id: z.string(),
        task_id: z.string(),
        feedback: z.string(),
        priority: z.enum(['low', 'medium', 'high', 'urgent']),
      }),
      execute: async (params) => {
        // In production, this would send message to agent
        return {
          refinement_id: `refine_${Date.now()}`,
          ...params,
          status: 'requested',
        };
      },
    });
  }

  /**
   * Process critic task
   */
  async processTask(task: AgentTask): Promise<any> {
    this.setStatus('thinking');

    const prompt = this.generatePrompt(
      `Evaluate the following work output:

Task: ${task.description}
Context: ${JSON.stringify(task.context || {})}

Evaluate against quality criteria and provide detailed feedback.`,
      { includeMemory: true, includeTools: true }
    );

    const evaluationPrompt = ai.definePrompt({
      name: 'qualityEvaluation',
      input: { schema: z.object({ prompt: z.string() }) },
      output: { schema: QualityEvaluationSchema },
      prompt: '{{prompt}}',
    });

    const { output } = await evaluationPrompt({ prompt });

    if (!output) {
      throw new Error('Failed to evaluate quality');
    }

    // Record metrics
    if (task.context?.agent_id) {
      await this.executeTool('record_metrics', {
        agent_id: task.context.agent_id,
        task_id: task.id,
        metrics: {
          accuracy: output.criteria.accuracy,
          completeness: output.criteria.completeness,
          clarity: output.criteria.clarity,
          efficiency: output.criteria.efficiency,
        },
      });
    }

    // Request refinement if not approved
    if (!output.approved && task.context?.agent_id) {
      await this.executeTool('request_refinement', {
        agent_id: task.context.agent_id,
        task_id: task.id,
        feedback: output.suggestions.join('\n'),
        priority: 'medium',
      });
    }

    this.addMemory({
      type: 'decision',
      content: `Quality evaluation completed: ${output.summary}`,
      metadata: {
        taskId: task.id,
        approved: output.approved,
        score: output.overall_score,
      },
    });

    this.setStatus('completed');
    return output;
  }

  /**
   * Evaluate agent output
   */
  async evaluateOutput(
    agentId: string,
    taskId: string,
    output: any,
    expectedCriteria?: Partial<QualityCriteria>
  ): Promise<AgentFeedback> {
    const task: AgentTask = {
      id: `eval_${taskId}`,
      type: 'quality_evaluation',
      priority: 'high',
      status: 'in_progress',
      description: `Evaluate output from agent ${agentId} for task ${taskId}`,
      context: {
        agent_id: agentId,
        task_id: taskId,
        output,
        expected_criteria: expectedCriteria,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const evaluation = await this.processTask(task);

    const feedback: AgentFeedback = {
      taskId,
      agentId,
      quality: evaluation.criteria,
      suggestions: evaluation.suggestions,
      approved: evaluation.approved,
      timestamp: Date.now(),
    };

    return feedback;
  }

  /**
   * Generate quality report for an agent
   */
  async generateQualityReport(agentId: string, period: string): Promise<any> {
    // In production, this would aggregate quality metrics from database
    return {
      agent_id: agentId,
      period,
      average_scores: {
        accuracy: 0.85,
        completeness: 0.90,
        clarity: 0.88,
        efficiency: 0.82,
      },
      tasks_evaluated: 45,
      approval_rate: 0.87,
      common_issues: [
        'Incomplete documentation in 3 cases',
        'Minor accuracy issues in 2 cases',
      ],
      improvement_trend: '+5% from previous period',
    };
  }
}
