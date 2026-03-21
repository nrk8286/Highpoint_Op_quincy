/**
 * @fileOverview Compliance & Research Agent - Monitors regulations and ensures compliance
 */

import { BaseAgent } from './base-agent';
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { AgentTask, AgentConfig } from './types';

const ComplianceReportSchema = z.object({
  compliance_status: z.enum(['compliant', 'non_compliant', 'needs_review']),
  findings: z.array(
    z.object({
      regulation: z.string(),
      status: z.enum(['pass', 'fail', 'warning']),
      description: z.string(),
      recommendation: z.string().optional(),
    })
  ),
  action_items: z.array(
    z.object({
      priority: z.enum(['low', 'medium', 'high', 'urgent']),
      description: z.string(),
      deadline: z.string().optional(),
    })
  ),
  summary: z.string(),
});

/**
 * Compliance Agent uses Claude's reasoning for regulatory monitoring
 */
export class ComplianceAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      id: 'compliance_001',
      role: 'compliance',
      name: 'Compliance & Research Specialist',
      description: 'Monitors regulatory requirements, generates compliance reports, and ensures safety',
      model: 'gemini', // Using Gemini as Claude integration would need separate API setup
      systemPrompt: `You are the Compliance Agent in a facility management system.

Your responsibilities:
1. Monitor regulatory requirements (IDPH, OSHA, local codes)
2. Generate compliance reports and audit documentation
3. Interpret legal updates and regulatory changes
4. Schedule and document safety inspections
5. Ensure compliance audits are completed on time
6. Identify compliance risks and recommend corrective actions

When analyzing compliance:
- Reference specific regulations and standards
- Provide clear pass/fail assessments
- Recommend specific corrective actions
- Prioritize based on risk and regulatory deadlines
- Maintain detailed documentation for audits

You have access to:
- Regulatory databases and requirements
- Facility inspection records
- Safety documentation
- Training records
- Incident reports`,
      capabilities: [
        'regulatory_monitoring',
        'compliance_reporting',
        'safety_inspections',
        'legal_interpretation',
        'audit_documentation',
      ],
      temperature: 0.3, // Lower temperature for compliance accuracy
    };

    super(config);
    this.registerComplianceTools();
  }

  /**
   * Register compliance-specific tools
   */
  private registerComplianceTools(): void {
    // Tool: Check compliance status
    this.registerTool({
      name: 'check_compliance',
      description: 'Check compliance status for a specific area or regulation',
      parameters: z.object({
        area: z.string(),
        regulation: z.string().optional(),
      }),
      execute: async (params) => {
        // In production, this would query compliance database
        return {
          area: params.area,
          status: 'compliant',
          last_check: new Date().toISOString(),
        };
      },
    });

    // Tool: Schedule inspection
    this.registerTool({
      name: 'schedule_inspection',
      description: 'Schedule a safety or compliance inspection',
      parameters: z.object({
        type: z.string(),
        date: z.string(),
        inspector: z.string().optional(),
      }),
      execute: async (params) => {
        // In production, this would create inspection in database
        return {
          inspection_id: `insp_${Date.now()}`,
          ...params,
          status: 'scheduled',
        };
      },
    });

    // Tool: Generate compliance report
    this.registerTool({
      name: 'generate_compliance_report',
      description: 'Generate a comprehensive compliance report',
      parameters: z.object({
        start_date: z.string(),
        end_date: z.string(),
        regulations: z.array(z.string()).optional(),
      }),
      execute: async (params) => {
        // In production, this would aggregate compliance data
        return {
          report_id: `rpt_${Date.now()}`,
          period: `${params.start_date} to ${params.end_date}`,
          status: 'generated',
        };
      },
    });
  }

  /**
   * Process compliance task
   */
  async processTask(task: AgentTask): Promise<any> {
    this.setStatus('thinking');

    const prompt = this.generatePrompt(
      `Perform the following compliance task:

Task: ${task.description}
Priority: ${task.priority}
Context: ${JSON.stringify(task.context || {})}

Analyze the compliance requirements, identify any issues, and provide recommendations.`,
      { includeMemory: true, includeTools: true }
    );

    const compliancePrompt = ai.definePrompt({
      name: 'complianceAnalysis',
      input: { schema: z.object({ prompt: z.string() }) },
      output: { schema: ComplianceReportSchema },
      prompt: '{{prompt}}',
    });

    const { output } = await compliancePrompt({ prompt });

    if (!output) {
      throw new Error('Failed to generate compliance analysis');
    }

    this.addMemory({
      type: 'decision',
      content: `Compliance analysis completed: ${output.summary}`,
      metadata: { taskId: task.id, status: output.compliance_status },
    });

    this.setStatus('completed');
    return output;
  }

  /**
   * Monitor regulatory updates
   */
  async monitorRegulations(): Promise<any> {
    const task: AgentTask = {
      id: `reg_monitor_${Date.now()}`,
      type: 'regulatory_monitoring',
      priority: 'medium',
      status: 'in_progress',
      description: 'Monitor for new regulatory updates and changes',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    return this.processTask(task);
  }

  /**
   * Generate audit report
   */
  async generateAuditReport(startDate: string, endDate: string): Promise<any> {
    const result = await this.executeTool('generate_compliance_report', {
      start_date: startDate,
      end_date: endDate,
    });

    return result;
  }
}
