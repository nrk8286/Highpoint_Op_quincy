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
import { addShiftReport } from '@/lib/firebase';
import type { ShiftReport, Resident, Shift } from '@/lib/types';

type AddShiftReportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resident: Resident;
};

const shifts: Shift[] = ["Day", "Evening", "Night"];

export function AddShiftReportDialog({ open, onOpenChange, resident }: AddShiftReportDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const [shift, setShift] = React.useState<Shift>('Day');
  const [reportText, setReportText] = React.useState('');


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportText || !user) {
        toast({
            variant: "destructive",
            title: "Validation Error",
            description: "Report text is required."
        });
        return;
    }

    const newReport: Omit<ShiftReport, 'id' | 'createdAt' | 'updatedAt'> = {
        residentId: resident.id,
        authorId: user.id,
        shift,
        date: new Date().toISOString(),
        reportText,
    };

    addShiftReport(firestore, newReport);
    toast({
        title: "Shift Report Added",
        description: `A new report for ${resident.name} has been logged.`
    });
    onOpenChange(false);
    setShift('Day');
    setReportText('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>New Shift Report for {resident.name}</DialogTitle>
              <DialogDescription>
                  Fill out the report details below.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="shift" className="text-right">Shift</Label>
                    <Select value={shift} onValueChange={(value: Shift) => setShift(value)}>
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Select a shift" />
                        </SelectTrigger>
                        <SelectContent>
                            {shifts.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="reportText" className="text-right pt-2">Report</Label>
                    <Textarea id="reportText" value={reportText} onChange={e => setReportText(e.target.value)} className="col-span-3" required placeholder="Enter shift report details..."/>
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancel</Button>
                </DialogClose>
                <Button type="submit">Log Report</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

    