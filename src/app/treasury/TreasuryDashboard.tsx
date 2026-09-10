'use client';

import { useState, useMemo } from 'react';
import {
  Banknote, TrendingUp, Wallet, Plus, Search,
  CheckCircle, XCircle, Clock, ArrowUpRight, ArrowDownRight,
  PiggyBank, Calendar, AlertTriangle,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  BankAccount, BankAccountType,
  CashPosition, CashFlowForecast, PaymentApproval, PaymentStatus,
  LiquidityAnalysis, TreasuryStats,
} from '@/lib/services/treasury-service';

// ── Props ──

interface TreasuryDashboardProps {
  organizationId: string;
  bankAccounts: BankAccount[];
  cashPositions: CashPosition[];
  forecasts: CashFlowForecast[];
  paymentApprovals: PaymentApproval[];
  liquidity: LiquidityAnalysis;
  stats: TreasuryStats;
}

// ── Helpers ──

const accountTypeVariant: Record<BankAccountType, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  checking: 'info',
  savings: 'success',
  credit: 'warning',
  investment: 'accent',
};

const paymentStatusVariant: Record<PaymentStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  pending: 'warning',
  approved: 'info',
  rejected: 'danger',
  paid: 'success',
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

export function TreasuryDashboard({
  organizationId: _organizationId,
  bankAccounts,
  cashPositions,
  forecasts,
  paymentApprovals,
  liquidity,
  stats,
}: TreasuryDashboardProps) {
  const [tab, setTab] = useState<'overview' | 'accounts' | 'cash' | 'forecasts' | 'payments' | 'liquidity'>('overview');
  const [search, setSearch] = useState('');

  const filteredAccounts = useMemo(() => {
    if (!search) return bankAccounts;
    const q = search.toLowerCase();
    return bankAccounts.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.bankName.toLowerCase().includes(q) ||
        a.accountNumber.toLowerCase().includes(q),
    );
  }, [bankAccounts, search]);

  const filteredCashPositions = useMemo(() => {
    if (!search) return cashPositions;
    const q = search.toLowerCase();
    return cashPositions.filter(
      (p) =>
        p.accountName.toLowerCase().includes(q) ||
        p.accountId.toLowerCase().includes(q) ||
        p.notes.toLowerCase().includes(q),
    );
  }, [cashPositions, search]);

  const filteredForecasts = useMemo(() => {
    if (!search) return forecasts;
    const q = search.toLowerCase();
    return forecasts.filter(
      (f) =>
        f.period.toLowerCase().includes(q) ||
        f.notes.toLowerCase().includes(q),
    );
  }, [forecasts, search]);

  const filteredPayments = useMemo(() => {
    if (!search) return paymentApprovals;
    const q = search.toLowerCase();
    return paymentApprovals.filter(
      (p) =>
        p.payee.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
    );
  }, [paymentApprovals, search]);

  const tabs: { id: typeof tab; label: string; icon: typeof Banknote }[] = [
    { id: 'overview', label: 'Overview', icon: Banknote },
    { id: 'accounts', label: 'Bank Accounts', icon: Wallet },
    { id: 'cash', label: 'Cash Positions', icon: PiggyBank },
    { id: 'forecasts', label: 'Forecasts', icon: TrendingUp },
    { id: 'payments', label: 'Payment Approvals', icon: CheckCircle },
    { id: 'liquidity', label: 'Liquidity', icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      {/* Stats overview */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Bank Accounts</span>
          </div>
          <p className="text-2xl font-semibold">{stats.bankAccountCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.activeAccountCount} active</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Banknote className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Total Cash</span>
          </div>
          <p className="text-2xl font-semibold">{formatCurrency(stats.totalCash)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Pending Payments</span>
          </div>
          <p className="text-2xl font-semibold">{stats.pendingPaymentCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{formatCurrency(stats.pendingPayments)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Forecasts</span>
          </div>
          <p className="text-2xl font-semibold">{stats.forecastCount}</p>
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

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Banknote className="h-5 w-5 text-accent-primary" />
                <h3 className="font-semibold">Current Cash</h3>
              </div>
              <p className="text-3xl font-bold">{formatCurrency(liquidity.currentCash)}</p>
            </Card>
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-warning" />
                <h3 className="font-semibold">Pending Payments</h3>
              </div>
              <p className="text-3xl font-bold">{formatCurrency(liquidity.pendingPayments)}</p>
              <p className="text-xs text-fg-secondary mt-1">{liquidity.pendingCount} pending</p>
            </Card>
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-accent-primary" />
                <h3 className="font-semibold">Projected Balance</h3>
              </div>
              <p className="text-3xl font-bold">{formatCurrency(liquidity.projectedBalance)}</p>
              <p className="text-xs text-fg-secondary mt-1">After pending payments</p>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="font-semibold mb-3">Recent Bank Accounts</h3>
            {bankAccounts.length === 0 ? (
              <p className="text-sm text-fg-secondary">No bank accounts yet.</p>
            ) : (
              <div className="space-y-2">
                {bankAccounts.slice(0, 5).map((account) => (
                  <div key={account.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{account.name}</p>
                      <p className="text-xs text-fg-secondary">{account.bankName}</p>
                    </div>
                    <span className="font-medium">{formatCurrency(account.balance)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-3">Recent Payment Approvals</h3>
            {paymentApprovals.length === 0 ? (
              <p className="text-sm text-fg-secondary">No payment approvals yet.</p>
            ) : (
              <div className="space-y-2">
                {paymentApprovals.slice(0, 5).map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{payment.payee}</p>
                      <p className="text-xs text-fg-secondary">{payment.category || 'No category'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formatCurrency(payment.amount)}</span>
                      <Badge variant={paymentStatusVariant[payment.status]}>{payment.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'accounts' && (
        <div className="space-y-4">
          {filteredAccounts.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Wallet}
                title="No bank accounts"
                description="Add a bank account to start managing treasury."
                action={<Button href="/treasury/new"><Plus className="h-4 w-4" />Add Account</Button>}
              />
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredAccounts.map((account) => (
                <Card key={account.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{account.name}</h3>
                      <p className="text-xs text-fg-secondary">{account.bankName || 'No bank'}</p>
                    </div>
                    <Badge variant={accountTypeVariant[account.type]}>{account.type}</Badge>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Balance</span>
                      <span className="font-medium text-base">{formatCurrency(account.balance)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Account #</span>
                      <span className="font-medium">{account.accountNumber || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Currency</span>
                      <span className="font-medium">{account.currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Status</span>
                      <span className="font-medium">{account.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'cash' && (
        <div className="space-y-4">
          {filteredCashPositions.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={PiggyBank}
                title="No cash positions"
                description="Record cash positions to track balances over time."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Account</th>
                    <th className="p-3 font-medium">Balance</th>
                    <th className="p-3 font-medium">Date</th>
                    <th className="p-3 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCashPositions.map((position) => (
                    <tr key={position.id} className="border-b last:border-0">
                      <td className="p-3">
                        <p className="font-medium">{position.accountName || '—'}</p>
                        <p className="text-xs text-fg-secondary">{position.accountId}</p>
                      </td>
                      <td className="p-3 font-medium">{formatCurrency(position.balance)}</td>
                      <td className="p-3">{formatDate(position.date)}</td>
                      <td className="p-3 max-w-xs truncate text-fg-secondary">{position.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'forecasts' && (
        <div className="space-y-4">
          {filteredForecasts.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={TrendingUp}
                title="No forecasts"
                description="Create a cash flow forecast to project future positions."
              />
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredForecasts.map((forecast) => (
                <Card key={forecast.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{forecast.period}</h3>
                      <p className="text-xs text-fg-secondary">{formatDate(forecast.createdAt)}</p>
                    </div>
                    <Badge variant={forecast.netFlow >= 0 ? 'success' : 'danger'}>
                      {forecast.netFlow >= 0 ? 'Surplus' : 'Deficit'}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-fg-secondary">
                        <ArrowUpRight className="h-4 w-4 text-success" /> Inflows
                      </span>
                      <span className="font-medium text-success">{formatCurrency(forecast.totalInflows)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-fg-secondary">
                        <ArrowDownRight className="h-4 w-4 text-danger" /> Outflows
                      </span>
                      <span className="font-medium text-danger">{formatCurrency(forecast.totalOutflows)}</span>
                    </div>
                    <div className="flex items-center justify-between border-t pt-2">
                      <span className="text-fg-secondary">Net Flow</span>
                      <span className="font-bold">{formatCurrency(forecast.netFlow)}</span>
                    </div>
                  </div>
                  {forecast.notes && (
                    <p className="text-xs text-fg-secondary mt-3 line-clamp-2">{forecast.notes}</p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'payments' && (
        <div className="space-y-4">
          {filteredPayments.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={CheckCircle}
                title="No payment approvals"
                description="Create a payment approval to route payments through review."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Payee</th>
                    <th className="p-3 font-medium">Amount</th>
                    <th className="p-3 font-medium">Category</th>
                    <th className="p-3 font-medium">Due Date</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="border-b last:border-0">
                      <td className="p-3">
                        <p className="font-medium">{payment.payee}</p>
                        <p className="text-xs text-fg-secondary">{payment.description || '—'}</p>
                      </td>
                      <td className="p-3 font-medium">{formatCurrency(payment.amount)}</td>
                      <td className="p-3">{payment.category || '—'}</td>
                      <td className="p-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-fg-muted" />
                          {formatDate(payment.dueDate)}
                        </span>
                      </td>
                      <td className="p-3">
                        <Badge variant={paymentStatusVariant[payment.status]}>{payment.status}</Badge>
                      </td>
                      <td className="p-3">
                        {payment.status === 'pending' && (
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="primary">
                              <CheckCircle className="h-3 w-3" /> Approve
                            </Button>
                            <Button size="sm" variant="danger">
                              <XCircle className="h-3 w-3" /> Reject
                            </Button>
                          </div>
                        )}
                        {payment.status === 'approved' && payment.approvedBy && (
                          <span className="text-xs text-fg-secondary">by {payment.approvedBy}</span>
                        )}
                        {payment.status === 'rejected' && payment.rejectionReason && (
                          <span className="text-xs text-fg-secondary">{payment.rejectionReason}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'liquidity' && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Banknote className="h-5 w-5 text-accent-primary" />
                <h3 className="font-semibold">Current Cash</h3>
              </div>
              <p className="text-3xl font-bold">{formatCurrency(liquidity.currentCash)}</p>
              <p className="text-xs text-fg-secondary mt-1">Total across active accounts</p>
            </Card>
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-warning" />
                <h3 className="font-semibold">Pending Payments</h3>
              </div>
              <p className="text-3xl font-bold">{formatCurrency(liquidity.pendingPayments)}</p>
              <p className="text-xs text-fg-secondary mt-1">{liquidity.pendingCount} payments awaiting approval</p>
            </Card>
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-accent-primary" />
                <h3 className="font-semibold">Projected Balance</h3>
              </div>
              <p className="text-3xl font-bold">{formatCurrency(liquidity.projectedBalance)}</p>
              <p className="text-xs text-fg-secondary mt-1">After pending payments clear</p>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="font-semibold mb-3">Liquidity Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-fg-secondary">Current cash position</span>
                <span className="font-medium">{formatCurrency(liquidity.currentCash)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-fg-secondary">Less: pending payments</span>
                <span className="font-medium text-danger">−{formatCurrency(liquidity.pendingPayments)}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-3 text-sm">
                <span className="font-semibold">Projected balance</span>
                <span className="font-bold">{formatCurrency(liquidity.projectedBalance)}</span>
              </div>
            </div>
          </Card>

          {liquidity.projectedBalance < 0 && (
            <Card className="p-4 border-warning">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <p className="text-sm">
                  Projected balance is negative. Review pending payments and cash inflows to avoid a shortfall.
                </p>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
