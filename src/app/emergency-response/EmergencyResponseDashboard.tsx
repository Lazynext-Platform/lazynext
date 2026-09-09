'use client';

import { useState, useMemo } from 'react';
import {
  Siren, ClipboardList, AlertTriangle, Route, Phone, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  EmergencyPlan, EmergencyDrill, EvacuationRoute, EmergencyContact,
  EmergencyResponseMetrics, EmergencyResponseStats,
} from '@/lib/services/emergency-response-service';

type TabId = 'overview' | 'plans' | 'drills' | 'routes' | 'contacts';

interface EmergencyResponseDashboardProps {
  organizationId: string;
  plans: EmergencyPlan[];
  drills: EmergencyDrill[];
  routes: EvacuationRoute[];
  contacts: EmergencyContact[];
  metrics: EmergencyResponseMetrics;
  stats: EmergencyResponseStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['active', 'completed', 'verified', 'executed', 'approved', 'implemented', 'tested', 'published', 'sent', 'responded'].includes(status)) return 'success';
  if (['draft', 'pending', 'placed', 'scheduled', 'planned', 'set', 'submitted', 'under_review', 'in_progress', 'standby', 'testing', 'received', 'responding'].includes(status)) return 'warning';
  if (['cancelled', 'expired', 'terminated', 'deactivated', 'missed', 'failed', 'suspended', 'deprecated', 'archived', 'blocked', 'unreachable', 'retracted', 'declined', 'decommissioned', 'paused'].includes(status)) return 'danger';
  return 'info';
};

export function EmergencyResponseDashboard({
  plans, drills, routes, contacts, metrics, stats,
}: EmergencyResponseDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const filteredPlans = useMemo(() => {
    if (!search) return plans;
    const q = search.toLowerCase();
    return plans.filter(
      (p) => p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q) || p.status.toLowerCase().includes(q),
    );
  }, [plans, search]);

  const filteredDrills = useMemo(() => {
    if (!search) return drills;
    const q = search.toLowerCase();
    return drills.filter(
      (d) => d.name.toLowerCase().includes(q) || d.type.toLowerCase().includes(q) || d.status.toLowerCase().includes(q),
    );
  }, [drills, search]);

  const filteredRoutes = useMemo(() => {
    if (!search) return routes;
    const q = search.toLowerCase();
    return routes.filter(
      (r) => r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q) || r.status.toLowerCase().includes(q),
    );
  }, [routes, search]);

  const filteredContacts = useMemo(() => {
    if (!search) return contacts;
    const q = search.toLowerCase();
    return contacts.filter(
      (c) => c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q) || c.status.toLowerCase().includes(q),
    );
  }, [contacts, search]);

  const tabs: { id: TabId; label: string; icon: typeof Siren }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'plans', label: 'Plans', icon: ClipboardList },
    { id: 'drills', label: 'Drills', icon: AlertTriangle },
    { id: 'routes', label: 'Routes', icon: Route },
    { id: 'contacts', label: 'Contacts', icon: Phone },
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
              <div className="text-xs text-fg-tertiary">Active Plans</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activePlans}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Scheduled Drills</div>
              <div className="mt-1 text-2xl font-bold">{metrics.scheduledDrills}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Routes</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeRoutes}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Contacts</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeContacts}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Completed Drills</div>
              <div className="mt-1 text-2xl font-bold">{metrics.completedDrills}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Plan Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byPlanType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Plan Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byPlanStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Drill Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byDrillStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'plans' && (
        <div className="space-y-3">
          {filteredPlans.length === 0 ? (
            <Card className="p-8"><EmptyState icon={ClipboardList} title="No emergency plans" description="Emergency plans will appear here." /></Card>
          ) : (
            filteredPlans.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-fg-secondary">{p.type.replace('_', ' ')} · {p.responsiblePerson || 'No responsible person'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.severity && <Badge variant="default">{p.severity}</Badge>}
                    <Badge variant={statusVariant(p.status)}>{p.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'drills' && (
        <div className="space-y-3">
          {filteredDrills.length === 0 ? (
            <Card className="p-8"><EmptyState icon={AlertTriangle} title="No emergency drills" description="Emergency drills will appear here." /></Card>
          ) : (
            filteredDrills.map((d) => (
              <Card key={d.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{d.name}</div>
                    <div className="text-sm text-fg-secondary">{d.type.replace('_', ' ')} · {d.observer || 'No observer'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {d.participants > 0 && <Badge variant="default">{d.participants} participants</Badge>}
                    <Badge variant={statusVariant(d.status)}>{d.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'routes' && (
        <div className="space-y-3">
          {filteredRoutes.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Route} title="No evacuation routes" description="Evacuation routes will appear here." /></Card>
          ) : (
            filteredRoutes.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-sm text-fg-secondary">{r.type.replace('_', ' ')} · {r.location || 'No location'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.capacity > 0 && <Badge variant="default">{r.capacity} cap</Badge>}
                    <Badge variant={statusVariant(r.status)}>{r.status.replace('_', ' ')}</Badge>
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
            <Card className="p-8"><EmptyState icon={Phone} title="No emergency contacts" description="Emergency contacts will appear here." /></Card>
          ) : (
            filteredContacts.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-sm text-fg-secondary">{c.type.replace('_', ' ')} · {c.contactName || 'No contact name'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.priority > 0 && <Badge variant="default">P{c.priority}</Badge>}
                    <Badge variant={statusVariant(c.status)}>{c.status.replace('_', ' ')}</Badge>
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
