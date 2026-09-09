'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  TrendingUp, DollarSign, PieChart, AlertTriangle, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  PortfolioHolding, PortfolioTransaction, PortfolioAllocation, PortfolioRisk,
  PortfolioMetrics, PortfolioStats,
  HoldingStatus, TransactionType, AllocationStrategy, RiskLevel, RiskStatus,
} from '@/lib/services/portfolio-service';

type TabId = 'overview' | 'holdings' | 'transactions' | 'allocations' | 'risks';

interface PortfolioDashboardProps {
  organizationId: string;
  holdings: PortfolioHolding[];
  transactions: PortfolioTransaction[];
  allocations: PortfolioAllocation[];
  risks: PortfolioRisk[];
  metrics: PortfolioMetrics;
  stats: PortfolioStats;
}

const holdingStatusVariant = (status: HoldingStatus): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (status === 'active') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'sold' || status === 'closed') return 'danger';
  return 'info';
};

const transactionTypeVariant = (type: TransactionType): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['buy', 'deposit', 'dividend', 'interest'].includes(type)) return 'success';
  if (['sell', 'withdrawal', 'fee'].includes(type)) return 'warning';
  if (['split', 'rebalance'].includes(type)) return 'info';
  return 'default';
};

const allocationStrategyVariant = (strategy: AllocationStrategy): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['conservative', 'income_focused', 'balanced'].includes(strategy)) return 'success';
  if (['moderate', 'growth_focused'].includes(strategy)) return 'warning';
  if (['aggressive', 'custom'].includes(strategy)) return 'danger';
  return 'info';
};

const riskLevelVariant = (level: RiskLevel): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (level === 'low') return 'success';
  if (level === 'medium') return 'warning';
  if (level === 'high' || level === 'very_high') return 'danger';
  return 'info';
};

const riskStatusVariant = (status: RiskStatus): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (status === 'within_limits') return 'success';
  if (status === 'warning') return 'warning';
  if (status === 'breach' || status === 'critical') return 'danger';
  return 'info';
};

export function PortfolioDashboard({
  holdings, transactions, allocations, risks, metrics, stats,
}: PortfolioDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const holdingName = useCallback(
    (id: string) => holdings.find((h) => h.id === id)?.name || id,
    [holdings],
  );

  const filteredHoldings = useMemo(() => {
    if (!search) return holdings;
    const q = search.toLowerCase();
    return holdings.filter(
      (h) => h.name.toLowerCase().includes(q) || h.assetClass.toLowerCase().includes(q) || h.status.toLowerCase().includes(q) || h.sector.toLowerCase().includes(q),
    );
  }, [holdings, search]);

  const filteredTransactions = useMemo(() => {
    if (!search) return transactions;
    const q = search.toLowerCase();
    return transactions.filter(
      (t) => holdingName(t.holdingId || '').toLowerCase().includes(q) || t.type.toLowerCase().includes(q) || t.notes.toLowerCase().includes(q),
    );
  }, [transactions, search, holdingName]);

  const filteredAllocations = useMemo(() => {
    if (!search) return allocations;
    const q = search.toLowerCase();
    return allocations.filter(
      (a) => a.name.toLowerCase().includes(q) || a.strategy.toLowerCase().includes(q) || a.status.toLowerCase().includes(q),
    );
  }, [allocations, search]);

  const filteredRisks = useMemo(() => {
    if (!search) return risks;
    const q = search.toLowerCase();
    return risks.filter(
      (r) => r.name.toLowerCase().includes(q) || r.riskLevel.toLowerCase().includes(q) || r.status.toLowerCase().includes(q),
    );
  }, [risks, search]);

  const tabs: { id: TabId; label: string; icon: typeof TrendingUp }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'holdings', label: 'Holdings', icon: TrendingUp },
    { id: 'transactions', label: 'Transactions', icon: DollarSign },
    { id: 'allocations', label: 'Allocations', icon: PieChart },
    { id: 'risks', label: 'Risks', icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
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

      {/* Search */}
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
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Total Value</div>
              <div className="mt-1 text-2xl font-bold">${metrics.totalValue.toLocaleString()}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Total Cost</div>
              <div className="mt-1 text-2xl font-bold">${metrics.totalCost.toLocaleString()}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Gain / Loss</div>
              <div className="mt-1 text-2xl font-bold">${metrics.totalGainLoss.toLocaleString()}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Holdings</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeHoldings}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Transactions</div>
              <div className="mt-1 text-2xl font-bold">{stats.transactionCount}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Allocations</div>
              <div className="mt-1 text-2xl font-bold">{stats.allocationCount}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Asset Class Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byAssetClass).map(([cls, count]) => (
                <Badge key={cls} variant="info">{cls.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Holding Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byHoldingStatus).map(([status, count]) => (
                <Badge key={status} variant={holdingStatusVariant(status as HoldingStatus)}>{status}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Transaction Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byTransactionType).map(([type, count]) => (
                <Badge key={type} variant={transactionTypeVariant(type as TransactionType)}>{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Risk Level Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byRiskLevel).map(([level, count]) => (
                <Badge key={level} variant={riskLevelVariant(level as RiskLevel)}>{level.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'holdings' && (
        <div className="space-y-3">
          {filteredHoldings.length === 0 ? (
            <Card className="p-8"><EmptyState icon={TrendingUp} title="No holdings" description="Investment holdings will appear here." /></Card>
          ) : (
            filteredHoldings.map((h) => (
              <Card key={h.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{h.name}</div>
                    <div className="text-sm text-fg-secondary">{h.assetClass.replace('_', ' ')} · {h.quantity} @ ${h.purchasePrice} · {h.currency}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">${(h.currentPrice * h.quantity).toLocaleString()}</Badge>
                    <Badge variant={holdingStatusVariant(h.status)}>{h.status}</Badge>
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
            <Card className="p-8"><EmptyState icon={DollarSign} title="No transactions" description="Portfolio transactions will appear here." /></Card>
          ) : (
            filteredTransactions.map((t) => (
              <Card key={t.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{holdingName(t.holdingId || '')} — {t.type.replace('_', ' ')}</div>
                    <div className="text-sm text-fg-secondary">${t.amount.toLocaleString()} · {t.transactionDate ? new Date(t.transactionDate).toLocaleDateString() : 'N/A'}</div>
                  </div>
                  <Badge variant={transactionTypeVariant(t.type)}>{t.type.replace('_', ' ')}</Badge>
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
                    <div className="font-medium">{a.name}</div>
                    <div className="text-sm text-fg-secondary">{a.strategy.replace('_', ' ')} · {Object.keys(a.targetWeights).length} target weights</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={allocationStrategyVariant(a.strategy)}>{a.strategy.replace('_', ' ')}</Badge>
                    <Badge variant="default">{a.status}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'risks' && (
        <div className="space-y-3">
          {filteredRisks.length === 0 ? (
            <Card className="p-8"><EmptyState icon={AlertTriangle} title="No risks" description="Risk assessments will appear here." /></Card>
          ) : (
            filteredRisks.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{r.name || 'Risk Assessment'}</div>
                    <div className="text-sm text-fg-secondary">VaR: ${r.varAmount.toLocaleString()} · Beta: {r.beta} · Volatility: {r.volatility}%</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={riskLevelVariant(r.riskLevel)}>{r.riskLevel.replace('_', ' ')}</Badge>
                    <Badge variant={riskStatusVariant(r.status)}>{r.status.replace('_', ' ')}</Badge>
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
