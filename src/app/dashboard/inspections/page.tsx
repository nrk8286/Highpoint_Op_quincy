'use client';
import React, { useMemo } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClipboardCheck, PlusCircle } from 'lucide-react';
import { Inspection, User, InspectionStatus } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AddInspectionDialog } from './add-inspection-dialog';
import { format } from 'date-fns';

const getStatusBadge = (status: InspectionStatus) => {
  const variantMap: { [key in InspectionStatus]: 'default' | 'secondary' | 'destructive' } = {
    'Pass': 'default',
    'Fail': 'destructive',
    'Corrective Action Required': 'secondary',
  };
  return <Badge variant={variantMap[status]} className="capitalize">{status}</Badge>;
};

export default function InspectionsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [showAddDialog, setShowAddDialog] = React.useState(false);

  const inspectionsQuery = useMemo(() => query(collection(firestore, 'inspections'), orderBy('date', 'desc')), [firestore]);
  const usersQuery = useMemo(() => query(collection(firestore, 'users')), [firestore]);

  const { data: inspections, loading: inspectionsLoading } = useCollection<Inspection>(inspectionsQuery);
  const { data: users, loading: usersLoading } = useCollection<User>(usersQuery);

  const usersMap = useMemo(() => {
    if (!users) return new Map();
    return new Map(users.map(u => [u.id, u.name]));
  }, [users]);
  
  const canManage = user?.role === 'Admin' || user?.role === 'Supervisor' || user?.role === 'Director' || user?.role === 'Administrator';

  return (
    <>
      <div className="space-y-8">
         <div>
          <h1 className="text-3xl font-bold font-headline">Quality Control Inspections</h1>
          <p className="text-muted-foreground">Monitor and document quality assurance checks.</p>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>All Inspections</CardTitle>
              <CardDescription>A log of all quality control inspections.</CardDescription>
            </div>
            {canManage && (
              <Button onClick={() => setShowAddDialog(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                New Inspection
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Inspector</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(inspectionsLoading || usersLoading) && (
                  <TableRow>
                      <TableCell colSpan={5} className="text-center">Loading inspections...</TableCell>
                  </TableRow>
                )}
                {inspections?.map((inspection) => (
                  <TableRow key={inspection.id}>
                    <TableCell className="font-medium">{inspection.location}</TableCell>
                    <TableCell>{format(new Date(inspection.date), 'PP')}</TableCell>
                    <TableCell>{usersMap.get(inspection.inspectorId) || 'Unknown'}</TableCell>
                    <TableCell>{getStatusBadge(inspection.status)}</TableCell>
                    <TableCell className="max-w-[300px] truncate">{inspection.notes || '-'}</TableCell>
                  </TableRow>
                ))}
                {inspections?.length === 0 && !inspectionsLoading && (
                  <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">No inspections found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      {canManage && <AddInspectionDialog open={showAddDialog} onOpenChange={setShowAddDialog} />}
    </>
  );
}
