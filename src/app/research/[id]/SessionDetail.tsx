'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Quote, ExternalLink, Trash2 } from 'lucide-react';
import { Button, Badge, Card } from '@/components/ui';

interface CitationItem {
  id: string;
  url: string;
  title: string | null;
  snippet: string | null;
  credibility: string;
  accessedAt: string;
}

interface SessionDetailProps {
  sessionId: string;
  status: string;
  summary: string | null;
  findings: Record<string, unknown>;
  citations: CitationItem[];
}

const credibilityVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  low: 'danger',
  medium: 'warning',
  high: 'success',
};

export function SessionDetail({ sessionId, status, summary, findings, citations }: SessionDetailProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [snippet, setSnippet] = useState('');
  const [credibility, setCredibility] = useState('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/research/sessions/${sessionId}/citations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          title: title || undefined,
          snippet: snippet || undefined,
          credibility,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'failed_to_add_citation');
      }
      setSuccess('Citation added successfully');
      setUrl('');
      setTitle('');
      setSnippet('');
      setCredibility('medium');
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

  async function handleDeleteCitation(citationId: string) {
    // Note: citation deletion via session endpoint not implemented; refresh only
    // Citations are deleted via cascade when session is deleted
    void citationId;
  }

  const findingsKeys = Object.keys(findings);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card className="p-6">
        <h2 className="font-semibold mb-3">Summary</h2>
        {summary ? (
          <p className="text-sm text-fg-secondary whitespace-pre-wrap">{summary}</p>
        ) : (
          <p className="text-sm text-fg-muted">No summary yet. The session is {status}.</p>
        )}
      </Card>

      {/* Findings */}
      <Card className="p-6">
        <h2 className="font-semibold mb-3">Findings</h2>
        {findingsKeys.length > 0 ? (
          <pre className="text-xs text-fg-secondary whitespace-pre-wrap font-mono bg-bg-tertiary p-4 rounded-md overflow-x-auto">
            {JSON.stringify(findings, null, 2)}
          </pre>
        ) : (
          <p className="text-sm text-fg-muted">No structured findings yet.</p>
        )}
      </Card>

      {/* Citations */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Quote className="h-4 w-4" /> Citations
          </h2>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Add Citation
          </Button>
        </div>
        {citations.length === 0 ? (
          <p className="text-sm text-fg-muted">No citations yet.</p>
        ) : (
          <div className="space-y-3">
            {citations.map((c) => (
              <div key={c.id} className="border border-border-primary rounded-md p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {c.title && <span className="text-sm font-medium block truncate">{c.title}</span>}
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-accent-primary hover:underline flex items-center gap-1 truncate"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" /> <span className="truncate">{c.url}</span>
                    </a>
                  </div>
                  <Badge variant={credibilityVariant[c.credibility] || 'default'} className="text-xs shrink-0">
                    {c.credibility}
                  </Badge>
                </div>
                {c.snippet && (
                  <p className="text-xs text-fg-secondary mt-2 italic line-clamp-3">{c.snippet}</p>
                )}
                <div className="text-xs text-fg-muted mt-2">
                  Accessed {new Date(c.accessedAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-lg rounded-lg border-2 bg-bg-primary p-6 max-h-[90vh] overflow-y-auto"
            style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-md)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="heading-display text-lg">Add Citation</h2>
              <button onClick={() => setOpen(false)} className="text-fg-secondary hover:text-fg">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-fg-secondary mb-1">URL *</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  placeholder="https://example.com/article"
                  className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-fg-secondary mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Source title"
                  className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-fg-secondary mb-1">Snippet</label>
                <textarea
                  value={snippet}
                  onChange={(e) => setSnippet(e.target.value)}
                  rows={3}
                  placeholder="Relevant excerpt from the source…"
                  className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-fg-secondary mb-1">Credibility</label>
                <select
                  value={credibility}
                  onChange={(e) => setCredibility(e.target.value)}
                  className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              {error && <p className="text-xs text-danger">{error}</p>}
              {success && <p className="text-xs text-success">{success}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={loading}>
                  {loading ? 'Adding…' : 'Add Citation'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
