import Image from 'next/image';
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
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { inspections, users } from '@/lib/data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FilePlus2, Check, X } from 'lucide-react';

export default function SupervisorPage() {
    const mapImage = PlaceHolderImages.find(i => i.id === 'facility-map');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Supervisor Tools</h1>
        <p className="text-muted-foreground">Manage schedules, conduct inspections, and view staff activity.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Real-Time Staff Location</CardTitle>
            <CardDescription>Visual map of staff assignments across facility floors.</CardDescription>
          </CardHeader>
          <CardContent>
            {mapImage && (
                <Image 
                    src={mapImage.imageUrl} 
                    alt={mapImage.description}
                    width={1200}
                    height={800}
                    className="rounded-lg border"
                    data-ai-hint={mapImage.imageHint}
                />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Bulk Task Assignment</CardTitle>
            <CardDescription>Create tasks for special events like move-ins or outbreak protocols.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="p-4 bg-primary/10 rounded-full mb-4">
              <FilePlus2 className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold">Assign Special Tasks</h3>
            <p className="text-sm text-muted-foreground mb-4">Quickly assign a deep clean or special protocol to a room or zone.</p>
            <Button>Create Bulk Task</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Inspection Reports</CardTitle>
          <CardDescription>Review spot-check quality inspections.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room</TableHead>
                <TableHead>Inspector</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inspections.map(inspection => {
                const inspector = users.find(u => u.id === inspection.inspectorId);
                return (
                  <TableRow key={inspection.id}>
                    <TableCell className="font-bold">{inspection.roomId}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                            <AvatarImage src={inspector?.avatarUrl} />
                            <AvatarFallback>{inspector?.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {inspector?.name}
                      </div>
                    </TableCell>
                    <TableCell>{inspection.date}</TableCell>
                    <TableCell>
                        <Badge variant={inspection.status === 'Pass' ? 'default' : 'destructive'} className='gap-1'>
                            {inspection.status === 'Pass' ? <Check className="h-3 w-3"/> : <X className="h-3 w-3"/>}
                            {inspection.status}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{inspection.notes}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
