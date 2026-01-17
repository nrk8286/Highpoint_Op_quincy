'use client';
import React, { useMemo } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection, useFirestore, useUser } from '@/firebase';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wrench, ShieldAlert } from 'lucide-react';
import { MaintenanceWorkOrder, MaintenanceStatus, MaintenancePriority, User } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AddWorkOrderDialog } from './add-work-order-dialog';

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
                <TableHead>Created By</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Description</TableHead>
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
                  <TableCell>{usersMap.get(order.createdBy) || 'Unknown'}</TableCell>
                  <TableCell>{usersMap.get(order.assignedTo || '') || 'Unassigned'}</TableCell>
                  <TableCell className="max-w-[300px] truncate">{order.description}</TableCell>
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
