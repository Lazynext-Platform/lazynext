'use client';

import { useState, useTransition } from 'react';
import {
  Lightbulb, Rocket, Map, ThumbsUp, Plus, TrendingUp, Calendar, Tag,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

interface FeatureIdea {
  id: string; title: string; description: string; category: string; status: string;
  priority: string; impact: number; effort: number; votes: number; tags: string;
  createdAt: Date;
}
interface Release {
  id: string; name: string; version: string; status: string; releaseDate: Date | null;
  changelog: string; features: string;
}
interface RoadmapItem {
  id: string; title: string; quarter: string; status: string; startDate: Date | null;
  endDate: Date | null; color: string; position: number;
}
interface Stats {
  totalIdeas: number;
  ideasByStatus: Record<string, number>;
  releases: { total: number; byStatus: Record<string, number> };
  roadmap: { total: number; byStatus: Record<string, number> };
}

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  idea: 'default',
  backlog: 'info',
  planned: 'accent',
  in_progress: 'warning',
  shipped: 'success',
  rejected: 'danger',
  planned_rm: 'accent',
  at_risk: 'warning',
  on_track: 'success',
  delayed: 'danger',
  done: 'success',
};

const releaseStatusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  planned: 'info',
  in_progress: 'warning',
  released: 'success',
  cancelled: 'danger',
};

function parseTags(raw: string): string[] {
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function ProductDashboard({
  organizationId,
  ideas: initialIdeas,
  releases: initialReleases,
  roadmap: initialRoadmap,
  stats,
}: {
  organizationId: string;
  ideas: FeatureIdea[];
  releases: Release[];
  roadmap: RoadmapItem[];
  stats: Stats;
}) {
  const [ideas] = useState(initialIdeas);
  const [releases] = useState(initialReleases);
  const [roadmap] = useState(initialRoadmap);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>(
    Object.fromEntries(ideas.map((i) => [i.id, i.votes])),
  );
  const [_, startTransition] = useTransition();
  void organizationId;
  void _;

  async function handleVote(id: string) {
    setVotingId(id);
    try {
      const res = await fetch(`/api/product/ideas/${id}/vote`, { method: 'POST' });
      const data = await res.json();
      if (data.idea) {
        startTransition(() => {
          setVoteCounts((prev) => ({ ...prev, [id]: data.idea.votes }));
        });
      }
    } finally {
      setVotingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Lightbulb className="h-3 w-3" /> Total Ideas
          </div>
          <div className="text-2xl font-semibold">{stats.totalIdeas}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Rocket className="h-3 w-3" /> Releases
          </div>
          <div className="text-2xl font-semibold">{stats.releases.total}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Map className="h-3 w-3" /> Roadmap Items
          </div>
          <div className="text-2xl font-semibold">{stats.roadmap.total}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <TrendingUp className="h-3 w-3" /> Shipped
          </div>
          <div className="text-2xl font-semibold">{stats.ideasByStatus.shipped || 0}</div>
        </Card>
      </div>

      {/* Idea Backlog */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="heading-display text-lg flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-accent-primary" /> Idea Backlog
          </h2>
          <Button size="sm" href="/api/product/ideas">
            <Plus className="h-4 w-4" /> New Idea
          </Button>
        </div>
        {ideas.length === 0 ? (
          <Card className="p-6">
            <EmptyState
              icon={Lightbulb}
              title="No ideas yet"
              description="Submit your first feature idea to start collecting votes."
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {ideas.map((idea) => (
              <Card key={idea.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-sm font-semibold block truncate pr-2">{idea.title}</span>
                  <Badge variant={statusVariant[idea.status] || 'default'} className="text-xs shrink-0">{idea.status}</Badge>
                </div>
                {idea.description && (
                  <p className="text-xs text-fg-secondary mb-3 line-clamp-2">{idea.description}</p>
                )}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge variant="default" className="text-xs">{idea.category}</Badge>
                  <Badge variant={idea.priority === 'critical' ? 'danger' : idea.priority === 'high' ? 'warning' : 'default'} className="text-xs">{idea.priority}</Badge>
                  {parseTags(idea.tags).slice(0, 2).map((tag) => (
                    <span key={tag} className="text-xs text-fg-muted flex items-center gap-0.5">
                      <Tag className="h-3 w-3" /> {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-fg-muted">
                    <span>Impact: {idea.impact}/5</span>
                    <span>·</span>
                    <span>Effort: {idea.effort}/5</span>
                  </div>
                  <button
                    onClick={() => handleVote(idea.id)}
                    disabled={votingId === idea.id}
                    className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg hover:bg-surface-alt transition-colors disabled:opacity-50"
                  >
                    <ThumbsUp className="h-3 w-3" /> {voteCounts[idea.id] ?? idea.votes}
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Roadmap Timeline */}
      <div>
        <h2 className="heading-display text-lg mb-3 flex items-center gap-2">
          <Map className="h-5 w-5 text-accent-primary" /> Roadmap
        </h2>
        {roadmap.length === 0 ? (
          <Card className="p-6">
            <EmptyState icon={Map} title="No roadmap items" description="Plan your quarters by adding roadmap items." />
          </Card>
        ) : (
          <div className="space-y-2">
            {roadmap.map((item) => (
              <Card key={item.id} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    {item.color && (
                      <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    )}
                    <span className="text-sm font-semibold truncate">{item.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.quarter && (
                      <span className="text-xs text-fg-secondary flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {item.quarter}
                      </span>
                    )}
                    <Badge variant={statusVariant[item.status] || 'default'} className="text-xs">{item.status}</Badge>
                  </div>
                </div>
                {item.startDate && item.endDate && (
                  <div className="text-xs text-fg-muted mt-2">
                    {new Date(item.startDate).toLocaleDateString()} — {new Date(item.endDate).toLocaleDateString()}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Releases */}
      <div>
        <h2 className="heading-display text-lg mb-3 flex items-center gap-2">
          <Rocket className="h-5 w-5 text-accent-primary" /> Releases
        </h2>
        {releases.length === 0 ? (
          <Card className="p-6">
            <EmptyState icon={Rocket} title="No releases yet" description="Plan your first release to track shipped features." />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {releases.map((release) => {
              const featureCount = parseTags(release.features).length;
              return (
                <Card key={release.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-sm font-semibold">{release.name}</span>
                      {release.version && (
                        <span className="text-xs text-fg-secondary ml-2">v{release.version}</span>
                      )}
                    </div>
                    <Badge variant={releaseStatusVariant[release.status] || 'default'} className="text-xs">{release.status}</Badge>
                  </div>
                  {release.releaseDate && (
                    <div className="text-xs text-fg-muted mb-2 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {new Date(release.releaseDate).toLocaleDateString()}
                    </div>
                  )}
                  <div className="text-xs text-fg-secondary">
                    {featureCount} feature{featureCount !== 1 ? 's' : ''}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
