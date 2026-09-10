'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Truck, Package, Shield, AlertTriangle, Activity, BarChart3,
  Search, MapPin, Clock,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

// ── Types ──

type SupplierStatus = 'active' | 'inactive' | 'blacklisted' | 'pending';
type ShipmentStatus =
  | 'pending'
  | 'in_transit'
  | 'delivered'
  | 'delayed'
  | 'cancelled'
  | 'customs_hold';
type FreightMode = 'air' | 'sea' | 'road' | 'rail' | 'multimodal';
type LogisticsStatus = 'pending' | 'in_transit' | 'delivered' | 'delayed' | 'cancelled';
type SupplierRiskType =
  | 'financial'
  | 'operational'
  | 'geopolitical'
  | 'compliance'
  | 'capacity'
  | 'quality';
type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';
type SupplierRiskStatus = 'open' | 'mitigating' | 'mitigated' | 'accepted' | 'closed';

interface Supplier {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  category: string;
  location: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  rating: number;
  paymentTerms: string;
  leadTimeDays: number;
  status: SupplierStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ShipmentItem {
  name: string;
  quantity: number;
  unitCost: number;
}

interface Shipment {
  id: string;
  organizationId: string;
  workspaceId: string;
  supplierId: string;
  origin: string;
  destination: string;
  carrier: string;
  trackingNumber: string;
  status: ShipmentStatus;
  expectedArrival: Date | null;
  items: ShipmentItem[];
  totalValue: number;
  currentLocation: string;
  trackingNotes: string;
  lastUpdated: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface LogisticsOrder {
  id: string;
  organizationId: string;
  workspaceId: string;
  shipmentId: string;
  supplierId: string;
  orderDate: Date | null;
  expectedDelivery: Date | null;
  freightMode: FreightMode;
  cost: number;
  destination: string;
  status: LogisticsStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface SupplierRisk {
  id: string;
  organizationId: string;
  workspaceId: string;
  supplierId: string;
  riskType: SupplierRiskType;
  severity: RiskSeverity;
  description: string;
  mitigation: string;
  status: SupplierRiskStatus;
  mitigatedBy: string;
  mitigatedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface SupplyChainMetrics {
  activeShipments: number;
  delayedShipments: number;
  avgLeadTime: number;
  highRiskSuppliers: number;
}

interface SupplyChainStats {
  supplierCount: number;
  activeSupplierCount: number;
  shipmentCount: number;
  activeShipmentCount: number;
  delayedShipmentCount: number;
  logisticsOrderCount: number;
  supplierRiskCount: number;
  openRiskCount: number;
  criticalRiskCount: number;
}

interface SupplyChainDashboardProps {
  organizationId: string;
  suppliers: Supplier[];
  shipments: Shipment[];
  logisticsOrders: LogisticsOrder[];
  risks: SupplierRisk[];
  metrics: SupplyChainMetrics;
  stats: SupplyChainStats;
}

// ── Helpers ──

const supplierStatusVariant: Record<SupplierStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  active: 'success',
  inactive: 'default',
  blacklisted: 'danger',
  pending: 'info',
};

const shipmentStatusVariant: Record<ShipmentStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  pending: 'info',
  in_transit: 'accent',
  delivered: 'success',
  delayed: 'warning',
  cancelled: 'danger',
  customs_hold: 'warning',
};

const logisticsStatusVariant: Record<LogisticsStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  pending: 'info',
  in_transit: 'accent',
  delivered: 'success',
  delayed: 'warning',
  cancelled: 'danger',
};

const severityVariant: Record<RiskSeverity, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  low: 'default',
  medium: 'info',
  high: 'warning',
  critical: 'danger',
};

const riskStatusVariant: Record<SupplierRiskStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  open: 'danger',
  mitigating: 'warning',
  mitigated: 'success',
  accepted: 'info',
  closed: 'default',
};

function formatCurrency(amount: number): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function formatDate(d: Date | string | null): string {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
}

// ── Component ──

