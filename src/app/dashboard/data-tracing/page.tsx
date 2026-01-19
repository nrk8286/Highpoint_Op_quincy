'use client';

import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCollection } from '@/firebase/firestore/use-collection';
import { DailyTask, DeepCleanTask, MaintenanceWorkOrder, Inspection } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function DataTracingPage() {
    const { data: dailyTasks } = useCollection<DailyTask>('dailyTasks');
    const { data: deepCleanTasks } = useCollection<DeepCleanTask>('deepCleanTasks');
    const { data: maintenanceTasks } = useCollection<MaintenanceWorkOrder>('maintenance');
    const { data: inspections } = useCollection<Inspection>('inspections');

    return (
        <div className="space-y-6">
            <PageHeader title="Data Tracing" description="Real-time activity log and historical data audit." />

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Task Activity</CardTitle>
                        <CardDescription>Latest daily and deep cleaning task updates.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Location</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Updated</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {dailyTasks?.slice(0, 5).map(task => (
                                    <TableRow key={task.id}>
                                        <TableCell>{task.roomNumber}</TableCell>
                                        <TableCell>Daily</TableCell>
                                        <TableCell><Badge variant="outline">{task.status}</Badge></TableCell>
                                        <TableCell>{task.updatedAt ? format(task.updatedAt.toDate(), 'HH:mm') : 'N/A'}</TableCell>
                                    </TableRow>
                                ))}
                                {deepCleanTasks?.slice(0, 5).map(task => (
                                    <TableRow key={task.id}>
                                        <TableCell>{task.zone}</TableCell>
                                        <TableCell>Deep</TableCell>
                                        <TableCell><Badge variant="outline">{task.status}</Badge></TableCell>
                                        <TableCell>{task.updatedAt ? format(task.updatedAt.toDate(), 'HH:mm') : 'N/A'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Maintenance & Inspections</CardTitle>
                        <CardDescription>Tracing maintenance requests and facility inspections.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Location</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Result</TableHead>
                                    <TableHead>Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {maintenanceTasks?.slice(0, 5).map(task => (
                                    <TableRow key={task.id}>
                                        <TableCell>{task.location}</TableCell>
                                        <TableCell>Maint.</TableCell>
                                        <TableCell><Badge variant="outline">{task.status}</Badge></TableCell>
                                        <TableCell>{task.createdAt ? format(task.createdAt.toDate(), 'MM/dd') : 'N/A'}</TableCell>
                                    </TableRow>
                                ))}
                                {inspections?.slice(0, 5).map(insp => (
                                    <TableRow key={insp.id}>
                                        <TableCell>{insp.location}</TableCell>
                                        <TableCell>Insp.</TableCell>
                                        <TableCell><Badge variant="outline">{insp.status}</Badge></TableCell>
                                        <TableCell>{insp.createdAt ? format(insp.createdAt.toDate(), 'MM/dd') : 'N/A'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
