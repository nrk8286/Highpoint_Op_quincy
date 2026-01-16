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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { dailyTasks, deepCleanTasks, inventoryItems, currentUser } from '@/lib/data';
import type { DailyTask } from '@/lib/types';
import { CheckCircle2, AlertCircle, Clock, XCircle } from 'lucide-react';
import { CompletionRingChart } from '@/components/charts/completion-ring-chart';
import { PerformanceTrendChart } from '@/components/charts/performance-trend-chart';
import { format, addDays, differenceInDays } from 'date-fns';

const getStatusIcon = (status: DailyTask['status']) => {
  switch (status) {
    case 'Completed':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'In Progress':
      return <Clock className="h-4 w-4 text-blue-500" />;
    case 'Overdue':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case 'Declined':
        return <XCircle className="h-4 w-4 text-gray-500" />;
    default:
      return <Clock className="h-4 w-4 text-gray-400" />;
  }
};

export default function DashboardPage() {
  const completedTasks = dailyTasks.filter(t => t.status === 'Completed').length;
  const totalTasks = dailyTasks.length;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Welcome back, {currentUser.name}!</h1>
        <p className="text-muted-foreground">Here's a summary of housekeeping operations.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Completed Today</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedTasks} / {totalTasks}</div>
            <p className="text-xs text-muted-foreground">
              {completionPercentage}% completion rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{dailyTasks.filter(t => t.status === 'Overdue').length}</div>
            <p className="text-xs text-muted-foreground">Require immediate attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventoryItems.filter(i => i.status === 'Low Stock').length}</div>
            <p className="text-xs text-muted-foreground">Review inventory and reorder</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Deep Cleans</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deepCleanTasks.filter(t => t.status === 'Scheduled').length}</div>
            <p className="text-xs text-muted-foreground">Scheduled for this quarter</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>My Priority Tasks</CardTitle>
            <CardDescription>Tasks assigned to you that are pending or in progress.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Room</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyTasks.filter(t => ['Pending', 'In Progress'].includes(t.status)).slice(0, 5).map(task => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.roomNumber}</TableCell>
                    <TableCell>
                      <Badge variant={task.status === 'In Progress' ? 'secondary' : 'outline'} className="flex items-center gap-2 w-fit">
                        {getStatusIcon(task.status)}
                        {task.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {/* Action buttons would go here */}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Daily Completion</CardTitle>
            <CardDescription>Your task completion for today.</CardDescription>
          </CardHeader>
          <CardContent>
             <CompletionRingChart percentage={completionPercentage} />
          </CardContent>
        </Card>
      </div>
      
    </div>
  );
}
