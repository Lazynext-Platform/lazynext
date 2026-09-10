'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  BookOpen, Users, Calendar, Target, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  KtArticle, Mentorship, KtSession, TransferPlan,
  KnowledgeTransferMetrics, KnowledgeTransferStats,
  ArticleStatus, MentorshipStatus, SessionStatus, PlanStatus, PlanPriority,
} from '@/lib/services/knowledge-transfer-service';

type TabId = 'overview' | 'articles' | 'mentorships' | 'sessions' | 'plans';

interface KnowledgeTransferDashboardProps {
  organizationId: string;
  articles: KtArticle[];
  mentorships: Mentorship[];
  sessions: KtSession[];
  plans: TransferPlan[];
  metrics: KnowledgeTransferMetrics;
  stats: KnowledgeTransferStats;
}

const articleStatusVariant = (status: ArticleStatus): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (status === 'published') return 'success';
  if (status === 'draft' || status === 'in_review') return 'warning';
  if (status === 'archived' || status === 'outdated') return 'danger';
  return 'info';
};

const mentorshipStatusVariant = (status: MentorshipStatus): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (status === 'completed') return 'success';
  if (status === 'active') return 'warning';
  if (status === 'cancelled') return 'danger';
  if (status === 'on_hold') return 'info';
  return 'default';
};

const sessionStatusVariant = (status: SessionStatus): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (status === 'completed') return 'success';
  if (status === 'scheduled' || status === 'in_progress') return 'warning';
  if (status === 'cancelled' || status === 'postponed') return 'danger';
  return 'info';
};

const planStatusVariant = (status: PlanStatus): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (status === 'completed') return 'success';
  if (status === 'active' || status === 'draft') return 'warning';
  if (status === 'cancelled') return 'danger';
  return 'info';
};

const priorityVariant = (priority: PlanPriority): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (priority === 'low') return 'info';
  if (priority === 'medium') return 'warning';
  if (priority === 'high') return 'danger';
  if (priority === 'critical') return 'danger';
  return 'default';
};

export function KnowledgeTransferDashboard({
  articles, mentorships, sessions, plans, metrics, stats,
}: KnowledgeTransferDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const mentorshipLabel = useCallback(
    (id: string) => mentorships.find((m) => m.id === id)?.menteeName || id,
    [mentorships],
  );

  const filteredArticles = useMemo(() => {
    if (!search) return articles;
    const q = search.toLowerCase();
    return articles.filter(
      (a) => a.title.toLowerCase().includes(q) || a.type.toLowerCase().includes(q) || a.status.toLowerCase().includes(q) || a.author.toLowerCase().includes(q),
    );
  }, [articles, search]);

  const filteredMentorships = useMemo(() => {
    if (!search) return mentorships;
    const q = search.toLowerCase();
    return mentorships.filter(
      (m) => m.mentorName.toLowerCase().includes(q) || m.menteeName.toLowerCase().includes(q) || m.status.toLowerCase().includes(q) || m.department.toLowerCase().includes(q),
    );
  }, [mentorships, search]);

  const filteredSessions = useMemo(() => {
    if (!search) return sessions;
    const q = search.toLowerCase();
    return sessions.filter(
      (s) => s.title.toLowerCase().includes(q) || s.type.toLowerCase().includes(q) || s.status.toLowerCase().includes(q) || mentorshipLabel(s.mentorshipId ?? '').toLowerCase().includes(q),
    );
  }, [sessions, search, mentorshipLabel]);

  const filteredPlans = useMemo(() => {
    if (!search) return plans;
    const q = search.toLowerCase();
    return plans.filter(
      (p) => p.title.toLowerCase().includes(q) || p.status.toLowerCase().includes(q) || p.priority.toLowerCase().includes(q) || p.owner.toLowerCase().includes(q),
    );
  }, [plans, search]);

  const tabs: { id: TabId; label: string; icon: typeof BookOpen }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'articles', label: 'Articles', icon: BookOpen },
    { id: 'mentorships', label: 'Mentorships', icon: Users },
    { id: 'sessions', label: 'Sessions', icon: Calendar },
    { id: 'plans', label: 'Plans', icon: Target },
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
              <div className="text-xs text-fg-tertiary">Published Articles</div>
              <div className="mt-1 text-2xl font-bold">{metrics.publishedArticles}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Mentorships</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeMentorships}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Scheduled Sessions</div>
              <div className="mt-1 text-2xl font-bold">{metrics.scheduledSessions}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Plans</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activePlans}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Completion Rate</div>
              <div className="mt-1 text-2xl font-bold">{metrics.completionRate}%</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Article Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byArticleType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Article Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byArticleStatus).map(([status, count]) => (
                <Badge key={status} variant="info">{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Mentorship Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byMentorshipStatus).map(([status, count]) => (
                <Badge key={status} variant="info">{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Plan Priority Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byPlanPriority).map(([priority, count]) => (
                <Badge key={priority} variant={priorityVariant(priority as PlanPriority)}>{priority}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'articles' && (
        <div className="space-y-3">
          {filteredArticles.length === 0 ? (
            <Card className="p-8"><EmptyState icon={BookOpen} title="No articles" description="Knowledge articles will appear here." /></Card>
          ) : (
            filteredArticles.map((a) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{a.title}</div>
                    <div className="text-sm text-fg-secondary">{a.type.replace('_', ' ')} · {a.author || 'Unknown'} · v{a.version}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.department && <Badge variant="default">{a.department}</Badge>}
                    <Badge variant={articleStatusVariant(a.status)}>{a.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'mentorships' && (
        <div className="space-y-3">
          {filteredMentorships.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Users} title="No mentorships" description="Mentorship relationships will appear here." /></Card>
          ) : (
            filteredMentorships.map((m) => (
              <Card key={m.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{m.mentorName} → {m.menteeName}</div>
                    <div className="text-sm text-fg-secondary">{m.department || 'No department'} · {m.startDate ? new Date(m.startDate).toLocaleDateString() : 'No start date'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={mentorshipStatusVariant(m.status)}>{m.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'sessions' && (
        <div className="space-y-3">
          {filteredSessions.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Calendar} title="No sessions" description="Transfer sessions will appear here." /></Card>
          ) : (
            filteredSessions.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{s.title}</div>
                    <div className="text-sm text-fg-secondary">{s.type.replace('_', ' ')} · {s.mentorshipId ? mentorshipLabel(s.mentorshipId) : 'Standalone'} · {s.scheduledDate ? new Date(s.scheduledDate).toLocaleDateString() : 'Unscheduled'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.duration > 0 && <Badge variant="default">{s.duration}m</Badge>}
                    <Badge variant={sessionStatusVariant(s.status)}>{s.status}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'plans' && (
        <div className="space-y-3">
          {filteredPlans.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Target} title="No plans" description="Transfer plans will appear here." /></Card>
          ) : (
            filteredPlans.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.title}</div>
                    <div className="text-sm text-fg-secondary">{p.owner || 'Unassigned'} · {p.sourcePerson} → {p.targetPerson}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">{p.progress}%</Badge>
                    <Badge variant={priorityVariant(p.priority)}>{p.priority}</Badge>
                    <Badge variant={planStatusVariant(p.status)}>{p.status}</Badge>
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
