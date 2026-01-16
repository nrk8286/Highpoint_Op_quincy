import type { DailyTask, DeepCleanTask, InventoryItem, User, UserRole, Inspection } from './types';
import { PlaceHolderImages } from './placeholder-images';

const avatar1 = PlaceHolderImages.find(i => i.id === 'avatar-1')?.imageUrl || '';
const avatar2 = PlaceHolderImages.find(i => i.id === 'avatar-2')?.imageUrl || '';
const avatar3 = PlaceHolderImages.find(i => i.id === 'avatar-3')?.imageUrl || '';

export const users: User[] = [
  { id: 'user-1', name: 'Sarah Johnson', email: 's.johnson@example.com', role: 'Supervisor', avatarUrl: avatar1 },
  { id: 'user-2', name: 'Mike Williams', email: 'm.williams@example.com', role: 'Housekeeper', avatarUrl: avatar2 },
  { id: 'user-3', name: 'Jessica Brown', email: 'j.brown@example.com', role: 'Housekeeper', avatarUrl: avatar3 },
  { id: 'user-4', name: 'Admin User', email: 'admin@example.com', role: 'Admin', avatarUrl: avatar1 },
];

export const currentUser = users[0]; // Mock current user as Supervisor

export const dailyTasks: DailyTask[] = [
  { id: 'task-1', roomNumber: '101', roomType: 'Standard', assignedTo: 'user-2', status: 'Completed', date: '2023-10-26' },
  { id: 'task-2', roomNumber: '102', roomType: 'Suite', assignedTo: 'user-2', status: 'In Progress', date: '2023-10-26' },
  { id: 'task-3', roomNumber: '103', roomType: 'Standard', assignedTo: 'user-3', status: 'Pending', date: '2023-10-26' },
  { id: 'task-4', roomNumber: '201', roomType: 'Standard', assignedTo: 'user-3', status: 'Pending', date: '2023-10-26' },
  { id: 'task-5', roomNumber: '202', roomType: 'Deluxe', assignedTo: 'user-2', status: 'Declined', date: '2023-10-26', notes: 'Resident requested no service today.' },
  { id: 'task-6', roomNumber: '305', roomType: 'Suite', assignedTo: 'user-3', status: 'Overdue', date: '2023-10-25' },
];

export const deepCleanTasks: DeepCleanTask[] = [
    { id: 'dc-1', zone: 'Floor 1 - West Wing', scheduledDate: '2023-11-05', status: 'Scheduled', assignedTo: 'user-2' },
    { id: 'dc-2', zone: 'Floor 2 - Common Areas', scheduledDate: '2023-11-12', status: 'Scheduled', assignedTo: 'user-3' },
    { id: 'dc-3', zone: 'Floor 3 - East Wing', scheduledDate: '2023-10-20', status: 'Completed', completedDate: '2023-10-19', assignedTo: 'user-2' },
];

export const inventoryItems: InventoryItem[] = [
  { id: 'inv-1', name: 'All-Purpose Cleaner', category: 'Chemicals', quantity: 15, reorderLevel: 10, status: 'Low Stock' },
  { id: 'inv-2', name: 'Paper Towels (Case)', category: 'Supplies', quantity: 30, reorderLevel: 20, status: 'In Stock' },
  { id: 'inv-3', name: 'Trash Bags (Box)', category: 'Supplies', quantity: 5, reorderLevel: 15, status: 'Low Stock' },
  { id: 'inv-4', name: 'Floor Buffer', category: 'Equipment', quantity: 2, reorderLevel: 1, status: 'In Stock' },
  { id: 'inv-5', name: 'Microfiber Cloths', category: 'Supplies', quantity: 150, reorderLevel: 100, status: 'In Stock' },
];

export const inspections: Inspection[] = [
    { id: 'insp-1', roomId: '101', inspectorId: 'user-1', date: '2023-10-26', status: 'Pass', notes: 'Excellent work.' },
    { id: 'insp-2', roomId: '205', inspectorId: 'user-1', date: '2023-10-25', status: 'Fail', notes: 'Dust found on top of wardrobe. Streaks on mirror.' },
    { id: 'insp-3', roomId: '301', inspectorId: 'user-1', date: '2023-10-25', status: 'Corrective Action', notes: 'Trash was missed. Action taken by staff.' },
];
