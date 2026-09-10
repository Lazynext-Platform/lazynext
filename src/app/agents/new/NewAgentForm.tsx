'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';

const ROLES = [
  'ceo',
  'engineering',
  'strategy',
  'research',
  'product',
  'design',
  'growth',
  'sales',
  'support',
  'finance',
  'operations',
  'security',
  'custom',
] as const;

interface NewAgentFormProps {
  workspaces: { id: string; name: string }[];
  defaultWorkspaceId: string;
}

export function NewAgentForm({ workspaces, defaultWorkspaceId }: NewAgentFormProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [role, setRole] = useState<string>('custom');
  const [instructions, setInstructions] = useState('');
  const [modelName, setModelName] = useState('doubao-seed-2.1-turbo');
  const [workspaceId, setWorkspaceId] = useState(defaultWorkspaceId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          name,
          role,
          instructions: instructions || undefined,
          modelName,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'failed_to_create_agent');
      }
      setSuccess('Agent created successfully');
      setTimeout(() => {
        router.push('/agents');
      }, 500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-fg-secondary mb-1">Workspace</label>
          <select
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
            className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
            style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
          >
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-fg-secondary mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Growth Agent"
            className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
            style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-fg-secondary mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
            style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-fg-secondary mb-1">Instructions</label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={5}
            placeholder="Describe what this agent should do…"
            className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
            style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-fg-secondary mb-1">Model</label>
          <input
            type="text"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
            style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
          />
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
        {success && <p className="text-xs text-success">{success}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => router.push('/agents')}>Cancel</Button>
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? 'Creating…' : 'Create Agent'}
          </Button>
        </div>
      </form>
    </div>
  );
}
