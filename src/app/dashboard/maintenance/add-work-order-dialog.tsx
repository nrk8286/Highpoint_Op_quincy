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
import { addWorkOrder } from '@/lib/firebase';
import type { MaintenanceWorkOrder, MaintenanceIssueType, MaintenancePriority, User } from '@/lib/types';

type AddWorkOrderDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maintenanceStaff: User[];
};

const issueTypes: MaintenanceIssueType[] = ["Plumbing", "Electrical", "HVAC", "Painting", "General Repair"];
const priorities: MaintenancePriority[] = ["Low", "Medium", "High", "Urgent"];

export function AddWorkOrderDialog({ open, onOpenChange, maintenanceStaff }: AddWorkOrderDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const [location, setLocation] = React.useState('');
  const [issueType, setIssueType] = React.useState<MaintenanceIssueType>('General Repair');
  const [priority, setPriority] = React.useState<MaintenancePriority>('Medium');
  const [description, setDescription] = React.useState('');
  const [assignedTo, setAssignedTo] = React.useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location || !description || !user) {
        toast({
            variant: "destructive",
            title: "Validation Error",
            description: "Location and Description are required."
        });
        return;
    }

    const newWorkOrder: Omit<MaintenanceWorkOrder, 'id' | 'createdAt' | 'updatedAt'> = {
        location,
        issueType,
        priority,
        description,
        status: 'Open',
        createdBy: user.id,
        assignedTo: assignedTo || undefined,
    };

    try {
        addWorkOrder(firestore, newWorkOrder);
        toast({
            title: "Work Order Created",
            description: `A new maintenance ticket has been created for ${location}.`
        });
        onOpenChange(false);
        // Reset form
        setLocation('');
        setIssueType('General Repair');
        setPriority('Medium');
        setDescription('');
        setAssignedTo('');
    } catch(error) {
        console.error("Error adding work order: ", error);
        // Error is handled by global error listener
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Create Maintenance Work Order</DialogTitle>
              <DialogDescription>
                  Fill out the details below to submit a new maintenance ticket.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="location" className="text-right">Location</Label>
                    <Input id="location" value={location} onChange={e => setLocation(e.target.value)} className="col-span-3" required placeholder="e.g., Room A1, Lobby" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="issueType" className="text-right">Issue Type</Label>
                    <Select value={issueType} onValueChange={(value: MaintenanceIssueType) => setIssueType(value)}>
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Select an issue type" />
                        </SelectTrigger>
                        <SelectContent>
                            {issueTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="priority" className="text-right">Priority</Label>
                    <Select value={priority} onValueChange={(value: MaintenancePriority) => setPriority(value)}>
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Select a priority level" />
                        </SelectTrigger>
                        <SelectContent>
                             {priorities.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="assignedTo" className="text-right">Assign To</Label>
                    <Select value={assignedTo} onValueChange={(value) => setAssignedTo(value)}>
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                            {maintenanceStaff.map(staff => (
                                <SelectItem key={staff.id} value={staff.id}>{staff.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="description" className="text-right pt-2">Description</Label>
                    <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} className="col-span-3" required placeholder="Describe the issue in detail."/>
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancel</Button>
                </DialogClose>
                <Button type="submit">Create Ticket</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
