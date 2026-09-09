'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui';

interface NewTransactionFormProps {
  workspaces: { id: string; organizationId: string; name: string }[];
  defaultWorkspaceId: string;
  defaultOrganizationId: string;
}

export function NewTransactionForm({ workspaces, defaultWorkspaceId, defaultOrganizationId }: NewTransactionFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('other');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [status, setStatus] = useState('confirmed');
  const [source, setSource] = useState('manual');
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const defaultWs = workspaces.find((w) => w.id === defaultWorkspaceId) || workspaces[0];
  const [workspaceId, setWorkspaceId] = useState(defaultWs.id);
  const [organizationId, setOrganizationId] = useState(defaultWs.organizationId);

  function handleWorkspaceChange(id: string) {
    const ws = workspaces.find((w) => w.id === id);
    if (ws) {
      setWorkspaceId(ws.id);
      setOrganizationId(ws.organizationId);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || isNaN(parseFloat(amount))) {
      setError('Amount is required');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/finance/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          workspaceId,
          type,
          category,
          amount: parseFloat(amount),
          currency,
          description: description || undefined,
          date: date || undefined,
          status,
          source: source || undefined,
          reference: reference || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'failed_to_create_transaction');
      }
      setSuccess('Transaction created successfully');
      setType('expense');
      setCategory('other');
      setAmount('');
      setDescription('');
      setDate('');
      setReference('');
      setTimeout(() => {
        setSuccess(null);
        setOpen(false);
        router.refresh();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Add Transaction
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
      <div
        className="w-full max-w-lg rounded-lg border-2 bg-bg-primary p-6 max-h-[90vh] overflow-y-auto"
        style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-md)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="heading-display text-lg">Add Transaction</h2>
          <button onClick={() => setOpen(false)} className="text-fg-secondary hover:text-fg">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-fg-secondary mb-1">Workspace</label>
            <select
              value={workspaceId}
              onChange={(e) => handleWorkspaceChange(e.target.value)}
              className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
              style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
            >
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-fg-secondary mb-1">Type *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
                <option value="transfer">Transfer</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-fg-secondary mb-1">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
              >
                <option value="revenue">Revenue</option>
                <option value="cost_of_goods">Cost of Goods</option>
                <option value="marketing">Marketing</option>
                <option value="salaries">Salaries</option>
                <option value="infrastructure">Infrastructure</option>
                <option value="tools">Tools</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-fg-secondary mb-1">Amount *</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-fg-secondary mb-1">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="INR">INR</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-fg-secondary mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Monthly subscription payment"
              className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
              style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-fg-secondary mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-fg-secondary mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
              >
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="disputed">Disputed</option>
                <option value="reversed">Reversed</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-fg-secondary mb-1">Source</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
              >
                <option value="manual">Manual</option>
                <option value="stripe">Stripe</option>
                <option value="dodo">Dodo</option>
                <option value="bank">Bank</option>
                <option value="agent">Agent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-fg-secondary mb-1">Reference</label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Invoice #"
                className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
              />
            </div>
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          {success && <p className="text-xs text-success">{success}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? 'Adding…' : 'Add Transaction'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
