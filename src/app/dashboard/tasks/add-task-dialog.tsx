'use client';
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { addTask } from '@/lib/firebase';
import type { DailyTask, User } from '@/lib/types';

type AddTaskDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  housekeepers: User[];
};

export function AddTaskDialog({ open, onOpenChange, housekeepers }: AddTaskDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [roomNumber, setRoomNumber] = React.useState('');
  const [roomType, setRoomType] = React.useState('Daily Clean');
  const [assignedTo, setAssignedTo] = React.useState<string>('');
  const [notes, setNotes] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNumber || !assignedTo) {
        toast({
            variant: "destructive",
            title: "Validation Error",
            description: "Room Number and Assigned To are required."
        });
        return;
    }

    const newTask: Omit<DailyTask, 'id' | 'createdAt' | 'updatedAt'> = {
        roomNumber,
        roomType,
        assignedTo,
        status: 'Pending',
        date: new Date().toISOString().split('T')[0], // Today's date
        notes,
    };

    try {
        await addTask(firestore, newTask);
        toast({
            title: "Task Created",
            description: `Task for room ${roomNumber} has been assigned.`
        });
        onOpenChange(false);
        // Reset form
        setRoomNumber('');
        setRoomType('Daily Clean');
        setAssignedTo('');
        setNotes('');
    } catch(error) {
        console.error("Error adding task: ", error);
        // Error is handled by global error listener
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Add New Task</DialogTitle>
              <DialogDescription>
                  Enter the details for the new task below.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="roomNumber" className="text-right">
                    Room #
                    </Label>
                    <Input id="roomNumber" value={roomNumber} onChange={e => setRoomNumber(e.target.value)} className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="roomType" className="text-right">
                    Type
                    </Label>
                    <Select value={roomType} onValueChange={(value) => setRoomType(value)}>
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Select a type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Daily Clean">Daily Clean</SelectItem>
                            <SelectItem value="Deep Clean">Deep Clean</SelectItem>
                            <SelectItem value="Maintenance">Maintenance</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="assignedTo" className="text-right">
                        Assign To
                    </Label>
                    <Select value={assignedTo} onValueChange={(value) => setAssignedTo(value)}>
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Select a housekeeper" />
                        </SelectTrigger>
                        <SelectContent>
                            {housekeepers.map(hk => (
                                <SelectItem key={hk.id} value={hk.id}>{hk.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="notes" className="text-right">
                    Notes
                    </Label>
                    <Input id="notes" value={notes} onChange={e => setNotes(e.target.value)} className="col-span-3" />
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="secondary">
                        Cancel
                    </Button>
                </DialogClose>
                <Button type="submit">Create Task</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
