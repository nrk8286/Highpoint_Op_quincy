'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Metrics {
  totalInspections: number;
  avgComplianceScore: number;
  criticalDeficiencies: number;
  resolvedDeficiencies: number;
  scoreHistory: Array<{ date: string; score: number }>;
  overallTrend: 'improving' | 'declining' | 'stable';
}

export function ComplianceMetrics({ facilityId }: { facilityId: string }) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const firestore = useFirestore();

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const inspectionsRef = collection(firestore, 'inspections');
        const q = query(inspectionsRef, where('facilityId', '==', facilityId));
        const snapshot = await getDocs(q);

        const inspections = snapshot.docs.map((doc) => doc.data());
        const totalInspections = inspections.length;
        const avgScore =
          inspections.reduce((sum, i) => sum + (i.complianceScore || 0), 0) / totalInspections || 0;

        const criticalCount = inspections.reduce(
          (sum, i) =>
            sum +
            (i.deficiencies?.filter((d: any) => d.severity === 'critical').length || 0),
          0
        );

        const resolvedCount = inspections.reduce(
          (sum, i) =>
            sum +
            (i.deficiencies?.filter((d: any) => d.resolved).length || 0),
          0
        );

        const scoreHistory = inspections
          .slice(-7)
          .map((i, idx) => ({
            date: `Day ${idx + 1}`,
            score: i.complianceScore || 0,
          }));

        setMetrics({
          totalInspections,
          avgComplianceScore: Math.round(avgScore * 100) / 100,
          criticalDeficiencies: criticalCount,
          resolvedDeficiencies: resolvedCount,
          scoreHistory,
          overallTrend: avgScore > 80 ? 'improving' : avgScore < 60 ? 'declining' : 'stable',
        });
      } catch (error) {
        console.error('Error fetching metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    if (facilityId) {
      fetchMetrics();
    }
  }, [facilityId, firestore]);

  if (loading) {
    return <div className="text-gray-500">Loading metrics...</div>;
  }

  if (!metrics) {
    return null;
  }

  const trendColor =
    metrics.overallTrend === 'improving'
      ? 'text-green-600'
      : metrics.overallTrend === 'declining'
        ? 'text-red-600'
        : 'text-blue-600';

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Compliance Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{metrics.avgComplianceScore}%</div>
          <p className={`text-xs mt-2 flex items-center gap-1 ${trendColor}`}>
            <TrendingUp className="w-3 h-3" />
            {metrics.overallTrend}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Inspections Completed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{metrics.totalInspections}</div>
          <p className="text-xs text-gray-500 mt-2">This period</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Critical Issues
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-red-600">
            {metrics.criticalDeficiencies}
          </div>
          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Require action
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Resolved Issues
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600">
            {metrics.resolvedDeficiencies}
          </div>
          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Closed
          </p>
        </CardContent>
      </Card>

      <Card className="md:col-span-2 lg:col-span-4">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Score Trend</CardTitle>
          <CardDescription>Last 7 inspections</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={metrics.scoreHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#C9A84C"
                strokeWidth={2}
                dot={{ fill: '#C9A84C' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
