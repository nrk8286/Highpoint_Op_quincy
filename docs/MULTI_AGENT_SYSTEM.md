# Multi-Agent Facility Management System

## Overview

This intelligent facility management system employs a multi-agent architecture where specialized AI agents collaborate to manage assets, maintenance, work orders, inventory, resource planning, compliance, training, scheduling, and reporting across all roles within the facility.

## System Architecture

### Core Components

#### 1. Agent Orchestrator (`src/ai/agents/orchestrator.ts`)
The central coordination system that manages all agents and routes messages between them.

**Features:**
- Agent lifecycle management
- Message routing (broadcast and targeted)
- Event logging and monitoring
- Task coordination
- Real-time status tracking

**Usage:**
```typescript
import { getOrchestrator } from '@/ai/agents/orchestrator';

const orchestrator = getOrchestrator();
const result = await orchestrator.processObjective(
  "Generate a compliance report and schedule overdue maintenance"
);
```

#### 2. Manager Agent (`src/ai/agents/manager-agent.ts`)
Coordinates all other agents and decomposes high-level objectives into specific tasks.

**Responsibilities:**
- Task decomposition
- Agent assignment based on capabilities
- Dependency management
- Result consolidation
- Progress monitoring

**Example:**
```typescript
// High-level objective is automatically decomposed into subtasks
const result = await processObjective(
  "Prepare for state audit: review compliance, update training materials, and schedule inspections"
);
```

#### 3. Compliance & Research Agent (`src/ai/agents/compliance-agent.ts`)
Monitors regulatory requirements and ensures facility compliance.

**Capabilities:**
- Regulatory monitoring (IDPH, OSHA, local codes)
- Compliance report generation
- Safety inspection scheduling
- Legal interpretation
- Audit documentation

**Tools:**
- `check_compliance`: Verify compliance status
- `schedule_inspection`: Schedule safety inspections
- `generate_compliance_report`: Create audit reports

**Example:**
```typescript
import { generateComplianceReport } from '@/ai/multi-agent-api';

const report = await generateComplianceReport(
  '2024-01-01',
  '2024-03-31'
);
```

#### 4. Operations & Scheduling Agent (`src/ai/agents/operations-agent.ts`)
Manages day-to-day facility operations, maintenance, and resources.

**Capabilities:**
- Maintenance scheduling (preventive and reactive)
- Work order creation and assignment
- Inventory monitoring and reordering
- Resource allocation
- Staff scheduling

**Tools:**
- `create_work_order`: Create maintenance work orders
- `schedule_maintenance`: Schedule preventive maintenance
- `check_inventory`: Check inventory levels
- `reorder_inventory`: Trigger automatic reorders
- `allocate_resources`: Assign staff and equipment

**Example:**
```typescript
import { autoScheduleMaintenance, monitorInventoryAndReorder } from '@/ai/multi-agent-api';

// Auto-schedule preventive maintenance
const maintenance = await autoScheduleMaintenance();

// Monitor inventory and reorder low stock items
const inventory = await monitorInventoryAndReorder();
```

#### 5. Training Agent (`src/ai/agents/training-agent.ts`)
Generates training materials and manages continuous learning programs.

**Capabilities:**
- Multi-modal training content generation
- Role-specific onboarding programs
- Assessment creation
- Compliance training updates
- Certification management

**Supported Formats:**
- In-Person sessions (hands-on practice)
- Live Online (real-time Q&A)
- Video modules (self-paced)
- Interactive modules (simulations)
- Assessments (knowledge checks)

**Tools:**
- `create_training_module`: Create training modules
- `schedule_training_session`: Schedule live sessions
- `track_completion`: Track employee progress
- `generate_certificate`: Issue certifications

**Example:**
```typescript
import { generateTrainingContent } from '@/ai/multi-agent-api';

const training = await generateTrainingContent('Housekeeper');
```

#### 6. Critic/Quality Agent (`src/ai/agents/critic-agent.ts`)
Evaluates outputs from other agents and ensures quality standards.

