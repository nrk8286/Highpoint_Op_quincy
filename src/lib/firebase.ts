'use client';
import {
  collection,
  doc,
  addDoc,
  setDoc,
  writeBatch,
  serverTimestamp,
  Firestore,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { DailyTask, DeepCleanTask, InventoryItem, User } from '@/lib/types';
import { PlaceHolderImages } from './placeholder-images';

// --- Seed Data based on High Point Residence Spec ---

const usersToSeed: Omit<User, 'id' | 'createdAt'>[] = [
    { name: 'Sarah Johnson', email: 'supervisor@example.com', role: 'Supervisor', avatarUrl: PlaceHolderImages.find(i => i.id === 'avatar-1')?.imageUrl || '' },
    { name: 'Audry Meadows', email: 'housekeeper1@example.com', role: 'Housekeeper', avatarUrl: PlaceHolderImages.find(i => i.id === 'avatar-2')?.imageUrl || '' },
    { name: 'Hannah Steele', email: 'housekeeper2@example.com', role: 'Housekeeper', avatarUrl: PlaceHolderImages.find(i => i.id === 'avatar-3')?.imageUrl || '' },
    { name: 'Admin User', email: 'admin@example.com', role: 'Admin', avatarUrl: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwyfHxwb3J0cmFpdHxlbnwwfHx8fDE3Njg1NjQxMDZ8MA&ixlib=rb-4.1.0&q=80&w=1080' },
];
  
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

  // Note: This does not create Firebase Auth users. You must create them in the Firebase Console.
  const userIds: { [key: string]: string } = {};
  usersToSeed.forEach((user) => {
    const userId = `${user.email.split('@')[0]}-id`;
    userIds[user.email] = userId;
    const userRef = doc(db, 'users', userId);
    batch.set(userRef, { ...user, id: userId, createdAt: serverTimestamp() });
  });

  const audreyId = userIds['housekeeper1@example.com'];
  const hannahId = userIds['housekeeper2@example.com'];

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

export function addUser(db: Firestore, user: Omit<User, 'id' | 'createdAt'>) {
    // This is a mock implementation. Creating a Firebase Auth user requires a backend function (e.g., a Genkit flow or Cloud Function).
    // This function only adds the user to the 'users' collection in Firestore, so they will appear in the list,
    // but they will NOT be able to log in.
    const userRef = doc(collection(db, 'users'));
    setDoc(userRef, { ...user, id: userRef.id, createdAt: serverTimestamp() })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: userRef.path,
          operation: 'create',
          requestResourceData: user,
        });
        errorEmitter.emit('permission-error', permissionError);
        throw permissionError;
      });
}
