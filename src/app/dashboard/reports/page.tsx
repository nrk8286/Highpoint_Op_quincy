'use client';

import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileBarChart, FileSpreadsheet, FileWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ReportsPage() {
    return (
        <div className="space-y-6">
            <PageHeader title="Facility Reports" description="Generate and view detailed facility reports." />

            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileBarChart className="h-5 w-5 text-primary" />
                            Performance Report
                        </CardTitle>
                        <CardDescription>Overall staff performance and task completion rates.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button className="w-full">Generate PDF</Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileSpreadsheet className="h-5 w-5 text-primary" />
                            Inventory Audit
                        </CardTitle>
                        <CardDescription>Current stock levels and reorder history.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button className="w-full" variant="outline">Export CSV</Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileWarning className="h-5 w-5 text-primary" />
                            Compliance Report
                        </CardTitle>
                        <CardDescription>Identify gaps in mandatory cleaning and maintenance.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button className="w-full" variant="destructive">View Issues</Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
