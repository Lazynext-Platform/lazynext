'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen, FileText, Search, Network, GitBranch, Tag, Link,
  History, Plus, ChevronRight, ChevronDown, X, Loader2,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

// ── Types ──

interface DocumentItem {
  id: string;
  title: string;
  excerpt: string;
  status: string;
  version: number;
  slug: string;
  tags: string[];
  updatedAt: string;
  workspaceId: string | null;
}

interface TreeNode {
  id: string;
  title: string;
  slug: string;
  parentId: string | null;
  status: string;
  children: TreeNode[];
}

interface TagItem {
  tag: string;
  count: number;
}

interface Stats {
  totalDocuments: number;
  byStatus: Record<string, number>;
  byWorkspace: Record<string, number>;
  totalVersions: number;
  totalLinks: number;
  recentActivity: Array<{ id: string; title: string; action: string; updatedAt: string }>;
}

interface WorkspaceItem {
  id: string;
  name: string;
  organizationId: string;
}

interface SearchResult {
  id: string;
  entityType: string;
  title: string;
  excerpt: string;
  relevance: number;
  tags: string[];
}

interface KnowledgeDashboardProps {
  organizationId: string;
  documents: DocumentItem[];
  tree: TreeNode[];
  tags: TagItem[];
  stats: Stats;
  workspaces: WorkspaceItem[];
}

// ── Tree node component ──

