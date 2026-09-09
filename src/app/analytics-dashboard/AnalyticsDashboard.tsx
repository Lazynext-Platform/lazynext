'use client';

import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Bot,
  Zap,
  CheckSquare,
  AlertTriangle,
  Gauge,
} from 'lucide-react';
import { Card, Badge, EmptyState } from '@/components/ui';
import { BarChart, DonutChart, ProgressRing } from '@/components/Charts';

// ── Types (mirror the service output) ──

interface KpiSummary {
  id: string;
  name: string;
  description: string | null;
  target: number;
  current: number;
  unit: string;
  period: string;
  direction: string;
  progress: number;
  goalId: string | null;
}

interface GoalProgress {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  progress: number;
  type: string;
  dueDate: Date | null;
  kpiCount: number;
  kpis: { id: string; name: string; current: number; target: number; unit: string }[];
}

interface AgentPerformanceStats {
  totalRuns: number;
  byStatus: Record<string, number>;
  successRate: number;
  avgDurationSec: number;
  toolCallsPerRun: number;
  totalCredits: number;
  mostActiveAgents: {
    agentId: string;
    agentName: string;
    runs: number;
    successRate: number;
    avgDurationSec: number;
  }[];
}

interface SystemHealthSummary {
  totalEvents: number;
  errorEvents: number;
  automationRuns: number;
  automationSuccessRate: number;
  pendingTasks: number;
  completedTasks: number;
  activeAgents: number;
}

interface DashboardData {
  kpis: KpiSummary[];
  goals: GoalProgress[];
  agentPerformance: AgentPerformanceStats;
  systemHealth: SystemHealthSummary;
  recentMetrics: {
    id: string;
    name: string;
    value: number;
    unit: string | null;
    timestamp: Date;
  }[];
}

const priorityVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  urgent: 'danger',
  high: 'warning',
  medium: 'info',
  low: 'default',
};

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  active: 'info',
  completed: 'success',
  cancelled: 'default',
  paused: 'warning',
};

