import type { DailyTask, DeepCleanTask, InventoryItem, User, UserRole, Inspection } from './types';
import { PlaceHolderImages } from './placeholder-images';

const avatar1 = PlaceHolderImages.find(i => i.id === 'avatar-1')?.imageUrl || '';
const avatar2 = PlaceHolderImages.find(i => i.id === 'avatar-2')?.imageUrl || '';
const avatar3 = PlaceHolderImages.find(i => i.id === 'avatar-3')?.imageUrl || '';

export const users: User[] = [
  { id: 'user-1', name: 'Sarah Johnson', email: 's.johnson@example.com', role: 'Supervisor', avatarUrl: avatar1 },
  { id: 'user-2', name: 'Audry Meadows', email: 'a.meadows@example.com', role: 'Housekeeper', avatarUrl: avatar2 },
  { id: 'user-3', name: 'Hannah Steele', email: 'h.steele@example.com', role: 'Housekeeper', avatarUrl: avatar3 },
  { id: 'user-4', name: 'Admin User', email: 'admin@example.com', role: 'Admin', avatarUrl: avatar1 },
];

export const currentUser = users[0]; // Mock current user as Supervisor

export const dailyTasks: DailyTask[] = [
  { id: 'task-1', roomNumber: 'A1', roomType: 'Daily Clean', assignedTo: 'user-2', status: 'Completed', date: '2023-10-26' },
  { id: 'task-2', roomNumber: 'B1', roomType: 'Daily Clean', assignedTo: 'user-3', status: 'In Progress', date: '2023-10-26' },
  { id: 'task-3', roomNumber: 'C1', roomType: 'Daily Clean', assignedTo: 'user-3', status: 'Pending', date: '2023-10-26' },
  { id: 'task-4', roomNumber: 'D1', roomType: 'Daily Clean', assignedTo: 'user-2', status: 'Pending', date: '2023-10-26' },
  { id: 'task-5', roomNumber: 'A2', roomType: 'Daily Clean', assignedTo: 'user-2', status: 'Declined', date: '2023-10-26', notes: 'Resident requested no service today.' },
  { id: 'task-6', roomNumber: 'B2', roomType: 'Deep Clean', assignedTo: 'user-3', status: 'Overdue', date: '2023-10-25' },
  { id: 'task-7', roomNumber: 'C2', roomType: 'Deep Clean', assignedTo: 'user-3', status: 'Pending', date: '2023-10-26' },
];

export const deepCleanTasks: DeepCleanTask[] = [
    { id: 'dc-1', zone: 'Side A', scheduledDate: '2023-11-05', status: 'Scheduled', assignedTo: 'user-2' },
    { id: 'dc-2', zone: 'Side B', scheduledDate: '2023-11-12', status: 'Scheduled', assignedTo: 'user-3' },
    { id: 'dc-3', zone: 'Side C', scheduledDate: '2023-10-20', status: 'Completed', completedDate: '2023-10-19', assignedTo: 'user-3' },
    { id: 'dc-4', zone: 'Side D', scheduledDate: '2023-12-01', status: 'Scheduled', assignedTo: 'user-2' },
];

export const inventoryItems: InventoryItem[] = [
  { id: 'inv-1', name: 'All-Purpose Cleaner', category: 'Chemicals', quantity: 15, reorderLevel: 10, status: 'Low Stock' },
  { id: 'inv-2', name: 'Paper Towels (Case)', category: 'Supplies', quantity: 30, reorderLevel: 20, status: 'In Stock' },
  { id: 'inv-3', name: 'Trash Bags (Box)', category: 'Supplies', quantity: 5, reorderLevel: 15, status: 'Low Stock' },
  { id: 'inv-4', name: 'Floor Buffer', category: 'Equipment', quantity: 2, reorderLevel: 1, status: 'In Stock' },
  { id: 'inv-5', name: 'Microfiber Cloths', category: 'Supplies', quantity: 150, reorderLevel: 100, status: 'In Stock' },
];

export const inspections: Inspection[] = [
    { id: 'insp-1', roomId: 'A1', inspectorId: 'user-1', date: '2023-10-26', status: 'Pass', notes: 'Excellent work.' },
    { id: 'insp-2', roomId: 'B2', inspectorId: 'user-1', date: '2023-10-25', status: 'Fail', notes: 'Dust found on top of wardrobe. Streaks on mirror.' },
    { id: 'insp-3', roomId: 'C1', inspectorId: 'user-1', date: '2023-10-25', status: 'Corrective Action', notes: 'Trash was missed. Action taken by staff.' },
];
