'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, BookOpen } from 'lucide-react';
import { Button, Badge, Card } from '@/components/ui';

interface KnowledgeBaseItem {
  id: string;
  name: string;
  description: string | null;
  visibility: string;
  articleCount: number;
  updatedAt: string;
}

interface KnowledgeBaseListProps {
  knowledgeBases: KnowledgeBaseItem[];
  defaultWorkspaceId: string;
  defaultOrganizationId: string;
}

export function KnowledgeBaseList({ knowledgeBases, defaultWorkspaceId, defaultOrganizationId }: KnowledgeBaseListProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('workspace');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/knowledge/bases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: defaultWorkspaceId,
          organizationId: defaultOrganizationId,
          name,
          description: description || undefined,
          visibility,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'failed_to_create_knowledge_base');
      }
      setSuccess('Knowledge base created successfully');
      setName('');
      setDescription('');
      setVisibility('workspace');
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
        <Plus className="h-4 w-4" /> New Knowledge Base
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
          <h2 className="heading-display text-lg">New Knowledge Base</h2>
          <button onClick={() => setOpen(false)} className="text-fg-secondary hover:text-fg">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-fg-secondary mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Marketing Playbook"
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
              placeholder="What is this knowledge base for?"
              className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
              style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-fg-secondary mb-1">Visibility</label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
              style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
            >
              <option value="workspace">Workspace</option>
              <option value="private">Private</option>
              <option value="shared">Shared</option>
            </select>
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          {success && <p className="text-xs text-success">{success}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? 'Creating…' : 'Create Knowledge Base'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