**Quality Criteria:**
- **Accuracy** (0-1): Factual correctness
- **Completeness** (0-1): Coverage of requirements
- **Compliance**: Regulatory adherence
- **Clarity** (0-1): Understandability
- **Efficiency** (0-1): Resource optimization

**Capabilities:**
- Output evaluation
- Feedback generation
- Refinement requests
- Quality metrics tracking
- Pattern recognition

**Example:**
```typescript
import { evaluateAgentOutput } from '@/ai/multi-agent-api';

const feedback = await evaluateAgentOutput(
  'operations_001',
  'task_123',
  workOrderOutput
);
```

### Agent Communication

Agents communicate via structured JSON messages using the `AgentMessage` schema:

```typescript
interface AgentMessage {
  id: string;
  from: string;        // Sending agent ID
  to?: string;         // Target agent ID or 'broadcast'
  type: 'task' | 'query' | 'response' | 'notification' | 'error';
  content: any;
  timestamp: number;
  metadata?: Record<string, any>;
}
```

**Message Flow:**
1. Agent sends message via `sendMessage()`
2. Orchestrator receives and routes message
3. Target agent(s) receive via `handleMessage()`
4. Event is logged for monitoring

### Agent Memory System

Each agent maintains a memory of interactions, decisions, and observations:

```typescript
interface MemoryEntry {
  id: string;
  agentId: string;
  type: 'fact' | 'interaction' | 'decision' | 'observation';
  content: string;
  timestamp: number;
  metadata?: Record<string, any>;
}
```

**Memory Features:**
- Context preservation across tasks
- Recent memory retrieval (last 100 entries)
- Keyword-based querying
- Automatic pruning of old entries

## Data Models

### Asset Management

```typescript
interface Asset {
  id: string;
  name: string;
  category: string;
  location: string;
  status: 'Active' | 'Inactive' | 'Under Maintenance' | 'Retired' | 'Disposed';
  condition: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical';
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  maintenanceSchedule?: string;
  // ... additional fields
}
```

### Training System

```typescript
interface TrainingModule {
  id: string;
  title: string;
  targetRole: UserRole | 'All';
  format: 'In-Person' | 'Live Online' | 'Video' | 'Interactive' | 'Assessment';
  durationMinutes: number;
  requiredForCompliance: boolean;
  topics: string[];
  validityDays?: number;
}

interface TrainingCompletion {
  id: string;
  userId: string;
  moduleId: string;
  status: 'Not Started' | 'In Progress' | 'Completed' | 'Overdue';
  score?: number;
  passed: boolean;
  expirationDate?: string;
}
```

### Scheduling

```typescript
interface ScheduledEvent {
  id: string;
  type: 'Maintenance' | 'Inspection' | 'Training' | 'Reservation' | 'Meeting';
  title: string;
  startTime: string;
  endTime: string;
  recurrence?: 'None' | 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
}
```

## API Reference

### Server Actions (`src/ai/multi-agent-api.ts`)

#### Process High-Level Objective
```typescript
processObjective(objective: string, context?: any): Promise<{
  success: boolean;
  result?: any;
  error?: string;
}>
```

#### Get System Status
```typescript
getOrchestratorStatus(): Promise<{
  success: boolean;
  status?: {
    isRunning: boolean;
    agentCount: number;
    agentStatuses: Record<string, any>;
    queuedMessages: number;
    recentEvents: OrchestrationEvent[];
  };
}>
```

#### Operations Actions
```typescript
autoScheduleMaintenance()
monitorInventoryAndReorder()
```

#### Compliance Actions
```typescript
generateComplianceReport(startDate: string, endDate: string)
```

#### Training Actions
```typescript
generateTrainingContent(role: string)
```

#### Quality Actions
```typescript
evaluateAgentOutput(agentId: string, taskId: string, output: any)
```

## User Interface

### Multi-Agent Dashboard (`/dashboard/multi-agent`)

