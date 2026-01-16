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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { users } from '@/lib/data';
import { PerformanceTrendChart } from '@/components/charts/performance-trend-chart';
import { Trophy, Star, Zap } from 'lucide-react';

const mockPerformance = {
  'user-2': { roomsPerShift: 18, inspectionPassRate: 95, avgSpeed: '22 min/room' },
  'user-3': { roomsPerShift: 16, inspectionPassRate: 98, avgSpeed: '25 min/room' },
};

export default function PerformancePage() {
  return (
    <div className="space-y-8">
       <div>
        <h1 className="text-3xl font-bold font-headline">Performance Dashboard</h1>
        <p className="text-muted-foreground">Analyze individual and team metrics with trend analysis.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Trophy className="text-primary"/>Top Performer</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                    <AvatarImage src={users.find(u => u.id === 'user-3')?.avatarUrl} />
                    <AvatarFallback>JB</AvatarFallback>
                </Avatar>
                <div>
                    <p className="font-bold text-lg">{users.find(u => u.id === 'user-3')?.name}</p>
                    <p className="text-sm text-muted-foreground">98% Pass Rate</p>
                </div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Star className="text-primary"/>Perfect Week</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                    <AvatarImage src={users.find(u => u.id === 'user-3')?.avatarUrl} />
                    <AvatarFallback>JB</AvatarFallback>
                </Avatar>
                <div>
                    <p className="font-bold text-lg">{users.find(u => u.id === 'user-3')?.name}</p>
                    <p className="text-sm text-muted-foreground">100% Tasks On-time</p>
                </div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Zap className="text-primary"/>Fastest Responder</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
                 <Avatar className="h-16 w-16">
                    <AvatarImage src={users.find(u => u.id === 'user-2')?.avatarUrl} />
                    <AvatarFallback>MW</AvatarFallback>
                </Avatar>
                <div>
                    <p className="font-bold text-lg">{users.find(u => u.id === 'user-2')?.name}</p>
                    <p className="text-sm text-muted-foreground">22 min/room Avg.</p>
                </div>
            </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Performance Trends</CardTitle>
          <CardDescription>30/60/90-day comparison of key metrics.</CardDescription>
        </CardHeader>
        <CardContent>
          <PerformanceTrendChart />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Individual Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Member</TableHead>
                <TableHead>Rooms/Shift</TableHead>
                <TableHead>Inspection Pass Rate</TableHead>
                <TableHead>Avg. Completion Speed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.filter(u => u.role === 'Housekeeper').map(user => (
                <TableRow key={user.id}>
                  <TableCell className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatarUrl} />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    {user.name}
                  </TableCell>
                  <TableCell>{mockPerformance[user.id as keyof typeof mockPerformance]?.roomsPerShift}</TableCell>
                  <TableCell className="text-green-600">{mockPerformance[user.id as keyof typeof mockPerformance]?.inspectionPassRate}%</TableCell>
                  <TableCell>{mockPerformance[user.id as keyof typeof mockPerformance]?.avgSpeed}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
