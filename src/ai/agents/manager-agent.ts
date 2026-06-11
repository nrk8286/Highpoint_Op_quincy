/**
 * @fileOverview Manager Agent - Coordinates all other agents
 */

import { BaseAgent } from './base-agent';
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { AgentTask, AgentConfig } from './types';

const TaskDecompositionSchema = z.object({
  subtasks: z.array(
    z.object({
      id: z.string(),
      description: z.string(),
      assignTo: z.enum(['compliance', 'operations', 'training', 'critic', 'support']),
      priority: z.enum(['low', 'medium', 'high', 'urgent']),
      dependencies: z.array(z.string()).optional(),
    })
  ),
  reasoning: z.string(),
});

/**
 * Manager Agent coordinates the multi-agent system
 */
export class ManagerAgent extends BaseAgent {
  private agents: Map<string, BaseAgent> = new Map();

  constructor() {
    const config: AgentConfig = {
      id: 'manager_001',
      role: 'manager',
      name: 'Facility Manager Coordinator',
      description: 'Coordinates all agents and decomposes high-level objectives into tasks',
      model: 'gemini',
      systemPrompt: `You are the Manager Agent in a multi-agent facility management system.

Your responsibilities:
1. Decompose high-level objectives into specific, actionable subtasks
2. Assign subtasks to specialized agents based on their capabilities:
   - Compliance Agent: Regulatory monitoring, compliance reports, safety inspections
   - Operations Agent: Maintenance scheduling, work orders, inventory, resource allocation
   - Training Agent: Onboarding, training materials, continuous learning
   - Critic Agent: Quality evaluation, feedback, refinement suggestions
   - Support Agent: Analytics, reporting, capital planning, vendor coordination

3. Map dependencies between tasks
4. Monitor progress and handle conflicts
5. Consolidate results from multiple agents

When given an objective, analyze it and break it down into subtasks. Consider:
- What needs to be done?
- Which agent is best suited for each part?
- What's the priority and sequence?
- Are there dependencies?

Provide clear, specific task descriptions that agents can execute.`,
      capabilities: [
        'task_decomposition',
        'agent_coordination',
        'progress_monitoring',
        'conflict_resolution',
        'result_consolidation',
      ],
      temperature: 0.7,
    };

    super(config);
  }

  /**
   * Register a specialized agent
   */
  registerAgent(agent: BaseAgent): void {
    this.agents.set(agent.getId(), agent);
  }

  /**
   * Process a task by decomposing it and delegating to specialized agents
   */
  async processTask(task: AgentTask): Promise<any> {
    this.setStatus('thinking');

    // Decompose the task
    const decomposition = await this.decomposeTask(task);

    this.addMemory({
      type: 'decision',
      content: `Decomposed task into ${decomposition.subtasks.length} subtasks`,
      metadata: { taskId: task.id, subtasks: decomposition.subtasks },
    });

    // Execute subtasks
    const results: any[] = [];
    for (const subtask of decomposition.subtasks) {
      // Check dependencies
      const dependenciesMet = await this.checkDependencies(subtask.dependencies || [], results);
      if (!dependenciesMet) {
        continue; // Skip for now, would need better dependency management in production
      }

      // Find the agent to assign the task to
      const agent = this.findAgentByRole(subtask.assignTo);
      if (!agent) {
        this.addMemory({
          type: 'observation',
          content: `No agent found for role: ${subtask.assignTo}`,
        });
        continue;
      }

      // Create agent task
      const agentTask: AgentTask = {
        id: subtask.id,
        type: task.type,
        priority: subtask.priority,
        status: 'assigned',
        assignedTo: agent.getId(),
        description: subtask.description,
        context: task.context,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Send message to agent
      const message = this.sendMessage({
        to: agent.getId(),
        type: 'task',
        content: agentTask,
      });

      // Execute the subtask
      try {
        const result = await agent.executeTask(agentTask);
        results.push({
          subtaskId: subtask.id,
          result,
          agent: agent.getId(),
        });
      } catch (error) {
        this.addMemory({
          type: 'observation',
          content: `Subtask ${subtask.id} failed: ${error}`,
          metadata: { error: String(error) },
        });
      }
    }

    // Consolidate results
    const consolidatedResult = await this.consolidateResults(task, results);

    this.setStatus('completed');
    return consolidatedResult;
  }

  /**
   * Decompose a high-level task into subtasks
   */
  private async decomposeTask(
    task: AgentTask
  ): Promise<z.infer<typeof TaskDecompositionSchema>> {
    const prompt = this.generatePrompt(
      `Decompose the following facility management objective into specific subtasks:

Objective: ${task.description}
Priority: ${task.priority}
Context: ${JSON.stringify(task.context || {})}

Break this down into subtasks and assign each to the most appropriate agent.`,
      { includeMemory: true }
    );

    const decompositionPrompt = ai.definePrompt({
      name: 'taskDecomposition',
      input: { schema: z.object({ prompt: z.string() }) },
      output: { schema: TaskDecompositionSchema },
      prompt: '{{prompt}}',
    });

    const { output } = await decompositionPrompt({ prompt });

    if (!output) {
      throw new Error('Failed to decompose task');
    }

    return output;
  }

  /**
   * Find agent by role
   */
  private findAgentByRole(role: string): BaseAgent | undefined {
    for (const agent of this.agents.values()) {
      if (agent.getRole() === role) {
        return agent;
      }
    }
    return undefined;
  }

  /**
   * Check if task dependencies are met
   */
  private async checkDependencies(
    dependencies: string[],
    completedResults: any[]
  ): Promise<boolean> {
    if (!dependencies || dependencies.length === 0) {
      return true;
    }

    const completedIds = new Set(completedResults.map((r) => r.subtaskId));
    return dependencies.every((dep) => completedIds.has(dep));
  }

  /**
   * Consolidate results from multiple agents
   */
  private async consolidateResults(task: AgentTask, results: any[]): Promise<any> {
    // Simple consolidation for now
    return {
      taskId: task.id,
      status: 'completed',
      subtasksCompleted: results.length,
      results,
      summary: `Completed ${results.length} subtasks for: ${task.description}`,
    };
  }

  /**
   * Get status of all agents
   */
  getAgentStatuses(): Record<string, any> {
    const statuses: Record<string, any> = {};
    this.agents.forEach((agent, id) => {
      statuses[id] = {
        role: agent.getRole(),
        status: agent.getStatus(),
        state: agent.getState(),
      };
    });
    return statuses;
  }
}
