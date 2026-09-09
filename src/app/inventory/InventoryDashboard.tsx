'use client';

import { useState } from 'react';
import {
  Warehouse, Package, ArrowLeftRight, DollarSign, AlertTriangle,
  TrendingDown, Boxes, Plus,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

interface Warehouse {
  id: string; name: string; code: string; location: string; address: string;
  isActive: boolean; createdAt: Date;
}
interface InventoryItem {
  id: string; warehouseId: string; sku: string; name: string; description: string;
  category: string; quantity: number; reorderPoint: number; reorderQty: number;
  unitCost: number; unitPrice: number; barcode: string; location: string;
  isActive: boolean; createdAt: Date; updatedAt: Date;
}
interface StockMovement {
  id: string; warehouseId: string; inventoryItemId: string; type: string;
  quantity: number; reference: string; notes: string; createdAt: Date;
}
interface Valuation {
  totalValue: number;
  byWarehouse: Array<{
    warehouseId: string; warehouseName: string; itemCount: number;
    totalQuantity: number; totalValue: number;
  }>;
}
interface Summary {
  totalItems: number; totalQuantity: number; totalValue: number;
  lowStockCount: number;
  byWarehouse: Array<{
    warehouseId: string; warehouseName: string; itemCount: number;
    totalQuantity: number; totalValue: number;
  }>;
}
interface Stats {
  warehouseCount: number; itemCount: number; movementCount: number;
  lowStockCount: number; totalValue: number; byCategory: Record<string, number>;
}

type Tab = 'overview' | 'warehouses' | 'items' | 'movements' | 'valuation';

const movementTypeVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  inbound: 'success',
  outbound: 'warning',
  transfer: 'info',
  adjustment: 'default',
  return: 'accent',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

const tabs: Array<{ id: Tab; label: string; icon: typeof Warehouse }> = [
  { id: 'overview', label: 'Overview', icon: Boxes },
  { id: 'warehouses', label: 'Warehouses', icon: Warehouse },
  { id: 'items', label: 'Items', icon: Package },
  { id: 'movements', label: 'Movements', icon: ArrowLeftRight },
  { id: 'valuation', label: 'Valuation', icon: DollarSign },
];

export function InventoryDashboard({
  organizationId,
  warehouses,
  items,
  movements,
  lowStock,
  valuation,
  summary,
  stats,
}: {
  organizationId: string;
  warehouses: Warehouse[];
  items: InventoryItem[];
  movements: StockMovement[];
  lowStock: InventoryItem[];
  valuation: Valuation;
  summary: Summary;
  stats: Stats;
}) {
  const [tab, setTab] = useState<Tab>('overview');
  void organizationId;

  const warehouseName = (id: string) =>
    warehouses.find((w) => w.id === id)?.name || 'Unknown';

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-px">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                active ? 'text-accent-primary border-b-2 border-accent-primary' : 'text-fg-secondary hover:text-fg-primary'
              }`}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <Card className="p-4">
              <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
                <Warehouse className="h-3 w-3" /> Warehouses
              </div>
              <div className="text-2xl font-semibold">{stats.warehouseCount}</div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
                <Package className="h-3 w-3" /> Items
              </div>
              <div className="text-2xl font-semibold">{stats.itemCount}</div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
                <ArrowLeftRight className="h-3 w-3" /> Movements
              </div>
              <div className="text-2xl font-semibold">{stats.movementCount}</div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
                <DollarSign className="h-3 w-3" /> Total Value
              </div>
              <div className="text-2xl font-semibold">{formatCurrency(stats.totalValue)}</div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
                <AlertTriangle className="h-3 w-3" /> Low Stock
              </div>
              <div className="text-2xl font-semibold">{stats.lowStockCount}</div>
            </Card>
          </div>

          {lowStock.length > 0 && (
            <Card className="p-4 border-warning/30">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="h-5 w-5 text-warning" />
                <h2 className="heading-display text-sm">Low Stock Alerts</h2>
              </div>
              <div className="space-y-2">
                {lowStock.slice(0, 10).map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <Package className="h-3 w-3 text-fg-muted" /> {item.name}
                      <Badge variant="default" className="text-xs">{item.sku}</Badge>
                    </span>
                    <Badge variant={item.quantity <= 0 ? 'danger' : 'warning'} className="text-xs">
                      {item.quantity} / {item.reorderPoint}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-4">
            <h2 className="heading-display text-sm mb-3">By Category</h2>
            {Object.keys(stats.byCategory).length === 0 ? (
              <p className="text-xs text-fg-secondary">No items yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.byCategory).map(([cat, count]) => (
                  <Badge key={cat} variant="default" className="text-xs">{cat}: {count}</Badge>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Warehouses */}
      {tab === 'warehouses' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="heading-display text-lg flex items-center gap-2">
              <Warehouse className="h-5 w-5 text-accent-primary" /> Warehouses
            </h2>
            <Button size="sm"><Plus className="h-4 w-4" /> Add Warehouse</Button>
          </div>
          {warehouses.length === 0 ? (
            <Card className="p-6">
              <EmptyState icon={Warehouse} title="No warehouses yet" description="Add your first warehouse to start tracking inventory." />
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {warehouses.map((w) => (
                <Card key={w.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-sm font-semibold block truncate pr-2">{w.name}</span>
                    <Badge variant={w.isActive ? 'success' : 'default'} className="text-xs shrink-0">
                      {w.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="text-xs text-fg-muted mb-1">Code: {w.code}</div>
                  {w.location && <div className="text-xs text-fg-secondary mb-1">Location: {w.location}</div>}
                  {w.address && <div className="text-xs text-fg-secondary mb-1">{w.address}</div>}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Items */}
      {tab === 'items' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="heading-display text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-accent-primary" /> Inventory Items
            </h2>
            <Button size="sm"><Plus className="h-4 w-4" /> Add Item</Button>
          </div>
          {items.length === 0 ? (
            <Card className="p-6">
              <EmptyState icon={Package} title="No items yet" description="Add your first inventory item to start tracking stock." />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-fg-secondary border-b border-border">
                  <tr>
                    <th className="text-left p-3">SKU</th>
                    <th className="text-left p-3">Name</th>
                    <th className="text-left p-3">Warehouse</th>
                    <th className="text-left p-3">Category</th>
                    <th className="text-right p-3">Qty</th>
                    <th className="text-right p-3">Reorder Pt</th>
                    <th className="text-right p-3">Unit Cost</th>
                    <th className="text-left p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const isLow = item.quantity <= item.reorderPoint;
                    return (
                      <tr key={item.id} className="border-b border-border/50">
                        <td className="p-3 font-mono">{item.sku}</td>
                        <td className="p-3">{item.name}</td>
                        <td className="p-3">{warehouseName(item.warehouseId)}</td>
                        <td className="p-3">{item.category}</td>
                        <td className="p-3 text-right">{item.quantity}</td>
                        <td className="p-3 text-right">{item.reorderPoint}</td>
                        <td className="p-3 text-right">{formatCurrency(item.unitCost)}</td>
                        <td className="p-3">
                          {isLow ? (
                            <Badge variant="warning" className="text-xs">Low</Badge>
                          ) : item.isActive ? (
                            <Badge variant="success" className="text-xs">Active</Badge>
                          ) : (
                            <Badge variant="default" className="text-xs">Inactive</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {/* Movements */}
      {tab === 'movements' && (
        <div>
          <h2 className="heading-display text-lg flex items-center gap-2 mb-3">
            <ArrowLeftRight className="h-5 w-5 text-accent-primary" /> Stock Movements
          </h2>
          {movements.length === 0 ? (
            <Card className="p-6">
              <EmptyState icon={ArrowLeftRight} title="No movements yet" description="Record stock movements to track inventory changes over time." />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-fg-secondary border-b border-border">
                  <tr>
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Type</th>
                    <th className="text-left p-3">Warehouse</th>
                    <th className="text-left p-3">Item</th>
                    <th className="text-right p-3">Qty</th>
                    <th className="text-left p-3">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.slice(0, 100).map((m) => (
                    <tr key={m.id} className="border-b border-border/50">
                      <td className="p-3">{formatDate(m.createdAt)}</td>
                      <td className="p-3">
                        <Badge variant={movementTypeVariant[m.type] || 'default'} className="text-xs">{m.type}</Badge>
                      </td>
                      <td className="p-3">{warehouseName(m.warehouseId)}</td>
                      <td className="p-3 font-mono">{m.inventoryItemId.slice(-8)}</td>
                      <td className="p-3 text-right">{m.quantity}</td>
                      <td className="p-3">{m.reference || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {/* Valuation */}
      {tab === 'valuation' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
              <DollarSign className="h-4 w-4" /> Total Inventory Value
            </div>
            <div className="text-3xl font-semibold">{formatCurrency(valuation.totalValue)}</div>
            <div className="text-xs text-fg-secondary mt-1">
              {summary.totalItems} items · {summary.totalQuantity} units in stock
            </div>
          </Card>

          <div>
            <h2 className="heading-display text-lg flex items-center gap-2 mb-3">
              <Warehouse className="h-5 w-5 text-accent-primary" /> By Warehouse
            </h2>
            {valuation.byWarehouse.length === 0 ? (
              <Card className="p-6">
                <EmptyState icon={Warehouse} title="No valuation data" description="Add warehouses and inventory items to see valuation." />
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {valuation.byWarehouse.map((w) => (
                  <Card key={w.warehouseId} className="p-4">
                    <div className="text-sm font-semibold mb-2">{w.warehouseName}</div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <div className="text-fg-secondary">Items</div>
                        <div className="font-semibold">{w.itemCount}</div>
                      </div>
                      <div>
                        <div className="text-fg-secondary">Units</div>
                        <div className="font-semibold">{w.totalQuantity}</div>
                      </div>
                      <div>
                        <div className="text-fg-secondary">Value</div>
                        <div className="font-semibold">{formatCurrency(w.totalValue)}</div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