export function AnalyticsDashboard({ data }: { data: DashboardData }) {
  const { kpis, goals, agentPerformance, systemHealth, recentMetrics } = data;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="heading-display text-2xl">Analytics Dashboard</h1>
        <p className="text-sm text-fg-secondary mt-1">
          Company OS analytics — KPIs, goals, agent performance, and system health.
        </p>
      </div>

      {/* System Health Cards */}
      <div className="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-4 lg:grid-cols-7">
        <HealthCard label="Events" value={systemHealth.totalEvents} icon={Activity} color="text-info" />
        <HealthCard label="Errors" value={systemHealth.errorEvents} icon={AlertTriangle} color="text-danger" />
        <HealthCard label="Automations" value={systemHealth.automationRuns} icon={Zap} color="text-accent-primary" />
        <HealthCard
          label="Auto Success"
          value={`${systemHealth.automationSuccessRate}%`}
          icon={Gauge}
          color={systemHealth.automationSuccessRate >= 90 ? 'text-success' : 'text-warning'}
        />
        <HealthCard label="Pending Tasks" value={systemHealth.pendingTasks} icon={CheckSquare} color="text-warning" />
        <HealthCard label="Done Tasks" value={systemHealth.completedTasks} icon={CheckSquare} color="text-success" />
        <HealthCard label="Active Agents" value={systemHealth.activeAgents} icon={Bot} color="text-info" />
      </div>

      {/* KPI Progress Cards */}
      <div className="mb-8">
        <h2 className="heading-display text-sm mb-4 flex items-center gap-2">
          <Target className="h-4 w-4" /> KPIs
        </h2>
        {kpis.length === 0 ? (
          <Card className="p-6">
            <EmptyState icon={Target} title="No KPIs yet" description="Define KPIs to track progress toward your goals." />
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {kpis.map((kpi) => (
              <Card key={kpi.id} className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{kpi.name}</p>
                    <p className="text-xs text-fg-muted mt-0.5">
                      {kpi.current} / {kpi.target} {kpi.unit}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {kpi.direction === 'up' ? (
                      <TrendingUp className="h-4 w-4 text-success" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-info" />
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <ProgressRing value={kpi.progress} max={100} size={80} label={kpi.period} />
                  <div className="flex-1">
                    <div className="h-2 rounded-full bg-bg-tertiary overflow-hidden">
                      <div
                        className="h-full bg-accent-primary rounded-full transition-all"
                        style={{ width: `${kpi.progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-fg-muted mt-2">
                      {kpi.progress}% of target
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Goal Progress */}
      <div className="mb-8">
        <h2 className="heading-display text-sm mb-4 flex items-center gap-2">
          <Target className="h-4 w-4" /> Goals
        </h2>
        {goals.length === 0 ? (
          <Card className="p-6">
            <EmptyState icon={Target} title="No goals yet" description="Create goals to track your company's objectives." />
          </Card>
        ) : (
          <div className="space-y-3">
            {goals.map((goal) => (
              <Card key={goal.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-semibold">{goal.title}</span>
                      <Badge variant={priorityVariant[goal.priority] || 'default'} className="text-xs">
                        {goal.priority}
                      </Badge>
                      <Badge variant={statusVariant[goal.status] || 'default'} className="text-xs">
                        {goal.status}
                      </Badge>
                      <Badge variant="default" className="text-xs">{goal.type}</Badge>
                    </div>
                    {goal.description && (
                      <p className="text-sm text-fg-secondary">{goal.description}</p>
                    )}
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-fg-muted">Progress</span>
                        <span className="text-xs font-medium">{goal.progress}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-bg-tertiary overflow-hidden">
                        <div
                          className="h-full bg-accent-primary rounded-full transition-all"
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                    </div>
                    {goal.kpis.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {goal.kpis.map((k) => (
                          <span key={k.id} className="text-xs text-fg-muted border-2 px-2 py-0.5 rounded-sm" style={{ borderColor: 'var(--c-ink)' }}>
                            {k.name}: {k.current}/{k.target} {k.unit}
                          </span>
                        ))}
                      </div>
                    )}
                    {goal.dueDate && (
                      <p className="text-xs text-fg-muted mt-2">Due {new Date(goal.dueDate).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Agent Performance */}
      <div className="mb-8">
        <h2 className="heading-display text-sm mb-4 flex items-center gap-2">
          <Bot className="h-4 w-4" /> Agent Performance
        </h2>
        <Card className="p-5">
          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-4">
            <StatBox label="Total Runs" value={agentPerformance.totalRuns} />
            <StatBox
              label="Success Rate"
              value={`${agentPerformance.successRate}%`}
              color={agentPerformance.successRate >= 90 ? 'text-success' : 'text-warning'}
            />
            <StatBox label="Avg Duration" value={`${agentPerformance.avgDurationSec}s`} />
            <StatBox label="Tool Calls/Run" value={agentPerformance.toolCallsPerRun} />
          </div>

          {/* Status distribution donut */}
          {agentPerformance.totalRuns > 0 && (
            <div className="mb-6">
              <p className="label-mono mb-3">Runs by Status</p>
              <DonutChart
                data={Object.entries(agentPerformance.byStatus).map(([status, count]) => ({
                  label: status,
                  value: count,
                }))}
                size={160}
              />
            </div>
          )}

          {/* Agent table */}
          {agentPerformance.mostActiveAgents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2" style={{ borderColor: 'var(--c-ink)' }}>
                    <th className="text-left py-2 px-3 label-mono">Agent</th>
                    <th className="text-right py-2 px-3 label-mono">Runs</th>
                    <th className="text-right py-2 px-3 label-mono">Success Rate</th>
                    <th className="text-right py-2 px-3 label-mono">Avg Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {agentPerformance.mostActiveAgents.map((agent) => (
                    <tr key={agent.agentId} className="border-b" style={{ borderColor: 'var(--c-border)' }}>
                      <td className="py-2 px-3 font-medium">{agent.agentName}</td>
                      <td className="py-2 px-3 text-right">{agent.runs}</td>
                      <td className="py-2 px-3 text-right">
                        <span className={agent.successRate >= 90 ? 'text-success' : agent.successRate >= 50 ? 'text-warning' : 'text-danger'}>
                          {agent.successRate}%
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right text-fg-muted">{agent.avgDurationSec}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-fg-muted">No agent runs recorded yet.</p>
          )}
        </Card>
      </div>

      {/* Task Completion Chart */}
      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        <Card className="p-5">
          <h2 className="heading-display text-sm mb-4 flex items-center gap-2">
            <CheckSquare className="h-4 w-4" /> Task Completion
          </h2>
          <div className="flex items-center gap-6">
            <ProgressRing
              value={systemHealth.completedTasks}
              max={systemHealth.completedTasks + systemHealth.pendingTasks}
              label={`${systemHealth.completedTasks}/${systemHealth.completedTasks + systemHealth.pendingTasks} done`}
            />
            <div className="flex-1">
              <BarChart
                data={[
                  { label: 'Done', value: systemHealth.completedTasks, color: '#22c55e' },
                  { label: 'Pending', value: systemHealth.pendingTasks, color: '#f97316' },
                ]}
                height={120}
              />
            </div>
          </div>
        </Card>

        {/* Recent Metrics */}
        <Card className="p-5">
          <h2 className="heading-display text-sm mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Recent Metrics
          </h2>
          {recentMetrics.length === 0 ? (
            <p className="text-sm text-fg-muted">No metrics recorded yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {recentMetrics.slice(0, 8).map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 border-2 bg-surface"
                  style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Activity className="h-4 w-4 shrink-0 text-fg-muted" />
                    <span className="text-sm font-medium truncate">{m.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-semibold">
                      {m.value} {m.unit || ''}
                    </span>
                    <span className="text-xs text-fg-muted">
                      {new Date(m.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ── Helper components ──

function HealthCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: typeof Activity;
  color?: string;
}) {
  return (
    <div
      className="flex flex-col gap-2 p-4 border-2 bg-surface"
      style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-hard-sm)' }}
    >
      <Icon className="h-5 w-5 text-fg-muted" />
      <div>
        <p className="heading-display text-xl" style={color ? { color: 'var(--c-fg)' } : undefined}>
          {value}
        </p>
        <p className="label-mono">{label}</p>
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="p-3 border-2" style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}>
      <p className="label-mono">{label}</p>
      <p className={`heading-display text-xl ${color || ''}`}>{value}</p>
    </div>
  );
}
