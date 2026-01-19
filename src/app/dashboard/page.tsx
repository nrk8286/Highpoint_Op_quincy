'use client';
import { useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useCollection, useUser, useFirestore } from '@/firebase';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu"
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
import { MoreHorizontal, CheckCircle2, AlertCircle, Clock, XCircle } from 'lucide-react';
import { CompletionRingChart } from '@/components/charts/completion-ring-chart';
import { updateTask } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { DailyTask, InventoryItem } from '@/lib/types';

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
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const tasksQuery = useMemo(() => user ? query(collection(firestore, 'daily_tasks')) : null, [firestore, user]);
  const inventoryQuery = useMemo(() => user ? query(collection(firestore, 'inventory')) : null, [firestore, user]);
  const deepCleansQuery = useMemo(() => user ? query(collection(firestore, 'deep_clean_tasks'), where('status', '==', 'Scheduled')) : null, [firestore, user]);
  
  const { data: dailyTasks, loading: tasksLoading } = useCollection<DailyTask>(tasksQuery);
  const { data: inventoryItems, loading: inventoryLoading } = useCollection<InventoryItem>(inventoryQuery);
  const { data: deepCleanTasks, loading: deepCleansLoading } = useCollection<DailyTask>(deepCleansQuery);

  const completedTasks = dailyTasks?.filter(t => t.status === 'Completed').length || 0;
  const totalTasks = dailyTasks?.length || 0;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const overdueTasks = dailyTasks?.filter(t => t.status === 'Overdue').length || 0;
  const lowStockItems = inventoryItems?.filter(i => i.quantity <= i.reorderLevel).length || 0;

  const myPriorityTasks = dailyTasks?.filter(t => t.assignedTo === user?.id && ['Pending', 'In Progress'].includes(t.status)).slice(0, 5) || [];

  const handleUpdateStatus = (taskId: string, status: DailyTask['status']) => {
    try {
      updateTask(firestore, taskId, { status });
      toast({
        title: "Task Updated",
        description: `Task status has been set to ${status}.`
      })
    } catch(error) {
        // Error is handled globally by the Firebase module
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Welcome back, {user?.name}!</h1>
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
            <div className="text-2xl font-bold text-red-500">{overdueTasks}</div>
            <p className="text-xs text-muted-foreground">Require immediate attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockItems}</div>
            <p className="text-xs text-muted-foreground">Review inventory and reorder</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Deep Cleans</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deepCleanTasks?.length || 0}</div>
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
                {myPriorityTasks.map(task => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.roomNumber}</TableCell>
                    <TableCell>
                      <Badge variant={task.status === 'In Progress' ? 'secondary' : 'outline'} className="flex items-center gap-2 w-fit">
                        {getStatusIcon(task.status)}
                        {task.status}
                      </Badge>
                    </TableCell>
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
                             {task.status === 'Pending' && (
                                <DropdownMenuItem onSelect={() => handleUpdateStatus(task.id, 'In Progress')}>
                                    Start Task
                                </DropdownMenuItem>
                            )}
                            {task.status === 'In Progress' && (
                                <DropdownMenuItem onSelect={() => handleUpdateStatus(task.id, 'Completed')}>
                                    Complete Task
                                </DropdownMenuItem>
                            )}
                            {(task.status === 'Pending' || task.status === 'In Progress') && (
                                <DropdownMenuItem onSelect={() => handleUpdateStatus(task.id, 'Declined')}>
                                    Decline Task
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem disabled>View Details</DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                 {myPriorityTasks.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">No priority tasks assigned.</TableCell>
                    </TableRow>
                )}
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
