'use client';

import { useState, useMemo } from 'react';
import {
  Gift, Users, Package, Boxes, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  GiftItem, GiftRecipient, GiftOrder, GiftInventory,
  GiftManagementMetrics, GiftManagementStats,
} from '@/lib/services/gift-management-service';

type TabId = 'overview' | 'items' | 'recipients' | 'orders' | 'inventory';

interface GiftManagementDashboardProps {
  organizationId: string;
  workspaceId: string;
  items: GiftItem[];
  recipients: GiftRecipient[];
  orders: GiftOrder[];
  inventory: GiftInventory[];
  metrics: GiftManagementMetrics;
  stats: GiftManagementStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['delivered', 'active', 'available', 'completed'].includes(status)) return 'success';
  if (['draft', 'approved', 'ordered', 'shipped', 'low', 'reserved', 'allocated', 'limited', 'vip'].includes(status)) return 'warning';
  if (['cancelled', 'do_not_gift', 'out', 'damaged', 'discontinued', 'out_of_stock', 'returned'].includes(status)) return 'danger';
  if (['overstock'].includes(status)) return 'info';
  return 'default';
};

export function GiftManagementDashboard({
  items, recipients, orders, inventory, metrics, stats,
}: GiftManagementDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const filteredItems = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(
      (i) => i.name.toLowerCase().includes(q) || i.type.toLowerCase().includes(q) || i.status.toLowerCase().includes(q),
    );
  }, [items, search]);

  const filteredRecipients = useMemo(() => {
    if (!search) return recipients;
    const q = search.toLowerCase();
    return recipients.filter(
      (r) => r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q) || r.status.toLowerCase().includes(q),
    );
  }, [recipients, search]);

  const filteredOrders = useMemo(() => {
    if (!search) return orders;
    const q = search.toLowerCase();
    return orders.filter(
      (o) => o.type.toLowerCase().includes(q) || o.status.toLowerCase().includes(q) || o.occasion.toLowerCase().includes(q),
    );
  }, [orders, search]);

  const filteredInventory = useMemo(() => {
    if (!search) return inventory;
    const q = search.toLowerCase();
    return inventory.filter(
      (i) => i.type.toLowerCase().includes(q) || i.status.toLowerCase().includes(q) || i.location.toLowerCase().includes(q),
    );
  }, [inventory, search]);

  const tabs: { id: TabId; label: string; icon: typeof Gift }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'items', label: 'Items', icon: Gift },
    { id: 'recipients', label: 'Recipients', icon: Users },
    { id: 'orders', label: 'Orders', icon: Package },
    { id: 'inventory', label: 'Inventory', icon: Boxes },
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
              <div className="text-xs text-fg-tertiary">Total Items</div>
              <div className="mt-1 text-2xl font-bold">{metrics.totalItems}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Recipients</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeRecipients}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Pending Orders</div>
              <div className="mt-1 text-2xl font-bold">{metrics.pendingOrders}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Delivered Orders</div>
              <div className="mt-1 text-2xl font-bold">{metrics.deliveredOrders}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Available Inventory</div>
              <div className="mt-1 text-2xl font-bold">{metrics.availableInventoryCount}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Item Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byItemType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Recipient Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byRecipientStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Order Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byOrderStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Inventory Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byInventoryStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'items' && (
        <div className="space-y-3">
          {filteredItems.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Gift} title="No gift items" description="Gift items will appear here." /></Card>
          ) : (
            filteredItems.map((i) => (
              <Card key={i.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{i.name}</div>
                    <div className="text-sm text-fg-secondary">{i.type.replace('_', ' ')} · {i.supplier || 'No supplier'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {i.unitCost > 0 && <Badge variant="default">${i.unitCost.toLocaleString()}</Badge>}
                    <Badge variant={statusVariant(i.status)}>{i.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'recipients' && (
        <div className="space-y-3">
          {filteredRecipients.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Users} title="No recipients" description="Gift recipients will appear here." /></Card>
          ) : (
            filteredRecipients.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-sm text-fg-secondary">{r.type.replace('_', ' ')} · {r.company || 'No company'}</div>
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

      {tab === 'orders' && (
        <div className="space-y-3">
          {filteredOrders.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Package} title="No orders" description="Gift orders will appear here." /></Card>
          ) : (
            filteredOrders.map((o) => (
              <Card key={o.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{o.type.replace('_', ' ')} Order</div>
                    <div className="text-sm text-fg-secondary">{o.occasion || 'No occasion'} · Qty: {o.quantity}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {o.budget > 0 && <Badge variant="default">${o.budget.toLocaleString()}</Badge>}
                    <Badge variant={statusVariant(o.status)}>{o.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'inventory' && (
        <div className="space-y-3">
          {filteredInventory.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Boxes} title="No inventory" description="Gift inventory will appear here." /></Card>
          ) : (
            filteredInventory.map((i) => (
              <Card key={i.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{i.type.replace('_', ' ')} · {i.quantity} units</div>
                    <div className="text-sm text-fg-secondary">{i.location || 'No location'} · {i.batchNumber || 'No batch'}</div>
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
    </div>
  );
}
