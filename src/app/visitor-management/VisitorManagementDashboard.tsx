'use client';

import { useState, useMemo } from 'react';
import {
  Users, IdCard, UserCheck, Shield, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  VisitorVisit, VisitorBadge, VisitorHost, VisitorAccessLog,
  VisitorManagementMetrics, VisitorManagementStats,
} from '@/lib/services/visitor-management-service';

type TabId = 'overview' | 'visits' | 'badges' | 'hosts' | 'access_logs';

interface VisitorManagementDashboardProps {
  organizationId: string;
  visits: VisitorVisit[];
  badges: VisitorBadge[];
  hosts: VisitorHost[];
  accessLogs: VisitorAccessLog[];
  metrics: VisitorManagementMetrics;
  stats: VisitorManagementStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['checked_out', 'returned', 'completed', 'verified', 'archived', 'inactive'].includes(status)) return 'success';
  if (['pre_registered', 'checked_in', 'issued', 'active', 'scheduled', 'recorded', 'reviewed'].includes(status)) return 'warning';
  if (['denied', 'cancelled', 'expired', 'lost', 'revoked', 'flagged', 'unavailable', 'no_show'].includes(status)) return 'danger';
  return 'info';
};

export function VisitorManagementDashboard({
  visits, badges, hosts, accessLogs, metrics, stats,
}: VisitorManagementDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const hostName = (id: string | null) => {
    if (!id) return '';
    return hosts.find((h) => h.id === id)?.name || id;
  };

  const filteredVisits = useMemo(() => {
    if (!search) return visits;
    const q = search.toLowerCase();
    return visits.filter(
      (v) => v.visitorName.toLowerCase().includes(q) || v.type.toLowerCase().includes(q) || v.status.toLowerCase().includes(q),
    );
  }, [visits, search]);

  const filteredBadges = useMemo(() => {
    if (!search) return badges;
    const q = search.toLowerCase();
    return badges.filter(
      (b) => b.badgeNumber.toLowerCase().includes(q) || b.type.toLowerCase().includes(q) || b.status.toLowerCase().includes(q),
    );
  }, [badges, search]);

  const filteredHosts = useMemo(() => {
    if (!search) return hosts;
    const q = search.toLowerCase();
    return hosts.filter(
      (h) => h.name.toLowerCase().includes(q) || h.type.toLowerCase().includes(q) || h.status.toLowerCase().includes(q),
    );
  }, [hosts, search]);

  const filteredAccessLogs = useMemo(() => {
    if (!search) return accessLogs;
    const q = search.toLowerCase();
    return accessLogs.filter(
      (l) => l.type.toLowerCase().includes(q) || l.status.toLowerCase().includes(q) || l.location.toLowerCase().includes(q),
    );
  }, [accessLogs, search]);

  const tabs: { id: TabId; label: string; icon: typeof Users }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'visits', label: 'Visits', icon: Users },
    { id: 'badges', label: 'Badges', icon: IdCard },
    { id: 'hosts', label: 'Hosts', icon: UserCheck },
    { id: 'access_logs', label: 'Access Logs', icon: Shield },
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
              <div className="text-xs text-fg-tertiary">Pre-Registered Visits</div>
              <div className="mt-1 text-2xl font-bold">{metrics.preRegisteredVisits}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Checked-In Visitors</div>
              <div className="mt-1 text-2xl font-bold">{metrics.checkedInVisitors}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Badges</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeBadges}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Hosts</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeHosts}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Flagged Logs</div>
              <div className="mt-1 text-2xl font-bold">{metrics.flaggedLogs}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Visit Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byVisitType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Visit Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byVisitStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Badge Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byBadgeStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'visits' && (
        <div className="space-y-3">
          {filteredVisits.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Users} title="No visits" description="Visitor visits will appear here." /></Card>
          ) : (
            filteredVisits.map((v) => (
              <Card key={v.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{v.visitorName}</div>
                    <div className="text-sm text-fg-secondary">{v.type.replace('_', ' ')} · {hostName(v.hostId) || v.hostName || 'No host'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {v.escortRequired && <Badge variant="warning">Escort</Badge>}
                    <Badge variant={statusVariant(v.status)}>{v.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'badges' && (
        <div className="space-y-3">
          {filteredBadges.length === 0 ? (
            <Card className="p-8"><EmptyState icon={IdCard} title="No badges" description="Visitor badges will appear here." /></Card>
          ) : (
            filteredBadges.map((b) => (
              <Card key={b.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{b.badgeNumber || 'Unnumbered badge'}</div>
                    <div className="text-sm text-fg-secondary">{b.type.replace('_', ' ')} · {b.accessLevel || 'No access level'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {b.validAreas.length > 0 && <Badge variant="default">{b.validAreas.length} areas</Badge>}
                    <Badge variant={statusVariant(b.status)}>{b.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'hosts' && (
        <div className="space-y-3">
          {filteredHosts.length === 0 ? (
            <Card className="p-8"><EmptyState icon={UserCheck} title="No hosts" description="Visitor hosts will appear here." /></Card>
          ) : (
            filteredHosts.map((h) => (
              <Card key={h.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{h.name}</div>
                    <div className="text-sm text-fg-secondary">{h.type.replace('_', ' ')} · {h.department || 'No department'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant(h.status)}>{h.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'access_logs' && (
        <div className="space-y-3">
          {filteredAccessLogs.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Shield} title="No access logs" description="Access logs will appear here." /></Card>
          ) : (
            filteredAccessLogs.map((l) => (
              <Card key={l.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{l.type.replace('_', ' ')}</div>
                    <div className="text-sm text-fg-secondary">{l.location || 'No location'} · {l.officer || 'No officer'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant(l.status)}>{l.status.replace('_', ' ')}</Badge>
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
