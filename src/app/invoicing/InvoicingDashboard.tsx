'use client';

import { useState, useCallback } from 'react';
import {
  Receipt, Plus, Send, CheckCircle, XCircle, Ban, Trash2,
  Search, X, AlertTriangle, TrendingUp, DollarSign, Clock,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

// ── Types ──

type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'void';
type InvoiceType = 'sales' | 'purchase' | 'credit' | 'debit';

interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discountRate: number;
  total: number;
  category: string | null;
  createdAt: Date;
}

interface Invoice {
  id: string;
  organizationId: string;
  workspaceId: string | null;
  customerId: string | null;
  number: string;
  status: InvoiceStatus;
  type: InvoiceType;
  issueDate: Date;
  dueDate: Date;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountRate: number;
  discountAmount: number;
  total: number;
  currency: string;
  notes: string;
  terms: string;
  paidAmount: number;
  paidAt: Date | null;
  sentAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  lineItems: InvoiceLineItem[];
}

interface InvoiceStats {
  totalInvoices: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  totalRevenue: number;
  totalOutstanding: number;
  totalOverdue: number;
}

interface ARStats {
  totalReceivables: number;
  totalOverdue: number;
  collectionRate: number;
  avgDaysToPay: number;
  invoiceCount: number;
  overdueCount: number;
}

interface APStats {
  totalPayables: number;
  payableCount: number;
  byCategory: Record<string, number>;
  avgDaysToPay: number;
  pendingApprovalCount: number;
}

interface RevenueTrendPoint {
  period: string;
  revenue: number;
  count: number;
}

interface DunningEntry {
  invoiceId: string;
  number: string;
  customerId: string | null;
  balance: number;
  daysOverdue: number;
  dunningLevel: 1 | 2 | 3;
  currency: string;
}

interface UpcomingPayment {
  id: string;
  vendor: string;
  amount: number;
  currency: string;
  category: string;
  expenseDate: Date;
  status: string;
}

interface InvoicingDashboardProps {
  organizationId: string;
  initialInvoices: Invoice[];
  initialInvoiceStats: InvoiceStats;
  initialArStats: ARStats;
  initialApStats: APStats;
  initialRevenueTrend: RevenueTrendPoint[];
  initialDunningList: DunningEntry[];
  initialUpcomingPayments: UpcomingPayment[];
}

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  draft: 'default',
  sent: 'info',
  paid: 'success',
  overdue: 'danger',
  cancelled: 'warning',
  void: 'default',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
  void: 'Void',
};

