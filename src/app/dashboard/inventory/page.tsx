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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { inventoryItems } from '@/lib/data';
import type { InventoryItem } from '@/lib/types';
import { AlertTriangle, CheckCircle, PackagePlus, ShieldAlert } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const getStatusBadge = (status: InventoryItem['status']) => {
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
  return (
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
          <Button><PackagePlus className="mr-2 h-4 w-4"/>Add Item</Button>
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
              {inventoryItems.map((item) => (
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
                  <TableCell>{getStatusBadge(item.status)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm">Reorder</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
