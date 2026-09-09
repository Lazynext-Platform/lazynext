'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  FileText,
  Scale,
  BarChart3,
  ListTree,
  Plus,
  CheckCircle,
  RotateCcw,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';

interface AccountBalance {
  accountId: string;
  code: string;
  name: string;
  type: string;
  debitTotal: number;
  creditTotal: number;
  balance: number;
}

interface JournalEntry {
  id: string;
  entryNumber: string;
  date: Date | string;
  description: string;
  reference: string;
  status: string;
  period: string;
  isReversed: boolean;
  lines?: Array<{ id: string; accountId: string; debit: number; credit: number; description: string }>;
}

interface AccountingStats {
  accountCount: number;
  activeAccountCount: number;
  journalEntryCount: number;
  postedEntryCount: number;
  draftEntryCount: number;
  totalDebits: number;
  totalCredits: number;
  closedPeriods: number;
}

type Tab = 'chart' | 'journal' | 'trial' | 'statements' | 'ledger';

const tabs: Array<{ id: Tab; label: string; icon: typeof BookOpen }> = [
  { id: 'chart', label: 'Chart of Accounts', icon: BookOpen },
  { id: 'journal', label: 'Journal Entries', icon: FileText },
  { id: 'trial', label: 'Trial Balance', icon: Scale },
  { id: 'statements', label: 'Financial Statements', icon: BarChart3 },
  { id: 'ledger', label: 'General Ledger', icon: ListTree },
];

const typeVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  asset: 'info',
  liability: 'warning',
  equity: 'accent',
  revenue: 'success',
  expense: 'danger',
};

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  draft: 'default',
  posted: 'success',
  reversed: 'danger',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

