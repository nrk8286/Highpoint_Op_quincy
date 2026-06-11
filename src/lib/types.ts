import { Timestamp, FieldValue } from 'firebase';

export type UserRole = 'Admin' | 'Supervisor' | 'Housekeeper' | 'Director' | 'Administrator' | 'Maintenance';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string;
  createdAt?: Timestamp | FieldValue;
}

export type TaskStatus = 'Pending' | 'In Progress' | 'Completed' | 'Overdue' | 'Declined';

export interface DailyTask {
  id: string;
  roomNumber: string;
  roomType: string;
  assignedTo: string; // User ID
  status: TaskStatus;
  date: string; // YYYY-MM-DD
  notes?: string;
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
}

export interface DeepCleanTask {
  id: string;
  zone: string;
  scheduledDate: string;
  completedDate?: string;
  assignedTo: string; // User ID
  status: 'Scheduled' | 'In Progress' | 'Completed';
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  reorderLevel: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
}

export type MaintenanceStatus = 'Open' | 'In Progress' | 'Completed' | 'On Hold';
export type MaintenancePriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type MaintenanceIssueType = 'Plumbing' | 'Electrical' | 'HVAC' | 'Painting' | 'General Repair';

export interface MaintenanceWorkOrder {
    id: string;
    location: string; // e.g. Room number or area name
    issueType: MaintenanceIssueType;
    description: string;
    status: MaintenanceStatus;
    priority: MaintenancePriority;
    createdBy: string; // User ID
    assignedTo?: string; // User ID
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}


export type InspectionStatus = 'Pass' | 'Fail' | 'Corrective Action Required';

