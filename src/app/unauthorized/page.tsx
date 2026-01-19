'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md text-center shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-destructive">Access Denied</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-6 text-lg text-muted-foreground">
            You do not have the necessary permissions to access this page.
          </p>
          <Link href="/dashboard">
            <Button variant="outline">Return to Dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
