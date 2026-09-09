'use client';

import { useState } from 'react';
import {
  Gavel,
  FileText,
  CheckCircle,
  AlertTriangle,
  Clock,
  Shield,
  Loader2,
  XCircle,
  TrendingUp,
} from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';

// ── Types (mirror server-side records) ──

interface ComplianceSummary {
  byStatus: Record<string, number>;
  bySeverity: Record<string, number>;
  total: number;
  passRate: number;
}

interface RetentionItem {
  dataType: string;
  ruleId: string;
  retentionDays: number;
  action: string;
  count: number;
  oldestDate: Date | null;
}

interface GovernanceDashboardData {
  policies: {
    total: number;
    active: number;
    draft: number;
    archived: number;
  };
  compliance: ComplianceSummary;
  retention: {
    rulesCount: number;
    itemsNeedingAction: number;
    items: RetentionItem[];
  };
  recentAudit: Array<{ id: string; action: string; createdAt: Date }>;
}

interface PolicyRecord {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  version: number;
  createdAt: Date;
}

interface ComplianceCheckRecord {
  id: string;
  checkName: string;
  description: string | null;
  status: string;
  severity: string;
  remediation: string | null;
  checkedAt: Date;
}

interface RetentionRuleRecord {
  id: string;
  dataType: string;
  retentionDays: number;
  action: string;
  enabled: boolean;
}

interface GovernanceDashboardProps {
  organizationId: string;
  dashboard: GovernanceDashboardData;
  policies: PolicyRecord[];
  checks: ComplianceCheckRecord[];
  retentionRules: RetentionRuleRecord[];
}

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  passed: 'success',
  failed: 'danger',
  warning: 'warning',
  pending: 'info',
  not_applicable: 'default',
  active: 'success',
  draft: 'info',
  archived: 'default',
  superseded: 'default',
};

const severityVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  critical: 'danger',
  high: 'warning',
  medium: 'info',
  low: 'default',
};

const statusIcon: Record<string, typeof CheckCircle> = {
  passed: CheckCircle,
  failed: XCircle,
  warning: AlertTriangle,
  pending: Clock,
  not_applicable: Clock,
};

