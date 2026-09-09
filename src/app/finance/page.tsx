import type { Metadata } from 'next';
import { Wallet, Plus, TrendingUp, TrendingDown, DollarSign, ArrowRightLeft, Receipt } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Finance — Lazynext',
  description: 'Track income, expenses, and financial transactions.',
  robots: { index: false, follow: false },
};
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { FinanceService } from '@/lib/services/finance';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import { NewTransactionForm } from './NewTransactionForm';

export const dynamic = 'force-dynamic';

const typeIcon: Record<string, typeof TrendingUp> = {
  income: TrendingUp,
  expense: TrendingDown,
  transfer: ArrowRightLeft,
};

const typeVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  income: 'success',
  expense: 'danger',
  transfer: 'info',
};

function formatCurrency(value: number, currency: string = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export default async function FinancePage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Finance</h1>
          <p className="text-sm text-fg-secondary mt-1">Track income, expenses, and financial transactions.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Wallet}
            title="No workspace yet"
            description="Create a company first to start tracking finances."
            action={<Button href="/company/new"><Plus className="h-4 w-4" /> Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const defaultWorkspace = workspaces[0];
  const [transactions, summary, byCategory] = await Promise.all([
    FinanceService.list(defaultWorkspace.id),
    FinanceService.getSummary(defaultWorkspace.id),
    FinanceService.getByCategory(defaultWorkspace.id),
  ]);

  const recentTransactions = transactions.slice(0, 10);
  const categoryEntries = Object.entries(byCategory).sort((a, b) => b[1].net - a[1].net);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="heading-display text-2xl">Finance</h1>
          <p className="text-sm text-fg-secondary mt-1">Track income, expenses, and financial transactions.</p>
        </div>
        <NewTransactionForm
          workspaces={workspaces.map((w) => ({ id: w.id, organizationId: w.organizationId, name: w.name }))}
          defaultWorkspaceId={defaultWorkspace.id}
          defaultOrganizationId={defaultWorkspace.organizationId}
        />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 mb-8 sm:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-2">
            <TrendingUp className="h-4 w-4 text-success" /> Income
          </div>
          <div className="text-3xl font-semibold text-success">{formatCurrency(summary.income)}</div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-2">
            <TrendingDown className="h-4 w-4 text-danger" /> Expenses
          </div>
          <div className="text-3xl font-semibold text-danger">{formatCurrency(summary.expense)}</div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-2">
            <DollarSign className="h-4 w-4" /> Net
          </div>
          <div className={`text-3xl font-semibold ${summary.net >= 0 ? 'text-success' : 'text-danger'}`}>
            {formatCurrency(summary.net)}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent transactions */}
        <div>
          <h2 className="heading-display text-sm mb-4">Recent Transactions</h2>
          {recentTransactions.length === 0 ? (
            <Card className="p-6">
              <EmptyState
                icon={Receipt}
                title="No transactions yet"
                description="Add your first transaction to start tracking your finances."
              />
            </Card>
          ) : (
            <div className="space-y-2">
              {recentTransactions.map((tx) => {
                const Icon = typeIcon[tx.type] || Receipt;
                return (
                  <Card key={tx.id} className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-md shrink-0"
                          style={{ backgroundColor: 'var(--c-surface-alt)' }}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm font-medium block truncate">
                            {tx.description || tx.category}
                          </span>
                          <div className="flex items-center gap-2 text-xs text-fg-muted">
                            <Badge variant={typeVariant[tx.type] || 'default'} className="text-xs">{tx.type}</Badge>
                            <span className="capitalize">{tx.category.replace(/_/g, ' ')}</span>
                            <span>· {new Date(tx.date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <span className={`text-sm font-semibold shrink-0 ${tx.type === 'income' ? 'text-success' : tx.type === 'expense' ? 'text-danger' : ''}`}>
                        {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}{formatCurrency(tx.amount, tx.currency)}
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Category breakdown */}
        <div>
          <h2 className="heading-display text-sm mb-4">Category Breakdown</h2>
          {categoryEntries.length === 0 ? (
            <Card className="p-6">
              <EmptyState
                icon={Wallet}
                title="No categories yet"
                description="Transactions will be grouped by category here."
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {categoryEntries.map(([category, data]) => {
                const maxAbs = Math.max(...categoryEntries.map(([, d]) => Math.abs(d.net)), 1);
                const widthPct = Math.min(100, (Math.abs(data.net) / maxAbs) * 100);
                return (
                  <Card key={category} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium capitalize">{category.replace(/_/g, ' ')}</span>
                      <span className={`text-sm font-semibold ${data.net >= 0 ? 'text-success' : 'text-danger'}`}>
                        {formatCurrency(data.net)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-bg-tertiary overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${data.net >= 0 ? 'bg-success' : 'bg-danger'}`}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1 text-xs text-fg-muted">
                      <span>{data.count} transactions</span>
                      <span>+{formatCurrency(data.income)} / -{formatCurrency(data.expense)}</span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
