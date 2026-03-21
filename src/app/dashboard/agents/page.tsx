'use client';

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { initializeAgents, getAgentWorkloadStats } from '@/lib/agent-orchestration';
import type { Agent, AgentTask, Objective, AgentLog } from '@/lib/types';
import { RefreshCw, Activity, CheckCircle, AlertCircle, Clock, Brain } from 'lucide-react';

export default function AgentsPage() {
  const { db } = useFirestore();
  const [workloadStats, setWorkloadStats] = useState<Record<string, { pending: number; inProgress: number; completed: number }>>({});
  const [isInitializing, setIsInitializing] = useState(false);

  // Fetch agents
  const agentsQuery = query(collection(db, 'agents'), orderBy('role'));
  const { data: agents = [], loading: agentsLoading } = useCollection<Agent>(agentsQuery);

  // Fetch objectives
  const objectivesQuery = query(collection(db, 'objectives'), orderBy('createdAt', 'desc'));
  const { data: objectives = [], loading: objectivesLoading } = useCollection<Objective>(objectivesQuery);

  // Fetch agent tasks
  const tasksQuery = query(collection(db, 'agent_tasks'), orderBy('createdAt', 'desc'));
  const { data: tasks = [], loading: tasksLoading } = useCollection<AgentTask>(tasksQuery);

  // Fetch agent logs (recent)
  const logsQuery = query(collection(db, 'agent_logs'), orderBy('timestamp', 'desc'));
  const { data: logs = [], loading: logsLoading } = useCollection<AgentLog>(logsQuery);

  useEffect(() => {
    const loadWorkloadStats = async () => {
      try {
        const stats = await getAgentWorkloadStats();
        setWorkloadStats(stats);
      } catch (error) {
        console.error('Failed to load workload stats:', error);
      }
    };

    if (!agentsLoading && agents.length > 0) {
      loadWorkloadStats();
    }
  }, [agentsLoading, agents]);

  const handleInitializeAgents = async () => {
    setIsInitializing(true);
    try {
      await initializeAgents();
      window.location.reload(); // Reload to show new agents
    } catch (error) {
      console.error('Failed to initialize agents:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-500';
      case 'Idle':
        return 'bg-blue-500';
      case 'Busy':
        return 'bg-yellow-500';
      case 'Error':
        return 'bg-red-500';
      case 'Offline':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getTaskStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      'Pending': 'secondary',
      'Assigned': 'default',
      'In Progress': 'default',
      'Review': 'secondary',
      'Completed': 'default',
      'Failed': 'destructive',
      'Cancelled': 'secondary',
    };
    return variants[status] || 'secondary';
  };

  if (agentsLoading) {
    return (
      <div className="p-8">
        <p>Loading agents...</p>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>Multi-Agent System</CardTitle>
            <CardDescription>Initialize the intelligent agent system to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              The multi-agent system enables automated facility management through specialized AI agents.
              Click below to initialize the system.
            </p>
            <Button onClick={handleInitializeAgents} disabled={isInitializing}>
              <Brain className="mr-2 h-4 w-4" />
              {isInitializing ? 'Initializing...' : 'Initialize Agents'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Multi-Agent System</h1>
        <p className="text-muted-foreground">
          Monitor and manage AI agents working on facility operations
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="objectives">Objectives</TabsTrigger>
          <TabsTrigger value="logs">Activity Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* System Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {agents.filter(a => a.status === 'Active' || a.status === 'Busy').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  of {agents.length} total agents
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {tasks.filter(t => t.status === 'Pending' || t.status === 'Assigned').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  awaiting execution
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {tasks.filter(t => t.status === 'In Progress').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  tasks being executed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {tasks.filter(t => t.status === 'Completed').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  successfully finished
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Agent Status Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {agents.map(agent => (
              <Card key={agent.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{agent.name}</CardTitle>
                    <div className={`h-3 w-3 rounded-full ${getStatusColor(agent.status)}`} />
                  </div>
                  <CardDescription>{agent.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant="outline">{agent.status}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Model:</span>
                      <span className="font-medium">{agent.model}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Tasks Completed:</span>
                      <span className="font-medium">{agent.tasksCompleted}</span>
                    </div>
                    {workloadStats[agent.role] && (
                      <div className="pt-2 border-t">
                        <div className="text-xs text-muted-foreground mb-1">Current Workload:</div>
                        <div className="flex gap-2 text-xs">
                          <span>Pending: {workloadStats[agent.role].pending}</span>
                          <span>Active: {workloadStats[agent.role].inProgress}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent Details</CardTitle>
              <CardDescription>Detailed information about each agent and their capabilities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {agents.map(agent => (
                  <div key={agent.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-lg">{agent.name}</h3>
                        <p className="text-sm text-muted-foreground">{agent.description}</p>
                      </div>
                      <Badge variant="outline">{agent.status}</Badge>
                    </div>
                    <div className="mt-3">
                      <div className="text-sm font-medium mb-1">Capabilities:</div>
                      <div className="flex flex-wrap gap-1">
                        {agent.capabilities.map((cap, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {cap.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent Tasks</CardTitle>
              <CardDescription>All tasks assigned to agents</CardDescription>
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <p>Loading tasks...</p>
              ) : tasks.length === 0 ? (
                <p className="text-muted-foreground">No tasks yet</p>
              ) : (
                <div className="space-y-2">
                  {tasks.slice(0, 20).map(task => (
                    <div key={task.id} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{task.title}</span>
                            <Badge variant={getTaskStatusBadge(task.status)}>{task.status}</Badge>
                            <Badge variant="outline">{task.priority}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{task.description}</p>
                          {task.assignedTo && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Assigned to: {agents.find(a => a.id === task.assignedTo)?.name || 'Unknown'}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="objectives" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Objectives</CardTitle>
              <CardDescription>High-level objectives being executed by the agent system</CardDescription>
            </CardHeader>
            <CardContent>
              {objectivesLoading ? (
                <p>Loading objectives...</p>
              ) : objectives.length === 0 ? (
                <p className="text-muted-foreground">No objectives yet</p>
              ) : (
                <div className="space-y-3">
                  {objectives.map(objective => (
                    <div key={objective.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold">{objective.title}</h3>
                          <p className="text-sm text-muted-foreground">{objective.description}</p>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline">{objective.status}</Badge>
                          <Badge variant="outline">{objective.priority}</Badge>
                        </div>
                      </div>
                      {objective.subtasks && objective.subtasks.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-2">
                          Subtasks: {objective.subtasks.length}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity Logs</CardTitle>
              <CardDescription>Recent agent activities and system events</CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <p>Loading logs...</p>
              ) : logs.length === 0 ? (
                <p className="text-muted-foreground">No activity logs yet</p>
              ) : (
                <div className="space-y-1">
                  {logs.slice(0, 50).map(log => (
                    <div key={log.id} className="flex items-start gap-3 text-sm py-2 border-b last:border-0">
                      <div className="flex-shrink-0">
                        {log.level === 'Error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                        {log.level === 'Warning' && <AlertCircle className="h-4 w-4 text-yellow-500" />}
                        {log.level === 'Info' && <CheckCircle className="h-4 w-4 text-blue-500" />}
                        {log.level === 'Debug' && <Activity className="h-4 w-4 text-gray-500" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{log.action}</span>
                          <Badge variant="outline" className="text-xs">
                            {agents.find(a => a.id === log.agentId)?.role || 'Unknown'}
                          </Badge>
                        </div>
                        {log.details && (
                          <p className="text-xs text-muted-foreground mt-0.5">{log.details}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
