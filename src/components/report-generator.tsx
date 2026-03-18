'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FileText, Download, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getFunctions, httpsCallable } from 'firebase/functions';

interface ReportOptions {
  startDate: string;
  endDate: string;
  facilityId: string;
  includePhotos: boolean;
}

export function ReportGenerator({ facilityId }: { facilityId: string }) {
  const [options, setOptions] = useState<ReportOptions>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    facilityId,
    includePhotos: false,
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const functions = getFunctions();

  const generateReport = async () => {
    setLoading(true);
    try {
      const generateComplianceReport = httpsCallable<any, any>(functions, 'generateComplianceReport');
      const result = await generateComplianceReport({
        startDate: options.startDate,
        endDate: options.endDate,
        facilityId: options.facilityId,
      });

      const report = result.data as {
        facilityId: string;
        metrics: { totalInspections: number; averageScore: number; totalDeficiencies: number; criticalDeficiencies: number };
        generatedAt: string;
      };

      // Create downloadable PDF (simplified - in production use a PDF library)
      const reportContent = `
COMPLIANCE REPORT
${report.facilityId}

Period: ${options.startDate} to ${options.endDate}

METRICS:
- Total Inspections: ${report.metrics.totalInspections}
- Average Score: ${report.metrics.averageScore}%
- Total Deficiencies: ${report.metrics.totalDeficiencies}
- Critical Deficiencies: ${report.metrics.criticalDeficiencies}

Generated: ${report.generatedAt}
      `;

      const blob = new Blob([reportContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance-report-${new Date().toISOString()}.txt`;
      a.click();

      toast({
        title: 'Report Generated',
        description: 'Your compliance report has been downloaded.',
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate report. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Generate Report
        </CardTitle>
        <CardDescription>Create compliance reports for audits and documentation</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-gray-700">Start Date</label>
            <Input
              type="date"
              value={options.startDate}
              onChange={(e) =>
                setOptions({ ...options, startDate: e.target.value })
              }
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">End Date</label>
            <Input
              type="date"
              value={options.endDate}
              onChange={(e) => setOptions({ ...options, endDate: e.target.value })}
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="includePhotos"
            checked={options.includePhotos}
            onChange={(e) =>
              setOptions({ ...options, includePhotos: e.target.checked })
            }
            className="w-4 h-4"
          />
          <label htmlFor="includePhotos" className="text-sm text-gray-700">
            Include photo evidence
          </label>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={generateReport}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {loading ? 'Generating...' : 'Download Report'}
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email Report
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
