'use client';

import { useState, useMemo } from 'react';
import {
  Package, Users, Truck, DollarSign, Building, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  RelocationCase, RelocationMove, RelocationExpense, RelocationVendor,
  RelocationMetrics, RelocationStats,
} from '@/lib/services/relocation-service';

type TabId = 'overview' | 'cases' | 'moves' | 'expenses' | 'vendors';

interface RelocationDashboardProps {
  organizationId: string;
  cases: RelocationCase[];
  moves: RelocationMove[];
  expenses: RelocationExpense[];
  vendors: RelocationVendor[];
  metrics: RelocationMetrics;
  stats: RelocationStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['completed', 'delivered', 'approved', 'reimbursed', 'preferred'].includes(status)) return 'success';
  if (['initiated', 'planning', 'in_progress', 'scheduled', 'in_transit', 'submitted', 'pending', 'active'].includes(status)) return 'warning';
  if (['cancelled', 'on_hold', 'delayed', 'rejected', 'disputed', 'blacklisted'].includes(status)) return 'danger';
  return 'info';
};

export function RelocationDashboard({
  cases, moves, expenses, vendors, metrics, stats,
}: RelocationDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const filteredCases = useMemo(() => {
    if (!search) return cases;
    const q = search.toLowerCase();
    return cases.filter(
      (c) => c.employeeName.toLowerCase().includes(q) || c.type.toLowerCase().includes(q) || c.status.toLowerCase().includes(q),
    );
  }, [cases, search]);

  const filteredMoves = useMemo(() => {
    if (!search) return moves;
    const q = search.toLowerCase();
    return moves.filter(
      (m) => m.type.toLowerCase().includes(q) || m.status.toLowerCase().includes(q) || m.carrier.toLowerCase().includes(q),
    );
  }, [moves, search]);

  const filteredExpenses = useMemo(() => {
    if (!search) return expenses;
    const q = search.toLowerCase();
    return expenses.filter(
      (e) => e.type.toLowerCase().includes(q) || e.status.toLowerCase().includes(q) || e.vendor.toLowerCase().includes(q),
    );
  }, [expenses, search]);

  const filteredVendors = useMemo(() => {
    if (!search) return vendors;
    const q = search.toLowerCase();
    return vendors.filter(
      (v) => v.name.toLowerCase().includes(q) || v.type.toLowerCase().includes(q) || v.status.toLowerCase().includes(q),
    );
  }, [vendors, search]);

  const tabs: { id: TabId; label: string; icon: typeof Package }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'cases', label: 'Cases', icon: Package },
    { id: 'moves', label: 'Moves', icon: Truck },
    { id: 'expenses', label: 'Expenses', icon: DollarSign },
    { id: 'vendors', label: 'Vendors', icon: Building },
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
              <div className="text-xs text-fg-tertiary">Active Cases</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeCases}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">In-Transit Moves</div>
              <div className="mt-1 text-2xl font-bold">{metrics.inTransitMoves}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Pending Expenses</div>
              <div className="mt-1 text-2xl font-bold">{metrics.pendingExpenses}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Total Budget</div>
              <div className="mt-1 text-2xl font-bold">${metrics.totalBudget.toLocaleString()}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Preferred Vendors</div>
              <div className="mt-1 text-2xl font-bold">{metrics.preferredVendors}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Case Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byCaseType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Case Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byCaseStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Move Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byMoveStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Expense Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byExpenseStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Vendor Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byVendorType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'cases' && (
        <div className="space-y-3">
          {filteredCases.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Package} title="No relocation cases" description="Relocation cases will appear here." /></Card>
          ) : (
            filteredCases.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{c.employeeName}</div>
                    <div className="text-sm text-fg-secondary">{c.type.replace('_', ' ')} · {c.originLocation || 'Unknown'} → {c.destinationLocation || 'Unknown'}</div>
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

      {tab === 'moves' && (
        <div className="space-y-3">
          {filteredMoves.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Truck} title="No moves" description="Relocation moves will appear here." /></Card>
          ) : (
            filteredMoves.map((m) => (
              <Card key={m.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{m.type.replace('_', ' ')}</div>
                    <div className="text-sm text-fg-secondary">{m.originAddress || 'Unknown'} → {m.destinationAddress || 'Unknown'} · {m.carrier || 'Unassigned'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.cost > 0 && <Badge variant="default">${m.cost.toLocaleString()}</Badge>}
                    <Badge variant={statusVariant(m.status)}>{m.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'expenses' && (
        <div className="space-y-3">
          {filteredExpenses.length === 0 ? (
            <Card className="p-8"><EmptyState icon={DollarSign} title="No expenses" description="Relocation expenses will appear here." /></Card>
          ) : (
            filteredExpenses.map((e) => (
              <Card key={e.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{e.type.replace('_', ' ')}</div>
                    <div className="text-sm text-fg-secondary">{e.vendor || 'Unknown vendor'} · {e.currency}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">${e.amount.toLocaleString()}</Badge>
                    <Badge variant={statusVariant(e.status)}>{e.status.replace('_', ' ')}</Badge>
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
            <Card className="p-8"><EmptyState icon={Building} title="No vendors" description="Relocation vendors will appear here." /></Card>
          ) : (
            filteredVendors.map((v) => (
              <Card key={v.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{v.name}</div>
                    <div className="text-sm text-fg-secondary">{v.type.replace('_', ' ')} · {v.contactName || 'No contact'}</div>
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
    </div>
  );
}
