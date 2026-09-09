'use client';

import { useState, useTransition } from 'react';
import {
  LifeBuoy, AlertTriangle, GitBranch, BookOpen, Plus, Clock, User,
  TrendingUp, CheckCircle, XCircle, Eye, ThumbsUp,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

interface Incident {
  id: string; title: string; description: string; type: string; priority: string;
  status: string; severity: string; category: string; assignedToId: string | null;
  slaDueAt: Date | null; createdAt: Date;
}
interface ChangeRequest {
  id: string; title: string; description: string; type: string; status: string;
  priority: string; riskLevel: string; scheduledAt: Date | null; createdAt: Date;
}
interface Article {
  id: string; title: string; content: string; category: string; type: string;
  status: string; views: number; helpfulVotes: number; updatedAt: Date;
}
interface Stats {
  incidents: { total: number; byStatus: Record<string, number>; byPriority: Record<string, number>; slaBreaches: number };
  changes: { total: number; byStatus: Record<string, number>; byType: Record<string, number> };
  knowledge: { total: number; byStatus: Record<string, number>; byCategory: Record<string, number>; totalViews: number };
}

const incidentStatusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  open: 'danger',
  investigating: 'warning',
  in_progress: 'warning',
  resolved: 'success',
  closed: 'default',
  cancelled: 'default',
};

const priorityVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  low: 'default',
  medium: 'info',
  high: 'warning',
  urgent: 'danger',
};

const changeStatusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  requested: 'info',
  approved: 'accent',
  in_progress: 'warning',
  implemented: 'success',
  rejected: 'danger',
  cancelled: 'default',
};

