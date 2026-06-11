'use server';

/**
 * @fileOverview Multi-Agent System API - Server actions for agent interaction
 */

import { getOrchestrator } from './agents/orchestrator';
import type { AgentTask } from './agents/types';

/**
 * Process an objective using the multi-agent system
 */
export async function processObjective(objective: string, context?: any) {
  try {
    const orchestrator = getOrchestrator();
    const result = await orchestrator.processObjective(objective, context);
    return { success: true, result };
  } catch (error) {
    console.error('Error processing objective:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Get orchestrator status
 */
export async function getOrchestratorStatus() {
  try {
    const orchestrator = getOrchestrator();
    const status = orchestrator.getStatus();
    return { success: true, status };
  } catch (error) {
    console.error('Error getting status:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Execute task with specific agent
 */
export async function executeAgentTask(agentId: string, taskDescription: string, context?: any) {
  try {
    const orchestrator = getOrchestrator();

    const task: AgentTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'direct_task',
      priority: 'medium',
      status: 'pending',
      description: taskDescription,
      context,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const result = await orchestrator.executeAgentTask(agentId, task);
    return { success: true, result };
  } catch (error) {
    console.error('Error executing agent task:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Get event log from orchestrator
 */
export async function getEventLog(limit?: number) {
  try {
    const orchestrator = getOrchestrator();
    const events = orchestrator.getEventLog(limit);
    return { success: true, events };
  } catch (error) {
    console.error('Error getting event log:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Auto-schedule maintenance (Operations Agent)
 */
export async function autoScheduleMaintenance() {
  try {
    const orchestrator = getOrchestrator();
    const operationsAgent = orchestrator.getAgent('operations_001');

    if (!operationsAgent) {
      throw new Error('Operations agent not found');
    }

    // Cast to OperationsAgent type (we know it's the right type)
    const result = await (operationsAgent as any).autoScheduleMaintenance();
    return { success: true, result };
  } catch (error) {
    console.error('Error auto-scheduling maintenance:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Monitor inventory and reorder (Operations Agent)
 */
export async function monitorInventoryAndReorder() {
  try {
    const orchestrator = getOrchestrator();
    const operationsAgent = orchestrator.getAgent('operations_001');

    if (!operationsAgent) {
      throw new Error('Operations agent not found');
    }

    const result = await (operationsAgent as any).monitorInventory();
    return { success: true, result };
  } catch (error) {
    console.error('Error monitoring inventory:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Generate compliance report (Compliance Agent)
 */
export async function generateComplianceReport(startDate: string, endDate: string) {
  try {
    const orchestrator = getOrchestrator();
    const complianceAgent = orchestrator.getAgent('compliance_001');

    if (!complianceAgent) {
      throw new Error('Compliance agent not found');
    }

    const result = await (complianceAgent as any).generateAuditReport(startDate, endDate);
    return { success: true, result };
  } catch (error) {
    console.error('Error generating compliance report:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Generate training content (Training Agent)
 */
export async function generateTrainingContent(role: string) {
  try {
    const orchestrator = getOrchestrator();
    const trainingAgent = orchestrator.getAgent('training_001');

    if (!trainingAgent) {
      throw new Error('Training agent not found');
    }

    const result = await (trainingAgent as any).generateOnboarding(role);
    return { success: true, result };
  } catch (error) {
    console.error('Error generating training content:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Evaluate agent output (Critic Agent)
 */
export async function evaluateAgentOutput(
  agentId: string,
  taskId: string,
  output: any
) {
  try {
    const orchestrator = getOrchestrator();
    const criticAgent = orchestrator.getAgent('critic_001');

    if (!criticAgent) {
      throw new Error('Critic agent not found');
    }

    const result = await (criticAgent as any).evaluateOutput(agentId, taskId, output);
    return { success: true, result };
  } catch (error) {
    console.error('Error evaluating output:', error);
    return { success: false, error: String(error) };
  }
}
