'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Landmark, ArrowLeftRight, CheckCircle, Send,
  Search, BarChart3, DollarSign,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  BankAccount, BankTransaction, BankReconciliation, WireTransfer,
  BankingMetrics, BankingStats,
} from '@/lib/services/banking-service';

type TabId = 'overview' | 'accounts' | 'transactions' | 'reconciliations' | 'wires';

interface BankingDashboardProps {
  organizationId: string;
  accounts: BankAccount[];
  transactions: BankTransaction[];
  reconciliations: BankReconciliation[];
  wires: WireTransfer[];
  metrics: BankingMetrics;
  stats: BankingStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['active', 'posted', 'completed', 'matched', 'received', 'sent'].includes(status)) return 'success';
  if (['pending', 'in_progress', 'initiated', 'approved', 'dormant'].includes(status)) return 'warning';
  if (['frozen', 'closed', 'reversed', 'returned', 'cancelled', 'failed', 'discrepancy'].includes(status)) return 'danger';
  return 'info';
};

export function BankingDashboard({
  accounts, transactions, reconciliations, wires, metrics, stats,
}: BankingDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const accountName = useCallback(
    (id: string) => accounts.find((a) => a.id === id)?.accountName || id,
    [accounts],
  );

  const filteredAccounts = useMemo(() => {
    if (!search) return accounts;
    const q = search.toLowerCase();
    return accounts.filter(
      (a) => a.accountName.toLowerCase().includes(q) || a.bankName.toLowerCase().includes(q) || a.status.toLowerCase().includes(q),
    );
  }, [accounts, search]);

  const filteredTransactions = useMemo(() => {
    if (!search) return transactions;
    const q = search.toLowerCase();
    return transactions.filter(
      (t) => accountName(t.accountId).toLowerCase().includes(q) || t.type.toLowerCase().includes(q) || t.status.toLowerCase().includes(q),
    );
  }, [transactions, search, accountName]);

  const filteredReconciliations = useMemo(() => {
    if (!search) return reconciliations;
    const q = search.toLowerCase();
    return reconciliations.filter(
      (r) => accountName(r.accountId).toLowerCase().includes(q) || r.period.toLowerCase().includes(q) || r.status.toLowerCase().includes(q),
    );
  }, [reconciliations, search, accountName]);

  const filteredWires = useMemo(() => {
    if (!search) return wires;
    const q = search.toLowerCase();
    return wires.filter(
      (w) => w.toAccountName.toLowerCase().includes(q) || w.toBankName.toLowerCase().includes(q) || w.status.toLowerCase().includes(q),
    );
  }, [wires, search]);

  const tabs: { id: TabId; label: string; icon: typeof Landmark }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'accounts', label: 'Accounts', icon: Landmark },
    { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
    { id: 'reconciliations', label: 'Reconciliations', icon: CheckCircle },
    { id: 'wires', label: 'Wire Transfers', icon: Send },
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
              <div className="text-xs text-fg-tertiary">Total Balance</div>
              <div className="mt-1 text-2xl font-bold">${metrics.totalBalance.toLocaleString()}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Pending Txns</div>
              <div className="mt-1 text-2xl font-bold">{metrics.pendingTransactions}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Outstanding Wires</div>
              <div className="mt-1 text-2xl font-bold">{metrics.outstandingWires}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Accounts</div>
              <div className="mt-1 text-2xl font-bold">{stats.activeAccountCount}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Posted Txns</div>
              <div className="mt-1 text-2xl font-bold">{stats.postedTransactionCount}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Completed Recons</div>
              <div className="mt-1 text-2xl font-bold">{stats.completedReconciliationCount}</div>
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
            <h3 className="mb-4 text-sm font-semibold">Transaction Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byTransactionStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'accounts' && (
        <div className="space-y-3">
          {filteredAccounts.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Landmark} title="No accounts" description="Bank accounts will appear here." /></Card>
          ) : (
            filteredAccounts.map((a) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{a.accountName}</div>
                    <div className="text-sm text-fg-secondary">{a.bankName} · {a.accountType.replace('_', ' ')} · {a.currency}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">${a.balance.toLocaleString()}</Badge>
                    <Badge variant={statusVariant(a.status)}>{a.status}</Badge>
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
            <Card className="p-8"><EmptyState icon={ArrowLeftRight} title="No transactions" description="Transactions will appear here." /></Card>
          ) : (
            filteredTransactions.map((t) => (
              <Card key={t.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{accountName(t.accountId)} — {t.type.replace('_', ' ')}</div>
                    <div className="text-sm text-fg-secondary">${t.amount.toLocaleString()} · {new Date(t.date).toLocaleDateString()}</div>
                  </div>
                  <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'reconciliations' && (
        <div className="space-y-3">
          {filteredReconciliations.length === 0 ? (
            <Card className="p-8"><EmptyState icon={CheckCircle} title="No reconciliations" description="Reconciliations will appear here." /></Card>
          ) : (
            filteredReconciliations.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{accountName(r.accountId)} — {r.period}</div>
                    <div className="text-sm text-fg-secondary">Statement: ${r.statementBalance.toLocaleString()} · Book: ${r.bookBalance.toLocaleString()}</div>
                  </div>
                  <Badge variant={statusVariant(r.status)}>{r.status.replace('_', ' ')}</Badge>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'wires' && (
        <div className="space-y-3">
          {filteredWires.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Send} title="No wire transfers" description="Wire transfers will appear here." /></Card>
          ) : (
            filteredWires.map((w) => (
              <Card key={w.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{w.toAccountName} — {w.toBankName}</div>
                    <div className="text-sm text-fg-secondary">${w.amount.toLocaleString()} {w.currency} · {new Date(w.initiatedDate).toLocaleDateString()}</div>
                  </div>
                  <Badge variant={statusVariant(w.status)}>{w.status}</Badge>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
