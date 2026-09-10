'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui';

interface NewProductFormProps {
  workspaces: { id: string; organizationId: string; name: string }[];
  defaultWorkspaceId: string;
  defaultOrganizationId: string;
}

export function NewProductForm({ workspaces, defaultWorkspaceId, defaultOrganizationId }: NewProductFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('product');
  const [status, setStatus] = useState('active');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [unit, setUnit] = useState('one_time');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('');
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
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          workspaceId,
          name,
          description: description || undefined,
          type,
          status,
          price: price ? parseFloat(price) : undefined,
          currency,
          unit: unit || undefined,
          sku: sku || undefined,
          category: category || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'failed_to_create_product');
      }
      setSuccess('Product created successfully');
      setName('');
      setDescription('');
      setType('product');
      setStatus('active');
      setPrice('');
      setCurrency('USD');
      setUnit('one_time');
      setSku('');
      setCategory('');
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
        <Plus className="h-4 w-4" /> New Product
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
          <h2 className="heading-display text-lg">New Product</h2>
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
          <div>
            <label className="block text-xs font-medium text-fg-secondary mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Pro Subscription"
              className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
              style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-fg-secondary mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Product description…"
              className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
              style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-fg-secondary mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
              >
                <option value="product">Product</option>
                <option value="service">Service</option>
                <option value="subscription">Subscription</option>
                <option value="digital">Digital</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-fg-secondary mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="beta">Beta</option>
                <option value="discontinued">Discontinued</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-fg-secondary mb-1">Price</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-fg-secondary mb-1">Unit</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
              >
                <option value="one_time">One Time</option>
                <option value="per_month">Per Month</option>
                <option value="per_year">Per Year</option>
                <option value="per_unit">Per Unit</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-fg-secondary mb-1">SKU</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="PRO-001"
                className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-fg-secondary mb-1">Category</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Software"
              className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
              style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
            />
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          {success && <p className="text-xs text-success">{success}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? 'Creating…' : 'Create Product'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
