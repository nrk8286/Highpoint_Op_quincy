'use server';

/**
 * @fileOverview Agent Orchestration Service
 *
 * Manages the multi-agent system including agent lifecycle, task assignment,
 * message routing, and coordination between agents.
 */

import {
  addDoc,
  collection,
  doc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebase';
import type {
  Agent,
  AgentTask,
  Objective,
  AgentMessage,
  AgentLog,
  AgentRole,
  AgentStatus,
  AgentTaskStatus,
  TaskPriority,
} from '@/lib/types';

// Agent Management

export async function initializeAgents(): Promise<void> {
  const agentsRef = collection(db, 'agents');

  const defaultAgents: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      role: 'Manager',
      name: 'Manager Agent',
      description: 'Coordinates multi-agent operations, decomposes objectives, and monitors progress',
      status: 'Active',
      model: 'gemini',
      capabilities: ['task_decomposition', 'agent_coordination', 'result_consolidation', 'progress_monitoring'],
      tasksCompleted: 0,
    },
    {
      role: 'Compliance',
      name: 'Compliance Agent',
      description: 'Monitors regulatory requirements, generates compliance reports, and interprets legal updates',
      status: 'Active',
      model: 'gemini', // In production, this would be Claude
      capabilities: ['compliance_monitoring', 'report_generation', 'regulatory_interpretation', 'safety_audits'],
      tasksCompleted: 0,
    },
    {
      role: 'Operations',
      name: 'Operations Agent',
      description: 'Manages maintenance schedules, work orders, inventory, and resource allocation',
      status: 'Active',
      model: 'gemini', // In production, this would be ChatGPT
      capabilities: ['schedule_optimization', 'work_order_management', 'resource_forecasting', 'inventory_management'],
      tasksCompleted: 0,
    },
    {
      role: 'Training',
      name: 'Training Agent',
      description: 'Generates training content, onboarding materials, and learning modules',
      status: 'Active',
      model: 'gemini',
      capabilities: ['content_generation', 'onboarding_plans', 'training_assessment', 'multi_modal_training'],
      tasksCompleted: 0,
    },
    {
      role: 'Critic',
      name: 'Quality Agent',
      description: 'Evaluates outputs from other agents, provides feedback, and ensures quality standards',
      status: 'Active',
      model: 'gemini',
      capabilities: ['output_evaluation', 'quality_assurance', 'feedback_generation', 'compliance_review'],
      tasksCompleted: 0,
    },
    {
      role: 'Analytics',
      name: 'Analytics Agent',
      description: 'Analyzes data, generates insights, and provides performance recommendations',
      status: 'Active',
      model: 'gemini',
      capabilities: ['data_analysis', 'trend_identification', 'predictive_modeling', 'kpi_monitoring'],
      tasksCompleted: 0,
    },
  ];

  // Check if agents already exist
  const existingAgents = await getDocs(agentsRef);
  if (existingAgents.empty) {
    for (const agent of defaultAgents) {
      await addDoc(agentsRef, {
        ...agent,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  }
}

export async function getAgents(): Promise<Agent[]> {
  const agentsRef = collection(db, 'agents');
  const snapshot = await getDocs(agentsRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Agent));
}

export async function getAgentByRole(role: AgentRole): Promise<Agent | null> {
  const agentsRef = collection(db, 'agents');
  const q = query(agentsRef, where('role', '==', role), limit(1));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as Agent;
}

export async function updateAgentStatus(agentId: string, status: AgentStatus, currentTask?: string): Promise<void> {
  const agentRef = doc(db, 'agents', agentId);
  await updateDoc(agentRef, {
    status,
    currentTask: currentTask || null,
    lastActive: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// Objective Management

export async function createObjective(
  title: string,
  description: string,
  createdBy: string,
  priority: TaskPriority
): Promise<string> {
  const objectivesRef = collection(db, 'objectives');
  const docRef = await addDoc(objectivesRef, {
    title,
    description,
    status: 'Planning',
    createdBy,
    priority,
    subtasks: [],
    startedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateObjective(
  objectiveId: string,
  updates: Partial<Objective>
): Promise<void> {
  const objectiveRef = doc(db, 'objectives', objectiveId);
  await updateDoc(objectiveRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

// Task Management

export async function createAgentTask(
  title: string,
  description: string,
  priority: TaskPriority,
  createdBy: string,
  objectiveId?: string,
  input?: Record<string, any>,
  dependencies?: string[]
): Promise<string> {
  const tasksRef = collection(db, 'agent_tasks');
  const docRef = await addDoc(tasksRef, {
    objectiveId,
    title,
    description,
    priority,
    status: 'Pending' as AgentTaskStatus,
    createdBy,
    dependencies: dependencies || [],
    input,
    retryCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function assignTaskToAgent(taskId: string, agentId: string): Promise<void> {
  const taskRef = doc(db, 'agent_tasks', taskId);
  await updateDoc(taskRef, {
    assignedTo: agentId,
    status: 'Assigned',
    updatedAt: serverTimestamp(),
  });

  await updateAgentStatus(agentId, 'Busy', taskId);
}

export async function updateTaskStatus(
  taskId: string,
  status: AgentTaskStatus,
  output?: Record<string, any>,
  feedback?: string
): Promise<void> {
  const taskRef = doc(db, 'agent_tasks', taskId);
  const updates: any = {
    status,
    updatedAt: serverTimestamp(),
  };

  if (status === 'In Progress') {
    updates.startedAt = serverTimestamp();
  } else if (status === 'Completed' || status === 'Failed') {
    updates.completedAt = serverTimestamp();
  }

  if (output) {
    updates.output = output;
  }

  if (feedback) {
    updates.feedback = feedback;
  }

  await updateDoc(taskRef, updates);
}

export async function getTasksForAgent(agentId: string): Promise<AgentTask[]> {
  const tasksRef = collection(db, 'agent_tasks');
  const q = query(
    tasksRef,
    where('assignedTo', '==', agentId),
    where('status', 'in', ['Assigned', 'In Progress']),
    orderBy('priority', 'desc'),
    orderBy('createdAt', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AgentTask));
}

export async function getPendingTasks(): Promise<AgentTask[]> {
  const tasksRef = collection(db, 'agent_tasks');
  const q = query(
    tasksRef,
    where('status', '==', 'Pending'),
    orderBy('priority', 'desc'),
    orderBy('createdAt', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AgentTask));
}

// Message Routing

export async function sendAgentMessage(
  fromAgentId: string,
  content: Record<string, any>,
  messageType: 'request' | 'response' | 'notification' | 'error',
  toAgentId?: string,
  relatedTaskId?: string
): Promise<string> {
  const messagesRef = collection(db, 'agent_messages');
  const docRef = await addDoc(messagesRef, {
    fromAgentId,
    toAgentId: toAgentId || null,
    messageType,
    content,
    relatedTaskId: relatedTaskId || null,
    timestamp: serverTimestamp(),
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getAgentMessages(agentId: string, lastN: number = 50): Promise<AgentMessage[]> {
  const messagesRef = collection(db, 'agent_messages');
  const q = query(
    messagesRef,
    where('toAgentId', 'in', [agentId, null]), // Messages to this agent or broadcast
    orderBy('timestamp', 'desc'),
    limit(lastN)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AgentMessage));
}

// Logging

export async function logAgentAction(
  agentId: string,
  level: 'Info' | 'Warning' | 'Error' | 'Debug',
  action: string,
  details?: string,
  relatedTaskId?: string
): Promise<void> {
  const logsRef = collection(db, 'agent_logs');
  await addDoc(logsRef, {
    agentId,
    level,
    action,
    details: details || null,
    relatedTaskId: relatedTaskId || null,
    timestamp: serverTimestamp(),
    createdAt: serverTimestamp(),
  });
}

export async function getAgentLogs(agentId: string, lastN: number = 100): Promise<AgentLog[]> {
  const logsRef = collection(db, 'agent_logs');
  const q = query(
    logsRef,
    where('agentId', '==', agentId),
    orderBy('timestamp', 'desc'),
    limit(lastN)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AgentLog));
}

// Agent Orchestration Workflow

export async function executeObjective(
  objectiveTitle: string,
  objectiveDescription: string,
  userId: string,
  priority: TaskPriority
): Promise<{ objectiveId: string; message: string }> {
  try {
    // Create the objective
    const objectiveId = await createObjective(objectiveTitle, objectiveDescription, userId, priority);

    // Get the Manager Agent
    const managerAgent = await getAgentByRole('Manager');
    if (!managerAgent) {
      throw new Error('Manager Agent not found. Please initialize agents first.');
    }

    // Create a task for the Manager to decompose the objective
    const taskId = await createAgentTask(
      `Decompose Objective: ${objectiveTitle}`,
      `Analyze and break down the following objective into subtasks:\n${objectiveDescription}`,
      priority,
      userId,
      objectiveId,
      {
        objective: objectiveDescription,
        priority,
      }
    );

    // Assign to Manager
    await assignTaskToAgent(taskId, managerAgent.id);

    // Log the action
    await logAgentAction(
      managerAgent.id,
      'Info',
      'Objective Created',
      `New objective assigned for decomposition: ${objectiveTitle}`,
      taskId
    );

    return {
      objectiveId,
      message: 'Objective created and assigned to Manager Agent for processing.',
    };
  } catch (error) {
    console.error('Error executing objective:', error);
    throw error;
  }
}

// Task Assignment Logic

export async function assignPendingTasks(): Promise<number> {
  const pendingTasks = await getPendingTasks();
  const agents = await getAgents();

  let assignedCount = 0;

  for (const task of pendingTasks) {
    // Check dependencies
    if (task.dependencies && task.dependencies.length > 0) {
      const dependencyTasks = await Promise.all(
        task.dependencies.map(async (depId) => {
          const tasksRef = collection(db, 'agent_tasks');
          const q = query(tasksRef, where('__name__', '==', depId));
          const snapshot = await getDocs(q);
          if (snapshot.empty) return null;
          return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as AgentTask;
        })
      );

      const allDependenciesCompleted = dependencyTasks.every(
        (dep) => dep && dep.status === 'Completed'
      );

      if (!allDependenciesCompleted) {
        continue; // Skip this task, dependencies not met
      }
    }

    // Find best agent based on capabilities and workload
    // Simplified logic: Find least busy agent with matching role
    const availableAgents = agents.filter((a) => a.status !== 'Offline' && a.status !== 'Error');

    if (availableAgents.length > 0) {
      // For now, simple round-robin assignment
      // In production, this would use more sophisticated matching
      const selectedAgent = availableAgents.reduce((prev, current) =>
        prev.tasksCompleted < current.tasksCompleted ? prev : current
      );

      await assignTaskToAgent(task.id, selectedAgent.id);
      assignedCount++;
    }
  }

  return assignedCount;
}

// Workload Statistics

export async function getAgentWorkloadStats(): Promise<Record<string, { pending: number; inProgress: number; completed: number }>> {
  const agents = await getAgents();
  const stats: Record<string, { pending: number; inProgress: number; completed: number }> = {};

  for (const agent of agents) {
    const tasksRef = collection(db, 'agent_tasks');

    // Pending/Assigned
    const pendingQ = query(tasksRef, where('assignedTo', '==', agent.id), where('status', 'in', ['Pending', 'Assigned']));
    const pendingSnapshot = await getDocs(pendingQ);

    // In Progress
    const inProgressQ = query(tasksRef, where('assignedTo', '==', agent.id), where('status', '==', 'In Progress'));
    const inProgressSnapshot = await getDocs(inProgressQ);

    // Completed
    const completedQ = query(tasksRef, where('assignedTo', '==', agent.id), where('status', '==', 'Completed'));
    const completedSnapshot = await getDocs(completedQ);

    stats[agent.role] = {
      pending: pendingSnapshot.size,
      inProgress: inProgressSnapshot.size,
      completed: completedSnapshot.size,
    };
  }

  return stats;
}
