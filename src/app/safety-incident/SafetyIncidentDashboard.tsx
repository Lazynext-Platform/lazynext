'use client';

import { useState, useMemo } from 'react';
import {
  AlertTriangle, Search, FileSearch, GitBranch, Wrench, BarChart3,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  SafetyIncident, IncidentInvestigation, RootCauseAnalysis, CorrectiveAction,
  SafetyIncidentMetrics, SafetyIncidentStats,
} from '@/lib/services/safety-incident-service';

type TabId = 'overview' | 'incidents' | 'investigations' | 'rcas' | 'correctiveActions';

interface SafetyIncidentDashboardProps {
  organizationId: string;
  incidents: SafetyIncident[];
  investigations: IncidentInvestigation[];
  rcas: RootCauseAnalysis[];
  correctiveActions: CorrectiveAction[];
  metrics: SafetyIncidentMetrics;
  stats: SafetyIncidentStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['active', 'completed', 'verified', 'executed', 'preferred', 'administered', 'boosted', 'resolved', 'mitigated', 'monitored', 'closed', 'reviewed', 'eliminated', 'implemented', 'approved', 'compliant', 'renewed'].includes(status)) return 'success';
  if (['draft', 'pending', 'placed', 'scheduled', 'planned', 'set', 'submitted', 'under_review', 'in_progress', 'in_review', 'investigating', 'reported', 'identified', 'assessed', 'controlled', 'enrolled'].includes(status)) return 'warning';
  if (['cancelled', 'expired', 'terminated', 'deactivated', 'missed', 'failed', 'suspended', 'overdue', 'refused', 'revoked', 'no_show', 'non_compliant', 'ineffective', 'deprecated', 'reopened'].includes(status)) return 'danger';
  return 'info';
};

export function SafetyIncidentDashboard({
  incidents, investigations, rcas, correctiveActions, metrics, stats,
}: SafetyIncidentDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const filteredIncidents = useMemo(() => {
    if (!search) return incidents;
    const q = search.toLowerCase();
    return incidents.filter(
      (i) => i.name.toLowerCase().includes(q) || i.type.toLowerCase().includes(q) || i.status.toLowerCase().includes(q),
    );
  }, [incidents, search]);

  const filteredInvestigations = useMemo(() => {
    if (!search) return investigations;
    const q = search.toLowerCase();
    return investigations.filter(
      (i) => i.name.toLowerCase().includes(q) || i.type.toLowerCase().includes(q) || i.status.toLowerCase().includes(q),
    );
  }, [investigations, search]);

  const filteredRCAs = useMemo(() => {
    if (!search) return rcas;
    const q = search.toLowerCase();
    return rcas.filter(
      (r) => r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q) || r.status.toLowerCase().includes(q),
    );
  }, [rcas, search]);

  const filteredCorrectiveActions = useMemo(() => {
    if (!search) return correctiveActions;
    const q = search.toLowerCase();
    return correctiveActions.filter(
      (a) => a.name.toLowerCase().includes(q) || a.type.toLowerCase().includes(q) || a.status.toLowerCase().includes(q),
    );
  }, [correctiveActions, search]);

  const tabs: { id: TabId; label: string; icon: typeof AlertTriangle }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'incidents', label: 'Incidents', icon: AlertTriangle },
    { id: 'investigations', label: 'Investigations', icon: FileSearch },
    { id: 'rcas', label: 'RCAs', icon: GitBranch },
    { id: 'correctiveActions', label: 'Corrective Actions', icon: Wrench },
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
              <div className="text-xs text-fg-tertiary">Reported Incidents</div>
              <div className="mt-1 text-2xl font-bold">{metrics.reportedIncidents}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Investigations</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeInvestigations}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Completed RCAs</div>
              <div className="mt-1 text-2xl font-bold">{metrics.completedRCAs}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Corrective Actions</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeCorrectiveActions}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Overdue Actions</div>
              <div className="mt-1 text-2xl font-bold">{metrics.overdueActions}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Incident Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byIncidentType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Incident Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byIncidentStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Investigation Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byInvestigationStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Corrective Action Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byCorrectiveActionStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'incidents' && (
        <div className="space-y-3">
          {filteredIncidents.length === 0 ? (
            <Card className="p-8"><EmptyState icon={AlertTriangle} title="No safety incidents" description="Safety incident records will appear here." /></Card>
          ) : (
            filteredIncidents.map((i) => (
              <Card key={i.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{i.name}</div>
                    <div className="text-sm text-fg-secondary">{i.type.replace('_', ' ')} · {i.location || 'No location'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {i.severity && <Badge variant="default">{i.severity}</Badge>}
                    <Badge variant={statusVariant(i.status)}>{i.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'investigations' && (
        <div className="space-y-3">
          {filteredInvestigations.length === 0 ? (
            <Card className="p-8"><EmptyState icon={FileSearch} title="No investigations" description="Incident investigation records will appear here." /></Card>
          ) : (
            filteredInvestigations.map((i) => (
              <Card key={i.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{i.name}</div>
                    <div className="text-sm text-fg-secondary">{i.type.replace('_', ' ')} · {i.investigator || 'No investigator'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant(i.status)}>{i.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'rcas' && (
        <div className="space-y-3">
          {filteredRCAs.length === 0 ? (
            <Card className="p-8"><EmptyState icon={GitBranch} title="No root cause analyses" description="Root cause analysis records will appear here." /></Card>
          ) : (
            filteredRCAs.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-sm text-fg-secondary">{r.type.replace('_', ' ')} · {r.analyst || 'No analyst'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant(r.status)}>{r.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'correctiveActions' && (
        <div className="space-y-3">
          {filteredCorrectiveActions.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Wrench} title="No corrective actions" description="Corrective action records will appear here." /></Card>
          ) : (
            filteredCorrectiveActions.map((a) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{a.name}</div>
                    <div className="text-sm text-fg-secondary">{a.type.replace('_', ' ')} · {a.assignedTo || 'Unassigned'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.priority && <Badge variant="default">{a.priority}</Badge>}
                    {a.cost > 0 && <Badge variant="default">${a.cost}</Badge>}
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
