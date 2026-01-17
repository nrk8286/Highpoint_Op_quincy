'use client';
import {
  collection,
  doc,
  addDoc,
  setDoc,
  writeBatch,
  serverTimestamp,
  query,
  where,
  getDocs,
  Firestore,
  updateDoc,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { DailyTask, DeepCleanTask, InventoryItem, User, MaintenanceWorkOrder, MaintenanceStatus } from '@/lib/types';
import { PlaceHolderImages } from './placeholder-images';

const dailyTasksToSeed: Omit<DailyTask, 'id' | 'createdAt' | 'updatedAt' | 'assignedTo'>[] = [
    { roomNumber: 'A1', roomType: 'Daily Clean', status: 'Completed', date: new Date().toISOString().split('T')[0] },
    { roomNumber: 'B1', roomType: 'Daily Clean', status: 'In Progress', date: new Date().toISOString().split('T')[0] },
    { roomNumber: 'C1', roomType: 'Daily Clean', status: 'Pending', date: new Date().toISOString().split('T')[0] },
    { roomNumber: 'D1', roomType: 'Daily Clean', status: 'Pending', date: new Date().toISOString().split('T')[0] },
    { roomNumber: 'A2', roomType: 'Daily Clean', status: 'Declined', date: new Date().toISOString().split('T')[0], notes: 'Resident requested no service today.' },
    { roomNumber: 'B2', roomType: 'Deep Clean', status: 'Overdue', date: new Date(Date.now() - 86400000).toISOString().split('T')[0] }, // Yesterday
    { roomNumber: 'C2', roomType: 'Deep Clean', status: 'Pending', date: new Date().toISOString().split('T')[0] },
];

const deepCleanTasksToSeed: Omit<DeepCleanTask, 'id' | 'createdAt' | 'updatedAt' | 'assignedTo'>[] = [
    { zone: 'Wing A, Floor 1', scheduledDate: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0], status: 'Scheduled'},
    { zone: 'Wing B, Floor 1', scheduledDate: new Date(new Date().setDate(new Date().getDate() + 14)).toISOString().split('T')[0], status: 'Scheduled'},
    { zone: 'Common Area - Lobby', scheduledDate: new Date().toISOString().split('T')[0], status: 'In Progress'},
    { zone: 'Dining Hall', scheduledDate: new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0], status: 'Completed', completedDate: new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0] },
];

const inventoryToSeed: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt' | 'status'>[] = [
    { name: 'All-Purpose Cleaner', category: 'Chemicals', quantity: 15, reorderLevel: 10 },
    { name: 'Paper Towels (Case)', category: 'Supplies', quantity: 30, reorderLevel: 20 },
    { name: 'Trash Bags (Box)', category: 'Supplies', quantity: 5, reorderLevel: 15 },
    { name: 'Floor Buffer', category: 'Equipment', quantity: 2, reorderLevel: 1 },
    { name: 'Microfiber Cloths', category: 'Supplies', quantity: 150, reorderLevel: 100 },
];


export const seedDatabase = async (db: Firestore) => {
  const batch = writeBatch(db);

  // Step 1: Get the UIDs for the housekeepers from the 'users' collection.
  const usersRef = collection(db, 'users');
  const housekeepersQuery = query(usersRef, where('email', 'in', ['housekeeper1@example.com', 'housekeeper2@example.com']));
  
  const querySnapshot = await getDocs(housekeepersQuery);

  let audreyId: string | undefined;
  let hannahId: string | undefined;

  querySnapshot.forEach((doc) => {
    const user = doc.data() as User;
    if (user.email === 'housekeeper1@example.com') {
      audreyId = user.id;
    }
    if (user.email === 'housekeeper2@example.com') {
      hannahId = user.id;
    }
  });

  // Guard against missing users.
  if (!audreyId || !hannahId) {
    throw new Error("Seeding failed: Could not find housekeeper profiles. Please ensure 'housekeeper1@example.com' and 'housekeeper2@example.com' have logged into the application at least once before seeding the database.");
  }


  // Step 2: Seed tasks and assign them using the retrieved UIDs.
  dailyTasksToSeed.forEach((task) => {
    const taskRef = doc(collection(db, 'daily_tasks'));
    let assignedTo = audreyId; // Default
    if (task.roomNumber.startsWith('B') || task.roomNumber.startsWith('C')) {
        assignedTo = hannahId;
    }
    batch.set(taskRef, { ...task, assignedTo, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  });

  deepCleanTasksToSeed.forEach((task, index) => {
    const taskRef = doc(collection(db, 'deep_clean_tasks'));
    const assignedTo = index % 2 === 0 ? audreyId : hannahId;
    batch.set(taskRef, { ...task, assignedTo, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  });

  inventoryToSeed.forEach((item) => {
    const itemRef = doc(collection(db, 'inventory'));
    batch.set(itemRef, { ...item, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  });

  await batch.commit();
};

export function addWorkOrder(db: Firestore, workOrder: Omit<MaintenanceWorkOrder, 'id' | 'createdAt' | 'updatedAt'>) {
    const workOrderRef = collection(db, 'maintenance_work_orders');
    addDoc(workOrderRef, { ...workOrder, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: workOrderRef.path,
                operation: 'create',
                requestResourceData: workOrder,
            });
            errorEmitter.emit('permission-error', permissionError);
            throw permissionError;
        });
}

export function addTask(db: Firestore, task: Omit<DailyTask, 'id' | 'createdAt' | 'updatedAt'>) {
    const taskRef = collection(db, 'daily_tasks');
    addDoc(taskRef, { ...task, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: taskRef.path,
          operation: 'create',
          requestResourceData: task,
        });
        errorEmitter.emit('permission-error', permissionError);
        throw permissionError;
      });
}

export function updateTask(db: Firestore, taskId: string, data: Partial<Omit<DailyTask, 'id'>>) {
    const taskRef = doc(db, 'daily_tasks', taskId);
    updateDoc(taskRef, { ...data, updatedAt: serverTimestamp() })
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: taskRef.path,
                operation: 'update',
                requestResourceData: data,
            });
            errorEmitter.emit('permission-error', permissionError);
            throw permissionError;
        });
}

export function updateWorkOrder(db: Firestore, workOrderId: string, data: Partial<Omit<MaintenanceWorkOrder, 'id'>>) {
    const workOrderRef = doc(db, 'maintenance_work_orders', workOrderId);
    updateDoc(workOrderRef, { ...data, updatedAt: serverTimestamp() })
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: workOrderRef.path,
                operation: 'update',
                requestResourceData: data,
            });
            errorEmitter.emit('permission-error', permissionError);
            throw permissionError;
        });
}

export function addItem(db: Firestore, item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt' | 'status'>) {
    const itemRef = collection(db, 'inventory');
    addDoc(itemRef, { ...item, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: itemRef.path,
          operation: 'create',
          requestResourceData: item,
        });
        errorEmitter.emit('permission-error', permissionError);
        throw permissionError;
      });
}
