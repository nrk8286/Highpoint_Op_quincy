import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Timestamp, FieldValue } from "firebase/firestore"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatFirestoreTimestamp(timestamp: Timestamp | FieldValue | undefined, format: string = 'HH:mm'): string {
  if (!timestamp) return 'N/A'
  if (timestamp instanceof Timestamp) {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(timestamp.toDate())
  }
  return 'N/A'
}
