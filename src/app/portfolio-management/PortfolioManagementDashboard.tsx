'use client';

import { useState, useMemo } from 'react';
import {
  Briefcase, TrendingUp, ArrowLeftRight, PieChart, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  PortfolioAccount, PortfolioHolding, PortfolioTransaction, PortfolioAllocation,
  PortfolioManagementMetrics, PortfolioManagementStats,
} from '@/lib/services/portfolio-management-service';

type TabId = 'overview' | 'accounts' | 'holdings' | 'transactions' | 'allocations';

interface PortfolioManagementDashboardProps {
  organizationId: string;
  accounts: PortfolioAccount[];
  holdings: PortfolioHolding[];
  transactions: PortfolioTransaction[];
  allocations: PortfolioAllocation[];
  metrics: PortfolioManagementMetrics;
  stats: PortfolioManagementStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['active', 'open', 'executed', 'settled', 'reviewed'].includes(status)) return 'success';
  if (['pending', 'draft', 'planned'].includes(status)) return 'warning';
  if (['closed', 'frozen', 'suspended', 'liquidated', 'cancelled', 'failed', 'reversed', 'sold', 'expired', 'archived'].includes(status)) return 'danger';
  return 'info';
};

export function PortfolioManagementDashboard({
  accounts, holdings, transactions, allocations, metrics, stats,
}: PortfolioManagementDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const accountName = useMemo(
    () => (id: string) => accounts.find((a) => a.id === id)?.name || id,
    [accounts],
  );

  const filteredAccounts = useMemo(() => {
    if (!search) return accounts;
    const q = search.toLowerCase();
    return accounts.filter(
      (a) => a.name.toLowerCase().includes(q) || a.type.toLowerCase().includes(q) || a.status.toLowerCase().includes(q),
    );
  }, [accounts, search]);

  const filteredHoldings = useMemo(() => {
    if (!search) return holdings;
    const q = search.toLowerCase();
    return holdings.filter(
      (h) => h.symbol.toLowerCase().includes(q) || h.name.toLowerCase().includes(q) || h.type.toLowerCase().includes(q) || h.status.toLowerCase().includes(q),
    );
  }, [holdings, search]);

  const filteredTransactions = useMemo(() => {
    if (!search) return transactions;
    const q = search.toLowerCase();
    return transactions.filter(
      (t) => t.type.toLowerCase().includes(q) || t.status.toLowerCase().includes(q) || t.description.toLowerCase().includes(q),
    );
  }, [transactions, search]);

  const filteredAllocations = useMemo(() => {
    if (!search) return allocations;
    const q = search.toLowerCase();
    return allocations.filter(
      (a) => a.type.toLowerCase().includes(q) || a.status.toLowerCase().includes(q) || a.description.toLowerCase().includes(q),
    );
  }, [allocations, search]);

  const tabs: { id: TabId; label: string; icon: typeof Briefcase }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'accounts', label: 'Accounts', icon: Briefcase },
    { id: 'holdings', label: 'Holdings', icon: TrendingUp },
    { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
    { id: 'allocations', label: 'Allocations', icon: PieChart },
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
              <div className="text-xs text-fg-tertiary">Active Accounts</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeAccounts}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Open Holdings</div>
              <div className="mt-1 text-2xl font-bold">{metrics.openHoldings}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Pending Transactions</div>
              <div className="mt-1 text-2xl font-bold">{metrics.pendingTransactions}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Total Portfolio Value</div>
              <div className="mt-1 text-2xl font-bold">${metrics.totalPortfolioValue.toLocaleString()}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Allocations</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeAllocations}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Account Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byAccountType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Account Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byAccountStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Holding Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byHoldingType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Transaction Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byTransactionStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Allocation Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byAllocationType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'accounts' && (
        <div className="space-y-3">
          {filteredAccounts.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Briefcase} title="No accounts" description="Portfolio accounts will appear here." /></Card>
          ) : (
            filteredAccounts.map((a) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{a.name}</div>
                    <div className="text-sm text-fg-secondary">{a.type.replace('_', ' ')} · {a.custodian || 'No custodian'} · {a.manager || 'No manager'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.currentValue > 0 && <Badge variant="default">${a.currentValue.toLocaleString()}</Badge>}
                    <Badge variant={statusVariant(a.status)}>{a.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'holdings' && (
        <div className="space-y-3">
          {filteredHoldings.length === 0 ? (
            <Card className="p-8"><EmptyState icon={TrendingUp} title="No holdings" description="Portfolio holdings will appear here." /></Card>
          ) : (
            filteredHoldings.map((h) => (
              <Card key={h.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{h.symbol} · {h.name}</div>
                    <div className="text-sm text-fg-secondary">{h.type.replace('_', ' ')} · {accountName(h.accountId)} · {h.sector || 'No sector'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {h.marketValue > 0 && <Badge variant="default">${h.marketValue.toLocaleString()}</Badge>}
                    <Badge variant={statusVariant(h.status)}>{h.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'transactions' && (
        <div className="space-y-3">
          {filteredTransactions.length === 0 ? (
            <Card className="p-8"><EmptyState icon={ArrowLeftRight} title="No transactions" description="Portfolio transactions will appear here." /></Card>
          ) : (
            filteredTransactions.map((t) => (
              <Card key={t.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{t.type.replace('_', ' ')} · ${t.amount.toLocaleString()}</div>
                    <div className="text-sm text-fg-secondary">{accountName(t.accountId)} · {t.description || 'No description'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.quantity > 0 && <Badge variant="default">{t.quantity} @ ${t.price}</Badge>}
                    <Badge variant={statusVariant(t.status)}>{t.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'allocations' && (
        <div className="space-y-3">
          {filteredAllocations.length === 0 ? (
            <Card className="p-8"><EmptyState icon={PieChart} title="No allocations" description="Portfolio allocations will appear here." /></Card>
          ) : (
            filteredAllocations.map((a) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{a.type.replace('_', ' ')} Allocation</div>
                    <div className="text-sm text-fg-secondary">{accountName(a.accountId)} · {a.description || 'No description'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.driftThreshold > 0 && <Badge variant="default">Drift: {a.driftThreshold}%</Badge>}
                    <Badge variant={statusVariant(a.status)}>{a.status.replace('_', ' ')}</Badge>
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
