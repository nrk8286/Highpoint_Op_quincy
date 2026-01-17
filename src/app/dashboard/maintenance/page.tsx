'use client';
import React, { useMemo } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection, useFirestore, useUser } from '@/firebase';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wrench, ShieldAlert, MoreHorizontal } from 'lucide-react';
import { MaintenanceWorkOrder, MaintenanceStatus, MaintenancePriority, User } from '@/lib/types';
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
import { AddWorkOrderDialog } from './add-work-order-dialog';
import { updateWorkOrder } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

const getStatusBadge = (status: MaintenanceStatus) => {
  const variantMap: { [key in MaintenanceStatus]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
    'Completed': 'default',
    'In Progress': 'secondary',
    'Open': 'outline',
    'On Hold': 'destructive',
  };
  return <Badge variant={variantMap[status]} className="capitalize">{status}</Badge>;
};

const getPriorityBadge = (priority: MaintenancePriority) => {
    if (priority === 'Urgent' || priority === 'High') {
        return <Badge variant="destructive" className="capitalize gap-1"><ShieldAlert className="h-3 w-3"/>{priority}</Badge>;
    }
    return <Badge variant="secondary" className="capitalize">{priority}</Badge>;
}


export default function MaintenancePage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = React.useState(false);

  const workOrdersQuery = useMemo(() => query(collection(firestore, 'maintenance_work_orders'), orderBy('createdAt', 'desc')), [firestore]);
  const usersQuery = useMemo(() => query(collection(firestore, 'users')), [firestore]);

  const { data: workOrders, loading: workOrdersLoading } = useCollection<MaintenanceWorkOrder>(workOrdersQuery);
  const { data: users, loading: usersLoading } = useCollection<User>(usersQuery);

  const usersMap = useMemo(() => {
    if (!users) return new Map();
    return new Map(users.map(u => [u.id, u.name]));
  }, [users]);
  
  const maintenanceStaff = useMemo(() => users?.filter(u => u.role === 'Maintenance') || [], [users]);

  const canManageWorkOrders = useMemo(() => {
    if (!user) return false;
    const managerRoles: User['role'][] = ['Admin', 'Supervisor', 'Director', 'Administrator'];
    return managerRoles.includes(user.role) || user.role === 'Maintenance';
  }, [user]);

  const handleUpdateStatus = (workOrderId: string, status: MaintenanceStatus) => {
    try {
      updateWorkOrder(firestore, workOrderId, { status });
      toast({
        title: 'Work Order Updated',
        description: `Work order status has been set to ${status}.`
      });
    } catch(error) {
      // Error is handled by global error listener via the Firebase module
    }
  };

  return (
    <>
    <div className="space-y-8">
       <div>
        <h1 className="text-3xl font-bold font-headline">Maintenance Work Orders</h1>
        <p className="text-muted-foreground">Track and manage all facility maintenance tickets.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>All Work Orders</CardTitle>
            <CardDescription>A log of all open, in-progress, and completed tickets.</CardDescription>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Wrench className="mr-2 h-4 w-4" />
            Create Work Order
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Location</TableHead>
                <TableHead>Issue Type</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead className="max-w-[200px]">Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(workOrdersLoading || usersLoading) && (
                <TableRow>
                    <TableCell colSpan={7} className="text-center">Loading work orders...</TableCell>
                </TableRow>
              )}
              {workOrders?.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.location}</TableCell>
                  <TableCell>{order.issueType}</TableCell>
                  <TableCell>{getPriorityBadge(order.priority)}</TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell>{usersMap.get(order.assignedTo || '') || 'Unassigned'}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{order.description}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          aria-haspopup="true"
                          size="icon"
                          variant="ghost"
                          disabled={!canManageWorkOrders}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                        {order.status !== 'In Progress' && (
                          <DropdownMenuItem onSelect={() => handleUpdateStatus(order.id, 'In Progress')}>
                            Start Work
                          </DropdownMenuItem>
                        )}
                        {order.status !== 'On Hold' && (
                           <DropdownMenuItem onSelect={() => handleUpdateStatus(order.id, 'On Hold')}>
                            Place on Hold
                          </DropdownMenuItem>
                        )}
                        {order.status !== 'Completed' && (
                          <DropdownMenuItem onSelect={() => handleUpdateStatus(order.id, 'Completed')}>
                            Complete Work Order
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {workOrders?.length === 0 && !workOrdersLoading && (
                <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">No work orders found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
    {<AddWorkOrderDialog open={showAddDialog} onOpenChange={setShowAddDialog} maintenanceStaff={maintenanceStaff} />}
    </>
  );
}
