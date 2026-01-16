import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AuditReportForm } from './audit-report-form';

export default function AuditPage() {

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">State Audit Compliance</h1>
        <p className="text-muted-foreground">
          Generate pre-formatted reports for Illinois IDPH Long-Term Care requirements.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate Compliance Report</CardTitle>
          <CardDescription>
            Select a date range to generate a draft audit report. The AI will synthesize data on
            task completion, deep cleaning, and inventory.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuditReportForm />
        </CardContent>
      </Card>
    </div>
  );
}
