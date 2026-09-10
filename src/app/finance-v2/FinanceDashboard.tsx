'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  Receipt,
  Calculator,
  Users,
  Send,
  CheckCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';

interface FinanceDashboardData {
  revenue: number;
  expenses: number;
  profit: number;
  outstanding: number;
  overdue: number;
  taxLiability: number;
  payrollTotal: number;
  recentInvoices: Array<{ total: number; paidAmount: number; status: string; dueDate: Date; number: string }>;
  recentExpenses: Array<{ id: string; vendor: string; amount: number; category: string; status: string; expenseDate: Date }>;
  monthly: Array<{ month: string; revenue: number; expenses: number; profit: number }>;
  period: string;
}

export function FinanceDashboard({
  organizationId,
  dashboard,
}: {
  organizationId: string;
  dashboard: FinanceDashboardData;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const profitMargin = dashboard.revenue > 0
    ? Math.round((dashboard.profit / dashboard.revenue) * 1000) / 10
    : 0;

  async function handleCreateInvoice() {
    setLoading(true);
    try {
      const res = await fetch('/api/finance/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          lineItems: [{ description: 'New Invoice Item', quantity: 1, unitPrice: 100 }],
        }),
      });
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateExpense() {
    setLoading(true);
    try {
      const res = await fetch('/api/finance/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          vendor: 'New Vendor',
          amount: 50,
          category: 'general',
          description: 'New expense',
        }),
      });
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleSendInvoice(number: string) {
    const invoices = dashboard.recentInvoices;
    const invoice = invoices.find((i) => i.number === number);
    if (!invoice) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/finance/invoices`, {
        method: 'GET',
      });
      const data = await res.json();
      const found = data.find((i: { number: string; id: string }) => i.number === number);
      if (found) {
        await fetch(`/api/finance/invoices/${found.id}/send`, { method: 'POST' });
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
    draft: 'default',
    sent: 'info',
    paid: 'success',
    overdue: 'danger',
    cancelled: 'default',
    void: 'default',
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
    reimbursed: 'success',
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-accent-primary" />
            <span className="text-xs text-fg-secondary">Revenue (MTD)</span>
          </div>
          <div className="text-2xl font-bold">${dashboard.revenue.toLocaleString()}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="h-4 w-4 text-fg-muted" />
            <span className="text-xs text-fg-secondary">Expenses (MTD)</span>
          </div>
          <div className="text-2xl font-bold">${dashboard.expenses.toLocaleString()}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-accent-primary" />
            <span className="text-xs text-fg-secondary">Profit</span>
          </div>
          <div className="text-2xl font-bold ${dashboard.profit >= 0 ? 'text-accent-primary' : 'text-fg-danger'}">
            ${dashboard.profit.toLocaleString()}
          </div>
          {profitMargin !== 0 && (
            <div className="text-xs text-fg-secondary mt-1">{profitMargin}% margin</div>
          )}
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-fg-warning" />
            <span className="text-xs text-fg-secondary">Outstanding</span>
          </div>
          <div className="text-2xl font-bold">${dashboard.outstanding.toLocaleString()}</div>
          {dashboard.overdue > 0 && (
            <div className="text-xs text-fg-danger mt-1">
              <AlertTriangle className="inline h-3 w-3" /> ${dashboard.overdue.toLocaleString()} overdue
            </div>
          )}
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button onClick={handleCreateInvoice} disabled={loading} variant="primary">
          <FileText className="h-4 w-4 mr-1" /> Create Invoice
        </Button>
        <Button onClick={handleCreateExpense} disabled={loading} variant="secondary">
          <Receipt className="h-4 w-4 mr-1" /> Create Expense
        </Button>
      </div>

      {/* Recent Invoices */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-4 w-4 text-accent-primary" />
          <h2 className="heading-display text-sm">Recent Invoices</h2>
        </div>
        {dashboard.recentInvoices.length === 0 ? (
          <Card className="p-6">
            <div className="text-sm text-fg-secondary">No invoices this month.</div>
          </Card>
        ) : (
          <div className="space-y-2">
            {dashboard.recentInvoices.map((inv, i) => (
              <Card key={i} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{inv.number}</span>
                  <Badge variant={statusVariant[inv.status] || 'default'} className="text-xs">
                    {inv.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm">${inv.total.toLocaleString()}</span>
                  {inv.status === 'draft' && (
                    <Button
                      onClick={() => handleSendInvoice(inv.number)}
                      disabled={loading}
                      variant="ghost"
                      className="text-xs"
                    >
                      <Send className="h-3 w-3" /> Send
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recent Expenses */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Receipt className="h-4 w-4 text-accent-primary" />
          <h2 className="heading-display text-sm">Recent Expenses</h2>
        </div>
        {dashboard.recentExpenses.length === 0 ? (
          <Card className="p-6">
            <div className="text-sm text-fg-secondary">No expenses recorded yet.</div>
          </Card>
        ) : (
          <div className="space-y-2">
            {dashboard.recentExpenses.map((exp) => (
              <Card key={exp.id} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{exp.vendor}</span>
                  <Badge variant="default" className="text-xs">{exp.category}</Badge>
                  <Badge variant={statusVariant[exp.status] || 'default'} className="text-xs">
                    {exp.status}
                  </Badge>
                </div>
                <span className="text-sm">${exp.amount.toLocaleString()}</span>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Tax & Payroll Summary */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calculator className="h-4 w-4 text-accent-primary" />
            <h3 className="text-sm font-medium">Tax Liability</h3>
          </div>
          <div className="text-2xl font-bold">${dashboard.taxLiability.toLocaleString()}</div>
          <div className="text-xs text-fg-secondary mt-1">Period: {dashboard.period}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-accent-primary" />
            <h3 className="text-sm font-medium">Payroll (Paid)</h3>
          </div>
          <div className="text-2xl font-bold">${dashboard.payrollTotal.toLocaleString()}</div>
          <div className="text-xs text-fg-secondary mt-1">Period: {dashboard.period}</div>
        </Card>
      </div>

      {/* Monthly Trend */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-accent-primary" />
          <h2 className="heading-display text-sm">Monthly Trend</h2>
        </div>
        <Card className="p-4">
          {dashboard.monthly.every((m) => m.revenue === 0 && m.expenses === 0) ? (
            <div className="text-sm text-fg-secondary">No trend data yet.</div>
          ) : (
            <div className="space-y-2">
              {dashboard.monthly.map((m) => (
                <div key={m.month} className="flex items-center gap-4 text-xs">
                  <span className="w-20 text-fg-secondary">{m.month}</span>
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-accent-primary">R: ${m.revenue}</span>
                    <span className="text-fg-muted">E: ${m.expenses}</span>
                    <span className={m.profit >= 0 ? 'text-accent-primary' : 'text-fg-danger'}>
                      P: ${m.profit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
