'use client';

/**
 * Multi-Agent System Dashboard
 * Provides interface to interact with and monitor the intelligent agent system
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bot, Brain, Shield, Wrench, GraduationCap, CheckCircle,
  Activity, AlertCircle, Clock, TrendingUp
} from 'lucide-react';
import {
  processObjective,
  getOrchestratorStatus,
  autoScheduleMaintenance,
  monitorInventoryAndReorder,
  generateComplianceReport,
  generateTrainingContent,
  getEventLog
} from '@/ai/multi-agent-api';
import PageHeader from '@/components/layout/page-header';

const agentIcons: Record<string, any> = {
  manager: Brain,
  compliance: Shield,
  operations: Wrench,
  training: GraduationCap,
  critic: CheckCircle,
};

export default function MultiAgentDashboard() {
  const [objective, setObjective] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [orchestratorStatus, setOrchestratorStatus] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);

  // Load orchestrator status
  const loadStatus = async () => {
    const response = await getOrchestratorStatus();
    if (response.success) {
      setOrchestratorStatus(response.status);
    }
  };

  // Load recent events
  const loadEvents = async () => {
    const response = await getEventLog(20);
    if (response.success && response.events) {
      setEvents(response.events);
    }
  };

  useEffect(() => {
    loadStatus();
    loadEvents();

    // Refresh status every 10 seconds
    const interval = setInterval(() => {
      loadStatus();
      loadEvents();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleProcessObjective = async () => {
    if (!objective.trim()) return;

    setProcessing(true);
    setResult(null);

    try {
      const response = await processObjective(objective);
      setResult(response);

      // Refresh status and events
      await loadStatus();
      await loadEvents();
    } catch (error) {
      setResult({ success: false, error: String(error) });
    } finally {
      setProcessing(false);
    }
  };

  const handleQuickAction = async (action: string) => {
    setProcessing(true);
    setResult(null);

    try {
      let response;
      switch (action) {
        case 'schedule_maintenance':
          response = await autoScheduleMaintenance();
          break;
        case 'monitor_inventory':
          response = await monitorInventoryAndReorder();
          break;
        case 'compliance_report':
          const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
          const endDate = new Date().toISOString();
          response = await generateComplianceReport(startDate, endDate);
          break;
        case 'generate_training':
          response = await generateTrainingContent('Housekeeper');
          break;
        default:
          response = { success: false, error: 'Unknown action' };
      }

      setResult(response);
      await loadStatus();
      await loadEvents();
    } catch (error) {
      setResult({ success: false, error: String(error) });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idle':
        return 'bg-gray-500';
      case 'thinking':
        return 'bg-blue-500';
      case 'acting':
        return 'bg-yellow-500';
      case 'completed':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Multi-Agent System"
        description="Intelligent AI agents coordinating facility management tasks"
      />

      {/* System Status Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orchestratorStatus?.isRunning ? 'Active' : 'Idle'}
            </div>
            <p className="text-xs text-muted-foreground">
              {orchestratorStatus?.agentCount || 0} agents deployed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Processing</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orchestratorStatus?.queuedMessages || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Queued messages
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.values(orchestratorStatus?.agentStatuses || {}).filter(
                (agent: any) => agent.status !== 'idle'
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently working
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Events Logged</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{events.length}</div>
            <p className="text-xs text-muted-foreground">
              Recent activity
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="control" className="space-y-4">
        <TabsList>
          <TabsTrigger value="control">Control Panel</TabsTrigger>
          <TabsTrigger value="agents">Agent Status</TabsTrigger>
          <TabsTrigger value="events">Event Log</TabsTrigger>
        </TabsList>

        <TabsContent value="control" className="space-y-4">
          {/* Objective Input */}
          <Card>
            <CardHeader>
              <CardTitle>Process High-Level Objective</CardTitle>
              <CardDescription>
                Describe a facility management objective. The Manager Agent will decompose it
                and coordinate specialized agents to complete the task.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="e.g., Generate a comprehensive compliance report for the last quarter, schedule all overdue maintenance, and create training materials for new housekeeping staff..."
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                rows={4}
              />
              <Button
                onClick={handleProcessObjective}
                disabled={processing || !objective.trim()}
              >
                {processing ? 'Processing...' : 'Process Objective'}
              </Button>

              {result && (
                <Card className={result.success ? 'border-green-500' : 'border-red-500'}>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      {result.success ? 'Success' : 'Error'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs overflow-auto">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Execute common tasks with specialized agents
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Button
                variant="outline"
                className="h-auto flex-col items-start p-4"
                onClick={() => handleQuickAction('schedule_maintenance')}
                disabled={processing}
              >
                <Wrench className="h-6 w-6 mb-2" />
                <div className="text-left">
                  <div className="font-semibold">Auto-Schedule</div>
                  <div className="text-xs text-muted-foreground">
                    Preventive maintenance
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="h-auto flex-col items-start p-4"
                onClick={() => handleQuickAction('monitor_inventory')}
                disabled={processing}
              >
                <AlertCircle className="h-6 w-6 mb-2" />
                <div className="text-left">
                  <div className="font-semibold">Monitor Inventory</div>
                  <div className="text-xs text-muted-foreground">
                    Check and reorder
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="h-auto flex-col items-start p-4"
                onClick={() => handleQuickAction('compliance_report')}
                disabled={processing}
              >
                <Shield className="h-6 w-6 mb-2" />
                <div className="text-left">
                  <div className="font-semibold">Compliance Report</div>
                  <div className="text-xs text-muted-foreground">
                    Generate audit report
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="h-auto flex-col items-start p-4"
                onClick={() => handleQuickAction('generate_training')}
                disabled={processing}
              >
                <GraduationCap className="h-6 w-6 mb-2" />
                <div className="text-left">
                  <div className="font-semibold">Training Content</div>
                  <div className="text-xs text-muted-foreground">
                    Generate materials
                  </div>
                </div>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent Status</CardTitle>
              <CardDescription>Current status of all specialized agents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {orchestratorStatus?.agentStatuses &&
                Object.entries(orchestratorStatus.agentStatuses).map(([id, agent]: [string, any]) => {
                  const Icon = agentIcons[agent.role] || Bot;
                  return (
                    <div key={id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5" />
                        <div>
                          <div className="font-medium capitalize">{agent.role} Agent</div>
                          <div className="text-sm text-muted-foreground">{id}</div>
                        </div>
                      </div>
                      <Badge className={getStatusColor(agent.status)}>
                        {agent.status}
                      </Badge>
                    </div>
                  );
                })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Event Log</CardTitle>
              <CardDescription>Recent orchestrator events and agent activities</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {events.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No events logged yet</p>
                  ) : (
                    events.map((event, index) => (
                      <div key={index} className="p-3 border rounded-lg text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="outline">{event.type}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        {event.agentId && (
                          <div className="text-xs text-muted-foreground">
                            Agent: {event.agentId}
                          </div>
                        )}
                        {event.taskId && (
                          <div className="text-xs text-muted-foreground">
                            Task: {event.taskId}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
