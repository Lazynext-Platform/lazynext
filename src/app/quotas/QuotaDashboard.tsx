'use client';

import { Card } from '@/components/ui';

interface QuotaCheckResult {
  allowed: boolean;
  current: number;
  max: number;
}

interface UsageSummary {
  quota: {
    id: string;
    organizationId: string;
    workspaceId: string;
    maxAgents: number;
    maxTasks: number;
    maxDocuments: number;
    maxAutomations: number;
    maxTickets: number;
    maxStorageMb: number;
    maxAgentRunsPerDay: number;
    maxSandboxRunsPerDay: number;
  };
  usage: {
    agents: QuotaCheckResult;
    tasks: QuotaCheckResult;
    documents: QuotaCheckResult;
    automations: QuotaCheckResult;
    tickets: QuotaCheckResult;
    agentRuns: QuotaCheckResult;
    sandboxRuns: QuotaCheckResult;
  };
}

interface QuotaDashboardProps {
  summary: UsageSummary;
  workspaceId: string;
}

function getColorClass(percentage: number): string {
  if (percentage > 90) return 'bg-danger';
  if (percentage >= 70) return 'bg-warning';
  return 'bg-success';
}

function getTextColorClass(percentage: number): string {
  if (percentage > 90) return 'text-danger';
  if (percentage >= 70) return 'text-warning';
  return 'text-success';
}

function UsageBar({
  label,
  current,
  max,
  unit,
}: {
  label: string;
  current: number;
  max: number;
  unit?: string;
}) {
  const percentage = max > 0 ? Math.round((current / max) * 100) : 0;
  const barWidth = Math.min(percentage, 100);
  const colorClass = getColorClass(percentage);
  const textClass = getTextColorClass(percentage);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className={`text-sm font-semibold ${textClass}`}>
          {current.toLocaleString()} / {max.toLocaleString()}{unit ? ` ${unit}` : ''}
          <span className="ml-2 text-fg-muted">({percentage}%)</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-border">
        <div
          className={`h-full rounded-full transition-all ${colorClass}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
}

export function QuotaDashboard({ summary }: QuotaDashboardProps) {
  const { quota, usage } = summary;

  return (
    <div className="space-y-6">
      {/* Resource Quotas */}
      <Card className="p-6">
        <h2 className="heading-display text-sm mb-6">Resource Limits</h2>
        <div className="space-y-5">
          <UsageBar label="Agents" current={usage.agents.current} max={usage.agents.max} />
          <UsageBar label="Tasks" current={usage.tasks.current} max={usage.tasks.max} />
          <UsageBar label="Documents" current={usage.documents.current} max={usage.documents.max} />
          <UsageBar label="Automations" current={usage.automations.current} max={usage.automations.max} />
          <UsageBar label="Tickets" current={usage.tickets.current} max={usage.tickets.max} />
        </div>
      </Card>

      {/* Daily Run Limits */}
      <Card className="p-6">
        <h2 className="heading-display text-sm mb-6">Daily Run Limits (last 24h)</h2>
        <div className="space-y-5">
          <UsageBar label="Agent Runs" current={usage.agentRuns.current} max={usage.agentRuns.max} />
          <UsageBar label="Sandbox Runs" current={usage.sandboxRuns.current} max={usage.sandboxRuns.max} />
        </div>
      </Card>

      {/* Storage */}
      <Card className="p-6">
        <h2 className="heading-display text-sm mb-6">Storage</h2>
        <UsageBar label="Storage" current={0} max={quota.maxStorageMb} unit="MB" />
        <p className="text-xs text-fg-muted mt-3">
          Storage usage tracking is calculated from stored files. Contact your administrator to adjust limits.
        </p>
      </Card>

      {/* Quota Details */}
      <Card className="p-6">
        <h2 className="heading-display text-sm mb-4">Quota Configuration</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-fg-muted">Max Agents</p>
            <p className="text-sm font-semibold">{quota.maxAgents}</p>
          </div>
          <div>
            <p className="text-xs text-fg-muted">Max Tasks</p>
            <p className="text-sm font-semibold">{quota.maxTasks.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-fg-muted">Max Documents</p>
            <p className="text-sm font-semibold">{quota.maxDocuments.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-fg-muted">Max Automations</p>
            <p className="text-sm font-semibold">{quota.maxAutomations}</p>
          </div>
          <div>
            <p className="text-xs text-fg-muted">Max Tickets</p>
            <p className="text-sm font-semibold">{quota.maxTickets.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-fg-muted">Max Storage</p>
            <p className="text-sm font-semibold">{quota.maxStorageMb.toLocaleString()} MB</p>
          </div>
          <div>
            <p className="text-xs text-fg-muted">Agent Runs / Day</p>
            <p className="text-sm font-semibold">{quota.maxAgentRunsPerDay}</p>
          </div>
          <div>
            <p className="text-xs text-fg-muted">Sandbox Runs / Day</p>
            <p className="text-sm font-semibold">{quota.maxSandboxRunsPerDay}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