export interface Inspection {
    id: string;
    location: string;
    inspectorId: string; // User ID
    date: string; // ISO String
    status: InspectionStatus;
    notes?: string;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

export interface Resident {
    id: string;
    name: string;
    roomNumber: string;
    dateOfBirth: string; // YYYY-MM-DD
    notes?: string;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

export type Shift = 'Day' | 'Evening' | 'Night';

export interface ShiftReport {
    id: string;
    residentId: string;
    authorId: string; // User ID
    shift: Shift;
    date: string; // ISO String
    reportText: string;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

// Asset Management Types
export type AssetStatus = 'Active' | 'Inactive' | 'Under Maintenance' | 'Retired' | 'Disposed';
export type AssetCondition = 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical';

export interface Asset {
    id: string;
    name: string;
    category: string; // e.g., HVAC, Plumbing, Electrical, Furniture
    location: string;
    serialNumber?: string;
    manufacturer?: string;
    model?: string;
    purchaseDate?: string;
    purchasePrice?: number;
    warrantyExpiration?: string;
    status: AssetStatus;
    condition: AssetCondition;
    lastMaintenanceDate?: string;
    nextMaintenanceDate?: string;
    maintenanceSchedule?: string; // e.g., 'monthly', 'quarterly', 'annually'
    notes?: string;
// Multi-Agent System Types

export type AgentRole =
    | 'Manager'           // Coordinator - decomposes objectives and assigns tasks
    | 'Compliance'        // Claude-powered - monitors regulations and compliance
    | 'Operations'        // ChatGPT-powered - manages operations and scheduling
    | 'Training'          // Hybrid - generates training content
    | 'Critic'            // Quality assurance - evaluates outputs
    | 'Analytics'         // Data analysis and insights
    | 'Vendor'            // Vendor coordination
    | 'CapitalPlanning';  // Capital planning support

export type AgentStatus = 'Active' | 'Idle' | 'Busy' | 'Error' | 'Offline';

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export type AgentTaskStatus =
    | 'Pending'           // Task created, not started
    | 'Assigned'          // Assigned to an agent
    | 'In Progress'       // Agent working on it
    | 'Review'            // Being reviewed by Critic
    | 'Completed'         // Successfully completed
    | 'Failed'            // Failed execution
    | 'Cancelled';        // Manually cancelled

export interface Agent {
    id: string;
    role: AgentRole;
    name: string;
    description: string;
    status: AgentStatus;
    model: 'chatgpt' | 'claude' | 'gemini'; // AI model powering this agent
    capabilities: string[]; // List of capabilities/functions
    currentTask?: string; // ID of current task
    tasksCompleted: number;
    lastActive?: Timestamp;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

export interface AgentTask {
    id: string;
    objectiveId?: string; // Parent objective if part of larger goal
    title: string;
    description: string;
    priority: TaskPriority;
    status: AgentTaskStatus;
    assignedTo?: string; // Agent ID
    createdBy: string; // Agent ID or User ID
    dependencies?: string[]; // IDs of tasks that must complete first
    input?: Record<string, any>; // Input parameters for the task
    output?: Record<string, any>; // Result of task execution
    feedback?: string; // Feedback from Critic agent
    retryCount: number;
    startedAt?: Timestamp;
    completedAt?: Timestamp;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

export interface AssetMaintenanceHistory {
    id: string;
    assetId: string;
    workOrderId?: string;
    date: string;
    type: 'Preventive' | 'Corrective' | 'Inspection' | 'Upgrade';
    description: string;
    cost?: number;
    performedBy: string; // User ID or vendor name
    outcome?: 'Success' | 'Partial' | 'Failed';
    notes?: string;
    createdAt?: Timestamp;
}

// Training and Learning Types
export type TrainingStatus = 'Not Started' | 'In Progress' | 'Completed' | 'Overdue';
export type TrainingFormat = 'In-Person' | 'Live Online' | 'Video' | 'Interactive' | 'Assessment';
export interface Objective {
    id: string;
    title: string;
    description: string;
    status: 'Planning' | 'In Progress' | 'Completed' | 'Failed';
    createdBy: string; // User ID
    priority: TaskPriority;
    subtasks: string[]; // IDs of decomposed tasks
    result?: string; // Final consolidated result
    startedAt?: Timestamp;
    completedAt?: Timestamp;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

export interface AgentMessage {
    id: string;
    fromAgentId: string;
    toAgentId?: string; // null for broadcast
    messageType: 'request' | 'response' | 'notification' | 'error';
    content: Record<string, any>; // Structured JSON message
    relatedTaskId?: string;
    timestamp: Timestamp;
    createdAt?: Timestamp;
}

export interface AgentMemory {
    id: string;
    agentId: string;
    contextType: 'conversation' | 'task' | 'knowledge' | 'feedback';
    content: string;
    metadata?: Record<string, any>;
    embedding?: number[]; // Vector embedding for semantic search
    relevanceScore?: number;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

export interface ComplianceRequirement {
    id: string;
    title: string;
    description: string;
    regulatoryBody: string; // e.g., "IDPH", "OSHA", "CMS"
    category: string; // e.g., "Safety", "Environmental", "Training"
    dueDate?: string; // ISO String
    status: 'Active' | 'Pending Review' | 'Compliant' | 'Non-Compliant' | 'Expired';
    lastReviewedBy?: string; // Agent ID or User ID
    lastReviewedAt?: Timestamp;
    nextReviewDate?: string; // ISO String
    relatedDocuments?: string[]; // Document IDs or URLs
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

export interface TrainingModule {
    id: string;
    title: string;
    description: string;
    targetRole: UserRole | 'All';
    format: TrainingFormat;
    durationMinutes: number;
    requiredForCompliance: boolean;
    topics: string[];
    content?: string; // Training content/script
    videoUrl?: string;
    assessmentId?: string;
    validityDays?: number; // How long certification is valid
    targetRoles: UserRole[]; // Which roles should complete this
    format: 'In-Person' | 'Live Online' | 'Video' | 'Interactive' | 'Reading';
    duration: number; // in minutes
    content: string; // Training content/materials
    quiz?: {
        questions: Array<{
            question: string;
            options: string[];
            correctAnswer: number;
        }>;
    };
    status: 'Draft' | 'Active' | 'Archived';
    completionRate: number; // Percentage of target users completed
    createdBy: string; // Agent ID or User ID
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

export interface TrainingCompletion {
    id: string;
    userId: string;
    moduleId: string;
    startDate?: string;
    completionDate?: string;
    status: TrainingStatus;
    score?: number; // 0-100
    passed: boolean;
    certificateUrl?: string;
    expirationDate?: string; // When certification expires
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

// Scheduling Types
export type EventType = 'Maintenance' | 'Inspection' | 'Training' | 'Reservation' | 'Meeting';

export interface ScheduledEvent {
    id: string;
    type: EventType;
    title: string;
    description?: string;
    startTime: string; // ISO String
    endTime: string; // ISO String
    location?: string;
    assignedTo?: string[]; // User IDs
    relatedAssetId?: string;
    relatedWorkOrderId?: string;
    relatedModuleId?: string;
    recurrence?: 'None' | 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';
    status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
    moduleId: string;
    userId: string;
    status: 'In Progress' | 'Completed' | 'Failed';
    score?: number; // Quiz score if applicable
    startedAt: Timestamp;
    completedAt?: Timestamp;
    createdAt?: Timestamp;
}

export interface Asset {
    id: string;
    name: string;
    type: string; // e.g., "HVAC Unit", "Elevator", "Generator"
    location: string;
    serialNumber?: string;
    manufacturer?: string;
    model?: string;
    installDate?: string; // ISO String
    warrantyExpiration?: string; // ISO String
    status: 'Operational' | 'Under Maintenance' | 'Needs Repair' | 'Out of Service';
    lastMaintenanceDate?: string;
    nextMaintenanceDate?: string;
    maintenanceHistory?: string[]; // Work Order IDs
    lifecycleStage: 'New' | 'Active' | 'Aging' | 'End of Life';
    estimatedReplacement?: string; // ISO String
    replacementCost?: number;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

export interface ResourceForecast {
    id: string;
    type: 'Labor' | 'Materials' | 'Budget';
    timeframe: string; // e.g., "Q1 2026", "March 2026"
    predictedDemand: number;
    currentAllocation: number;
    gap: number; // Demand - Allocation
    confidence: number; // 0-100 confidence score
    recommendations: string[];
    generatedBy: string; // Agent ID
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

// Analytics and Metrics Types
export interface FacilityMetrics {
    id: string;
    facilityId: string;
    date: string; // YYYY-MM-DD
    tasksCompleted: number;
    tasksOverdue: number;
    maintenanceWorkOrders: number;
    inventoryAlerts: number;
    complianceScore: number; // 0-100
    staffUtilization: number; // 0-100
    assetDowntime: number; // hours
    residentSatisfaction?: number; // 0-100
export interface ScheduleConflict {
    id: string;
    type: 'Double Booking' | 'Resource Unavailable' | 'Overlapping Tasks';
    description: string;
    affectedResources: string[]; // User IDs, Asset IDs, etc.
    suggestedResolution?: string;
    status: 'Detected' | 'Resolving' | 'Resolved';
    detectedBy: string; // Agent ID
    resolvedBy?: string; // Agent ID or User ID
    detectedAt: Timestamp;
    resolvedAt?: Timestamp;
    createdAt?: Timestamp;
}

export interface AgentLog {
    id: string;
    agentId: string;
    level: 'Info' | 'Warning' | 'Error' | 'Debug';
    action: string;
    details?: string;
    relatedTaskId?: string;
    timestamp: Timestamp;
    createdAt?: Timestamp;
}
