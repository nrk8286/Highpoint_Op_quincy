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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser } from '@/firebase';
import { addInspection } from '@/lib/firebase';
import type { Inspection, InspectionStatus } from '@/lib/types';

type AddInspectionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const inspectionStatuses: InspectionStatus[] = ["Pass", "Fail", "Corrective Action Required"];

export function AddInspectionDialog({ open, onOpenChange }: AddInspectionDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const [location, setLocation] = React.useState('');
  const [status, setStatus] = React.useState<InspectionStatus>('Pass');
  const [notes, setNotes] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!location || !user) {
        toast({
            variant: "destructive",
            title: "Validation Error",
            description: "Location is required."
        });
        return;
    }

    const newInspection: Omit<Inspection, 'id' | 'createdAt' | 'updatedAt'> = {
        location,
        status,
        notes,
        inspectorId: user.id,
        date: new Date().toISOString(),
    };

    addInspection(firestore, newInspection);
    toast({
        title: "Inspection Logged",
        description: `An inspection for ${location} has been created.`
    });
    onOpenChange(false);
    setLocation('');
    setStatus('Pass');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Log New Inspection</DialogTitle>
              <DialogDescription>
                  Fill out the details below to log a new quality control inspection.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="location" className="text-right">Location</Label>
                    <Input id="location" value={location} onChange={e => setLocation(e.target.value)} className="col-span-3" required placeholder="e.g., Room A1, Lobby" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="status" className="text-right">Status</Label>
                    <Select value={status} onValueChange={(value: InspectionStatus) => setStatus(value)}>
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Select a status" />
                        </SelectTrigger>
                        <SelectContent>
                            {inspectionStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="notes" className="text-right pt-2">Notes</Label>
                    <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} className="col-span-3" placeholder="Describe any findings or actions taken."/>
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancel</Button>
                </DialogClose>
                <Button type="submit">Log Inspection</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
