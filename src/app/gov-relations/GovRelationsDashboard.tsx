'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Landmark, FileText, Megaphone, CheckCircle, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  GovContact, PolicyMonitor, LobbyingActivity, GovCompliance,
  GovRelationsMetrics, GovRelationsStats,
  PolicyStatus, LobbyingStatus, GovComplianceStatus,
} from '@/lib/services/gov-relations-service';

type TabId = 'overview' | 'contacts' | 'policies' | 'lobbying' | 'compliance';

interface GovRelationsDashboardProps {
  organizationId: string;
  contacts: GovContact[];
  policies: PolicyMonitor[];
  lobbying: LobbyingActivity[];
  compliance: GovCompliance[];
  metrics: GovRelationsMetrics;
  stats: GovRelationsStats;
}

const policyStatusVariant = (status: PolicyStatus): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  switch (status) {
    case 'supporting': return 'success';
    case 'monitoring': return 'info';
    case 'opposing': return 'danger';
    case 'amending': return 'warning';
    case 'neutral': return 'default';
    default: return 'info';
  }
};

const lobbyingStatusVariant = (status: LobbyingStatus): 'success' | 'warning' | 'danger' | 'default' | 'info' | 'accent' => {
  switch (status) {
    case 'completed': return 'success';
    case 'registered': return 'info';
    case 'active': return 'accent';
    case 'planned': return 'warning';
    case 'cancelled': return 'danger';
    default: return 'default';
  }
};

const complianceStatusVariant = (status: GovComplianceStatus): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  switch (status) {
    case 'approved': return 'success';
    case 'filed': return 'info';
    case 'pending': return 'warning';
    case 'rejected': return 'danger';
    case 'overdue': return 'danger';
    default: return 'default';
  }
};

export function GovRelationsDashboard({
  contacts, policies, lobbying, compliance, metrics, stats,
}: GovRelationsDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const filteredContacts = useMemo(() => {
    if (!search) return contacts;
    const q = search.toLowerCase();
    return contacts.filter(
      (c) => c.name.toLowerCase().includes(q) || c.contactType.toLowerCase().includes(q) || c.level.toLowerCase().includes(q) || c.organization.toLowerCase().includes(q),
    );
  }, [contacts, search]);

  const filteredPolicies = useMemo(() => {
    if (!search) return policies;
    const q = search.toLowerCase();
    return policies.filter(
      (p) => p.title.toLowerCase().includes(q) || p.policyType.toLowerCase().includes(q) || p.status.toLowerCase().includes(q) || p.jurisdiction.toLowerCase().includes(q) || p.billNumber.toLowerCase().includes(q),
    );
  }, [policies, search]);

  const filteredLobbying = useMemo(() => {
    if (!search) return lobbying;
    const q = search.toLowerCase();
    return lobbying.filter(
      (l) => l.title.toLowerCase().includes(q) || l.status.toLowerCase().includes(q) || l.description.toLowerCase().includes(q),
    );
  }, [lobbying, search]);

  const filteredCompliance = useMemo(() => {
    if (!search) return compliance;
    const q = search.toLowerCase();
    return compliance.filter(
      (c) => c.title.toLowerCase().includes(q) || c.complianceType.toLowerCase().includes(q) || c.status.toLowerCase().includes(q) || c.period.toLowerCase().includes(q),
    );
  }, [compliance, search]);

  const formatDate = useCallback((d: Date | null): string => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString();
  }, []);

  const tabs: { id: TabId; label: string; icon: typeof Landmark }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'contacts', label: 'Contacts', icon: Landmark },
    { id: 'policies', label: 'Policies', icon: FileText },
    { id: 'lobbying', label: 'Lobbying', icon: Megaphone },
    { id: 'compliance', label: 'Compliance', icon: CheckCircle },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
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

      {/* Search */}
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
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Policies</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activePolicies}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Registered Lobbying</div>
              <div className="mt-1 text-2xl font-bold">{metrics.registeredLobbying}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Pending Compliance</div>
              <div className="mt-1 text-2xl font-bold">{metrics.pendingCompliance}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Total Contacts</div>
              <div className="mt-1 text-2xl font-bold">{metrics.totalContacts}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Overdue Compliance</div>
              <div className="mt-1 text-2xl font-bold">{metrics.overdueCompliance}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Lobbying Activities</div>
              <div className="mt-1 text-2xl font-bold">{stats.lobbyingCount}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Contact Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byContactType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Policy Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byPolicyStatus).map(([status, count]) => (
                <Badge key={status} variant={policyStatusVariant(status as PolicyStatus)}>{status}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Lobbying Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byLobbyingStatus).map(([status, count]) => (
                <Badge key={status} variant={lobbyingStatusVariant(status as LobbyingStatus)}>{status}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Compliance Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byComplianceStatus).map(([status, count]) => (
                <Badge key={status} variant={complianceStatusVariant(status as GovComplianceStatus)}>{status}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'contacts' && (
        <div className="space-y-3">
          {filteredContacts.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Landmark} title="No contacts" description="Government contacts will appear here." /></Card>
          ) : (
            filteredContacts.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-sm text-fg-secondary">{c.title} · {c.organization} · {c.contactType.replace('_', ' ')} · {c.level}</div>
                    <div className="text-sm text-fg-tertiary">{c.jurisdiction} · Last contact: {formatDate(c.lastContactDate)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">{c.contactType.replace('_', ' ')}</Badge>
                    <Badge variant="info">{c.level}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'policies' && (
        <div className="space-y-3">
          {filteredPolicies.length === 0 ? (
            <Card className="p-8"><EmptyState icon={FileText} title="No policies" description="Monitored policies will appear here." /></Card>
          ) : (
            filteredPolicies.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.title}</div>
                    <div className="text-sm text-fg-secondary">{p.policyType.replace('_', ' ')} · {p.jurisdiction} · {p.billNumber || 'No bill number'}</div>
                    <div className="text-sm text-fg-tertiary">Sponsor: {p.sponsor || '—'} · Next action: {formatDate(p.nextActionDate)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.position && <Badge variant="default">{p.position}</Badge>}
                    <Badge variant={policyStatusVariant(p.status)}>{p.status}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'lobbying' && (
        <div className="space-y-3">
          {filteredLobbying.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Megaphone} title="No lobbying activities" description="Lobbying activities will appear here." /></Card>
          ) : (
            filteredLobbying.map((l) => (
              <Card key={l.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{l.title}</div>
                    <div className="text-sm text-fg-secondary">{l.description || 'No description'}</div>
                    <div className="text-sm text-fg-tertiary">Budget: ${l.budget.toLocaleString()} · Spent: ${l.spent.toLocaleString()} · {formatDate(l.startDate)} – {formatDate(l.endDate)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {l.registrationId && <Badge variant="default">Reg: {l.registrationId}</Badge>}
                    <Badge variant={lobbyingStatusVariant(l.status)}>{l.status}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'compliance' && (
        <div className="space-y-3">
          {filteredCompliance.length === 0 ? (
            <Card className="p-8"><EmptyState icon={CheckCircle} title="No compliance records" description="Compliance filings will appear here." /></Card>
          ) : (
            filteredCompliance.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{c.title}</div>
                    <div className="text-sm text-fg-secondary">{c.complianceType.replace('_', ' ')} · {c.period || 'No period'}</div>
                    <div className="text-sm text-fg-tertiary">Due: {formatDate(c.dueDate)} · Amount: ${c.amount.toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.filingId && <Badge variant="default">Filing: {c.filingId}</Badge>}
                    <Badge variant={complianceStatusVariant(c.status)}>{c.status}</Badge>
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
