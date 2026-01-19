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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { addResident } from '@/lib/firebase';
import type { Resident } from '@/lib/types';

type AddResidentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AddResidentDialog({ open, onOpenChange }: AddResidentDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const [name, setName] = React.useState('');
  const [roomNumber, setRoomNumber] = React.useState('');
  const [dateOfBirth, setDateOfBirth] = React.useState('');
  const [notes, setNotes] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !roomNumber || !dateOfBirth) {
        toast({
            variant: "destructive",
            title: "Validation Error",
            description: "Name, Room Number and Date of Birth are required."
        });
        return;
    }

    const newResident: Omit<Resident, 'id' | 'createdAt' | 'updatedAt'> = {
        name,
        roomNumber,
        dateOfBirth,
        notes,
    };

    addResident(firestore, newResident);
    toast({
        title: "Resident Added",
        description: `${name} has been added to the system.`
    });
    onOpenChange(false);
    // Reset form
    setName('');
    setRoomNumber('');
    setDateOfBirth('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Add New Resident</DialogTitle>
              <DialogDescription>
                  Fill out the details below for the new resident.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">Name</Label>
                    <Input id="name" value={name} onChange={e => setName(e.target.value)} className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="roomNumber" className="text-right">Room #</Label>
                    <Input id="roomNumber" value={roomNumber} onChange={e => setRoomNumber(e.target.value)} className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="dateOfBirth" className="text-right">Date of Birth</Label>
                    <Input id="dateOfBirth" type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="notes" className="text-right pt-2">Notes</Label>
                    <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} className="col-span-3" placeholder="Any important notes about the resident..."/>
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancel</Button>
                </DialogClose>
                <Button type="submit">Add Resident</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

    