export function SupplyChainDashboard({
  organizationId: _organizationId,
  suppliers,
  shipments,
  logisticsOrders,
  risks,
  metrics,
  stats,
}: SupplyChainDashboardProps) {
  const [tab, setTab] = useState<'overview' | 'suppliers' | 'shipments' | 'logistics' | 'risk'>('overview');
  const [search, setSearch] = useState('');

  const supplierName = useCallback(
    (id: string) => suppliers.find((s) => s.id === id)?.name || id,
    [suppliers],
  );

  const filteredSuppliers = useMemo(() => {
    if (!search) return suppliers;
    const q = search.toLowerCase();
    return suppliers.filter(
      (s) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q) || s.location.toLowerCase().includes(q),
    );
  }, [suppliers, search]);

  const filteredShipments = useMemo(() => {
    if (!search) return shipments;
    const q = search.toLowerCase();
    return shipments.filter(
      (s) => s.origin.toLowerCase().includes(q) || s.destination.toLowerCase().includes(q) || s.carrier.toLowerCase().includes(q) || supplierName(s.supplierId).toLowerCase().includes(q),
    );
  }, [shipments, search, supplierName]);

  const filteredLogistics = useMemo(() => {
    if (!search) return logisticsOrders;
    const q = search.toLowerCase();
    return logisticsOrders.filter(
      (o) => o.destination.toLowerCase().includes(q) || o.freightMode.toLowerCase().includes(q) || supplierName(o.supplierId).toLowerCase().includes(q),
    );
  }, [logisticsOrders, search, supplierName]);

  const filteredRisks = useMemo(() => {
    if (!search) return risks;
    const q = search.toLowerCase();
    return risks.filter(
      (r) => r.riskType.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || supplierName(r.supplierId).toLowerCase().includes(q),
    );
  }, [risks, search, supplierName]);

  const tabs: { id: typeof tab; label: string; icon: typeof Truck }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'suppliers', label: 'Suppliers', icon: Truck },
    { id: 'shipments', label: 'Shipments', icon: Package },
    { id: 'logistics', label: 'Logistics', icon: Activity },
    { id: 'risk', label: 'Risk', icon: Shield },
  ];

  return (
    <div className="space-y-6">
      {/* Stats overview */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Truck className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Suppliers</span>
          </div>
          <p className="text-2xl font-semibold">{stats.supplierCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.activeSupplierCount} active</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Package className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Shipments</span>
          </div>
          <p className="text-2xl font-semibold">{stats.shipmentCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.activeShipmentCount} active · {stats.delayedShipmentCount} delayed</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Logistics</span>
          </div>
          <p className="text-2xl font-semibold">{stats.logisticsOrderCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">orders</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Risks</span>
          </div>
          <p className="text-2xl font-semibold">{stats.supplierRiskCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.openRiskCount} open · {stats.criticalRiskCount} critical</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-accent-primary text-white'
                  : 'bg-surface-alt text-fg-secondary hover:text-fg-primary'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Search */}
      {tab !== 'overview' && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 w-full"
            />
          </div>
        </div>
      )}

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-accent-primary" />
                <h2 className="heading-display text-lg">Supply Chain Metrics</h2>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary flex items-center gap-1.5"><Package className="h-3.5 w-3.5" /> Active shipments</span>
                  <span className="font-medium">{metrics.activeShipments}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> Delayed shipments</span>
                  <span className="font-medium">{metrics.delayedShipments}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Avg lead time</span>
                  <span className="font-medium">{metrics.avgLeadTime} days</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> High-risk suppliers</span>
                  <span className="font-medium">{metrics.highRiskSuppliers}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-accent-primary" />
                <h2 className="heading-display text-lg">Open Supplier Risks</h2>
              </div>
              {risks.filter((r) => r.status === 'open' || r.status === 'mitigating').length === 0 ? (
                <p className="text-sm text-fg-secondary">No open supplier risks.</p>
              ) : (
                <div className="space-y-2">
                  {risks.filter((r) => r.status === 'open' || r.status === 'mitigating').slice(0, 5).map((r) => (
                    <div key={r.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium">{supplierName(r.supplierId)}</p>
                        <p className="text-xs text-fg-secondary capitalize">{r.riskType}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={severityVariant[r.severity]}>{r.severity}</Badge>
                        <Badge variant={riskStatusVariant[r.status]}>{r.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="font-semibold mb-3">Active Shipments</h3>
            {shipments.filter((s) => s.status === 'in_transit' || s.status === 'pending' || s.status === 'customs_hold').length === 0 ? (
              <p className="text-sm text-fg-secondary">No active shipments.</p>
            ) : (
              <div className="space-y-2">
                {shipments.filter((s) => s.status === 'in_transit' || s.status === 'pending' || s.status === 'customs_hold').slice(0, 5).map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{supplierName(s.supplierId)}</p>
                      <p className="text-xs text-fg-secondary">{s.origin} → {s.destination}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-fg-secondary">{formatCurrency(s.totalValue)}</span>
                      <Badge variant={shipmentStatusVariant[s.status]}>{s.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'suppliers' && (
        <div className="space-y-4">
          {filteredSuppliers.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Truck}
                title="No suppliers"
                description="Add a supplier to get started."
              />
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredSuppliers.map((supplier) => (
                <Card key={supplier.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{supplier.name}</h3>
                      <p className="text-xs text-fg-secondary flex items-center gap-1">
                        <MapPin className="h-3 w-3" />{supplier.location || 'No location'}
                      </p>
                    </div>
                    <Badge variant={supplierStatusVariant[supplier.status]}>{supplier.status}</Badge>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Category</span>
                      <span className="font-medium">{supplier.category || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Rating</span>
                      <span className="font-medium">{supplier.rating || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Lead time</span>
                      <span className="font-medium">{supplier.leadTimeDays} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Payment terms</span>
                      <span className="font-medium">{supplier.paymentTerms || '—'}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'shipments' && (
        <div className="space-y-4">
          {filteredShipments.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Package}
                title="No shipments"
                description="Create a shipment to see it here."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Supplier</th>
                    <th className="p-3 font-medium">Origin</th>
                    <th className="p-3 font-medium">Destination</th>
                    <th className="p-3 font-medium">Carrier</th>
                    <th className="p-3 font-medium">Expected</th>
                    <th className="p-3 font-medium">Value</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShipments.map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="p-3">{supplierName(s.supplierId)}</td>
                      <td className="p-3">{s.origin}</td>
                      <td className="p-3">{s.destination}</td>
                      <td className="p-3">{s.carrier || '—'}</td>
                      <td className="p-3">{formatDate(s.expectedArrival)}</td>
                      <td className="p-3 font-medium">{formatCurrency(s.totalValue)}</td>
                      <td className="p-3">
                        <Badge variant={shipmentStatusVariant[s.status]}>{s.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'logistics' && (
        <div className="space-y-4">
          {filteredLogistics.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Activity}
                title="No logistics orders"
                description="Create a logistics order to see it here."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Order Date</th>
                    <th className="p-3 font-medium">Supplier</th>
                    <th className="p-3 font-medium">Freight Mode</th>
                    <th className="p-3 font-medium">Destination</th>
                    <th className="p-3 font-medium">Expected Delivery</th>
                    <th className="p-3 font-medium">Cost</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogistics.map((o) => (
                    <tr key={o.id} className="border-b last:border-0">
                      <td className="p-3">{formatDate(o.orderDate)}</td>
                      <td className="p-3">{o.supplierId ? supplierName(o.supplierId) : '—'}</td>
                      <td className="p-3 capitalize">{o.freightMode}</td>
                      <td className="p-3">{o.destination || '—'}</td>
                      <td className="p-3">{formatDate(o.expectedDelivery)}</td>
                      <td className="p-3 font-medium">{formatCurrency(o.cost)}</td>
                      <td className="p-3">
                        <Badge variant={logisticsStatusVariant[o.status]}>{o.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'risk' && (
        <div className="space-y-4">
          {filteredRisks.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Shield}
                title="No supplier risks"
                description="Supplier risks will appear here once identified."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Supplier</th>
                    <th className="p-3 font-medium">Risk Type</th>
                    <th className="p-3 font-medium">Severity</th>
                    <th className="p-3 font-medium">Description</th>
                    <th className="p-3 font-medium">Mitigation</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRisks.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="p-3">{supplierName(r.supplierId)}</td>
                      <td className="p-3 capitalize">{r.riskType}</td>
                      <td className="p-3">
                        <Badge variant={severityVariant[r.severity]}>{r.severity}</Badge>
                      </td>
                      <td className="p-3 max-w-xs truncate text-fg-secondary">{r.description || '—'}</td>
                      <td className="p-3 max-w-xs truncate text-fg-secondary">{r.mitigation || '—'}</td>
                      <td className="p-3">
                        <Badge variant={riskStatusVariant[r.status]}>{r.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
