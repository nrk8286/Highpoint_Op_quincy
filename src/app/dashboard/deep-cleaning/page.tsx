import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { deepCleanTasks } from '@/lib/data';

export default function DeepCleaningPage() {
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
                    selected={deepCleanTasks.map(task => new Date(task.scheduledDate))}
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
              {deepCleanTasks
                .filter(task => task.status === 'Scheduled')
                .map(task => (
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
