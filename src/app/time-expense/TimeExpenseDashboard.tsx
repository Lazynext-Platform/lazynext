'use client';

import { useState, useTransition } from 'react';
import {
  Clock, Receipt, Plus, Check, X, DollarSign, TrendingUp, Calendar, Tag,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

interface Timesheet {
  id: string; userId: string; status: string; periodStart: Date; periodEnd: Date;
  totalHours: number; billableHours: number; notes: string; submittedAt: Date | null;
  approvedBy: string | null; rejectedReason: string | null;
}
interface Expense {
  id: string; vendor: string; description: string; category: string; amount: number;
  currency: string; status: string; expenseDate: Date; submittedBy: string | null;
  tags: string;
}
interface TimesheetStats {
  total: number; byStatus: Record<string, number>; totalHours: number;
  billableHours: number; avgHoursPerTimesheet: number;
}
interface ExpenseStats {
  total: number; byCategory: Record<string, { total: number; count: number }>;
  byStatus: Record<string, number>; totalAmount: number; pendingAmount: number; approvedAmount: number;
}

const tsStatusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  draft: 'default',
  submitted: 'info',
  approved: 'success',
  rejected: 'danger',
};
const expStatusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  reimbursed: 'info',
};

function parseTags(raw: string): string[] {
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function TimeExpenseDashboard({
  organizationId,
  timesheets: initialTimesheets,
  expenses: initialExpenses,
  timesheetStats,
  expenseStats,
}: {
  organizationId: string;
  timesheets: Timesheet[];
  expenses: Expense[];
  timesheetStats: TimesheetStats;
  expenseStats: ExpenseStats;
}) {
  const [timesheets, setTimesheets] = useState(initialTimesheets);
  const [expenses, setExpenses] = useState(initialExpenses);
  const [actingId, setActingId] = useState<string | null>(null);
  const [showTsForm, setShowTsForm] = useState(false);
  const [showExpForm, setShowExpForm] = useState(false);
  const [, startTransition] = useTransition();
  void organizationId;

  async function refreshTimesheets() {
    const res = await fetch('/api/timesheets');
    const data = await res.json();
    startTransition(() => setTimesheets(data.timesheets || []));
  }

  async function refreshExpenses() {
    const res = await fetch('/api/expenses-v2');
    const data = await res.json();
    startTransition(() => setExpenses(data.expenses || []));
  }

  async function handleTsAction(id: string, action: 'submit' | 'approve' | 'reject') {
    setActingId(id);
    try {
      const body: Record<string, unknown> = {};
      if (action === 'reject') body.reason = 'Rejected by manager';
      await fetch(`/api/timesheets/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      await refreshTimesheets();
    } finally {
      setActingId(null);
    }
  }

  async function handleExpAction(id: string, action: 'approve' | 'reject' | 'reimburse') {
    setActingId(id);
    try {
      await fetch(`/api/expenses-v2/${id}/${action}`, { method: 'POST' });
      await refreshExpenses();
    } finally {
      setActingId(null);
    }
  }

  async function handleCreateTs(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const periodStart = form.get('periodStart') as string;
    const periodEnd = form.get('periodEnd') as string;
    if (!periodStart || !periodEnd) return;
    await fetch('/api/timesheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ periodStart, periodEnd, notes: form.get('notes') || '' }),
    });
    setShowTsForm(false);
    await refreshTimesheets();
    (e.target as HTMLFormElement).reset();
  }

  async function handleCreateExp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const vendor = form.get('vendor') as string;
    const category = form.get('category') as string;
    const amount = Number(form.get('amount'));
    const expenseDate = form.get('expenseDate') as string;
    if (!vendor || !category || !amount || !expenseDate) return;
    await fetch('/api/expenses-v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vendor, category, amount, expenseDate,
        description: form.get('description') || '',
        currency: form.get('currency') || 'USD',
      }),
    });
    setShowExpForm(false);
    await refreshExpenses();
    (e.target as HTMLFormElement).reset();
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Clock className="h-3 w-3" /> Total Hours
          </div>
          <div className="text-2xl font-semibold">{timesheetStats.totalHours.toFixed(1)}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <DollarSign className="h-3 w-3" /> Billable Hours
          </div>
          <div className="text-2xl font-semibold">{timesheetStats.billableHours.toFixed(1)}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Receipt className="h-3 w-3" /> Pending Expenses
          </div>
          <div className="text-2xl font-semibold">${expenseStats.pendingAmount.toFixed(2)}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <TrendingUp className="h-3 w-3" /> Approved Amount
          </div>
          <div className="text-2xl font-semibold">${expenseStats.approvedAmount.toFixed(2)}</div>
        </Card>
      </div>

      {/* Timesheet Panel */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="heading-display text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-accent-primary" /> Timesheets
          </h2>
          <Button size="sm" onClick={() => setShowTsForm((v) => !v)}>
            <Plus className="h-4 w-4" /> New Timesheet
          </Button>
        </div>
        {showTsForm && (
          <Card className="p-4 mb-3">
            <form onSubmit={handleCreateTs} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="text-xs text-fg-secondary">
                Period Start
                <input type="date" name="periodStart" required className="input mt-1 w-full" />
              </label>
              <label className="text-xs text-fg-secondary">
                Period End
                <input type="date" name="periodEnd" required className="input mt-1 w-full" />
              </label>
              <label className="text-xs text-fg-secondary">
                Notes
                <input type="text" name="notes" className="input mt-1 w-full" />
              </label>
              <div className="sm:col-span-3 flex gap-2">
                <Button type="submit" size="sm">Create</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowTsForm(false)}>Cancel</Button>
              </div>
            </form>
          </Card>
        )}
        {timesheets.length === 0 ? (
          <Card className="p-6">
            <EmptyState icon={Clock} title="No timesheets yet" description="Create a timesheet to start tracking time for a period." />
          </Card>
        ) : (
          <div className="space-y-2">
            {timesheets.map((ts) => (
              <Card key={ts.id} className="p-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <Calendar className="h-4 w-4 text-fg-muted shrink-0" />
                    <span className="text-sm font-medium">
                      {new Date(ts.periodStart).toLocaleDateString()} — {new Date(ts.periodEnd).toLocaleDateString()}
                    </span>
                    <Badge variant={tsStatusVariant[ts.status] || 'default'} className="text-xs">{ts.status}</Badge>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-fg-secondary">{ts.totalHours.toFixed(1)}h total · {ts.billableHours.toFixed(1)}h billable</span>
                    {ts.status === 'draft' && (
                      <Button size="sm" variant="ghost" disabled={actingId === ts.id} onClick={() => handleTsAction(ts.id, 'submit')}>Submit</Button>
                    )}
                    {ts.status === 'submitted' && (
                      <>
                        <Button size="sm" variant="ghost" disabled={actingId === ts.id} onClick={() => handleTsAction(ts.id, 'approve')}>
                          <Check className="h-3 w-3" /> Approve
                        </Button>
                        <Button size="sm" variant="ghost" disabled={actingId === ts.id} onClick={() => handleTsAction(ts.id, 'reject')}>
                          <X className="h-3 w-3" /> Reject
                        </Button>
                      </>
                    )}
                    {ts.status === 'rejected' && ts.rejectedReason && (
                      <span className="text-xs text-danger">{ts.rejectedReason}</span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Expense Panel */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="heading-display text-lg flex items-center gap-2">
            <Receipt className="h-5 w-5 text-accent-primary" /> Expenses
          </h2>
          <Button size="sm" onClick={() => setShowExpForm((v) => !v)}>
            <Plus className="h-4 w-4" /> New Expense
          </Button>
        </div>
        {showExpForm && (
          <Card className="p-4 mb-3">
            <form onSubmit={handleCreateExp} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <label className="text-xs text-fg-secondary">
                Vendor
                <input type="text" name="vendor" required className="input mt-1 w-full" />
              </label>
              <label className="text-xs text-fg-secondary">
                Category
                <select name="category" required className="input mt-1 w-full">
                  <option value="general">General</option>
                  <option value="software">Software</option>
                  <option value="hardware">Hardware</option>
                  <option value="marketing">Marketing</option>
                  <option value="travel">Travel</option>
                  <option value="office">Office</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="text-xs text-fg-secondary">
                Amount
                <input type="number" name="amount" step="0.01" required className="input mt-1 w-full" />
              </label>
              <label className="text-xs text-fg-secondary">
                Date
                <input type="date" name="expenseDate" required className="input mt-1 w-full" />
              </label>
              <label className="text-xs text-fg-secondary sm:col-span-2">
                Description
                <input type="text" name="description" className="input mt-1 w-full" />
              </label>
              <label className="text-xs text-fg-secondary">
                Currency
                <input type="text" name="currency" defaultValue="USD" className="input mt-1 w-full" />
              </label>
              <div className="sm:col-span-4 flex gap-2">
                <Button type="submit" size="sm">Submit</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowExpForm(false)}>Cancel</Button>
              </div>
            </form>
          </Card>
        )}
        {expenses.length === 0 ? (
          <Card className="p-6">
            <EmptyState icon={Receipt} title="No expenses yet" description="Submit an expense report to start tracking spending." />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {expenses.map((exp) => (
              <Card key={exp.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-sm font-semibold block truncate pr-2">{exp.vendor}</span>
                  <Badge variant={expStatusVariant[exp.status] || 'default'} className="text-xs shrink-0">{exp.status}</Badge>
                </div>
                {exp.description && (
                  <p className="text-xs text-fg-secondary mb-2 line-clamp-2">{exp.description}</p>
                )}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge variant="default" className="text-xs">{exp.category}</Badge>
                  <span className="text-sm font-semibold">{exp.currency} {exp.amount.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-fg-muted flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {new Date(exp.expenseDate).toLocaleDateString()}
                  </span>
                  {exp.status === 'pending' && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" disabled={actingId === exp.id} onClick={() => handleExpAction(exp.id, 'approve')}>
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" disabled={actingId === exp.id} onClick={() => handleExpAction(exp.id, 'reject')}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  {exp.status === 'approved' && (
                    <Button size="sm" variant="ghost" disabled={actingId === exp.id} onClick={() => handleExpAction(exp.id, 'reimburse')}>
                      Reimburse
                    </Button>
                  )}
                </div>
                {parseTags(exp.tags).length > 0 && (
                  <div className="flex items-center gap-1 mt-2 flex-wrap">
                    {parseTags(exp.tags).slice(0, 3).map((tag) => (
                      <span key={tag} className="text-xs text-fg-muted flex items-center gap-0.5">
                        <Tag className="h-3 w-3" /> {tag}
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Expense by Category */}
      {Object.keys(expenseStats.byCategory).length > 0 && (
        <div>
          <h2 className="heading-display text-lg mb-3 flex items-center gap-2">
            <Tag className="h-5 w-5 text-accent-primary" /> Expenses by Category
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(expenseStats.byCategory).map(([cat, info]) => (
              <Card key={cat} className="p-4">
                <div className="text-xs text-fg-secondary mb-1">{cat}</div>
                <div className="text-lg font-semibold">${info.total.toFixed(2)}</div>
                <div className="text-xs text-fg-muted">{info.count} item{info.count !== 1 ? 's' : ''}</div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
