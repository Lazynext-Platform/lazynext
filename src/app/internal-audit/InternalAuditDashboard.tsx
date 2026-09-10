'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  ClipboardCheck, AlertTriangle, Calendar, Wrench,
  Search, BarChart3,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  AuditPlan, AuditFinding, AuditSchedule, AuditRemediation,
  InternalAuditMetrics, InternalAuditStats,
} from '@/lib/services/internal-audit-service';

type TabId = 'overview' | 'plans' | 'findings' | 'schedules' | 'remediations';

interface InternalAuditDashboardProps {
  organizationId: string;
  plans: AuditPlan[];
  findings: AuditFinding[];
  schedules: AuditSchedule[];
  remediations: AuditRemediation[];
  metrics: InternalAuditMetrics;
  stats: InternalAuditStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['completed', 'verified', 'remediated', 'filed', 'approved'].includes(status)) return 'success';
  if (['planned', 'in_progress', 'fieldwork', 'reporting', 'scheduled', 'not_started', 'pending', 'published', 'active'].includes(status)) return 'warning';
  if (['cancelled', 'overdue', 'critical', 'breach', 'rejected', 'postponed'].includes(status)) return 'danger';
  return 'info';
};

const severityVariant = (severity: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (severity === 'low') return 'info';
  if (severity === 'medium') return 'warning';
  if (severity === 'high') return 'danger';
  if (severity === 'critical') return 'danger';
  return 'default';
};

export function InternalAuditDashboard({
  plans, findings, schedules, remediations, metrics, stats,
}: InternalAuditDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const planTitle = useCallback(
    (id: string) => plans.find((p) => p.id === id)?.title || id,
    [plans],
  );

  const filteredPlans = useMemo(() => {
    if (!search) return plans;
    const q = search.toLowerCase();
    return plans.filter(
      (p) => p.title.toLowerCase().includes(q) || p.auditType.toLowerCase().includes(q) || p.status.toLowerCase().includes(q),
    );
  }, [plans, search]);

  const filteredFindings = useMemo(() => {
    if (!search) return findings;
    const q = search.toLowerCase();
    return findings.filter(
      (f) => f.title.toLowerCase().includes(q) || f.severity.toLowerCase().includes(q) || f.status.toLowerCase().includes(q),
    );
  }, [findings, search]);

  const filteredSchedules = useMemo(() => {
    if (!search) return schedules;
    const q = search.toLowerCase();
    return schedules.filter(
      (s) => s.title.toLowerCase().includes(q) || planTitle(s.planId).toLowerCase().includes(q) || s.status.toLowerCase().includes(q),
    );
  }, [schedules, search, planTitle]);

  const filteredRemediations = useMemo(() => {
    if (!search) return remediations;
    const q = search.toLowerCase();
    return remediations.filter(
      (r) => r.action.toLowerCase().includes(q) || r.status.toLowerCase().includes(q) || r.owner.toLowerCase().includes(q),
    );
  }, [remediations, search]);

  const tabs: { id: TabId; label: string; icon: typeof ClipboardCheck }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'plans', label: 'Plans', icon: ClipboardCheck },
    { id: 'findings', label: 'Findings', icon: AlertTriangle },
    { id: 'schedules', label: 'Schedules', icon: Calendar },
    { id: 'remediations', label: 'Remediations', icon: Wrench },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-accent-primary text-white' : 'bg-bg-secondary text-fg-secondary hover:bg-bg-tertiary'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab !== 'overview' && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-tertiary" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border-primary bg-bg-primary px-10 py-2 text-sm focus:border-accent-primary focus:outline-none"
          />
        </div>
      )}

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Open Findings</div>
              <div className="mt-1 text-2xl font-bold">{metrics.openFindings}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Critical Findings</div>
              <div className="mt-1 text-2xl font-bold">{metrics.criticalFindings}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Remediation Rate</div>
              <div className="mt-1 text-2xl font-bold">{metrics.remediationRate}%</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Overdue Remediations</div>
              <div className="mt-1 text-2xl font-bold">{metrics.overdueRemediations}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Plans</div>
              <div className="mt-1 text-2xl font-bold">{stats.activePlanCount}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Audit Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byAuditType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Finding Severity Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byFindingSeverity).map(([sev, count]) => (
                <Badge key={sev} variant={severityVariant(sev)}>{sev}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Remediation Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byRemediationStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'plans' && (
        <div className="space-y-3">
          {filteredPlans.length === 0 ? (
            <Card className="p-8"><EmptyState icon={ClipboardCheck} title="No audit plans" description="Audit plans will appear here." /></Card>
          ) : (
            filteredPlans.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.title}</div>
                    <div className="text-sm text-fg-secondary">{p.auditType.replace('_', ' ')} · {p.leadAuditor || 'Unassigned'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.budget > 0 && <Badge variant="default">${p.budget.toLocaleString()}</Badge>}
                    <Badge variant={statusVariant(p.status)}>{p.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'findings' && (
        <div className="space-y-3">
          {filteredFindings.length === 0 ? (
            <Card className="p-8"><EmptyState icon={AlertTriangle} title="No findings" description="Audit findings will appear here." /></Card>
          ) : (
            filteredFindings.map((f) => (
              <Card key={f.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{f.title}</div>
                    <div className="text-sm text-fg-secondary">{f.auditType.replace('_', ' ')} · {f.identifiedBy || 'Unknown'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={severityVariant(f.severity)}>{f.severity}</Badge>
                    <Badge variant={statusVariant(f.status)}>{f.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'schedules' && (
        <div className="space-y-3">
          {filteredSchedules.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Calendar} title="No schedules" description="Audit schedules will appear here." /></Card>
          ) : (
            filteredSchedules.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{s.title}</div>
                    <div className="text-sm text-fg-secondary">{planTitle(s.planId)} · {new Date(s.scheduledDate).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.duration > 0 && <Badge variant="default">{s.duration}h</Badge>}
                    <Badge variant={statusVariant(s.status)}>{s.status}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'remediations' && (
        <div className="space-y-3">
          {filteredRemediations.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Wrench} title="No remediations" description="Remediation actions will appear here." /></Card>
          ) : (
            filteredRemediations.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{r.action}</div>
                    <div className="text-sm text-fg-secondary">{r.owner || 'Unassigned'} · {r.dueDate ? new Date(r.dueDate).toLocaleDateString() : 'No due date'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">{r.progress}%</Badge>
                    <Badge variant={statusVariant(r.status)}>{r.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
