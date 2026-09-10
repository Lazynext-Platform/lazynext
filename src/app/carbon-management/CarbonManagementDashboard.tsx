'use client';

import { useState, useMemo } from 'react';
import {
  Leaf, Sprout, Target, Ticket, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  CarbonInventory, CarbonOffset, CarbonTarget, CarbonCredit,
  CarbonManagementMetrics, CarbonManagementStats,
} from '@/lib/services/carbon-management-service';

type TabId = 'overview' | 'inventories' | 'offsets' | 'targets' | 'credits';

interface CarbonManagementDashboardProps {
  organizationId: string;
  inventories: CarbonInventory[];
  offsets: CarbonOffset[];
  targets: CarbonTarget[];
  credits: CarbonCredit[];
  metrics: CarbonManagementMetrics;
  stats: CarbonManagementStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['active', 'completed', 'verified', 'executed', 'preferred', 'approved', 'achieved', 'adopted', 'published', 'retired'].includes(status)) return 'success';
  if (['draft', 'pending', 'placed', 'scheduled', 'planned', 'set', 'submitted', 'under_review', 'in_review', 'in_progress', 'evaluating', 'held', 'reviewed'].includes(status)) return 'warning';
  if (['cancelled', 'expired', 'terminated', 'deactivated', 'missed', 'failed', 'suspended', 'revoked', 'rejected', 'deprecated', 'archived'].includes(status)) return 'danger';
  return 'info';
};

export function CarbonManagementDashboard({
  inventories, offsets, targets, credits, metrics, stats,
}: CarbonManagementDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const filteredInventories = useMemo(() => {
    if (!search) return inventories;
    const q = search.toLowerCase();
    return inventories.filter(
      (i) => i.name.toLowerCase().includes(q) || i.type.toLowerCase().includes(q) || i.status.toLowerCase().includes(q),
    );
  }, [inventories, search]);

  const filteredOffsets = useMemo(() => {
    if (!search) return offsets;
    const q = search.toLowerCase();
    return offsets.filter(
      (o) => o.name.toLowerCase().includes(q) || o.type.toLowerCase().includes(q) || o.status.toLowerCase().includes(q),
    );
  }, [offsets, search]);

  const filteredTargets = useMemo(() => {
    if (!search) return targets;
    const q = search.toLowerCase();
    return targets.filter(
      (t) => t.name.toLowerCase().includes(q) || t.type.toLowerCase().includes(q) || t.status.toLowerCase().includes(q),
    );
  }, [targets, search]);

  const filteredCredits = useMemo(() => {
    if (!search) return credits;
    const q = search.toLowerCase();
    return credits.filter(
      (c) => c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q) || c.status.toLowerCase().includes(q),
    );
  }, [credits, search]);

  const tabs: { id: TabId; label: string; icon: typeof Leaf }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'inventories', label: 'Inventories', icon: Leaf },
    { id: 'offsets', label: 'Offsets', icon: Sprout },
    { id: 'targets', label: 'Targets', icon: Target },
    { id: 'credits', label: 'Credits', icon: Ticket },
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
              <div className="text-xs text-fg-tertiary">Active Inventories</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeInventories}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Offsets</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeOffsets}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Targets</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeTargets}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Held Credits</div>
              <div className="mt-1 text-2xl font-bold">{metrics.heldCredits}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Total Offset Amount</div>
              <div className="mt-1 text-2xl font-bold">{metrics.totalOffsetAmount}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Inventory Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byInventoryType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Offset Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byOffsetStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Target Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byTargetStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'inventories' && (
        <div className="space-y-3">
          {filteredInventories.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Leaf} title="No carbon inventories" description="Carbon inventories will appear here." /></Card>
          ) : (
            filteredInventories.map((i) => (
              <Card key={i.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{i.name}</div>
                    <div className="text-sm text-fg-secondary">{i.type.replace('_', ' ')} · {i.source || 'No source'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {i.emissions > 0 && <Badge variant="default">{i.emissions} {i.unit}</Badge>}
                    <Badge variant={statusVariant(i.status)}>{i.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'offsets' && (
        <div className="space-y-3">
          {filteredOffsets.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Sprout} title="No carbon offsets" description="Carbon offsets will appear here." /></Card>
          ) : (
            filteredOffsets.map((o) => (
              <Card key={o.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{o.name}</div>
                    <div className="text-sm text-fg-secondary">{o.type.replace('_', ' ')} · {o.provider || 'No provider'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {o.amount > 0 && <Badge variant="default">{o.amount} {o.unit}</Badge>}
                    <Badge variant={statusVariant(o.status)}>{o.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'targets' && (
        <div className="space-y-3">
          {filteredTargets.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Target} title="No carbon targets" description="Carbon reduction targets will appear here." /></Card>
          ) : (
            filteredTargets.map((t) => (
              <Card key={t.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-sm text-fg-secondary">{t.type.replace('_', ' ')} · {t.baselineYear}→{t.targetYear}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.progress > 0 && <Badge variant="default">{t.progress}%</Badge>}
                    <Badge variant={statusVariant(t.status)}>{t.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'credits' && (
        <div className="space-y-3">
          {filteredCredits.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Ticket} title="No carbon credits" description="Carbon credits will appear here." /></Card>
          ) : (
            filteredCredits.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-sm text-fg-secondary">{c.type.replace('_', ' ')} · {c.project || 'No project'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.amount > 0 && <Badge variant="default">{c.amount} {c.unit}</Badge>}
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
