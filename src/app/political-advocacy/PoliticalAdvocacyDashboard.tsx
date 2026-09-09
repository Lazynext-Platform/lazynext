'use client';

import { useState, useMemo } from 'react';
import {
  Megaphone, Landmark, FileText, DollarSign, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  AdvocacyCampaign, LobbyingActivity, PolicyPosition, PacContribution,
  PoliticalAdvocacyMetrics, PoliticalAdvocacyStats,
} from '@/lib/services/political-advocacy-service';

type TabId = 'overview' | 'campaigns' | 'lobbying' | 'positions' | 'contributions';

interface PoliticalAdvocacyDashboardProps {
  organizationId: string;
  campaigns: AdvocacyCampaign[];
  lobbying: LobbyingActivity[];
  positions: PolicyPosition[];
  contributions: PacContribution[];
  metrics: PoliticalAdvocacyMetrics;
  stats: PoliticalAdvocacyStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['completed', 'published', 'received', 'disbursed', 'approved'].includes(status)) return 'success';
  if (['draft', 'planned', 'active', 'pledged', 'pending_approval', 'updated', 'scheduled'].includes(status)) return 'warning';
  if (['cancelled', 'refunded', 'on_hold', 'paused', 'archived', 'overdue'].includes(status)) return 'danger';
  return 'info';
};

export function PoliticalAdvocacyDashboard({
  campaigns, lobbying, positions, contributions, metrics, stats,
}: PoliticalAdvocacyDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const filteredCampaigns = useMemo(() => {
    if (!search) return campaigns;
    const q = search.toLowerCase();
    return campaigns.filter(
      (c) => c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q) || c.status.toLowerCase().includes(q),
    );
  }, [campaigns, search]);

  const filteredLobbying = useMemo(() => {
    if (!search) return lobbying;
    const q = search.toLowerCase();
    return lobbying.filter(
      (l) => l.title.toLowerCase().includes(q) || l.type.toLowerCase().includes(q) || l.status.toLowerCase().includes(q),
    );
  }, [lobbying, search]);

  const filteredPositions = useMemo(() => {
    if (!search) return positions;
    const q = search.toLowerCase();
    return positions.filter(
      (p) => p.title.toLowerCase().includes(q) || p.type.toLowerCase().includes(q) || p.status.toLowerCase().includes(q),
    );
  }, [positions, search]);

  const filteredContributions = useMemo(() => {
    if (!search) return contributions;
    const q = search.toLowerCase();
    return contributions.filter(
      (c) => c.recipient.toLowerCase().includes(q) || c.type.toLowerCase().includes(q) || c.status.toLowerCase().includes(q),
    );
  }, [contributions, search]);

  const tabs: { id: TabId; label: string; icon: typeof Megaphone }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
    { id: 'lobbying', label: 'Lobbying', icon: Landmark },
    { id: 'positions', label: 'Positions', icon: FileText },
    { id: 'contributions', label: 'Contributions', icon: DollarSign },
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
              <div className="text-xs text-fg-tertiary">Active Campaigns</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeCampaigns}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Lobbying</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeLobbying}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Published Positions</div>
              <div className="mt-1 text-2xl font-bold">{metrics.publishedPositions}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Pending Contributions</div>
              <div className="mt-1 text-2xl font-bold">{metrics.pendingContributions}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Total Contributions</div>
              <div className="mt-1 text-2xl font-bold">${metrics.totalContributionAmount.toLocaleString()}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Campaign Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byCampaignType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Campaign Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byCampaignStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Lobbying Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byLobbyingType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Position Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byPositionType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Contribution Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byContributionStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'campaigns' && (
        <div className="space-y-3">
          {filteredCampaigns.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Megaphone} title="No advocacy campaigns" description="Advocacy campaigns will appear here." /></Card>
          ) : (
            filteredCampaigns.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-sm text-fg-secondary">{c.type.replace('_', ' ')} · {c.coordinator || 'Unassigned'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.budget > 0 && <Badge variant="default">${c.budget.toLocaleString()}</Badge>}
                    <Badge variant={statusVariant(c.status)}>{c.status.replace('_', ' ')}</Badge>
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
            <Card className="p-8"><EmptyState icon={Landmark} title="No lobbying activities" description="Lobbying activities will appear here." /></Card>
          ) : (
            filteredLobbying.map((l) => (
              <Card key={l.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{l.title}</div>
                    <div className="text-sm text-fg-secondary">{l.type.replace('_', ' ')} · {l.lobbyist || 'Unassigned'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {l.expenses > 0 && <Badge variant="default">${l.expenses.toLocaleString()}</Badge>}
                    <Badge variant={statusVariant(l.status)}>{l.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'positions' && (
        <div className="space-y-3">
          {filteredPositions.length === 0 ? (
            <Card className="p-8"><EmptyState icon={FileText} title="No policy positions" description="Policy positions will appear here." /></Card>
          ) : (
            filteredPositions.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.title}</div>
                    <div className="text-sm text-fg-secondary">{p.type.replace('_', ' ')} · {p.issueArea.replace('_', ' ')}{p.billNumber ? ` · ${p.billNumber}` : ''}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant(p.status)}>{p.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'contributions' && (
        <div className="space-y-3">
          {filteredContributions.length === 0 ? (
            <Card className="p-8"><EmptyState icon={DollarSign} title="No contributions" description="PAC contributions will appear here." /></Card>
          ) : (
            filteredContributions.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{c.recipient}</div>
                    <div className="text-sm text-fg-secondary">{c.type.replace('_', ' ')} · {c.committee || 'No committee'}{c.date ? ` · ${new Date(c.date).toLocaleDateString()}` : ''}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">${c.amount.toLocaleString()} {c.currency}</Badge>
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
