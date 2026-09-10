'use client';

import { useState, useMemo } from 'react';
import {
  UtensilsCrossed, ClipboardList, Store, Package, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  FoodMenu, FoodOrder, FoodVendor, FoodInventory,
  FoodServicesMetrics, FoodServicesStats,
} from '@/lib/services/food-services-service';

type TabId = 'overview' | 'menus' | 'orders' | 'vendors' | 'inventory';

interface FoodServicesDashboardProps {
  organizationId: string;
  menus: FoodMenu[];
  orders: FoodOrder[];
  vendors: FoodVendor[];
  inventory: FoodInventory[];
  metrics: FoodServicesMetrics;
  stats: FoodServicesStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['delivered', 'completed', 'published', 'active', 'preferred', 'received', 'in_stock'].includes(status)) return 'success';
  if (['draft', 'placed', 'confirmed', 'preparing', 'ready', 'under_review', 'ordered', 'seasonal'].includes(status)) return 'warning';
  if (['cancelled', 'expired', 'terminated', 'out', 'no_show', 'low'].includes(status)) return 'danger';
  return 'info';
};

export function FoodServicesDashboard({
  menus, orders, vendors, inventory, metrics, stats,
}: FoodServicesDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const filteredMenus = useMemo(() => {
    if (!search) return menus;
    const q = search.toLowerCase();
    return menus.filter(
      (m) => m.name.toLowerCase().includes(q) || m.type.toLowerCase().includes(q) || m.status.toLowerCase().includes(q),
    );
  }, [menus, search]);

  const filteredOrders = useMemo(() => {
    if (!search) return orders;
    const q = search.toLowerCase();
    return orders.filter(
      (o) => o.requester.toLowerCase().includes(q) || o.type.toLowerCase().includes(q) || o.status.toLowerCase().includes(q),
    );
  }, [orders, search]);

  const filteredVendors = useMemo(() => {
    if (!search) return vendors;
    const q = search.toLowerCase();
    return vendors.filter(
      (v) => v.name.toLowerCase().includes(q) || v.type.toLowerCase().includes(q) || v.status.toLowerCase().includes(q),
    );
  }, [vendors, search]);

  const filteredInventory = useMemo(() => {
    if (!search) return inventory;
    const q = search.toLowerCase();
    return inventory.filter(
      (i) => i.name.toLowerCase().includes(q) || i.type.toLowerCase().includes(q) || i.status.toLowerCase().includes(q),
    );
  }, [inventory, search]);

  const tabs: { id: TabId; label: string; icon: typeof UtensilsCrossed }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'menus', label: 'Menus', icon: UtensilsCrossed },
    { id: 'orders', label: 'Orders', icon: ClipboardList },
    { id: 'vendors', label: 'Vendors', icon: Store },
    { id: 'inventory', label: 'Inventory', icon: Package },
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
              <div className="text-xs text-fg-tertiary">Published Menus</div>
              <div className="mt-1 text-2xl font-bold">{metrics.publishedMenus}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Pending Orders</div>
              <div className="mt-1 text-2xl font-bold">{metrics.pendingOrders}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Vendors</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeVendors}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Low Stock Items</div>
              <div className="mt-1 text-2xl font-bold">{metrics.lowStockItems}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Total Orders</div>
              <div className="mt-1 text-2xl font-bold">{metrics.totalOrders}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Menu Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byMenuType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
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

      {tab === 'menus' && (
        <div className="space-y-3">
          {filteredMenus.length === 0 ? (
            <Card className="p-8"><EmptyState icon={UtensilsCrossed} title="No menus" description="Food menus will appear here." /></Card>
          ) : (
            filteredMenus.map((m) => (
              <Card key={m.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{m.name}</div>
                    <div className="text-sm text-fg-secondary">{m.type.replace('_', ' ')} · {m.servings} servings</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.pricePerPerson > 0 && <Badge variant="default">${m.pricePerPerson}/person</Badge>}
                    <Badge variant={statusVariant(m.status)}>{m.status.replace('_', ' ')}</Badge>
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
            <Card className="p-8"><EmptyState icon={ClipboardList} title="No orders" description="Food orders will appear here." /></Card>
          ) : (
            filteredOrders.map((o) => (
              <Card key={o.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{o.requester || 'Unknown requester'}</div>
                    <div className="text-sm text-fg-secondary">{o.type.replace('_', ' ')} · {o.department || 'No department'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {o.headcount > 0 && <Badge variant="default">{o.headcount} ppl</Badge>}
                    <Badge variant={statusVariant(o.status)}>{o.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'vendors' && (
        <div className="space-y-3">
          {filteredVendors.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Store} title="No vendors" description="Food vendors will appear here." /></Card>
          ) : (
            filteredVendors.map((v) => (
              <Card key={v.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{v.name}</div>
                    <div className="text-sm text-fg-secondary">{v.type.replace('_', ' ')} · {v.cuisine || 'No cuisine'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {v.rating > 0 && <Badge variant="default">{v.rating}★</Badge>}
                    <Badge variant={statusVariant(v.status)}>{v.status.replace('_', ' ')}</Badge>
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
            <Card className="p-8"><EmptyState icon={Package} title="No inventory" description="Food inventory items will appear here." /></Card>
          ) : (
            filteredInventory.map((i) => (
              <Card key={i.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{i.name}</div>
                    <div className="text-sm text-fg-secondary">{i.type.replace('_', ' ')} · {i.storageLocation || 'No location'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {i.quantity > 0 && <Badge variant="default">{i.quantity} {i.unit}</Badge>}
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
