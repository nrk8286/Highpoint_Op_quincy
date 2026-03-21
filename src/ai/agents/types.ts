/**
 * @fileOverview Core types for the multi-agent facility management system
 */

import { z } from 'zod';

// Agent Roles
export type AgentRole =
  | 'manager'
  | 'compliance'
  | 'operations'
  | 'training'
  | 'critic'
  | 'support';

// Agent Status
export type AgentStatus = 'idle' | 'thinking' | 'acting' | 'waiting' | 'completed' | 'error';

// Task Priority
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

// Task Status
export type TaskStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed';

// Message Schema for agent communication
export const AgentMessageSchema = z.object({
  id: z.string(),
  from: z.string(), // Agent ID
  to: z.string().optional(), // Agent ID or 'broadcast'
  type: z.enum(['task', 'query', 'response', 'notification', 'error']),
  content: z.any(),
  timestamp: z.number(),
  metadata: z.record(z.any()).optional(),
});

export type AgentMessage = z.infer<typeof AgentMessageSchema>;

// Agent Task Schema
export const AgentTaskSchema = z.object({
  id: z.string(),
  type: z.string(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  status: z.enum(['pending', 'assigned', 'in_progress', 'completed', 'failed']),
  assignedTo: z.string().optional(), // Agent ID
  description: z.string(),
  context: z.record(z.any()).optional(),
  dependencies: z.array(z.string()).optional(), // Task IDs
  result: z.any().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
  completedAt: z.number().optional(),
});

export type AgentTask = z.infer<typeof AgentTaskSchema>;

// Agent Memory Entry
export const MemoryEntrySchema = z.object({
  id: z.string(),
  agentId: z.string(),
  type: z.enum(['fact', 'interaction', 'decision', 'observation']),
  content: z.string(),
  embedding: z.array(z.number()).optional(), // Vector embedding for similarity search
  metadata: z.record(z.any()).optional(),
  timestamp: z.number(),
  relevance: z.number().optional(), // Relevance score (0-1)
});

export type MemoryEntry = z.infer<typeof MemoryEntrySchema>;

// Agent Configuration
export interface AgentConfig {
  id: string;
  role: AgentRole;
  name: string;
  description: string;
  model: 'gemini' | 'claude' | 'chatgpt'; // AI model to use
  systemPrompt: string;
  capabilities: string[];
  maxTokens?: number;
  temperature?: number;
}

// Agent State
export interface AgentState {
  id: string;
  role: AgentRole;
  status: AgentStatus;
  currentTask: string | null; // Task ID
  memory: MemoryEntry[];
  metrics: {
    tasksCompleted: number;
    tasksFaileed: number;
    averageResponseTime: number;
  };
}

// Tool Definition for agents
export interface AgentTool {
  name: string;
  description: string;
  parameters: z.ZodSchema;
  execute: (params: any) => Promise<any>;
}

// Agent Action
export interface AgentAction {
  type: 'tool_use' | 'message' | 'query' | 'delegate';
  target?: string; // Tool name or agent ID
  params: any;
  reasoning?: string;
}

// Orchestration Event
export interface OrchestrationEvent {
  type: 'task_created' | 'task_assigned' | 'task_completed' | 'agent_message' | 'error';
  agentId?: string;
  taskId?: string;
  data: any;
  timestamp: number;
}

// Quality Criteria for Critic Agent
export interface QualityCriteria {
  accuracy: number; // 0-1
  completeness: number; // 0-1
  compliance: boolean;
  clarity: number; // 0-1
  efficiency: number; // 0-1
}

// Feedback from Critic Agent
export interface AgentFeedback {
  taskId: string;
  agentId: string;
  quality: QualityCriteria;
  suggestions: string[];
  approved: boolean;
  timestamp: number;
}