function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function InvoicingDashboard({
  organizationId: _organizationId,
  initialInvoices,
  initialInvoiceStats,
  initialArStats,
  initialApStats,
  initialRevenueTrend,
  initialDunningList,
  initialUpcomingPayments,
}: InvoicingDashboardProps) {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [invoiceStats, setInvoiceStats] = useState<InvoiceStats>(initialInvoiceStats);
  const [arStats, setArStats] = useState<ARStats>(initialArStats);
  const [apStats, setApStats] = useState<APStats>(initialApStats);
  const [revenueTrend] = useState<RevenueTrendPoint[]>(initialRevenueTrend);
  const [dunningList, setDunningList] = useState<DunningEntry[]>(initialDunningList);
  const [upcomingPayments] = useState<UpcomingPayment[]>(initialUpcomingPayments);
  const [activeTab, setActiveTab] = useState<'invoices' | 'create' | 'ar' | 'ap' | 'trend'>('invoices');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Create form state
  const [formCustomerId, setFormCustomerId] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formCurrency, setFormCurrency] = useState('USD');
  const [formTaxRate, setFormTaxRate] = useState('0');
  const [formNotes, setFormNotes] = useState('');
  const [lineItems, setLineItems] = useState<{ description: string; quantity: string; unitPrice: string }[]>([
    { description: '', quantity: '1', unitPrice: '0' },
  ]);

  const filteredInvoices = searchQuery
    ? invoices.filter((inv) =>
        inv.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.notes.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : invoices;

  const refreshStats = useCallback(async () => {
    try {
      const [invRes, arRes, apRes] = await Promise.all([
        fetch('/api/invoicing/invoices/stats'),
        fetch('/api/invoicing/ar/stats'),
        fetch('/api/invoicing/ap/stats'),
      ]);
      const [invData, arData, apData] = await Promise.all([
        invRes.json(),
        arRes.json(),
        apRes.json(),
      ]);
      setInvoiceStats(invData);
      setArStats(arData);
      setApStats(apData);
    } catch { /* ignore */ }
  }, []);

  const handleCreate = useCallback(async () => {
    if (!formDueDate) return;
    setLoading(true);
    try {
      const res = await fetch('/api/invoicing/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: formCustomerId || undefined,
          dueDate: formDueDate,
          currency: formCurrency,
          taxRate: parseFloat(formTaxRate) || 0,
          notes: formNotes,
          lineItems: lineItems
            .filter((li) => li.description.trim())
            .map((li) => ({
              description: li.description,
              quantity: parseFloat(li.quantity) || 1,
              unitPrice: parseFloat(li.unitPrice) || 0,
            })),
        }),
      });
      const data = await res.json();
      if (data.invoice) {
        setInvoices((prev) => [data.invoice, ...prev]);
        setFormCustomerId('');
        setFormDueDate('');
        setFormNotes('');
        setLineItems([{ description: '', quantity: '1', unitPrice: '0' }]);
        setActiveTab('invoices');
        refreshStats();
      }
    } finally {
      setLoading(false);
    }
  }, [formCustomerId, formDueDate, formCurrency, formTaxRate, formNotes, lineItems, refreshStats]);

  const handleSend = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/invoicing/invoices/${id}/send`, { method: 'POST' });
      const data = await res.json();
      if (data.invoice) {
        setInvoices((prev) => prev.map((inv) => (inv.id === id ? data.invoice : inv)));
        refreshStats();
      }
    } catch { /* ignore */ }
  }, [refreshStats]);

  const handleMarkPaid = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/invoicing/invoices/${id}/paid`, { method: 'POST' });
      const data = await res.json();
      if (data.invoice) {
        setInvoices((prev) => prev.map((inv) => (inv.id === id ? data.invoice : inv)));
        refreshStats();
      }
    } catch { /* ignore */ }
  }, [refreshStats]);

  const handleCancel = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/invoicing/invoices/${id}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (data.invoice) {
        setInvoices((prev) => prev.map((inv) => (inv.id === id ? data.invoice : inv)));
        refreshStats();
      }
    } catch { /* ignore */ }
  }, [refreshStats]);

  const handleVoid = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/invoicing/invoices/${id}/void`, { method: 'POST' });
      const data = await res.json();
      if (data.invoice) {
        setInvoices((prev) => prev.map((inv) => (inv.id === id ? data.invoice : inv)));
        refreshStats();
      }
    } catch { /* ignore */ }
  }, [refreshStats]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await fetch(`/api/invoicing/invoices/${id}`, { method: 'DELETE' });
      setInvoices((prev) => prev.filter((inv) => inv.id !== id));
      refreshStats();
    } catch { /* ignore */ }
  }, [refreshStats]);

  const addLineItemRow = () => {
    setLineItems((prev) => [...prev, { description: '', quantity: '1', unitPrice: '0' }]);
  };

  const removeLineItemRow = (idx: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-3">
          <div className="text-xs text-fg-secondary mb-1">Total Invoices</div>
          <div className="text-xl font-bold">{invoiceStats.totalInvoices}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-fg-secondary mb-1">Revenue</div>
          <div className="text-xl font-bold">{formatCurrency(invoiceStats.totalRevenue)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-fg-secondary mb-1">Outstanding</div>
          <div className="text-xl font-bold">{formatCurrency(invoiceStats.totalOutstanding)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-fg-secondary mb-1">Receivables</div>
          <div className="text-xl font-bold">{formatCurrency(arStats.totalReceivables)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-fg-secondary mb-1">Payables</div>
          <div className="text-xl font-bold">{formatCurrency(apStats.totalPayables)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-fg-secondary mb-1">Collection Rate</div>
          <div className="text-xl font-bold">{arStats.collectionRate}%</div>
        </Card>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 flex-wrap">
        {([
          ['invoices', 'Invoices'],
          ['create', 'Create'],
          ['ar', 'AR'],
          ['ap', 'AP'],
          ['trend', 'Revenue Trend'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-3 py-1.5 text-sm rounded-lg ${activeTab === key ? 'bg-accent-primary text-white' : 'text-fg-secondary hover:bg-fg-muted/10'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="heading-display text-sm">Invoices</h2>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-fg-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="pl-7 pr-3 py-1 text-xs border rounded-lg bg-transparent"
                />
              </div>
              <Button variant="secondary" size="sm" className="text-xs" onClick={() => setActiveTab('create')}>
                <Plus className="h-3 w-3" /> New
              </Button>
            </div>
          </div>

          {filteredInvoices.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No invoices yet"
              description="Create your first invoice to get started."
              action={<Button size="sm" onClick={() => setActiveTab('create')}><Plus className="h-3 w-3" /> New Invoice</Button>}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">Number</th>
                    <th className="text-left p-2 font-medium">Status</th>
                    <th className="text-left p-2 font-medium">Due Date</th>
                    <th className="text-right p-2 font-medium">Total</th>
                    <th className="text-right p-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="border-b">
                      <td className="p-2 font-mono">{inv.number}</td>
                      <td className="p-2">
                        <Badge variant={statusVariant[inv.status] || 'default'} className="text-xs">
                          {statusLabels[inv.status] || inv.status}
                        </Badge>
                      </td>
                      <td className="p-2">{formatDate(inv.dueDate)}</td>
                      <td className="p-2 text-right">{formatCurrency(inv.total, inv.currency)}</td>
                      <td className="p-2 text-right">
                        <div className="flex gap-1 justify-end">
                          {inv.status === 'draft' && (
                            <Button variant="ghost" size="sm" className="text-xs" onClick={() => handleSend(inv.id)}>
                              <Send className="h-3 w-3" />
                            </Button>
                          )}
                          {(inv.status === 'sent' || inv.status === 'overdue') && (
                            <Button variant="ghost" size="sm" className="text-xs" onClick={() => handleMarkPaid(inv.id)}>
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                          )}
                          {inv.status !== 'cancelled' && inv.status !== 'void' && inv.status !== 'paid' && (
                            <Button variant="ghost" size="sm" className="text-xs" onClick={() => handleCancel(inv.id)}>
                              <Ban className="h-3 w-3" />
                            </Button>
                          )}
                          {inv.status !== 'void' && (
                            <Button variant="ghost" size="sm" className="text-xs" onClick={() => handleVoid(inv.id)}>
                              <XCircle className="h-3 w-3" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" className="text-xs text-danger" onClick={() => handleDelete(inv.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Create Tab */}
      {activeTab === 'create' && (
        <Card className="p-4">
          <h2 className="heading-display text-sm mb-3">Create Invoice</h2>
          <div className="space-y-3 max-w-2xl">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-fg-secondary mb-1 block">Customer ID</label>
                <input
                  type="text"
                  value={formCustomerId}
                  onChange={(e) => setFormCustomerId(e.target.value)}
                  placeholder="cust-..."
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-transparent"
                />
              </div>
              <div>
                <label className="text-xs text-fg-secondary mb-1 block">Due Date *</label>
                <input
                  type="date"
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-transparent"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-fg-secondary mb-1 block">Currency</label>
                <select
                  value={formCurrency}
                  onChange={(e) => setFormCurrency(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-transparent"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="INR">INR</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-fg-secondary mb-1 block">Tax Rate (%)</label>
                <input
                  type="number"
                  value={formTaxRate}
                  onChange={(e) => setFormTaxRate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-transparent"
                />
              </div>
            </div>

            {/* Line Items */}
            <div>
              <label className="text-xs text-fg-secondary mb-1 block">Line Items</label>
              <div className="space-y-2">
                {lineItems.map((li, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_80px_100px_32px] gap-2">
                    <input
                      type="text"
                      value={li.description}
                      onChange={(e) => {
                        const next = [...lineItems];
                        next[idx] = { ...next[idx], description: e.target.value };
                        setLineItems(next);
                      }}
                      placeholder="Description"
                      className="px-2 py-1.5 text-xs border rounded-lg bg-transparent"
                    />
                    <input
                      type="number"
                      value={li.quantity}
                      onChange={(e) => {
                        const next = [...lineItems];
                        next[idx] = { ...next[idx], quantity: e.target.value };
                        setLineItems(next);
                      }}
                      placeholder="Qty"
                      className="px-2 py-1.5 text-xs border rounded-lg bg-transparent"
                    />
                    <input
                      type="number"
                      value={li.unitPrice}
                      onChange={(e) => {
                        const next = [...lineItems];
                        next[idx] = { ...next[idx], unitPrice: e.target.value };
                        setLineItems(next);
                      }}
                      placeholder="Price"
                      className="px-2 py-1.5 text-xs border rounded-lg bg-transparent"
                    />
                    {lineItems.length > 1 && (
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => removeLineItemRow(idx)}>
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="text-xs mt-2" onClick={addLineItemRow}>
                <Plus className="h-3 w-3" /> Add Line
              </Button>
            </div>

            <div>
              <label className="text-xs text-fg-secondary mb-1 block">Notes</label>
              <textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Invoice notes..."
                className="w-full px-3 py-2 text-sm border rounded-lg bg-transparent"
                rows={2}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={handleCreate} disabled={loading || !formDueDate}>
                <Plus className="h-3 w-3" /> Create Invoice
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('invoices')}>
                <X className="h-3 w-3" /> Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* AR Tab */}
      {activeTab === 'ar' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-3 w-3 text-accent-primary" />
                <span className="text-xs text-fg-secondary">Receivables</span>
              </div>
              <div className="text-lg font-bold">{formatCurrency(arStats.totalReceivables)}</div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-3 w-3 text-danger" />
                <span className="text-xs text-fg-secondary">Overdue</span>
              </div>
              <div className="text-lg font-bold">{formatCurrency(arStats.totalOverdue)}</div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-3 w-3 text-accent-primary" />
                <span className="text-xs text-fg-secondary">Collection Rate</span>
              </div>
              <div className="text-lg font-bold">{arStats.collectionRate}%</div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-3 w-3 text-accent-primary" />
                <span className="text-xs text-fg-secondary">Avg Days to Pay</span>
              </div>
              <div className="text-lg font-bold">{arStats.avgDaysToPay}</div>
            </Card>
          </div>

          <Card className="p-4">
            <h2 className="heading-display text-sm mb-3">Dunning List</h2>
            {dunningList.length === 0 ? (
              <EmptyState icon={CheckCircle} title="No overdue invoices" description="All receivables are on track." />
            ) : (
              <div className="space-y-2">
                {dunningList.map((entry) => (
                  <div key={entry.invoiceId} className="flex items-center justify-between p-2 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{entry.number}</span>
                      <Badge variant={entry.dunningLevel === 3 ? 'danger' : entry.dunningLevel === 2 ? 'warning' : 'info'} className="text-xs">
                        Level {entry.dunningLevel}
                      </Badge>
                      <span className="text-xs text-fg-secondary">{entry.daysOverdue} days overdue</span>
                    </div>
                    <span className="text-sm font-medium">{formatCurrency(entry.balance, entry.currency)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* AP Tab */}
      {activeTab === 'ap' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-3 w-3 text-accent-primary" />
                <span className="text-xs text-fg-secondary">Total Payables</span>
              </div>
              <div className="text-lg font-bold">{formatCurrency(apStats.totalPayables)}</div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-3 w-3 text-accent-primary" />
                <span className="text-xs text-fg-secondary">Avg Days to Pay</span>
              </div>
              <div className="text-lg font-bold">{apStats.avgDaysToPay}</div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-3 w-3 text-warning" />
                <span className="text-xs text-fg-secondary">Pending Approval</span>
              </div>
              <div className="text-lg font-bold">{apStats.pendingApprovalCount}</div>
            </Card>
          </div>

          <Card className="p-4">
            <h2 className="heading-display text-sm mb-3">Upcoming Payments</h2>
            {upcomingPayments.length === 0 ? (
              <EmptyState icon={CheckCircle} title="No upcoming payments" description="All expenses are processed." />
            ) : (
              <div className="space-y-2">
                {upcomingPayments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-2 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{p.vendor}</span>
                      <Badge variant="default" className="text-xs">{p.category}</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-fg-secondary">{formatDate(p.expenseDate)}</span>
                      <span className="text-sm font-medium">{formatCurrency(p.amount, p.currency)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {Object.keys(apStats.byCategory).length > 0 && (
            <Card className="p-4">
              <h2 className="heading-display text-sm mb-3">Payables by Category</h2>
              <div className="space-y-1">
                {Object.entries(apStats.byCategory).map(([cat, amount]) => (
                  <div key={cat} className="flex justify-between text-sm">
                    <span className="capitalize">{cat}</span>
                    <span className="font-medium">{formatCurrency(amount)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Revenue Trend Tab */}
      {activeTab === 'trend' && (
        <Card className="p-4">
          <h2 className="heading-display text-sm mb-3">Revenue Trend</h2>
          {revenueTrend.length === 0 ? (
            <EmptyState icon={TrendingUp} title="No revenue data" description="Paid invoices will appear here." />
          ) : (
            <div className="space-y-2">
              {revenueTrend.map((point) => {
                const maxRevenue = Math.max(...revenueTrend.map((p) => p.revenue), 1);
                const widthPct = (point.revenue / maxRevenue) * 100;
                return (
                  <div key={point.period} className="flex items-center gap-3">
                    <span className="text-xs text-fg-secondary w-20">{point.period}</span>
                    <div className="flex-1 bg-fg-muted/10 rounded h-6 relative overflow-hidden">
                      <div
                        className="bg-accent-primary h-full rounded transition-all"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium w-24 text-right">
                      {formatCurrency(point.revenue)}
                    </span>
                    <span className="text-xs text-fg-muted w-12">{point.count} inv</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
