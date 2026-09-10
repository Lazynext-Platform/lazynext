'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Building, FileText, Users, DollarSign, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  LeaseProperty, LeaseContract, LeaseTenant, LeasePayment,
  LeaseManagementMetrics, LeaseManagementStats,
} from '@/lib/services/lease-management-service';

type TabId = 'overview' | 'properties' | 'contracts' | 'tenants' | 'payments';

interface LeaseManagementDashboardProps {
  organizationId: string;
  properties: LeaseProperty[];
  contracts: LeaseContract[];
  tenants: LeaseTenant[];
  payments: LeasePayment[];
  metrics: LeaseManagementMetrics;
  stats: LeaseManagementStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['active', 'paid', 'leased', 'renewed'].includes(status)) return 'success';
  if (['draft', 'pending', 'prospective', 'available', 'under_renovation', 'pending_renewal'].includes(status)) return 'warning';
  if (['terminated', 'overdue', 'cancelled', 'off_market', 'sold', 'former', 'inactive', 'expired', 'refunded'].includes(status)) return 'danger';
  return 'info';
};

export function LeaseManagementDashboard({
  properties, contracts, tenants, payments, metrics, stats,
}: LeaseManagementDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const tenantName = useCallback((id: string) => tenants.find((t) => t.id === id)?.name || id, [tenants]);
  const propertyName = useCallback((id: string) => properties.find((p) => p.id === id)?.name || id, [properties]);

  const filteredProperties = useMemo(() => {
    if (!search) return properties;
    const q = search.toLowerCase();
    return properties.filter(
      (p) => p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q) || p.status.toLowerCase().includes(q),
    );
  }, [properties, search]);

  const filteredContracts = useMemo(() => {
    if (!search) return contracts;
    const q = search.toLowerCase();
    return contracts.filter(
      (c) => propertyName(c.propertyId).toLowerCase().includes(q) || tenantName(c.tenantId).toLowerCase().includes(q) || c.type.toLowerCase().includes(q) || c.status.toLowerCase().includes(q),
    );
  }, [contracts, search, propertyName, tenantName]);

  const filteredTenants = useMemo(() => {
    if (!search) return tenants;
    const q = search.toLowerCase();
    return tenants.filter(
      (t) => t.name.toLowerCase().includes(q) || t.type.toLowerCase().includes(q) || t.status.toLowerCase().includes(q),
    );
  }, [tenants, search]);

  const filteredPayments = useMemo(() => {
    if (!search) return payments;
    const q = search.toLowerCase();
    return payments.filter(
      (p) => p.type.toLowerCase().includes(q) || p.status.toLowerCase().includes(q) || String(p.amount).includes(q),
    );
  }, [payments, search]);

  const tabs: { id: TabId; label: string; icon: typeof Building }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'properties', label: 'Properties', icon: Building },
    { id: 'contracts', label: 'Contracts', icon: FileText },
    { id: 'tenants', label: 'Tenants', icon: Users },
    { id: 'payments', label: 'Payments', icon: DollarSign },
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
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Contracts</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeContracts}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Total Monthly Rent</div>
              <div className="mt-1 text-2xl font-bold">${metrics.totalMonthlyRent.toLocaleString()}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Pending Payments</div>
              <div className="mt-1 text-2xl font-bold">{metrics.pendingPayments}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Overdue Payments</div>
              <div className="mt-1 text-2xl font-bold">{metrics.overduePayments}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Available Properties</div>
              <div className="mt-1 text-2xl font-bold">{metrics.availableProperties}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Leased Properties</div>
              <div className="mt-1 text-2xl font-bold">{metrics.leasedProperties}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Tenants</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeTenants}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Total Properties</div>
              <div className="mt-1 text-2xl font-bold">{stats.propertyCount}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Property Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byPropertyType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Contract Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byContractStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Payment Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byPaymentStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'properties' && (
        <div className="space-y-3">
          {filteredProperties.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Building} title="No properties" description="Lease properties will appear here." /></Card>
          ) : (
            filteredProperties.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-fg-secondary">{p.type.replace('_', ' ')} · {p.address || 'No address'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.monthlyRent > 0 && <Badge variant="default">${p.monthlyRent.toLocaleString()}/mo</Badge>}
                    <Badge variant={statusVariant(p.status)}>{p.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'contracts' && (
        <div className="space-y-3">
          {filteredContracts.length === 0 ? (
            <Card className="p-8"><EmptyState icon={FileText} title="No contracts" description="Lease contracts will appear here." /></Card>
          ) : (
            filteredContracts.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{propertyName(c.propertyId)}</div>
                    <div className="text-sm text-fg-secondary">{tenantName(c.tenantId)} · {c.type.replace('_', ' ')}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.monthlyRent > 0 && <Badge variant="default">${c.monthlyRent.toLocaleString()}/mo</Badge>}
                    <Badge variant={statusVariant(c.status)}>{c.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'tenants' && (
        <div className="space-y-3">
          {filteredTenants.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Users} title="No tenants" description="Lease tenants will appear here." /></Card>
          ) : (
            filteredTenants.map((t) => (
              <Card key={t.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-sm text-fg-secondary">{t.type.replace('_', ' ')} · {t.contactName || t.email || 'No contact'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.creditScore > 0 && <Badge variant="default">Credit: {t.creditScore}</Badge>}
                    <Badge variant={statusVariant(t.status)}>{t.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'payments' && (
        <div className="space-y-3">
          {filteredPayments.length === 0 ? (
            <Card className="p-8"><EmptyState icon={DollarSign} title="No payments" description="Lease payments will appear here." /></Card>
          ) : (
            filteredPayments.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">${p.amount.toLocaleString()} {p.currency}</div>
                    <div className="text-sm text-fg-secondary">{p.type.replace('_', ' ')} · {p.dueDate ? new Date(p.dueDate).toLocaleDateString() : 'No due date'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.method && <Badge variant="default">{p.method}</Badge>}
                    <Badge variant={statusVariant(p.status)}>{p.status.replace('_', ' ')}</Badge>
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