export function GovernanceDashboard({
  organizationId,
  dashboard: initialDashboard,
  policies: initialPolicies,
  checks: initialChecks,
  retentionRules: initialRetentionRules,
}: GovernanceDashboardProps) {
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [checks, setChecks] = useState(initialChecks);
  const [policies] = useState(initialPolicies);
  const [retentionRules] = useState(initialRetentionRules);

  async function handleRunChecks() {
    setRunning(true);
    setRunResult(null);
    try {
      const res = await fetch('/api/governance/checks/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId }),
      });
      const data = await res.json();
      if (res.ok) {
        setRunResult(`Ran ${data.count} compliance check(s).`);
        // Refresh summary and checks
        const [summaryRes, checksRes] = await Promise.all([
          fetch(`/api/governance/checks/summary?organizationId=${organizationId}`),
          fetch(`/api/governance/checks?organizationId=${organizationId}&limit=20`),
        ]);
        if (summaryRes.ok) {
          const summaryData = await summaryRes.json();
          setDashboard((prev) => ({ ...prev, compliance: summaryData.summary }));
        }
        if (checksRes.ok) {
          const checksData = await checksRes.json();
          setChecks(checksData.checks);
        }
      } else {
        setRunResult('Failed to run compliance checks. Please try again.');
      }
    } catch {
      setRunResult('Failed to run compliance checks. Please try again.');
    } finally {
      setRunning(false);
    }
  }

  const summaryCards = [
    { key: 'passed', label: 'Passed', count: dashboard.compliance.byStatus.passed || 0, icon: CheckCircle, variant: 'success' as const },
    { key: 'failed', label: 'Failed', count: dashboard.compliance.byStatus.failed || 0, icon: XCircle, variant: 'danger' as const },
    { key: 'warning', label: 'Warnings', count: dashboard.compliance.byStatus.warning || 0, icon: AlertTriangle, variant: 'warning' as const },
    { key: 'passRate', label: 'Pass Rate', count: `${dashboard.compliance.passRate}%`, icon: TrendingUp, variant: 'accent' as const },
  ];

  return (
    <div className="space-y-6">
      {/* Compliance summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.key} className="p-4">
              <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
                <Icon className="h-3 w-3" /> {card.label}
              </div>
              <div className="text-2xl font-semibold">{card.count}</div>
            </Card>
          );
        })}
      </div>

      {/* Run checks action */}
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4 text-accent-primary" />
              <h2 className="heading-display text-sm">Compliance Checks</h2>
            </div>
            <p className="text-xs text-fg-secondary">
              Run automated compliance checks for token security, workspace isolation, audit coverage, and data retention.
            </p>
          </div>
          <Button onClick={handleRunChecks} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
            {running ? 'Running...' : 'Run Compliance Checks'}
          </Button>
        </div>
        {runResult && (
          <div className="mt-3 text-xs text-fg-secondary bg-bg-secondary rounded-lg p-3">
            {runResult}
          </div>
        )}
      </Card>

      {/* Policies list */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-4 w-4 text-accent-primary" />
          <h2 className="heading-display text-sm">Policies</h2>
          <Badge variant="default" className="text-xs">{dashboard.policies.total} total</Badge>
          <Badge variant="success" className="text-xs">{dashboard.policies.active} active</Badge>
        </div>
        {policies.length === 0 ? (
          <Card className="p-6">
            <div className="flex items-center gap-2 text-sm text-fg-secondary">
              <FileText className="h-4 w-4 text-fg-muted" />
              No policies defined yet.
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {policies.map((policy) => (
              <Card key={policy.id} className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-medium">{policy.title}</span>
                      <Badge variant={statusVariant[policy.status] || 'default'} className="text-xs">
                        {policy.status}
                      </Badge>
                      <Badge variant="info" className="text-xs">{policy.type}</Badge>
                      <Badge variant="default" className="text-xs">v{policy.version}</Badge>
                    </div>
                    {policy.description && (
                      <p className="text-xs text-fg-secondary truncate">{policy.description}</p>
                    )}
                    <div className="text-xs text-fg-muted mt-1">
                      {new Date(policy.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Retention rules table */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-accent-primary" />
          <h2 className="heading-display text-sm">Data Retention Rules</h2>
          {dashboard.retention.itemsNeedingAction > 0 && (
            <Badge variant="warning" className="text-xs">
              {dashboard.retention.itemsNeedingAction} needing action
            </Badge>
          )}
        </div>
        {retentionRules.length === 0 ? (
          <Card className="p-6">
            <div className="flex items-center gap-2 text-sm text-fg-secondary">
              <Clock className="h-4 w-4 text-fg-muted" />
              No retention rules configured.
            </div>
          </Card>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-fg-secondary">
                  <th className="px-4 py-2 font-medium">Data Type</th>
                  <th className="px-4 py-2 font-medium">Retention</th>
                  <th className="px-4 py-2 font-medium">Action</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {retentionRules.map((rule) => (
                  <tr key={rule.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 font-mono text-xs">{rule.dataType}</td>
                    <td className="px-4 py-2">{rule.retentionDays} days</td>
                    <td className="px-4 py-2">
                      <Badge variant="info" className="text-xs">{rule.action}</Badge>
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant={rule.enabled ? 'success' : 'default'} className="text-xs">
                        {rule.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>

      {/* Recent compliance checks */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Gavel className="h-4 w-4 text-accent-primary" />
          <h2 className="heading-display text-sm">Recent Compliance Checks</h2>
        </div>
        {checks.length === 0 ? (
          <Card className="p-6">
            <div className="flex items-center gap-2 text-sm text-fg-secondary">
              <CheckCircle className="h-4 w-4 text-fg-muted" />
              No compliance checks recorded yet.
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {checks.map((check) => {
              const Icon = statusIcon[check.status] || Clock;
              return (
                <Card key={check.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Icon className="h-3 w-3 text-fg-secondary" />
                        <span className="text-sm font-medium">{check.checkName}</span>
                        <Badge variant={statusVariant[check.status] || 'default'} className="text-xs">
                          {check.status}
                        </Badge>
                        <Badge variant={severityVariant[check.severity] || 'default'} className="text-xs">
                          {check.severity}
                        </Badge>
                      </div>
                      {check.description && (
                        <p className="text-xs text-fg-secondary">{check.description}</p>
                      )}
                      {check.remediation && (
                        <p className="text-xs text-warning mt-1">⚠ {check.remediation}</p>
                      )}
                      <div className="text-xs text-fg-muted mt-1">
                        {new Date(check.checkedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
