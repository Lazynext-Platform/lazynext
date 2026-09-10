'use client';

import { useState, useMemo } from 'react';
import {
  FileBarChart, BookOpen, Eye, ShieldCheck, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  SustainabilityReport, ReportingFramework, SustainabilityDisclosure, AssuranceEngagement,
  SustainabilityReportingMetrics, SustainabilityReportingStats,
} from '@/lib/services/sustainability-reporting-service';

type TabId = 'overview' | 'reports' | 'frameworks' | 'disclosures' | 'assurances';

interface SustainabilityReportingDashboardProps {
  organizationId: string;
  reports: SustainabilityReport[];
  frameworks: ReportingFramework[];
  disclosures: SustainabilityDisclosure[];
  assurances: AssuranceEngagement[];
  metrics: SustainabilityReportingMetrics;
  stats: SustainabilityReportingStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['active', 'completed', 'verified', 'executed', 'preferred', 'approved', 'achieved', 'adopted', 'published'].includes(status)) return 'success';
  if (['draft', 'pending', 'placed', 'scheduled', 'planned', 'set', 'submitted', 'under_review', 'in_review', 'in_progress', 'evaluating', 'held', 'reviewed'].includes(status)) return 'warning';
  if (['cancelled', 'expired', 'terminated', 'deactivated', 'missed', 'failed', 'suspended', 'revoked', 'rejected', 'deprecated', 'archived'].includes(status)) return 'danger';
  return 'info';
};

export function SustainabilityReportingDashboard({
  reports, frameworks, disclosures, assurances, metrics, stats,
}: SustainabilityReportingDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const filteredReports = useMemo(() => {
    if (!search) return reports;
    const q = search.toLowerCase();
    return reports.filter(
      (r) => r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q) || r.status.toLowerCase().includes(q),
    );
  }, [reports, search]);

  const filteredFrameworks = useMemo(() => {
    if (!search) return frameworks;
    const q = search.toLowerCase();
    return frameworks.filter(
      (f) => f.name.toLowerCase().includes(q) || f.type.toLowerCase().includes(q) || f.status.toLowerCase().includes(q),
    );
  }, [frameworks, search]);

  const filteredDisclosures = useMemo(() => {
    if (!search) return disclosures;
    const q = search.toLowerCase();
    return disclosures.filter(
      (d) => d.name.toLowerCase().includes(q) || d.type.toLowerCase().includes(q) || d.status.toLowerCase().includes(q),
    );
  }, [disclosures, search]);

  const filteredAssurances = useMemo(() => {
    if (!search) return assurances;
    const q = search.toLowerCase();
    return assurances.filter(
      (a) => a.name.toLowerCase().includes(q) || a.type.toLowerCase().includes(q) || a.status.toLowerCase().includes(q),
    );
  }, [assurances, search]);

  const tabs: { id: TabId; label: string; icon: typeof FileBarChart }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'reports', label: 'Reports', icon: FileBarChart },
    { id: 'frameworks', label: 'Frameworks', icon: BookOpen },
    { id: 'disclosures', label: 'Disclosures', icon: Eye },
    { id: 'assurances', label: 'Assurances', icon: ShieldCheck },
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
              <div className="text-xs text-fg-tertiary">Published Reports</div>
              <div className="mt-1 text-2xl font-bold">{metrics.publishedReports}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Frameworks</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeFrameworks}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Published Disclosures</div>
              <div className="mt-1 text-2xl font-bold">{metrics.publishedDisclosures}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Completed Assurances</div>
              <div className="mt-1 text-2xl font-bold">{metrics.completedAssurances}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Draft Reports</div>
              <div className="mt-1 text-2xl font-bold">{metrics.draftReports}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Report Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byReportType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Report Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byReportStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Framework Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byFrameworkStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'reports' && (
        <div className="space-y-3">
          {filteredReports.length === 0 ? (
            <Card className="p-8"><EmptyState icon={FileBarChart} title="No sustainability reports" description="Sustainability reports will appear here." /></Card>
          ) : (
            filteredReports.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-sm text-fg-secondary">{r.type.replace('_', ' ')} · {r.framework || 'No framework'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.period && <Badge variant="default">{r.period}</Badge>}
                    <Badge variant={statusVariant(r.status)}>{r.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'frameworks' && (
        <div className="space-y-3">
          {filteredFrameworks.length === 0 ? (
            <Card className="p-8"><EmptyState icon={BookOpen} title="No reporting frameworks" description="Reporting frameworks will appear here." /></Card>
          ) : (
            filteredFrameworks.map((f) => (
              <Card key={f.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{f.name}</div>
                    <div className="text-sm text-fg-secondary">{f.type.replace('_', ' ')} · {f.version || 'No version'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {f.requirements && <Badge variant="default">{f.requirements}</Badge>}
                    <Badge variant={statusVariant(f.status)}>{f.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'disclosures' && (
        <div className="space-y-3">
          {filteredDisclosures.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Eye} title="No disclosures" description="Sustainability disclosures will appear here." /></Card>
          ) : (
            filteredDisclosures.map((d) => (
              <Card key={d.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{d.name}</div>
                    <div className="text-sm text-fg-secondary">{d.type.replace('_', ' ')} · {d.metric || 'No metric'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {d.value && <Badge variant="default">{d.value} {d.unit}</Badge>}
                    <Badge variant={statusVariant(d.status)}>{d.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'assurances' && (
        <div className="space-y-3">
          {filteredAssurances.length === 0 ? (
            <Card className="p-8"><EmptyState icon={ShieldCheck} title="No assurance engagements" description="Assurance engagements will appear here." /></Card>
          ) : (
            filteredAssurances.map((a) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{a.name}</div>
                    <div className="text-sm text-fg-secondary">{a.type.replace('_', ' ')} · {a.provider || 'No provider'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.scope && <Badge variant="default">{a.scope}</Badge>}
                    <Badge variant={statusVariant(a.status)}>{a.status.replace('_', ' ')}</Badge>
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