**Features:**
- Real-time system status monitoring
- Agent status visualization
- Event log viewer
- Quick action buttons for common tasks
- High-level objective processing interface

**Status Indicators:**
- **Idle**: Agent is waiting for tasks (gray)
- **Thinking**: Agent is processing a task (blue)
- **Acting**: Agent is executing actions (yellow)
- **Completed**: Task finished successfully (green)
- **Error**: Task failed (red)

## Workflow Examples

### Example 1: Automated Compliance Audit

```typescript
// High-level objective
const result = await processObjective(
  "Prepare comprehensive compliance audit report for Q1 2024"
);

// Manager Agent decomposes into:
// 1. Compliance Agent: Generate compliance report
// 2. Operations Agent: Gather maintenance records
// 3. Training Agent: Verify staff certifications
// 4. Critic Agent: Review and validate all outputs
```

### Example 2: Preventive Maintenance Scheduling

```typescript
// Operations Agent analyzes assets and schedules maintenance
const result = await autoScheduleMaintenance();

// Result includes:
// - Work orders created
// - Scheduled maintenance dates
// - Resource allocations
// - Estimated completion times
```

### Example 3: Staff Onboarding

```typescript
// Training Agent generates comprehensive onboarding
const training = await generateTrainingContent('Housekeeper');

// Result includes:
// - Learning objectives
// - Multi-modal content sections
// - Assessment questions
// - Regulatory compliance notes
```

## Best Practices

### 1. Task Decomposition
- Keep objectives clear and specific
- Provide relevant context
- Allow agents to handle complexity

### 2. Error Handling
- All agent actions include try-catch
- Failed tasks are logged with details
- Agents update status on errors

### 3. Quality Assurance
- Use Critic Agent for important outputs
- Set quality thresholds
- Request refinements when needed

### 4. Memory Management
- Memory is automatically pruned
- Query memory for context
- Include relevant history in prompts

### 5. Scalability
- System handles unlimited facilities
- Agents work in parallel when possible
- Message queue prevents overload

## Monitoring and Debugging

### Event Log
All agent activities are logged as events:
```typescript
interface OrchestrationEvent {
  type: 'task_created' | 'task_assigned' | 'task_completed' | 'agent_message' | 'error';
  agentId?: string;
  taskId?: string;
  data: any;
  timestamp: number;
}
```

### Agent Metrics
Each agent tracks performance metrics:
- Tasks completed
- Tasks failed
- Average response time

### Status Monitoring
Real-time status available via:
- Multi-Agent Dashboard UI
- `getOrchestratorStatus()` API
- Event log queries

## Future Enhancements

### Planned Features
1. **Vector Memory**: Replace keyword search with semantic similarity
2. **Multi-Model Support**: Add Claude API integration for Compliance Agent
3. **Learning System**: Track agent performance and adapt strategies
4. **Advanced Scheduling**: Conflict resolution and optimization
5. **Mobile Interface**: Mobile-responsive agent interaction
6. **Analytics Dashboard**: Agent performance visualization
7. **Custom Agents**: Easy framework for adding specialized agents

## Security and Compliance

### Data Privacy
- All agent communications are logged
- Sensitive data is not stored in memory
- Access controls via user authentication

### Regulatory Compliance
- Compliance Agent monitors relevant regulations
- Audit trails for all activities
- Training certification tracking
- Inspection scheduling and documentation

## Troubleshooting

### Agent Not Responding
1. Check orchestrator status
2. Review event log for errors
3. Verify agent is not in error state
4. Restart orchestrator if needed

### Poor Quality Outputs
1. Review Critic Agent feedback
2. Check agent memory for context
3. Provide more detailed context
4. Request refinement

### Performance Issues
1. Monitor message queue length
2. Check for blocking tasks
3. Review agent metrics
4. Consider task prioritization

## Support

For issues or questions:
- Check event log for errors
- Review agent status
- Consult this documentation
- Submit issues via GitHub
