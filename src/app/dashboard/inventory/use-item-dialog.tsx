'use client';
import React, { useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { updateInventoryItem } from '@/lib/firebase';
import type { InventoryItem } from '@/lib/types';

type UseItemDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem;
};

export function UseItemDialog({ open, onOpenChange, item }: UseItemDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [quantity, setQuantity] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
        toast({
            variant: "destructive",
            title: "Validation Error",
            description: "Quantity must be a positive number."
        });
        return;
    }
    if (quantity > item.quantity) {
        toast({
            variant: "destructive",
            title: "Insufficient Stock",
            description: `You cannot use more than the available quantity of ${item.quantity}.`
        });
        return;
    }

    const newQuantity = item.quantity - quantity;

    updateInventoryItem(firestore, item.id, { quantity: newQuantity });
    toast({
        title: "Item Used",
        description: `${quantity} unit(s) of ${item.name} have been used.`
    });
    onOpenChange(false);
    setQuantity(1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Use: {item.name}</DialogTitle>
              <DialogDescription>
                  Enter the quantity you are using. There are {item.quantity} available.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="quantity" className="text-right">Quantity Used</Label>
                    <Input id="quantity" type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="col-span-3" required min="1" max={item.quantity} />
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancel</Button>
                </DialogClose>
                <Button type="submit">Confirm Use</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

    