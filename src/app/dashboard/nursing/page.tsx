'use client';
import React, { useMemo, useState } from 'react';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle } from 'lucide-react';
import { Resident, ShiftReport, User } from '@/lib/types';
import { AddResidentDialog } from './add-resident-dialog';
import { AddShiftReportDialog } from './add-shift-report-dialog';
import { format, formatDistanceToNow } from 'date-fns';

export default function NursingPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
    const [showAddResidentDialog, setShowAddResidentDialog] = useState(false);
    const [showAddReportDialog, setShowAddReportDialog] = useState(false);

    const residentsQuery = useMemo(() => query(collection(firestore, 'residents'), orderBy('name', 'asc')), [firestore]);
    const { data: residents, loading: residentsLoading } = useCollection<Resident>(residentsQuery);

    const reportsQuery = useMemo(() => 
        selectedResident ? query(collection(firestore, 'shift_reports'), where('residentId', '==', selectedResident.id), orderBy('date', 'desc')) : null, 
    [firestore, selectedResident]);
    const { data: reports, loading: reportsLoading } = useCollection<ShiftReport>(reportsQuery);

    const usersQuery = useMemo(() => query(collection(firestore, 'users')), [firestore]);
    const { data: users, loading: usersLoading } = useCollection<User>(usersQuery);

    const usersMap = useMemo(() => {
        if (!users) return new Map();
        return new Map(users.map(u => [u.id, u]));
    }, [users]);

    const canManage = user?.role === 'Administrator' || user?.role === 'Director';

    return (
        <>
            <div className="space-y-8 h-full">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Nursing Dashboard</h1>
                    <p className="text-muted-foreground">Manage residents and view clinical shift reports.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100%-100px)]">
                    <Card className="lg:col-span-1 flex flex-col">
                        <CardHeader className="flex flex-row justify-between items-center">
                            <CardTitle>Residents</CardTitle>
                            {canManage && (
                                <Button size="sm" variant="outline" onClick={() => setShowAddResidentDialog(true)}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add Resident
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent className="p-0 flex-1">
                            <ScrollArea className="h-full">
                                <div className="space-y-2 p-4 pt-0">
                                    {residentsLoading && <p className="text-muted-foreground text-center">Loading residents...</p>}
                                    {residents?.map(res => (
                                        <button key={res.id} onClick={() => setSelectedResident(res)} className={`w-full text-left p-3 rounded-lg border flex items-center gap-3 transition-colors ${selectedResident?.id === res.id ? 'bg-muted' : 'hover:bg-muted/50'}`}>
                                            <Avatar>
                                                <AvatarFallback>{res.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-semibold">{res.name}</p>
                                                <p className="text-sm text-muted-foreground">Room {res.roomNumber}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-2 flex flex-col">
                        {selectedResident ? (
                            <>
                            <CardHeader className="flex flex-row justify-between items-center">
                                <div>
                                    <CardTitle>Shift Reports for {selectedResident.name}</CardTitle>
                                    <CardDescription>Room {selectedResident.roomNumber} &bull; DOB: {format(new Date(selectedResident.dateOfBirth), 'PP')}</CardDescription>
                                </div>
                                <Button onClick={() => setShowAddReportDialog(true)}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    New Report
                                </Button>
                            </CardHeader>
                            <CardContent className="p-0 flex-1">
                                <ScrollArea className="h-full">
                                    <div className="space-y-4 p-6 pt-0">
                                        {reportsLoading && <p className="text-muted-foreground text-center">Loading reports...</p>}
                                        {reports?.map(report => {
                                            const author = usersMap.get(report.authorId);
                                            return (
                                                <div key={report.id} className="border p-4 rounded-lg">
                                                    <p>{report.reportText}</p>
                                                    <div className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
                                                        <Avatar className="h-5 w-5">
                                                            <AvatarImage src={author?.avatarUrl} />
                                                            <AvatarFallback>{author?.name.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                        <span>{author?.name || 'Unknown'} &bull; {report.shift} Shift &bull; {formatDistanceToNow(new Date(report.date), { addSuffix: true })}</span>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        {!reportsLoading && reports?.length === 0 && (
                                            <p className="text-muted-foreground text-center pt-10">No shift reports found for this resident.</p>
                                        )}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                            </>
                        ) : (
                            <CardContent className="flex items-center justify-center h-full">
                                <p className="text-muted-foreground">Select a resident to view their reports.</p>
                            </CardContent>
                        )}
                    </Card>
                </div>
            </div>
            {canManage && <AddResidentDialog open={showAddResidentDialog} onOpenChange={setShowAddResidentDialog} />}
            {selectedResident && <AddShiftReportDialog open={showAddReportDialog} onOpenChange={setShowAddReportDialog} resident={selectedResident} />}
        </>
    );
}

    