function TreeView({ nodes, expanded, onToggle, depth }: {
  nodes: TreeNode[];
  expanded: Set<string>;
  onToggle: (id: string) => void;
  depth: number;
}) {
  if (nodes.length === 0) {
    return <p className="text-xs text-fg-muted px-2 py-1">No documents yet</p>;
  }

  return (
    <ul className="space-y-0.5">
      {nodes.map((node) => {
        const hasChildren = node.children.length > 0;
        const isExpanded = expanded.has(node.id);
        return (
          <li key={node.id}>
            <div
              className="flex items-center gap-1 px-2 py-1 rounded hover:bg-bg-secondary cursor-pointer text-sm"
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
              onClick={() => onToggle(node.id)}
            >
              {hasChildren ? (
                <button onClick={(e) => { e.stopPropagation(); onToggle(node.id); }} className="text-fg-muted">
                  {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </button>
              ) : (
                <span className="w-3" />
              )}
              <FileText className="h-3 w-3 text-fg-muted flex-shrink-0" />
              <span className="truncate">{node.title}</span>
              {node.status === 'published' && (
                <span className="ml-auto text-xs text-success">●</span>
              )}
            </div>
            {hasChildren && isExpanded && (
              <TreeView nodes={node.children} expanded={expanded} onToggle={onToggle} depth={depth + 1} />
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ── Main dashboard ──

export function KnowledgeDashboard({ organizationId, documents, tree, tags, stats, workspaces }: KnowledgeDashboardProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [workspaceFilter, setWorkspaceFilter] = useState<string>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Create form state
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newStatus, setNewStatus] = useState('draft');
  const [newWorkspaceId, setNewWorkspaceId] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Debounced search
  const searchTimer = useMemo(() => ({ current: null as ReturnType<typeof setTimeout> | null }), []);
  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/knowledge/search?q=${encodeURIComponent(q)}&organizationId=${organizationId}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
        }
      } catch {
        // ignore
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [organizationId, searchTimer]);

  function toggleNode(id: string) {
    router.push(`/knowledge-v2/${id}`);
  }

  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      if (statusFilter !== 'all' && doc.status !== statusFilter) return false;
      if (tagFilter && !doc.tags.includes(tagFilter)) return false;
      if (workspaceFilter !== 'all') {
        if (workspaceFilter === 'unassigned' && doc.workspaceId) return false;
        if (workspaceFilter !== 'unassigned' && doc.workspaceId !== workspaceFilter) return false;
      }
      return true;
    });
  }, [documents, statusFilter, tagFilter, workspaceFilter]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch('/api/knowledge/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          title: newTitle,
          content: newContent,
          tags: newTags ? newTags.split(',').map((t) => t.trim()).filter(Boolean) : [],
          status: newStatus,
          workspaceId: newWorkspaceId || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'failed_to_create');
      }
      const data = await res.json();
      setShowCreate(false);
      setNewTitle('');
      setNewContent('');
      setNewTags('');
      setNewStatus('draft');
      router.push(`/knowledge-v2/${data.document.id}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats overview */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-fg-muted" />
            <span className="text-xs text-fg-secondary">Documents</span>
          </div>
          <p className="text-2xl font-bold">{stats.totalDocuments}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <History className="h-4 w-4 text-fg-muted" />
            <span className="text-xs text-fg-secondary">Versions</span>
          </div>
          <p className="text-2xl font-bold">{stats.totalVersions}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Link className="h-4 w-4 text-fg-muted" />
            <span className="text-xs text-fg-secondary">Links</span>
          </div>
          <p className="text-2xl font-bold">{stats.totalLinks}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Tag className="h-4 w-4 text-fg-muted" />
            <span className="text-xs text-fg-secondary">Tags</span>
          </div>
          <p className="text-2xl font-bold">{tags.length}</p>
        </Card>
      </div>

      {/* Search bar */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search across documents, memories, and research…"
            className="w-full rounded-lg border-2 bg-bg-secondary pl-10 pr-10 py-2.5 text-sm"
            style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-md)' }}
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-fg-muted" />
          )}
          {searchQuery && !searching && (
            <button
              onClick={() => handleSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {searchResults.length > 0 && (
          <Card className="absolute z-10 mt-1 w-full p-2 max-h-96 overflow-y-auto">
            {searchResults.map((result) => (
              <a
                key={result.id}
                href={result.entityType === 'document' ? `/knowledge-v2/${result.id}` : '#'}
                className="block px-3 py-2 rounded hover:bg-bg-secondary"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="default">{result.entityType}</Badge>
                  <span className="text-sm font-medium truncate">{result.title}</span>
                  <span className="ml-auto text-xs text-fg-muted">{result.relevance.toFixed(2)}</span>
                </div>
                <p className="text-xs text-fg-secondary line-clamp-2">{result.excerpt}</p>
              </a>
            ))}
          </Card>
        )}
      </div>

      <div className="flex gap-6">
        {/* Sidebar: document tree */}
        {sidebarOpen && (
          <Card className="w-64 flex-shrink-0 p-3 max-h-[600px] overflow-y-auto hidden md:block">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Network className="h-4 w-4 text-fg-muted" />
                <span className="text-xs font-semibold">Wiki Tree</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-fg-muted hover:text-fg">
                <X className="h-3 w-3" />
              </button>
            </div>
            <TreeView nodes={tree} expanded={expanded} onToggle={toggleNode} depth={0} />
          </Card>
        )}

        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center gap-1 text-xs text-fg-secondary hover:text-fg"
          >
            <Network className="h-4 w-4" /> Show tree
          </button>
        )}

        {/* Main content: document list */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Filters + Create button */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border-2 bg-bg-secondary px-2 py-1 text-xs"
              style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
            <select
              value={workspaceFilter}
              onChange={(e) => setWorkspaceFilter(e.target.value)}
              className="rounded-md border-2 bg-bg-secondary px-2 py-1 text-xs"
              style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
            >
              <option value="all">All workspaces</option>
              <option value="unassigned">Unassigned</option>
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
            <div className="ml-auto">
              <Button size="sm" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4" /> New Document
              </Button>
            </div>
          </div>

          {/* Tag filter chips */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tagFilter && (
                <button
                  onClick={() => setTagFilter(null)}
                  className="text-xs text-fg-muted hover:text-fg"
                >
                  Clear filter
                </button>
              )}
              {tags.slice(0, 15).map((t) => (
                <button
                  key={t.tag}
                  onClick={() => setTagFilter(tagFilter === t.tag ? null : t.tag)}
                  className={`text-xs px-2 py-0.5 rounded-full border ${
                    tagFilter === t.tag ? 'bg-accent-primary text-white border-accent-primary' : 'border-ink text-fg-secondary'
                  }`}
                >
                  {t.tag} ({t.count})
                </button>
              ))}
            </div>
          )}

          {/* Document list */}
          {filteredDocs.length === 0 ? (
            <Card className="p-6">
              <EmptyState
                icon={BookOpen}
                title="No documents found"
                description="Create your first knowledge document or adjust your filters."
                action={<Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> New Document</Button>}
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {filteredDocs.map((doc) => (
                <a key={doc.id} href={`/knowledge-v2/${doc.id}`} className="group">
                  <Card className="p-4 h-full hover:border-accent-primary transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <FileText className="h-4 w-4 text-fg-muted flex-shrink-0" />
                      <Badge variant={doc.status === 'published' ? 'success' : doc.status === 'archived' ? 'default' : 'default'}>
                        {doc.status}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-sm mb-1 group-hover:text-accent-primary line-clamp-1">{doc.title}</h3>
                    <p className="text-xs text-fg-secondary line-clamp-2 mb-2">{doc.excerpt}</p>
                    {doc.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {doc.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-xs text-fg-muted">#{tag}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-fg-muted">
                      <GitBranch className="h-3 w-3" />v{doc.version}
                      <span>·</span>
                      <span>{new Date(doc.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </Card>
                </a>
              ))}
            </div>
          )}

          {/* Recent activity */}
          {stats.recentActivity.length > 0 && !searchQuery && (
            <Card className="p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <History className="h-4 w-4 text-fg-muted" />
                <span className="text-xs font-semibold">Recent Activity</span>
              </div>
              <div className="space-y-2">
                {stats.recentActivity.slice(0, 5).map((activity) => (
                  <a key={activity.id} href={`/knowledge-v2/${activity.id}`} className="flex items-center gap-2 text-sm hover:text-accent-primary">
                    <FileText className="h-3 w-3 text-fg-muted" />
                    <span className="truncate">{activity.title}</span>
                    <Badge variant="default">{activity.action}</Badge>
                    <span className="ml-auto text-xs text-fg-muted">{new Date(activity.updatedAt).toLocaleDateString()}</span>
                  </a>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Create document modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCreate(false)}>
          <div
            className="w-full max-w-lg rounded-lg border-2 bg-bg-primary p-6 max-h-[90vh] overflow-y-auto"
            style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-md)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="heading-display text-lg">New Knowledge Document</h2>
              <button onClick={() => setShowCreate(false)} className="text-fg-secondary hover:text-fg">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-fg-secondary mb-1">Title *</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  placeholder="Document title"
                  className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-fg-secondary mb-1">Content (Markdown)</label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={6}
                  placeholder="# Heading&#10;&#10;Write your document content here…"
                  className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm font-mono"
                  style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-fg-secondary mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="marketing, guide, reference"
                  className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-fg-secondary mb-1">Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-fg-secondary mb-1">Workspace</label>
                  <select
                    value={newWorkspaceId}
                    onChange={(e) => setNewWorkspaceId(e.target.value)}
                    className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
                  >
                    <option value="">Unassigned</option>
                    {workspaces.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              {createError && <p className="text-xs text-danger">{createError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={creating}>
                  {creating ? 'Creating…' : 'Create Document'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
