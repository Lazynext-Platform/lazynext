'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, FileText, Trash2 } from 'lucide-react';
import { Button, Badge, Card } from '@/components/ui';

interface ArticleItem {
  id: string;
  title: string;
  summary: string | null;
  status: string;
  source: string;
  version: number;
  wordCount: number;
  updatedAt: string;
}

interface ArticleListProps {
  knowledgeBaseId: string;
  articles: ArticleItem[];
}

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  draft: 'default',
  published: 'success',
  archived: 'warning',
};

export function ArticleList({ knowledgeBaseId, articles }: ArticleListProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [status, setStatus] = useState('draft');
  const [source, setSource] = useState('manual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/knowledge/bases/${knowledgeBaseId}/articles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          summary: summary || undefined,
          status,
          source,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'failed_to_create_article');
      }
      setSuccess('Article created successfully');
      setTitle('');
      setContent('');
      setSummary('');
      setStatus('draft');
      setSource('manual');
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

  async function handleDelete(articleId: string) {
    if (!confirm('Delete this article?')) return;
    try {
      const res = await fetch(`/api/knowledge/bases/${knowledgeBaseId}/articles/${articleId}`, {
        method: 'DELETE',
      });
      if (res.ok) router.refresh();
    } catch {
      // ignore
    }
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New Article
        </Button>
      </div>

      {articles.length > 0 && (
        <div className="space-y-3">
          {articles.map((article) => (
            <Card key={article.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-fg-secondary shrink-0" />
                    <span className="text-sm font-semibold truncate">{article.title}</span>
                  </div>
                  {article.summary && (
                    <p className="text-xs text-fg-secondary line-clamp-2 ml-6">{article.summary}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 ml-6">
                    <Badge variant={statusVariant[article.status] || 'default'} className="text-xs">{article.status}</Badge>
                    <Badge variant="default" className="text-xs">{article.source}</Badge>
                    <span className="text-xs text-fg-muted">v{article.version} · {article.wordCount} words</span>
                    <span className="text-xs text-fg-muted">· {new Date(article.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(article.id)}
                  className="text-fg-muted hover:text-danger shrink-0 ml-2"
                  title="Delete article"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-2xl rounded-lg border-2 bg-bg-primary p-6 max-h-[90vh] overflow-y-auto"
            style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-md)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="heading-display text-lg">New Article</h2>
              <button onClick={() => setOpen(false)} className="text-fg-secondary hover:text-fg">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-fg-secondary mb-1">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="Article title"
                  className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-fg-secondary mb-1">Summary</label>
                <input
                  type="text"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Brief summary (optional)"
                  className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-fg-secondary mb-1">Content *</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  rows={8}
                  placeholder="Write your article in markdown…"
                  className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm font-mono"
                  style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-fg-secondary mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-fg-secondary mb-1">Source</label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
                  >
                    <option value="manual">Manual</option>
                    <option value="research">Research</option>
                    <option value="agent">Agent</option>
                    <option value="import">Import</option>
                  </select>
                </div>
              </div>
              {error && <p className="text-xs text-danger">{error}</p>}
              {success && <p className="text-xs text-success">{success}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={loading}>
                  {loading ? 'Creating…' : 'Create Article'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
