'use client';
import React, { useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { DeepCleanTask } from '@/lib/types';

export default function DeepCleaningPage() {
  const firestore = useFirestore();

  const queryRef = useMemo(() => query(collection(firestore, 'deep_clean_tasks')), [firestore]);
  const { data: deepCleanTasks, loading } = useCollection<DeepCleanTask>(queryRef);

  const scheduledTasks = useMemo(() => deepCleanTasks?.filter(task => task.status === 'Scheduled') || [], [deepCleanTasks]);
  const selectedDates = useMemo(() => deepCleanTasks?.map(task => new Date(task.scheduledDate)) || [], [deepCleanTasks]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Deep Cleaning Scheduler</h1>
        <p className="text-muted-foreground">Manage and track quarterly deep cleaning rotations.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>Rotation Calendar</CardTitle>
                    <CardDescription>
                        This calendar shows scheduled, in-progress, and completed deep cleans.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Calendar
                    mode="multiple"
                    selected={selectedDates}
                    className="p-0"
                    />
                </CardContent>
            </Card>
        </div>
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading && <p>Loading schedule...</p>}
              {scheduledTasks.map(task => (
                  <div key={task.id} className="p-3 rounded-lg border">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="font-semibold">{task.zone}</p>
                            <p className="text-sm text-muted-foreground">
                                Scheduled for: {new Date(task.scheduledDate).toLocaleDateString()}
                            </p>
                        </div>
                        <Badge variant="secondary">{task.status}</Badge>
                    </div>
                  </div>
                ))}
                {scheduledTasks.length === 0 && !loading && (
                    <p className="text-sm text-muted-foreground">No upcoming deep cleans scheduled.</p>
                )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
