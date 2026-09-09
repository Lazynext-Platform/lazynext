'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Search, Target, Eye, Lightbulb, BarChart3,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  ResearchProject, MarketSegment, CompetitorAnalysis, ResearchInsight,
  MarketResearchMetrics, MarketResearchStats,
} from '@/lib/services/market-research-service';

type TabId = 'overview' | 'projects' | 'segments' | 'competitors' | 'insights';

interface MarketResearchDashboardProps {
  organizationId: string;
  projects: ResearchProject[];
  segments: MarketSegment[];
  competitors: CompetitorAnalysis[];
  insights: ResearchInsight[];
  metrics: MarketResearchMetrics;
  stats: MarketResearchStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['completed', 'validated', 'actioned', 'active'].includes(status)) return 'success';
  if (['planned', 'in_progress', 'on_hold', 'tracking', 'watching', 'new'].includes(status)) return 'warning';
  if (['cancelled', 'critical', 'archived', 'inactive'].includes(status)) return 'danger';
  return 'info';
};

const priorityVariant = (priority: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (priority === 'low') return 'info';
  if (priority === 'medium') return 'warning';
  if (priority === 'high') return 'danger';
  if (priority === 'critical') return 'danger';
  return 'default';
};

export function MarketResearchDashboard({
  projects, segments, competitors, insights, metrics, stats,
}: MarketResearchDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const projectName = useCallback(
    (id: string) => projects.find((p) => p.id === id)?.name || id,
    [projects],
  );

  const filteredProjects = useMemo(() => {
    if (!search) return projects;
    const q = search.toLowerCase();
    return projects.filter(
      (p) => p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q) || p.status.toLowerCase().includes(q),
    );
  }, [projects, search]);

  const filteredSegments = useMemo(() => {
    if (!search) return segments;
    const q = search.toLowerCase();
    return segments.filter(
      (s) => s.name.toLowerCase().includes(q) || s.type.toLowerCase().includes(q) || s.status.toLowerCase().includes(q),
    );
  }, [segments, search]);

  const filteredCompetitors = useMemo(() => {
    if (!search) return competitors;
    const q = search.toLowerCase();
    return competitors.filter(
      (c) => c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q) || c.status.toLowerCase().includes(q),
    );
  }, [competitors, search]);

  const filteredInsights = useMemo(() => {
    if (!search) return insights;
    const q = search.toLowerCase();
    return insights.filter(
      (i) => i.title.toLowerCase().includes(q) || i.type.toLowerCase().includes(q) || i.priority.toLowerCase().includes(q) || i.status.toLowerCase().includes(q),
    );
  }, [insights, search]);

  const tabs: { id: TabId; label: string; icon: typeof Search }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'projects', label: 'Projects', icon: Search },
    { id: 'segments', label: 'Segments', icon: Target },
    { id: 'competitors', label: 'Competitors', icon: Eye },
    { id: 'insights', label: 'Insights', icon: Lightbulb },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-accent-primary text-white' : 'bg-bg-secondary text-fg-secondary hover:bg-bg-tertiary'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab !== 'overview' && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-tertiary" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border-primary bg-bg-primary px-10 py-2 text-sm focus:border-accent-primary focus:outline-none"
          />
        </div>
      )}

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Projects</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeProjects}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Completed Projects</div>
              <div className="mt-1 text-2xl font-bold">{metrics.completedProjects}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Tracked Competitors</div>
              <div className="mt-1 text-2xl font-bold">{metrics.trackedCompetitors}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Segments</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeSegments}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">New Insights</div>
              <div className="mt-1 text-2xl font-bold">{metrics.newInsights}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Project Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byProjectType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Project Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byProjectStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Insight Priority Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byInsightPriority).map(([priority, count]) => (
                <Badge key={priority} variant={priorityVariant(priority)}>{priority}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Competitor Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byCompetitorType).map(([type, count]) => (
                <Badge key={type} variant="info">{type}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'projects' && (
        <div className="space-y-3">
          {filteredProjects.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Search} title="No research projects" description="Research projects will appear here." /></Card>
          ) : (
            filteredProjects.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-fg-secondary">{p.type.replace('_', ' ')} · {p.lead || 'Unassigned'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.budget > 0 && <Badge variant="default">${p.budget.toLocaleString()}</Badge>}
                    <Badge variant={statusVariant(p.status)}>{p.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'segments' && (
        <div className="space-y-3">
          {filteredSegments.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Target} title="No market segments" description="Market segments will appear here." /></Card>
          ) : (
            filteredSegments.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-sm text-fg-secondary">{s.type} · {s.size.toLocaleString()} members</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant(s.status)}>{s.status}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'competitors' && (
        <div className="space-y-3">
          {filteredCompetitors.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Eye} title="No competitors" description="Competitor analyses will appear here." /></Card>
          ) : (
            filteredCompetitors.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-sm text-fg-secondary">{c.type} · {c.marketShare}% market share</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'insights' && (
        <div className="space-y-3">
          {filteredInsights.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Lightbulb} title="No insights" description="Research insights will appear here." /></Card>
          ) : (
            filteredInsights.map((i) => (
              <Card key={i.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{i.title}</div>
                    <div className="text-sm text-fg-secondary">{i.type.replace('_', ' ')} · {i.projectId ? projectName(i.projectId) : 'No project'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={priorityVariant(i.priority)}>{i.priority}</Badge>
                    <Badge variant={statusVariant(i.status)}>{i.status}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