export function ITSMDashboard({
  organizationId,
  incidents: initialIncidents,
  slaBreaches: initialSlaBreaches,
  changes: initialChanges,
  articles: initialArticles,
  stats,
}: {
  organizationId: string;
  incidents: Incident[];
  slaBreaches: Incident[];
  changes: ChangeRequest[];
  articles: Article[];
  stats: Stats;
}) {
  const [incidents] = useState(initialIncidents);
  const [slaBreaches] = useState(initialSlaBreaches);
  const [changes] = useState(initialChanges);
  const [articles] = useState(initialArticles);
  const [actingId, setActingId] = useState<string | null>(null);
  const [_, startTransition] = useTransition();
  void organizationId;
  void _;

  async function handleAction(id: string, path: string) {
    setActingId(id);
    try {
      await fetch(`/api/itsm/incidents/${id}/${path}`, { method: 'POST' });
      startTransition(() => { /* optimistic refresh */ });
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <LifeBuoy className="h-3 w-3" /> Incidents
          </div>
          <div className="text-2xl font-semibold">{stats.incidents.total}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <AlertTriangle className="h-3 w-3" /> SLA Breaches
          </div>
          <div className="text-2xl font-semibold text-danger">{stats.incidents.slaBreaches}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <GitBranch className="h-3 w-3" /> Change Requests
          </div>
          <div className="text-2xl font-semibold">{stats.changes.total}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <BookOpen className="h-3 w-3" /> Knowledge Articles
          </div>
          <div className="text-2xl font-semibold">{stats.knowledge.total}</div>
        </Card>
      </div>

      {/* SLA Alerts */}
      {slaBreaches.length > 0 && (
        <Card className="p-4 border-danger">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-danger" />
            <h2 className="heading-display text-lg text-danger">SLA Breaches ({slaBreaches.length})</h2>
          </div>
          <div className="space-y-2">
            {slaBreaches.slice(0, 5).map((inc) => (
              <div key={inc.id} className="flex items-center justify-between gap-2 rounded-lg bg-surface-alt p-2">
                <span className="text-sm font-medium truncate">{inc.title}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={priorityVariant[inc.priority] || 'default'} className="text-xs">{inc.priority}</Badge>
                  {inc.slaDueAt && (
                    <span className="text-xs text-fg-muted flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {new Date(inc.slaDueAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Incident Queue */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="heading-display text-lg flex items-center gap-2">
            <LifeBuoy className="h-5 w-5 text-accent-primary" /> Incident Queue
          </h2>
          <Button size="sm" href="/api/itsm/incidents">
            <Plus className="h-4 w-4" /> New Incident
          </Button>
        </div>
        {incidents.length === 0 ? (
          <Card className="p-6">
            <EmptyState icon={LifeBuoy} title="No incidents" description="Report an incident to start tracking it." />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {incidents.slice(0, 12).map((inc) => (
              <Card key={inc.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-sm font-semibold block truncate pr-2">{inc.title}</span>
                  <Badge variant={incidentStatusVariant[inc.status] || 'default'} className="text-xs shrink-0">{inc.status}</Badge>
                </div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge variant={priorityVariant[inc.priority] || 'default'} className="text-xs">{inc.priority}</Badge>
                  <Badge variant="default" className="text-xs">{inc.category}</Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-fg-muted mb-3">
                  {inc.assignedToId ? (
                    <span className="flex items-center gap-1"><User className="h-3 w-3" /> Assigned</span>
                  ) : (
                    <span className="flex items-center gap-1 text-warning">Unassigned</span>
                  )}
                  <span>·</span>
                  <span>{new Date(inc.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" disabled={actingId === inc.id} onClick={() => handleAction(inc.id, 'escalate')}>
                    Escalate
                  </Button>
                  <Button size="sm" variant="ghost" disabled={actingId === inc.id} onClick={() => handleAction(inc.id, 'resolve')}>
                    <CheckCircle className="h-3 w-3" /> Resolve
                  </Button>
                  <Button size="sm" variant="ghost" disabled={actingId === inc.id} onClick={() => handleAction(inc.id, 'close')}>
                    Close
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Change Requests */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="heading-display text-lg flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-accent-primary" /> Change Requests
          </h2>
          <Button size="sm" href="/api/itsm/changes">
            <Plus className="h-4 w-4" /> New Change
          </Button>
        </div>
        {changes.length === 0 ? (
          <Card className="p-6">
            <EmptyState icon={GitBranch} title="No change requests" description="Submit a change request to track approvals and rollouts." />
          </Card>
        ) : (
          <div className="space-y-2">
            {changes.slice(0, 10).map((ch) => (
              <Card key={ch.id} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-sm font-semibold block truncate">{ch.title}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="default" className="text-xs">{ch.type}</Badge>
                      <Badge variant={changeStatusVariant[ch.status] || 'default'} className="text-xs">{ch.status}</Badge>
                      <Badge variant={priorityVariant[ch.priority] || 'default'} className="text-xs">{ch.priority}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {ch.scheduledAt && (
                      <span className="text-xs text-fg-muted flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {new Date(ch.scheduledAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Knowledge Base */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="heading-display text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-accent-primary" /> Knowledge Base
          </h2>
          <Button size="sm" href="/api/itsm/knowledge">
            <Plus className="h-4 w-4" /> New Article
          </Button>
        </div>
        {articles.length === 0 ? (
          <Card className="p-6">
            <EmptyState icon={BookOpen} title="No articles" description="Publish knowledge articles to help your team self-serve." />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {articles.slice(0, 9).map((art) => (
              <Card key={art.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-sm font-semibold block truncate pr-2">{art.title}</span>
                  <Badge variant="default" className="text-xs shrink-0">{art.category}</Badge>
                </div>
                {art.content && (
                  <p className="text-xs text-fg-secondary mb-3 line-clamp-2">{art.content}</p>
                )}
                <div className="flex items-center justify-between text-xs text-fg-muted">
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {art.views}</span>
                  <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> {art.helpfulVotes}</span>
                  <span>{new Date(art.updatedAt).toLocaleDateString()}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Incidents by Status</h3>
          <div className="space-y-1">
            {Object.entries(stats.incidents.byStatus).map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs">
                <span className="capitalize">{k.replace(/_/g, ' ')}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
            {Object.keys(stats.incidents.byStatus).length === 0 && (
              <span className="text-xs text-fg-muted">No data</span>
            )}
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><GitBranch className="h-4 w-4" /> Changes by Status</h3>
          <div className="space-y-1">
            {Object.entries(stats.changes.byStatus).map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs">
                <span className="capitalize">{k.replace(/_/g, ' ')}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
            {Object.keys(stats.changes.byStatus).length === 0 && (
              <span className="text-xs text-fg-muted">No data</span>
            )}
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><BookOpen className="h-4 w-4" /> Knowledge by Status</h3>
          <div className="space-y-1">
            {Object.entries(stats.knowledge.byStatus).map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs">
                <span className="capitalize">{k}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
            {Object.keys(stats.knowledge.byStatus).length === 0 && (
              <span className="text-xs text-fg-muted">No data</span>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
