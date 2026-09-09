'use client';

import { useState, useMemo } from 'react';
import {
  Warehouse, Share2, Package, Network, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  DistributionCenter, DistributionChannel, FulfillmentOrder, DistributionNetwork,
  DistributionMetrics, DistributionStats,
} from '@/lib/services/distribution-service';

type TabId = 'overview' | 'centers' | 'channels' | 'fulfillment' | 'networks';

interface DistributionDashboardProps {
  organizationId: string;
  centers: DistributionCenter[];
  channels: DistributionChannel[];
  fulfillments: FulfillmentOrder[];
  networks: DistributionNetwork[];
  metrics: DistributionMetrics;
  stats: DistributionStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['active', 'delivered', 'completed'].includes(status)) return 'success';
  if (['planned', 'pending', 'allocated', 'picked', 'packed', 'shipped', 'maintenance'].includes(status)) return 'warning';
  if (['closed', 'cancelled', 'discontinued', 'deprecated', 'returned'].includes(status)) return 'danger';
  return 'info';
};

export function DistributionDashboard({
  centers, channels, fulfillments, networks, metrics, stats,
}: DistributionDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const filteredCenters = useMemo(() => {
    if (!search) return centers;
    const q = search.toLowerCase();
    return centers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q) || c.status.toLowerCase().includes(q),
    );
  }, [centers, search]);

  const filteredChannels = useMemo(() => {
    if (!search) return channels;
    const q = search.toLowerCase();
    return channels.filter(
      (c) => c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q) || c.status.toLowerCase().includes(q),
    );
  }, [channels, search]);

  const filteredFulfillments = useMemo(() => {
    if (!search) return fulfillments;
    const q = search.toLowerCase();
    return fulfillments.filter(
      (f) => f.orderId.toLowerCase().includes(q) || f.type.toLowerCase().includes(q) || f.status.toLowerCase().includes(q),
    );
  }, [fulfillments, search]);

  const filteredNetworks = useMemo(() => {
    if (!search) return networks;
    const q = search.toLowerCase();
    return networks.filter(
      (n) => n.name.toLowerCase().includes(q) || n.type.toLowerCase().includes(q) || n.status.toLowerCase().includes(q),
    );
  }, [networks, search]);

  const tabs: { id: TabId; label: string; icon: typeof Warehouse }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'centers', label: 'Centers', icon: Warehouse },
    { id: 'channels', label: 'Channels', icon: Share2 },
    { id: 'fulfillment', label: 'Fulfillment', icon: Package },
    { id: 'networks', label: 'Networks', icon: Network },
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
              <div className="text-xs text-fg-tertiary">Active Centers</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeCenters}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Channels</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeChannels}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Pending Fulfillments</div>
              <div className="mt-1 text-2xl font-bold">{metrics.pendingFulfillments}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Delivered Fulfillments</div>
              <div className="mt-1 text-2xl font-bold">{metrics.deliveredFulfillments}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Fulfillment Rate</div>
              <div className="mt-1 text-2xl font-bold">{metrics.fulfillmentRate}%</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Center Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byCenterType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Channel Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byChannelType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Fulfillment Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byFulfillmentStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Network Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byNetworkType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'centers' && (
        <div className="space-y-3">
          {filteredCenters.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Warehouse} title="No distribution centers" description="Distribution centers will appear here." /></Card>
          ) : (
            filteredCenters.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-sm text-fg-secondary">{c.type.replace('_', ' ')} · {c.manager || 'Unassigned'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.capacity > 0 && <Badge variant="default">{c.capacity.toLocaleString()}</Badge>}
                    <Badge variant={statusVariant(c.status)}>{c.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'channels' && (
        <div className="space-y-3">
          {filteredChannels.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Share2} title="No distribution channels" description="Distribution channels will appear here." /></Card>
          ) : (
            filteredChannels.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-sm text-fg-secondary">{c.type.replace('_', ' ')} · {c.partnerName || 'No partner'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.commission > 0 && <Badge variant="default">{c.commission}%</Badge>}
                    <Badge variant={statusVariant(c.status)}>{c.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'fulfillment' && (
        <div className="space-y-3">
          {filteredFulfillments.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Package} title="No fulfillment orders" description="Fulfillment orders will appear here." /></Card>
          ) : (
            filteredFulfillments.map((f) => (
              <Card key={f.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{f.orderId}</div>
                    <div className="text-sm text-fg-secondary">{f.type.replace('_', ' ')} · {f.customerName || 'Unknown'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {f.carrier && <Badge variant="default">{f.carrier}</Badge>}
                    <Badge variant={statusVariant(f.status)}>{f.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'networks' && (
        <div className="space-y-3">
          {filteredNetworks.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Network} title="No distribution networks" description="Distribution networks will appear here." /></Card>
          ) : (
            filteredNetworks.map((n) => (
              <Card key={n.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{n.name}</div>
                    <div className="text-sm text-fg-secondary">{n.type.replace('_', ' ')} · {n.coverage || 'No coverage'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant(n.status)}>{n.status.replace('_', ' ')}</Badge>
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
