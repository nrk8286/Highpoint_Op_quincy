/**
 * @fileOverview Base Agent class for the multi-agent system
 */

import { z } from 'zod';
import type {
  AgentConfig,
  AgentState,
  AgentMessage,
  AgentTask,
  AgentTool,
  AgentAction,
  MemoryEntry,
  AgentStatus,
} from './types';

/**
 * Base Agent class that all specialized agents extend
 */
export abstract class BaseAgent {
  protected config: AgentConfig;
  protected state: AgentState;
  protected tools: Map<string, AgentTool>;
  protected messageHandler?: (message: AgentMessage) => void;

  constructor(config: AgentConfig) {
    this.config = config;
    this.tools = new Map();
    this.state = {
      id: config.id,
      role: config.role,
      status: 'idle',
      currentTask: null,
      memory: [],
      metrics: {
        tasksCompleted: 0,
        tasksFaileed: 0,
        averageResponseTime: 0,
      },
    };
  }

  /**
   * Get agent ID
   */
  getId(): string {
    return this.config.id;
  }

  /**
   * Get agent role
   */
  getRole(): string {
    return this.config.role;
  }

  /**
   * Get current agent status
   */
  getStatus(): AgentStatus {
    return this.state.status;
  }

  /**
   * Update agent status
   */
  protected setStatus(status: AgentStatus): void {
    this.state.status = status;
  }

  /**
   * Register a tool for the agent to use
   */
  registerTool(tool: AgentTool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Execute a tool by name
   */
  protected async executeTool(name: string, params: any): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }

    // Validate parameters
    const validatedParams = tool.parameters.parse(params);
    return await tool.execute(validatedParams);
  }

  /**
   * Add memory entry
   */
  protected addMemory(entry: Omit<MemoryEntry, 'id' | 'agentId' | 'timestamp'>): void {
    const memoryEntry: MemoryEntry = {
      ...entry,
      id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      agentId: this.config.id,
      timestamp: Date.now(),
    };

    this.state.memory.push(memoryEntry);

    // Keep only recent memories (last 100)
    if (this.state.memory.length > 100) {
      this.state.memory = this.state.memory.slice(-100);
    }
  }

  /**
   * Query memory
   */
  protected queryMemory(query: string, limit: number = 10): MemoryEntry[] {
    // Simple keyword matching for now
    // In production, use vector similarity search
    const queryLower = query.toLowerCase();
    return this.state.memory
      .filter((entry) => entry.content.toLowerCase().includes(queryLower))
      .slice(-limit);
  }

  /**
   * Set message handler for receiving messages from other agents
   */
  setMessageHandler(handler: (message: AgentMessage) => void): void {
    this.messageHandler = handler;
  }

  /**
   * Handle incoming message
   */
  async handleMessage(message: AgentMessage): Promise<void> {
    this.addMemory({
      type: 'interaction',
      content: `Received message from ${message.from}: ${JSON.stringify(message.content)}`,
    });

    if (this.messageHandler) {
      this.messageHandler(message);
    }
  }

  /**
   * Send message to another agent or broadcast
   */
  protected sendMessage(message: Omit<AgentMessage, 'id' | 'from' | 'timestamp'>): AgentMessage {
    const fullMessage: AgentMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      from: this.config.id,
      timestamp: Date.now(),
    };

    this.addMemory({
      type: 'interaction',
      content: `Sent message to ${message.to || 'broadcast'}: ${JSON.stringify(message.content)}`,
    });

    return fullMessage;
  }

  /**
   * Process a task - must be implemented by subclasses
   */
  abstract processTask(task: AgentTask): Promise<any>;

  /**
   * Execute a task with timing and error handling
   */
  async executeTask(task: AgentTask): Promise<any> {
    const startTime = Date.now();
    this.setStatus('thinking');
    this.state.currentTask = task.id;

    this.addMemory({
      type: 'decision',
      content: `Starting task: ${task.description}`,
      metadata: { taskId: task.id },
    });

    try {
      const result = await this.processTask(task);

      const duration = Date.now() - startTime;
      this.state.metrics.tasksCompleted++;
      this.state.metrics.averageResponseTime =
        (this.state.metrics.averageResponseTime * (this.state.metrics.tasksCompleted - 1) +
          duration) /
        this.state.metrics.tasksCompleted;

      this.addMemory({
        type: 'decision',
        content: `Completed task: ${task.description}`,
        metadata: { taskId: task.id, duration, result },
      });

      this.setStatus('idle');
      this.state.currentTask = null;

      return result;
    } catch (error) {
      this.state.metrics.tasksFaileed++;
      this.setStatus('error');

      this.addMemory({
        type: 'observation',
        content: `Task failed: ${task.description}. Error: ${error}`,
        metadata: { taskId: task.id, error: String(error) },
      });

      throw error;
    }
  }

  /**
   * Get agent state for monitoring
   */
  getState(): AgentState {
    return { ...this.state };
  }

  /**
   * Generate a prompt with system context
   */
  protected generatePrompt(userMessage: string, context?: any): string {
    let prompt = `${this.config.systemPrompt}\n\n`;

    // Add relevant memories
    if (context?.includeMemory) {
      const recentMemories = this.state.memory.slice(-5);
      if (recentMemories.length > 0) {
        prompt += `Recent Context:\n`;
        recentMemories.forEach((mem) => {
          prompt += `- ${mem.content}\n`;
        });
        prompt += `\n`;
      }
    }

    // Add tools information
    if (this.tools.size > 0 && context?.includeTools) {
      prompt += `Available Tools:\n`;
      this.tools.forEach((tool) => {
        prompt += `- ${tool.name}: ${tool.description}\n`;
      });
      prompt += `\n`;
    }

    prompt += `Current Request: ${userMessage}`;

    return prompt;
  }
}
