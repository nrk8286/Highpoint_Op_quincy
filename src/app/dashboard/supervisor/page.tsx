'use client';
import React, { useMemo } from 'react';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MoreHorizontal, UserPlus, Database } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from '@/hooks/use-toast';
import { AddUserDialog } from './add-user-dialog';
import { useCollection, useUser, useFirestore } from '@/firebase';
import { seedDatabase } from '@/lib/firebase';
import { collection, query } from 'firebase/firestore';
import type { User } from '@/lib/types';


export default function SupervisorPage() {
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user: currentUser } = useUser();
    const [showAddUserDialog, setShowAddUserDialog] = React.useState(false);
    
    const usersQuery = useMemo(() => query(collection(firestore, 'users')), [firestore]);
    const {data: users, loading: usersLoading} = useCollection<User>(usersQuery);

    const otherUsers = useMemo(() => users?.filter(u => u.id !== currentUser?.id) || [], [users, currentUser]);

    const handleSeedDatabase = async () => {
        if (!currentUser) {
            toast({
                variant: 'destructive',
                title: "Authentication Error",
                description: "Could not identify current user. Please log in again."
            });
            return;
        }
        try {
            await seedDatabase(firestore, currentUser.id);
            toast({
                title: "Database Seeded",
                description: "Initial data has been added to Firestore."
            })
        } catch (error) {
            console.error(error);
            const errorMessage = error instanceof Error ? error.message : "Could not seed the database. Check console for errors.";
            toast({
                variant: 'destructive',
                title: "Seeding Failed",
                description: errorMessage,
            })
        }
    }

  return (
    <>
        <div className="space-y-8">
        <div>
            <h1 className="text-3xl font-bold font-headline">User Management</h1>
            <p className="text-muted-foreground">Manage staff accounts and permissions.</p>
        </div>

        {currentUser?.role === 'Admin' && (
             <Card>
                <CardHeader>
                    <CardTitle>Admin Tools</CardTitle>
                    <CardDescription>Actions for setting up and managing the application.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleSeedDatabase}><Database className="mr-2 h-4 w-4" /> Seed Database</Button>
                    <p className="text-sm text-muted-foreground mt-2">
                        Click here to populate your database with initial sample data. This is useful for first-time setup.
                        Note: This will not create Firebase Auth users. You must create them in the Firebase Console with matching emails.
                    </p>
                </CardContent>
             </Card>
        )}

        <Card>
            <CardHeader className="flex-row justify-between items-center">
                <div>
                    <CardTitle>All Staff</CardTitle>
                    <CardDescription>A list of all users in the system.</CardDescription>
                </div>
                <Button onClick={() => setShowAddUserDialog(true)}>
                    <UserPlus className="mr-2 h-4 w-4" /> Add User
                </Button>
            </CardHeader>
            <CardContent>
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>
                    <span className="sr-only">Actions</span>
                    </TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {usersLoading && (
                    <TableRow>
                        <TableCell colSpan={3} className="text-center">Loading users...</TableCell>
                    </TableRow>
                )}
                {otherUsers.map((user) => (
                    <TableRow key={user.id}>
                    <TableCell>
                        <div className="flex items-center gap-3">
                        <Avatar>
                            <AvatarImage src={user.avatarUrl} alt={user.name} />
                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                        </div>
                    </TableCell>
                    <TableCell>
                        <Badge variant={user.role === 'Admin' || user.role === 'Supervisor' || user.role === 'Director' || user.role === 'Administrator' ? 'secondary' : 'outline'}>{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onSelect={() => toast({title: "Mock Action", description: `Password reset email sent to ${user.name}`})}>Reset Password</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                                className="text-destructive focus:text-destructive" 
                                onSelect={() => toast({title: "Mock Action", description: `${user.name} has been deleted.`})}
                            >
                                Delete User
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                    </TableRow>
                ))}
                {otherUsers.length === 0 && !usersLoading && (
                    <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">No other users found.</TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
            </CardContent>
        </Card>
        </div>
        <AddUserDialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog} />
    </>
  );
}
