'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Search } from 'lucide-react';
import { Button, Badge, Card } from '@/components/ui';

interface SessionItem {
  id: string;
  query: string;
  status: string;
  summary: string | null;
  citationCount: number;
  updatedAt: string;
}

interface ResearchSessionListProps {
  sessions: SessionItem[];
  defaultWorkspaceId: string;
  defaultOrganizationId: string;
}

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  pending: 'default',
  running: 'info',
  completed: 'success',
  failed: 'danger',
  cancelled: 'default',
};

export function ResearchSessionList({ sessions, defaultWorkspaceId, defaultOrganizationId }: ResearchSessionListProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/research/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: defaultWorkspaceId,
          organizationId: defaultOrganizationId,
          query,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'failed_to_create_session');
      }
      setSuccess('Research session created successfully');
      setQuery('');
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
        <Plus className="h-4 w-4" /> New Research Session
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
          <h2 className="heading-display text-lg">New Research Session</h2>
          <button onClick={() => setOpen(false)} className="text-fg-secondary hover:text-fg">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-fg-secondary mb-1">Research Query *</label>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              required
              rows={3}
              placeholder="What do you want to research?"
              className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
              style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
            />
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          {success && <p className="text-xs text-success">{success}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? 'Creating…' : 'Create Session'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
