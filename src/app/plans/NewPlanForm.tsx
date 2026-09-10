'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui';

interface NewPlanFormProps {
  workspaces: { id: string; name: string; organizationId: string }[];
  defaultWorkspaceId: string;
  defaultOrganizationId: string;
}

export function NewPlanForm({ workspaces, defaultWorkspaceId, defaultOrganizationId }: NewPlanFormProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [objective, setObjective] = useState('');
  const [reasoning, setReasoning] = useState('');
  const [priority, setPriority] = useState('medium');
  const [riskLevel, setRiskLevel] = useState('low');
  const [estimatedCost, setEstimatedCost] = useState('0');
  const [workspaceId, setWorkspaceId] = useState(defaultWorkspaceId);
  const [organizationId, setOrganizationId] = useState(defaultOrganizationId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleWorkspaceChange(id: string) {
    setWorkspaceId(id);
    const ws = workspaces.find((w) => w.id === id);
    if (ws) setOrganizationId(ws.organizationId);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          organizationId,
          title,
          objective,
          reasoning: reasoning || undefined,
          priority,
          riskLevel,
          estimatedCost: parseInt(estimatedCost, 10) || 0,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'failed_to_create_plan');
      }
      setSuccess('Plan created successfully');
      setTitle('');
      setObjective('');
      setReasoning('');
      setPriority('medium');
      setRiskLevel('low');
      setEstimatedCost('0');
      setTimeout(() => {
        setSuccess(null);
        setOpen(false);
        window.location.reload();
      }, 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> New Plan
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
      <div
        className="w-full max-w-lg rounded-lg border-2 bg-bg-primary p-6"
        style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-md)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="heading-display text-lg">New Plan</h2>
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
            <label className="block text-xs font-medium text-fg-secondary mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. Launch Q1 Marketing Campaign"
              className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
              style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-fg-secondary mb-1">Objective</label>
            <textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              required
              rows={3}
              placeholder="What should this plan achieve?"
              className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
              style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-fg-secondary mb-1">Reasoning (optional)</label>
            <textarea
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              rows={2}
              placeholder="Why this plan?"
              className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
              style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-fg-secondary mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-fg-secondary mb-1">Risk Level</label>
              <select
                value={riskLevel}
                onChange={(e) => setRiskLevel(e.target.value)}
                className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-fg-secondary mb-1">Est. Cost (credits)</label>
              <input
                type="number"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
                min="0"
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
              {loading ? 'Creating…' : 'Create Plan'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
