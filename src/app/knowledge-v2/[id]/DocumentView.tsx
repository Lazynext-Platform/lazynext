'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen, FileText, GitBranch, Tag, Link, History,
  ChevronRight, Plus, X, Loader2, ArrowLeft, RotateCcw, Trash2,
} from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';

// ── Types ──

interface DocumentData {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  status: string;
  version: number;
  slug: string;
  tags: string[];
  organizationId: string;
  workspaceId: string | null;
  authorId: string;
  updatedAt: string;
  publishedAt: string | null;
}

interface VersionData {
  id: string;
  version: number;
  excerpt: string;
  editorId: string;
  changeSummary: string;
  createdAt: string;
}

interface LinksData {
  outgoing: Array<{ id: string; targetId: string; label: string; linkType: string }>;
  incoming: Array<{ id: string; sourceId: string; label: string; linkType: string }>;
}

interface BacklinkData {
  id: string;
  title: string;
  slug: string;
  status: string;
  linkId: string | null;
  linkType: string | null;
  label: string | null;
}

interface WikiPathNode {
  id: string;
  title: string;
  slug: string;
}

interface DocumentViewProps {
  document: DocumentData;
  versions: VersionData[];
  links: LinksData;
  backlinks: BacklinkData[];
  wikiPath: WikiPathNode[];
}

// ── Simple markdown renderer ──

