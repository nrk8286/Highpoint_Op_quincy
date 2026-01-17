'use client';
import React, { useMemo } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection, useFirestore, useUser } from '@/firebase';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FilePlus2, MoreHorizontal } from 'lucide-react';
import { DailyTask, User } from '@/lib/types';
import { CheckCircle2, AlertCircle, Clock, XCircle } from 'lucide-react';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AddTaskDialog } from './add-task-dialog';
import { updateTask } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

const getStatusBadge = (status: DailyTask['status']) => {
  const variantMap: { [key in DailyTask['status']]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
    'Completed': 'default',
    'In Progress': 'secondary',
    'Pending': 'outline',
    'Overdue': 'destructive',
    'Declined': 'outline',
  };
  const iconMap: { [key in DailyTask['status']]: React.ReactNode } = {
    'Completed': <CheckCircle2 className="h-3 w-3" />,
    'In Progress': <Clock className="h-3 w-3" />,
    'Pending': <Clock className="h-3 w-3" />,
    'Overdue': <AlertCircle className="h-3 w-3" />,
    'Declined': <XCircle className="h-3 w-3" />,
  };
  return (
    <Badge variant={variantMap[status]} className="gap-1 capitalize">
      {iconMap[status]}
      {status}
    </Badge>
  );
};


export default function TasksPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [showAddTaskDialog, setShowAddTaskDialog] = React.useState(false);

  const tasksQuery = useMemo(() => query(collection(firestore, 'daily_tasks'), orderBy('createdAt', 'desc')), [firestore]);
  const usersQuery = useMemo(() => query(collection(firestore, 'users')), [firestore]);

  const { data: dailyTasks, loading: tasksLoading } = useCollection<DailyTask>(tasksQuery);
  const { data: users, loading: usersLoading } = useCollection<User>(usersQuery);

  const usersMap = useMemo(() => {
    if (!users) return new Map();
    return new Map(users.map(u => [u.id, u.name]));
  }, [users]);

  const canAddTask = user?.role === 'Admin' || user?.role === 'Supervisor' || user?.role === 'Director' || user?.role === 'Administrator';

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
    <>
    <div className="space-y-8">
       <div>
        <h1 className="text-3xl font-bold font-headline">Daily Task Management</h1>
        <p className="text-muted-foreground">View, claim, and complete your daily assignments.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>All Tasks</CardTitle>
            <CardDescription>A list of all housekeeping tasks for today.</CardDescription>
          </div>
          {canAddTask && (
            <Button onClick={() => setShowAddTaskDialog(true)}>
              <FilePlus2 className="mr-2 h-4 w-4" />
              Add Task
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(tasksLoading || usersLoading) && (
                <TableRow>
                    <TableCell colSpan={6} className="text-center">Loading tasks...</TableCell>
                </TableRow>
              )}
              {dailyTasks?.map((task) => {
                const isAuthorized = canAddTask || task.assignedTo === user?.id;
                return (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.roomNumber}</TableCell>
                    <TableCell>{task.roomType}</TableCell>
                    <TableCell>{getStatusBadge(task.status)}</TableCell>
                    <TableCell>{usersMap.get(task.assignedTo) || task.assignedTo}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{task.notes || '-'}</TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                aria-haspopup="true"
                                size="icon"
                                variant="ghost"
                                disabled={!isAuthorized}
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
                )
              })}
              {dailyTasks?.length === 0 && !tasksLoading && (
                <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">No tasks found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
    {canAddTask && users && <AddTaskDialog open={showAddTaskDialog} onOpenChange={setShowAddTaskDialog} housekeepers={users.filter(u => u.role === 'Housekeeper')} />}
    </>
  );
}
