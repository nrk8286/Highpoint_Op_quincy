'use client';
import React, { useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InventoryItem } from '@/lib/types';
import { AlertTriangle, CheckCircle, PackagePlus, ShieldAlert, MoreHorizontal } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { AddItemDialog } from './add-item-dialog';
import { UseItemDialog } from './use-item-dialog';
import { RestockItemDialog } from './restock-item-dialog';

const getStatus = (item: InventoryItem) => {
    if (item.quantity <= 0) return 'Out of Stock';
    if (item.quantity <= item.reorderLevel) return 'Low Stock';
    return 'In Stock';
}

const getStatusBadge = (status: 'In Stock' | 'Low Stock' | 'Out of Stock') => {
    switch (status) {
        case 'In Stock':
            return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300"><CheckCircle className="mr-1 h-3 w-3"/>In Stock</Badge>;
        case 'Low Stock':
            return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300"><AlertTriangle className="mr-1 h-3 w-3"/>Low Stock</Badge>;
        case 'Out of Stock':
            return <Badge variant="destructive"><ShieldAlert className="mr-1 h-3 w-3"/>Out of Stock</Badge>;
        default:
            return <Badge>{status}</Badge>
    }
}

export default function InventoryPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    const [showAddItemDialog, setShowAddItemDialog] = useState(false);
    const [showUseItemDialog, setShowUseItemDialog] = useState(false);
    const [showRestockItemDialog, setShowRestockItemDialog] = useState(false);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

    const queryRef = useMemo(() => query(collection(firestore, 'inventory'), orderBy('createdAt', 'desc')), [firestore]);
    const { data: inventoryItems, loading } = useCollection<InventoryItem>(queryRef);
    const canManageInventory = user?.role === 'Admin' || user?.role === 'Supervisor' || user?.role === 'Director' || user?.role === 'Administrator';

    const handleUseItem = (item: InventoryItem) => {
      setSelectedItem(item);
      setShowUseItemDialog(true);
    }
    
    const handleRestockItem = (item: InventoryItem) => {
      setSelectedItem(item);
      setShowRestockItemDialog(true);
    }

  return (
    <>
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Inventory Management</h1>
        <p className="text-muted-foreground">Track cleaning supplies and equipment status in real-time.</p>
      </div>

      <Card>
        <CardHeader className="flex-row justify-between items-center">
          <div>
            <CardTitle>Supply Levels</CardTitle>
            <CardDescription>Automated alerts are triggered at threshold levels.</CardDescription>
          </div>
          {canManageInventory && (
            <Button onClick={() => setShowAddItemDialog(true)}><PackagePlus className="mr-2 h-4 w-4"/>Add Item</Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead className="w-[200px]">Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                    <TableCell colSpan={6} className="text-center">Loading inventory...</TableCell>
                </TableRow>
              )}
              {inventoryItems?.map((item) => {
                const status = getStatus(item);
                return (
                    <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2">
                            <Progress value={(item.quantity / (item.reorderLevel * 2)) * 100} className="h-2"/>
                            <span className="text-xs text-muted-foreground">{item.quantity} / {item.reorderLevel * 2}</span>
                        </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(status)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            aria-haspopup="true"
                            size="icon"
                            variant="ghost"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onSelect={() => handleUseItem(item)}>Use Item</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleRestockItem(item)}>Restock Item</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    </TableRow>
                )
              })}
              {inventoryItems?.length === 0 && !loading && (
                <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">No inventory items found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
    {canManageInventory && <AddItemDialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog} />}
    {selectedItem && <UseItemDialog open={showUseItemDialog} onOpenChange={setShowUseItemDialog} item={selectedItem} />}
    {selectedItem && <RestockItemDialog open={showRestockItemDialog} onOpenChange={setShowRestockItemDialog} item={selectedItem} />}
    </>
  );
}

    