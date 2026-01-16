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
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { addItem } from '@/lib/firebase';
import type { InventoryItem } from '@/lib/types';

type AddItemDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AddItemDialog({ open, onOpenChange }: AddItemDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [name, setName] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [quantity, setQuantity] = React.useState(0);
  const [reorderLevel, setReorderLevel] = React.useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !category || quantity < 0 || reorderLevel < 0) {
        toast({
            variant: "destructive",
            title: "Validation Error",
            description: "Please fill out all fields with valid values."
        });
        return;
    }

    const newItem: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt' | 'status'> = {
        name,
        category,
        quantity,
        reorderLevel,
    };

    try {
        await addItem(firestore, newItem);
        toast({
            title: "Item Added",
            description: `${name} has been added to the inventory.`
        });
        onOpenChange(false);
        // Reset form
        setName('');
        setCategory('');
        setQuantity(0);
        setReorderLevel(0);
    } catch(error) {
        console.error("Error adding item: ", error);
        // Error is handled by global error listener
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Add Inventory Item</DialogTitle>
              <DialogDescription>
                  Enter the details for the new inventory item.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">Name</Label>
                    <Input id="name" value={name} onChange={e => setName(e.target.value)} className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="category" className="text-right">Category</Label>
                    <Input id="category" value={category} onChange={e => setCategory(e.target.value)} className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="quantity" className="text-right">Quantity</Label>
                    <Input id="quantity" type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="reorderLevel" className="text-right">Reorder Level</Label>
                    <Input id="reorderLevel" type="number" value={reorderLevel} onChange={e => setReorderLevel(Number(e.target.value))} className="col-span-3" required />
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancel</Button>
                </DialogClose>
                <Button type="submit">Add Item</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
