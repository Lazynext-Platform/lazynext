'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  AlertTriangle, Shield, Phone, Activity,
  Search, BarChart3,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  CrisisPlan, CrisisIncident, CrisisContact, CrisisDrill,
  CrisisMetrics, CrisisStats,
} from '@/lib/services/crisis-service';

type TabId = 'overview' | 'plans' | 'incidents' | 'contacts' | 'drills';

interface CrisisDashboardProps {
  organizationId: string;
  plans: CrisisPlan[];
  incidents: CrisisIncident[];
  contacts: CrisisContact[];
  drills: CrisisDrill[];
  metrics: CrisisMetrics;
  stats: CrisisStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['approved', 'active', 'resolved', 'closed', 'completed', 'available'].includes(status)) return 'success';
  if (['draft', 'under_review', 'reported', 'assessed', 'scheduled', 'standby'].includes(status)) return 'warning';
  if (['archived', 'cancelled', 'unavailable', 'failed'].includes(status)) return 'danger';
  return 'info';
};

const severityVariant = (severity: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (severity === 'low') return 'success';
  if (severity === 'medium') return 'warning';
  if (severity === 'high') return 'danger';
  if (severity === 'critical') return 'danger';
  return 'default';
};

export function CrisisDashboard({
  plans, incidents, contacts, drills, metrics, stats,
}: CrisisDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const planName = useCallback(
    (id: string) => plans.find((p) => p.id === id)?.name || id,
    [plans],
  );

  const filteredPlans = useMemo(() => {
    if (!search) return plans;
    const q = search.toLowerCase();
    return plans.filter(
      (p) => p.name.toLowerCase().includes(q) || p.crisisType.toLowerCase().includes(q) || p.status.toLowerCase().includes(q),
    );
  }, [plans, search]);

  const filteredIncidents = useMemo(() => {
    if (!search) return incidents;
    const q = search.toLowerCase();
    return incidents.filter(
      (i) => i.title.toLowerCase().includes(q) || i.crisisType.toLowerCase().includes(q) || i.status.toLowerCase().includes(q),
    );
  }, [incidents, search]);

  const filteredContacts = useMemo(() => {
    if (!search) return contacts;
    const q = search.toLowerCase();
    return contacts.filter(
      (c) => c.name.toLowerCase().includes(q) || c.role.toLowerCase().includes(q) || c.status.toLowerCase().includes(q),
    );
  }, [contacts, search]);

  const filteredDrills = useMemo(() => {
    if (!search) return drills;
    const q = search.toLowerCase();
    return drills.filter(
      (d) => d.name.toLowerCase().includes(q) || d.type.toLowerCase().includes(q) || d.status.toLowerCase().includes(q),
    );
  }, [drills, search]);

  const tabs: { id: TabId; label: string; icon: typeof AlertTriangle }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'plans', label: 'Plans', icon: Shield },
    { id: 'incidents', label: 'Incidents', icon: AlertTriangle },
    { id: 'contacts', label: 'Contacts', icon: Phone },
    { id: 'drills', label: 'Drills', icon: Activity },
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
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Incidents</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeIncidents}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Plans Coverage</div>
              <div className="mt-1 text-2xl font-bold">{metrics.plansCoverage}%</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Drill Readiness</div>
              <div className="mt-1 text-2xl font-bold">{metrics.drillReadiness}%</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Avg Response (hrs)</div>
              <div className="mt-1 text-2xl font-bold">{metrics.responseTime}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Incident Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byIncidentStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Severity Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.bySeverity).map(([severity, count]) => (
                <Badge key={severity} variant={severityVariant(severity)}>{severity}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'plans' && (
        <div className="space-y-3">
          {filteredPlans.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Shield} title="No plans" description="Crisis plans will appear here." /></Card>
          ) : (
            filteredPlans.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-fg-secondary">{p.crisisType.replace('_', ' ')} · v{p.version}</div>
                  </div>
                  <Badge variant={statusVariant(p.status)}>{p.status.replace('_', ' ')}</Badge>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'incidents' && (
        <div className="space-y-3">
          {filteredIncidents.length === 0 ? (
            <Card className="p-8"><EmptyState icon={AlertTriangle} title="No incidents" description="Crisis incidents will appear here." /></Card>
          ) : (
            filteredIncidents.map((i) => (
              <Card key={i.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{i.title}</div>
                    <div className="text-sm text-fg-secondary">{i.crisisType.replace('_', ' ')} · {new Date(i.reportedDate).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={severityVariant(i.severity)}>{i.severity}</Badge>
                    <Badge variant={statusVariant(i.status)}>{i.status}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'contacts' && (
        <div className="space-y-3">
          {filteredContacts.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Phone} title="No contacts" description="Crisis contacts will appear here." /></Card>
          ) : (
            filteredContacts.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-sm text-fg-secondary">{c.role.replace('_', ' ')} · {c.department} · {c.phone}</div>
                  </div>
                  <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'drills' && (
        <div className="space-y-3">
          {filteredDrills.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Activity} title="No drills" description="Crisis drills will appear here." /></Card>
          ) : (
            filteredDrills.map((d) => (
              <Card key={d.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{d.name}</div>
                    <div className="text-sm text-fg-secondary">{d.type.replace('_', ' ')} · {new Date(d.scheduledDate).toLocaleDateString()}</div>
                  </div>
                  <Badge variant={statusVariant(d.status)}>{d.status}</Badge>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