function renderMarkdown(content: string): string {
  let html = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-4 mb-2">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-4 mb-2">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Code blocks
  html = html.replace(/```([\s\S]*?)```/g, '<pre class="bg-bg-secondary p-3 rounded text-xs overflow-x-auto my-2"><code>$1</code></pre>');
  html = html.replace(/`(.+?)`/g, '<code class="bg-bg-secondary px-1 rounded text-xs">$1</code>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-accent-primary underline">$1</a>');

  // Lists
  html = html.replace(/^[\s]*[-*] (.+)$/gm, '<li class="ml-4 list-disc">$1</li>');
  html = html.replace(/^[\s]*\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>');

  // Paragraphs (split on double newlines)
  html = html
    .split(/\n\n+/)
    .map((block) => {
      if (block.startsWith('<h') || block.startsWith('<pre') || block.startsWith('<li')) {
        return block;
      }
      return `<p class="text-sm leading-relaxed mb-3">${block.replace(/\n/g, '<br/>')}</p>`;
    })
    .join('\n');

  return html;
}

// ── Main component ──

export function DocumentView({ document: doc, versions, links, backlinks, wikiPath }: DocumentViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'content' | 'versions' | 'links'>('content');
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(doc.title);
  const [editContent, setEditContent] = useState(doc.content);
  const [editTags, setEditTags] = useState(doc.tags.join(', '));
  const [editStatus, setEditStatus] = useState(doc.status);
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState<number | null>(null);
  const [showAddLink, setShowAddLink] = useState(false);
  const [linkTargetId, setLinkTargetId] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const [linkType, setLinkType] = useState('reference');
  const [addingLink, setAddingLink] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/knowledge/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          content: editContent,
          tags: editTags ? editTags.split(',').map((t) => t.trim()).filter(Boolean) : [],
          status: editStatus,
          changeSummary: 'Edited via UI',
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'failed_to_save');
      }
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  async function handleRestore(version: number) {
    setRestoring(version);
    setError(null);
    try {
      const res = await fetch(`/api/knowledge/documents/${doc.id}/versions/${version}`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'failed_to_restore');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setRestoring(null);
    }
  }

  async function handleAddLink(e: React.FormEvent) {
    e.preventDefault();
    setAddingLink(true);
    setError(null);
    try {
      const res = await fetch(`/api/knowledge/documents/${doc.id}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId: linkTargetId,
          label: linkLabel,
          linkType,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'failed_to_add_link');
      }
      setShowAddLink(false);
      setLinkTargetId('');
      setLinkLabel('');
      setLinkType('reference');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setAddingLink(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this document? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/knowledge/documents/${doc.id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/knowledge-v2');
        router.refresh();
      }
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      {wikiPath.length > 0 && (
        <div className="flex items-center gap-1 text-xs text-fg-muted flex-wrap">
          <a href="/knowledge-v2" className="hover:text-fg">Knowledge</a>
          {wikiPath.map((node, i) => (
            <span key={node.id} className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3" />
              <a href={`/knowledge-v2/${node.id}`} className={i === wikiPath.length - 1 ? 'text-fg font-medium' : 'hover:text-fg'}>
                {node.title}
              </a>
            </span>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={doc.status === 'published' ? 'success' : 'default'}>{doc.status}</Badge>
            <Badge variant="default">v{doc.version}</Badge>
            {doc.publishedAt && (
              <span className="text-xs text-fg-muted">Published {new Date(doc.publishedAt).toLocaleDateString()}</span>
            )}
          </div>
          {editing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-lg font-bold"
              style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
            />
          ) : (
            <h1 className="heading-display text-2xl">{doc.title}</h1>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button size="sm" variant="ghost" onClick={() => setEditing(!editing)}>
            {editing ? 'Cancel' : 'Edit'}
          </Button>
          <Button size="sm" variant="ghost" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tags */}
      {!editing && doc.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {doc.tags.map((tag) => (
            <span key={tag} className="text-xs px-2 py-0.5 rounded-full border border-ink text-fg-secondary">
              <Tag className="inline h-3 w-3 mr-1" />{tag}
            </span>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-ink pb-px">
        <button
          onClick={() => setActiveTab('content')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border-b-2 ${activeTab === 'content' ? 'border-accent-primary text-fg' : 'border-transparent text-fg-muted'}`}
        >
          <FileText className="h-4 w-4" /> Content
        </button>
        <button
          onClick={() => setActiveTab('versions')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border-b-2 ${activeTab === 'versions' ? 'border-accent-primary text-fg' : 'border-transparent text-fg-muted'}`}
        >
          <History className="h-4 w-4" /> Versions ({versions.length})
        </button>
        <button
          onClick={() => setActiveTab('links')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border-b-2 ${activeTab === 'links' ? 'border-accent-primary text-fg' : 'border-transparent text-fg-muted'}`}
        >
          <Link className="h-4 w-4" /> Links ({links.outgoing.length + links.incoming.length})
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="rounded-md border border-danger bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </div>
      )}

      {/* Content tab */}
      {activeTab === 'content' && (
        <Card className="p-6">
          {editing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-fg-secondary mb-1">Content (Markdown)</label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={16}
                  className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm font-mono"
                  style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-fg-secondary mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-fg-secondary mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </Button>
              </div>
            </form>
          ) : (
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(doc.content) }}
            />
          )}
        </Card>
      )}

      {/* Versions tab */}
      {activeTab === 'versions' && (
        <Card className="p-4">
          {versions.length === 0 ? (
            <p className="text-sm text-fg-muted text-center py-4">No version history</p>
          ) : (
            <div className="space-y-2">
              {versions.map((v) => (
                <div key={v.id} className="flex items-center gap-3 px-3 py-2 rounded border border-ink">
                  <GitBranch className="h-4 w-4 text-fg-muted" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">v{v.version}</span>
                      {v.version === doc.version && <Badge variant="success">current</Badge>}
                    </div>
                    <p className="text-xs text-fg-muted">
                      {v.changeSummary || 'No change summary'} · {new Date(v.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {v.version !== doc.version && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRestore(v.version)}
                      disabled={restoring === v.version}
                    >
                      {restoring === v.version ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                      Restore
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Links tab */}
      {activeTab === 'links' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Document Links</h3>
            <Button size="sm" onClick={() => setShowAddLink(!showAddLink)}>
              <Plus className="h-4 w-4" /> Add Link
            </Button>
          </div>

          {showAddLink && (
            <Card className="p-4">
              <form onSubmit={handleAddLink} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-fg-secondary mb-1">Target Document ID</label>
                  <input
                    type="text"
                    value={linkTargetId}
                    onChange={(e) => setLinkTargetId(e.target.value)}
                    required
                    placeholder="Document ID to link to"
                    className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-fg-secondary mb-1">Label</label>
                    <input
                      type="text"
                      value={linkLabel}
                      onChange={(e) => setLinkLabel(e.target.value)}
                      placeholder="Link label"
                      className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                      style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-fg-secondary mb-1">Link Type</label>
                    <select
                      value={linkType}
                      onChange={(e) => setLinkType(e.target.value)}
                      className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                      style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
                    >
                      <option value="reference">Reference</option>
                      <option value="related">Related</option>
                      <option value="prerequisite">Prerequisite</option>
                      <option value="extension">Extension</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddLink(false)}>Cancel</Button>
                  <Button type="submit" size="sm" disabled={addingLink}>
                    {addingLink ? 'Adding…' : 'Add Link'}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Outgoing links */}
          <Card className="p-4">
            <h4 className="text-xs font-semibold mb-2 flex items-center gap-1">
              <Link className="h-3 w-3" /> Outgoing ({links.outgoing.length})
            </h4>
            {links.outgoing.length === 0 ? (
              <p className="text-xs text-fg-muted">No outgoing links</p>
            ) : (
              <div className="space-y-1">
                {links.outgoing.map((l) => (
                  <a key={l.id} href={`/knowledge-v2/${l.targetId}`} className="flex items-center gap-2 text-sm hover:text-accent-primary">
                    <ChevronRight className="h-3 w-3 text-fg-muted" />
                    <span className="truncate">{l.label || l.targetId}</span>
                    <Badge variant="default">{l.linkType}</Badge>
                  </a>
                ))}
              </div>
            )}
          </Card>

          {/* Incoming links (backlinks) */}
          <Card className="p-4">
            <h4 className="text-xs font-semibold mb-2 flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Backlinks ({backlinks.length})
            </h4>
            {backlinks.length === 0 ? (
              <p className="text-xs text-fg-muted">No backlinks</p>
            ) : (
              <div className="space-y-1">
                {backlinks.map((b) => (
                  <a key={b.id} href={`/knowledge-v2/${b.id}`} className="flex items-center gap-2 text-sm hover:text-accent-primary">
                    <ChevronRight className="h-3 w-3 text-fg-muted" />
                    <span className="truncate">{b.title}</span>
                    {b.linkType && <Badge variant="default">{b.linkType}</Badge>}
                  </a>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
