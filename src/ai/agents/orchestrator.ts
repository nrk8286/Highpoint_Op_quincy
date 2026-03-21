/**
 * @fileOverview Agent Orchestrator - Coordinates multi-agent system
 */

import { BaseAgent } from './base-agent';
import { ManagerAgent } from './manager-agent';
import { ComplianceAgent } from './compliance-agent';
import { OperationsAgent } from './operations-agent';
import { TrainingAgent } from './training-agent';
import { CriticAgent } from './critic-agent';
import type { AgentTask, AgentMessage, OrchestrationEvent } from './types';

/**
 * Orchestrator manages the multi-agent system
 */
export class AgentOrchestrator {
  private manager: ManagerAgent;
  private agents: Map<string, BaseAgent>;
  private messageQueue: AgentMessage[];
  private eventLog: OrchestrationEvent[];
  private isRunning: boolean;

  constructor() {
    this.manager = new ManagerAgent();
    this.agents = new Map();
    this.messageQueue = [];
    this.eventLog = [];
    this.isRunning = false;

    // Initialize all agents
    this.initializeAgents();
  }

  /**
   * Initialize all specialized agents
   */
  private initializeAgents(): void {
    // Create agents
    const complianceAgent = new ComplianceAgent();
    const operationsAgent = new OperationsAgent();
    const trainingAgent = new TrainingAgent();
    const criticAgent = new CriticAgent();

    // Register agents with manager
    this.manager.registerAgent(complianceAgent);
    this.manager.registerAgent(operationsAgent);
    this.manager.registerAgent(trainingAgent);
    this.manager.registerAgent(criticAgent);

    // Store agents
    this.agents.set(complianceAgent.getId(), complianceAgent);
    this.agents.set(operationsAgent.getId(), operationsAgent);
    this.agents.set(trainingAgent.getId(), trainingAgent);
    this.agents.set(criticAgent.getId(), criticAgent);

    // Set up message handlers
    this.setupMessageHandlers();
  }

  /**
   * Set up message handlers for inter-agent communication
   */
  private setupMessageHandlers(): void {
    // Set message handler for each agent
    this.agents.forEach((agent) => {
      agent.setMessageHandler((message: AgentMessage) => {
        this.handleAgentMessage(message);
      });
    });

    this.manager.setMessageHandler((message: AgentMessage) => {
      this.handleAgentMessage(message);
    });
  }

  /**
   * Handle messages from agents
   */
  private handleAgentMessage(message: AgentMessage): void {
    // Add to message queue
    this.messageQueue.push(message);

    // Log event
    this.logEvent({
      type: 'agent_message',
      agentId: message.from,
      data: message,
      timestamp: Date.now(),
    });

    // Route message to recipient(s)
    if (message.to === 'broadcast') {
      // Broadcast to all agents
      this.agents.forEach((agent) => {
        if (agent.getId() !== message.from) {
          agent.handleMessage(message);
        }
      });
    } else if (message.to) {
      // Send to specific agent
      const recipient = this.agents.get(message.to);
      if (recipient) {
        recipient.handleMessage(message);
      }
    }
  }

  /**
   * Log orchestration event
   */
  private logEvent(event: OrchestrationEvent): void {
    this.eventLog.push(event);

    // Keep only recent events (last 1000)
    if (this.eventLog.length > 1000) {
      this.eventLog = this.eventLog.slice(-1000);
    }
  }

  /**
   * Process a high-level objective
   */
  async processObjective(objective: string, context?: any): Promise<any> {
    this.isRunning = true;

    // Create task for manager
    const task: AgentTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'high_level_objective',
      priority: 'high',
      status: 'pending',
      description: objective,
      context,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.logEvent({
      type: 'task_created',
      taskId: task.id,
      data: task,
      timestamp: Date.now(),
    });

    try {
      // Manager will decompose and delegate
      const result = await this.manager.executeTask(task);

      this.logEvent({
        type: 'task_completed',
        taskId: task.id,
        data: result,
        timestamp: Date.now(),
      });

      this.isRunning = false;
      return result;
    } catch (error) {
      this.logEvent({
        type: 'error',
        taskId: task.id,
        data: { error: String(error) },
        timestamp: Date.now(),
      });

      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Get orchestrator status
   */
  getStatus(): any {
    return {
      isRunning: this.isRunning,
      agentCount: this.agents.size + 1, // +1 for manager
      agentStatuses: this.manager.getAgentStatuses(),
      queuedMessages: this.messageQueue.length,
      recentEvents: this.eventLog.slice(-10),
    };
  }

  /**
   * Get specific agent
   */
  getAgent(agentId: string): BaseAgent | undefined {
    if (agentId === this.manager.getId()) {
      return this.manager;
    }
    return this.agents.get(agentId);
  }

  /**
   * Get manager agent
   */
  getManager(): ManagerAgent {
    return this.manager;
  }

  /**
   * Get event log
   */
  getEventLog(limit?: number): OrchestrationEvent[] {
    if (limit) {
      return this.eventLog.slice(-limit);
    }
    return [...this.eventLog];
  }

  /**
   * Clear event log
   */
  clearEventLog(): void {
    this.eventLog = [];
  }

  /**
   * Get message queue
   */
  getMessageQueue(): AgentMessage[] {
    return [...this.messageQueue];
  }

  /**
   * Clear message queue
   */
  clearMessageQueue(): void {
    this.messageQueue = [];
  }

  /**
   * Execute a task directly with a specific agent
   */
  async executeAgentTask(agentId: string, task: AgentTask): Promise<any> {
    const agent = this.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    this.logEvent({
      type: 'task_assigned',
      agentId,
      taskId: task.id,
      data: task,
      timestamp: Date.now(),
    });

    try {
      const result = await agent.executeTask(task);

      this.logEvent({
        type: 'task_completed',
        agentId,
        taskId: task.id,
        data: result,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      this.logEvent({
        type: 'error',
        agentId,
        taskId: task.id,
        data: { error: String(error) },
        timestamp: Date.now(),
      });

      throw error;
    }
  }
}

// Create singleton instance
let orchestratorInstance: AgentOrchestrator | null = null;

/**
 * Get the orchestrator singleton instance
 */
export function getOrchestrator(): AgentOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new AgentOrchestrator();
  }
  return orchestratorInstance;
}
