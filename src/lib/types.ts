import { Timestamp } from 'firebase/firestore';

export type UserRole = 'Admin' | 'Supervisor' | 'Housekeeper' | 'Director' | 'Administrator';

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

export interface Inspection {
    id: string;
    roomId: string;
    inspectorId: string; // User ID
    date: string;
    status: 'Pass' | 'Fail' | 'Corrective Action';
    notes: string;
    photoUrl?: string;
    createdAt?: Timestamp;
}