export function AccountingDashboard({
  organizationId,
  accounts,
  entries,
  stats,
}: {
  organizationId: string;
  accounts: AccountBalance[];
  entries: JournalEntry[];
  stats: AccountingStats;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('chart');
  const [loading, setLoading] = useState(false);
  const [trial, setTrial] = useState<{ lines: Array<{ code: string; name: string; type: string; debit: number; credit: number }>; totalDebits: number; totalCredits: number } | null>(null);
  const [statements, setStatements] = useState<null | {
    balanceSheet: { assets: Array<{ code: string; name: string; debit: number; credit: number }>; liabilities: Array<{ code: string; name: string; debit: number; credit: number }>; equity: Array<{ code: string; name: string; debit: number; credit: number }>; totalAssets: number; totalLiabilities: number; totalEquity: number };
    incomeStatement: { revenue: Array<{ code: string; name: string; debit: number; credit: number }>; expenses: Array<{ code: string; name: string; debit: number; credit: number }>; totalRevenue: number; totalExpenses: number; netIncome: number };
    cashFlowSummary: { operating: number; investing: number; financing: number; netChange: number };
  }>(null);
  const [ledger, setLedger] = useState<Array<{ entryNumber: string; date: string; accountCode: string; accountName: string; debit: number; credit: number; description: string }>>([]);

  async function loadTrial() {
    const res = await fetch(`/api/accounting/trial-balance?organizationId=${organizationId}`);
    if (res.ok) setTrial(await res.json());
  }

  async function loadStatements() {
    const res = await fetch(`/api/accounting/financial-statements?organizationId=${organizationId}`);
    if (res.ok) setStatements(await res.json());
  }

  async function loadLedger() {
    const res = await fetch(`/api/accounting/general-ledger?organizationId=${organizationId}`);
    if (res.ok) {
      const data = await res.json();
      setLedger(data.lines || []);
    }
  }

  function handleTabChange(id: Tab) {
    setTab(id);
    if (id === 'trial' && !trial) loadTrial();
    if (id === 'statements' && !statements) loadStatements();
    if (id === 'ledger' && ledger.length === 0) loadLedger();
  }

  async function handleCreateAccount() {
    setLoading(true);
    try {
      const res = await fetch('/api/accounting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          code: `${String(accounts.length + 1000).padStart(4, '0')}`,
          name: 'New Account',
          type: 'asset',
        }),
      });
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handlePostEntry(id: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/accounting/journal-entries/${id}/post`, { method: 'POST' });
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleReverseEntry(id: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/accounting/journal-entries/${id}/reverse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Manual reversal' }),
      });
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <BookOpen className="h-3 w-3" /> Accounts
          </div>
          <div className="text-2xl font-semibold">{stats.accountCount}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <FileText className="h-3 w-3" /> Journal Entries
          </div>
          <div className="text-2xl font-semibold">{stats.journalEntryCount}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <CheckCircle className="h-3 w-3" /> Posted
          </div>
          <div className="text-2xl font-semibold">{stats.postedEntryCount}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Scale className="h-3 w-3" /> Total Debits
          </div>
          <div className="text-2xl font-semibold">{formatCurrency(stats.totalDebits)}</div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border-primary">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-accent-primary text-accent-primary'
                  : 'border-transparent text-fg-secondary hover:text-fg-primary'
              }`}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Chart of Accounts */}
      {tab === 'chart' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={handleCreateAccount} disabled={loading} variant="primary">
              <Plus className="h-4 w-4" /> New Account
            </Button>
          </div>
          {accounts.length === 0 ? (
            <Card className="p-6 text-center text-sm text-fg-secondary">No accounts yet. Create your first GL account.</Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-fg-secondary text-xs">
                  <tr className="border-b border-border-primary">
                    <th className="text-left p-3">Code</th>
                    <th className="text-left p-3">Name</th>
                    <th className="text-left p-3">Type</th>
                    <th className="text-right p-3">Debits</th>
                    <th className="text-right p-3">Credits</th>
                    <th className="text-right p-3">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((a) => (
                    <tr key={a.accountId} className="border-b border-border-primary/50">
                      <td className="p-3 font-mono text-xs">{a.code}</td>
                      <td className="p-3">{a.name}</td>
                      <td className="p-3"><Badge variant={typeVariant[a.type] || 'default'} className="text-xs">{a.type}</Badge></td>
                      <td className="p-3 text-right">{formatCurrency(a.debitTotal)}</td>
                      <td className="p-3 text-right">{formatCurrency(a.creditTotal)}</td>
                      <td className="p-3 text-right font-semibold">{formatCurrency(a.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {/* Journal Entries */}
      {tab === 'journal' && (
        <div className="space-y-4">
          {entries.length === 0 ? (
            <Card className="p-6 text-center text-sm text-fg-secondary">No journal entries yet.</Card>
          ) : (
            <div className="space-y-3">
              {entries.map((e) => (
                <Card key={e.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold">{e.entryNumber}</span>
                        <Badge variant={statusVariant[e.status] || 'default'} className="text-xs">{e.status}</Badge>
                        {e.isReversed && <Badge variant="danger" className="text-xs">reversed</Badge>}
                      </div>
                      <div className="text-xs text-fg-secondary mt-1">
                        {new Date(e.date).toLocaleDateString()} · {e.period} {e.reference ? `· Ref: ${e.reference}` : ''}
                      </div>
                      {e.description && <div className="text-sm mt-1">{e.description}</div>}
                    </div>
                    <div className="flex gap-2">
                      {e.status === 'draft' && (
                        <Button onClick={() => handlePostEntry(e.id)} disabled={loading} variant="primary" className="text-xs">
                          <CheckCircle className="h-3 w-3" /> Post
                        </Button>
                      )}
                      {e.status === 'posted' && !e.isReversed && (
                        <Button onClick={() => handleReverseEntry(e.id)} disabled={loading} className="text-xs">
                          <RotateCcw className="h-3 w-3" /> Reverse
                        </Button>
                      )}
                    </div>
                  </div>
                  {e.lines && e.lines.length > 0 && (
                    <div className="mt-2 border-t border-border-primary/50 pt-2">
                      <table className="w-full text-xs">
                        <thead className="text-fg-secondary">
                          <tr>
                            <th className="text-left py-1">Account</th>
                            <th className="text-right py-1">Debit</th>
                            <th className="text-right py-1">Credit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {e.lines.map((l) => (
                            <tr key={l.id}>
                              <td className="py-1 font-mono">{l.accountId.slice(-6)}</td>
                              <td className="py-1 text-right">{l.debit ? formatCurrency(l.debit) : ''}</td>
                              <td className="py-1 text-right">{l.credit ? formatCurrency(l.credit) : ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Trial Balance */}
      {tab === 'trial' && (
        <div className="space-y-4">
          {trial ? (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-fg-secondary text-xs">
                  <tr className="border-b border-border-primary">
                    <th className="text-left p-3">Code</th>
                    <th className="text-left p-3">Name</th>
                    <th className="text-left p-3">Type</th>
                    <th className="text-right p-3">Debit</th>
                    <th className="text-right p-3">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {trial.lines.map((l) => (
                    <tr key={l.code + l.name} className="border-b border-border-primary/50">
                      <td className="p-3 font-mono text-xs">{l.code}</td>
                      <td className="p-3">{l.name}</td>
                      <td className="p-3"><Badge variant={typeVariant[l.type] || 'default'} className="text-xs">{l.type}</Badge></td>
                      <td className="p-3 text-right">{l.debit ? formatCurrency(l.debit) : ''}</td>
                      <td className="p-3 text-right">{l.credit ? formatCurrency(l.credit) : ''}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border-primary font-semibold">
                    <td className="p-3" colSpan={3}>Totals</td>
                    <td className="p-3 text-right">{formatCurrency(trial.totalDebits)}</td>
                    <td className="p-3 text-right">{formatCurrency(trial.totalCredits)}</td>
                  </tr>
                </tfoot>
              </table>
            </Card>
          ) : (
            <Card className="p-6 text-center text-sm text-fg-secondary">Loading trial balance…</Card>
          )}
        </div>
      )}

      {/* Financial Statements */}
      {tab === 'statements' && (
        <div className="space-y-4">
          {statements ? (
            <>
              <Card className="p-4">
                <h3 className="heading-display text-sm mb-3">Balance Sheet</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <div className="text-xs text-fg-secondary mb-1">Assets</div>
                    <div className="text-xl font-semibold">{formatCurrency(statements.balanceSheet.totalAssets)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-fg-secondary mb-1">Liabilities</div>
                    <div className="text-xl font-semibold">{formatCurrency(statements.balanceSheet.totalLiabilities)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-fg-secondary mb-1">Equity</div>
                    <div className="text-xl font-semibold">{formatCurrency(statements.balanceSheet.totalEquity)}</div>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <h3 className="heading-display text-sm mb-3">Income Statement</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <div className="flex items-center gap-1 text-xs text-fg-secondary mb-1"><TrendingUp className="h-3 w-3" /> Revenue</div>
                    <div className="text-xl font-semibold">{formatCurrency(statements.incomeStatement.totalRevenue)}</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-xs text-fg-secondary mb-1"><TrendingDown className="h-3 w-3" /> Expenses</div>
                    <div className="text-xl font-semibold">{formatCurrency(statements.incomeStatement.totalExpenses)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-fg-secondary mb-1">Net Income</div>
                    <div className={`text-xl font-semibold ${statements.incomeStatement.netIncome >= 0 ? 'text-success' : 'text-danger'}`}>
                      {formatCurrency(statements.incomeStatement.netIncome)}
                    </div>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <h3 className="heading-display text-sm mb-3">Cash Flow Summary</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <div><div className="text-xs text-fg-secondary mb-1">Operating</div><div className="text-lg font-semibold">{formatCurrency(statements.cashFlowSummary.operating)}</div></div>
                  <div><div className="text-xs text-fg-secondary mb-1">Investing</div><div className="text-lg font-semibold">{formatCurrency(statements.cashFlowSummary.investing)}</div></div>
                  <div><div className="text-xs text-fg-secondary mb-1">Financing</div><div className="text-lg font-semibold">{formatCurrency(statements.cashFlowSummary.financing)}</div></div>
                  <div><div className="text-xs text-fg-secondary mb-1">Net Change</div><div className="text-lg font-semibold">{formatCurrency(statements.cashFlowSummary.netChange)}</div></div>
                </div>
              </Card>
            </>
          ) : (
            <Card className="p-6 text-center text-sm text-fg-secondary">Loading financial statements…</Card>
          )}
        </div>
      )}

      {/* General Ledger */}
      {tab === 'ledger' && (
        <div className="space-y-4">
          {ledger.length === 0 ? (
            <Card className="p-6 text-center text-sm text-fg-secondary">No posted journal lines yet.</Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-fg-secondary text-xs">
                  <tr className="border-b border-border-primary">
                    <th className="text-left p-3">Entry</th>
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Account</th>
                    <th className="text-left p-3">Description</th>
                    <th className="text-right p-3">Debit</th>
                    <th className="text-right p-3">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((l, i) => (
                    <tr key={i} className="border-b border-border-primary/50">
                      <td className="p-3 font-mono text-xs">{l.entryNumber}</td>
                      <td className="p-3 text-xs">{new Date(l.date).toLocaleDateString()}</td>
                      <td className="p-3"><span className="font-mono text-xs">{l.accountCode}</span> {l.accountName}</td>
                      <td className="p-3 text-xs">{l.description}</td>
                      <td className="p-3 text-right">{l.debit ? formatCurrency(l.debit) : ''}</td>
                      <td className="p-3 text-right">{l.credit ? formatCurrency(l.credit) : ''}</td>
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
