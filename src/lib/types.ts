import { Timestamp } from 'firebase/firestore';

export type UserRole = 'Admin' | 'Supervisor' | 'Housekeeper' | 'Director' | 'Administrator' | 'Maintenance';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string;
  createdAt?: Timestamp;
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
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface DeepCleanTask {
  id: string;
  zone: string;
  scheduledDate: string;
  completedDate?: string;
  assignedTo: string; // User ID
  status: 'Scheduled' | 'In Progress' | 'Completed';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  reorderLevel: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
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
    createdAt?: Timestamp;
}
