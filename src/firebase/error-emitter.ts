'use client';

import type { FirestorePermissionError } from './errors';

type Listener = (error: FirestorePermissionError) => void;

type EventName = 'permission-error';

class ErrorEmitter {
  private listeners: { [key: string]: Listener[] } = {};

  on(eventName: EventName, listener: Listener) {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push(listener);
  }

  off(eventName: EventName, listener: Listener) {
    if (!this.listeners[eventName]) {
      return;
    }
    this.listeners[eventName] = this.listeners[eventName].filter(
      (l) => l !== listener
    );
  }

  emit(eventName: EventName, error: FirestorePermissionError) {
    if (!this.listeners[eventName]) {
      return;
    }
    this.listeners[eventName].forEach((listener) => listener(error));
  }
}

export const errorEmitter = new ErrorEmitter();
