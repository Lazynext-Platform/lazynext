'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  ClipboardCheck, Target, MessageSquare, TrendingUp,
  Search, BarChart3,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  PerfReview, PerfGoal, PerfFeedback, DevelopmentPlan,
  PerformanceManagementMetrics, PerformanceManagementStats,
} from '@/lib/services/performance-management-service';

type TabId = 'overview' | 'reviews' | 'goals' | 'feedback' | 'plans';

interface PerformanceManagementDashboardProps {
  organizationId: string;
  reviews: PerfReview[];
  goals: PerfGoal[];
  feedback: PerfFeedback[];
  plans: DevelopmentPlan[];
  metrics: PerformanceManagementMetrics;
  stats: PerformanceManagementStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['completed', 'achieved', 'actioned', 'acknowledged', 'active'].includes(status)) return 'success';
  if (['draft', 'sent', 'in_progress', 'submitted', 'not_started', 'pending', 'delivered'].includes(status)) return 'warning';
  if (['cancelled', 'missed', 'on_hold'].includes(status)) return 'danger';
  return 'info';
};

const ratingVariant = (rating: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (rating === 'exceeds') return 'success';
  if (rating === 'meets') return 'info';
  if (rating === 'below') return 'warning';
  if (rating === 'unsatisfactory') return 'danger';
  return 'default';
};

const priorityVariant = (priority: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (priority === 'low') return 'info';
  if (priority === 'medium') return 'warning';
  if (priority === 'high') return 'danger';
  if (priority === 'critical') return 'danger';
  return 'default';
};

export function PerformanceManagementDashboard({
  reviews, goals, feedback, plans, metrics, stats,
}: PerformanceManagementDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const employeeName = useCallback(
    (id: string) => reviews.find((r) => r.employeeId === id)?.employeeName || id,
    [reviews],
  );

  const filteredReviews = useMemo(() => {
    if (!search) return reviews;
    const q = search.toLowerCase();
    return reviews.filter(
      (r) => r.employeeName.toLowerCase().includes(q) || r.type.toLowerCase().includes(q) || r.status.toLowerCase().includes(q),
    );
  }, [reviews, search]);

  const filteredGoals = useMemo(() => {
    if (!search) return goals;
    const q = search.toLowerCase();
    return goals.filter(
      (g) => g.title.toLowerCase().includes(q) || g.type.toLowerCase().includes(q) || g.status.toLowerCase().includes(q),
    );
  }, [goals, search]);

  const filteredFeedback = useMemo(() => {
    if (!search) return feedback;
    const q = search.toLowerCase();
    return feedback.filter(
      (f) => f.title.toLowerCase().includes(q) || f.type.toLowerCase().includes(q) || f.status.toLowerCase().includes(q),
    );
  }, [feedback, search]);

  const filteredPlans = useMemo(() => {
    if (!search) return plans;
    const q = search.toLowerCase();
    return plans.filter(
      (p) => p.title.toLowerCase().includes(q) || p.type.toLowerCase().includes(q) || p.status.toLowerCase().includes(q),
    );
  }, [plans, search]);

  const tabs: { id: TabId; label: string; icon: typeof ClipboardCheck }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'reviews', label: 'Reviews', icon: ClipboardCheck },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'feedback', label: 'Feedback', icon: MessageSquare },
    { id: 'plans', label: 'Development Plans', icon: TrendingUp },
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
              <div className="text-xs text-fg-tertiary">Active Reviews</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeReviews}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Completed Reviews</div>
              <div className="mt-1 text-2xl font-bold">{metrics.completedReviews}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Goals</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeGoals}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Achieved Goals</div>
              <div className="mt-1 text-2xl font-bold">{metrics.achievedGoals}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Pending Feedback</div>
              <div className="mt-1 text-2xl font-bold">{metrics.pendingFeedback}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Review Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byReviewType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Review Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byReviewStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Goal Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byGoalStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Feedback Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byFeedbackStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Plan Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byPlanStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'reviews' && (
        <div className="space-y-3">
          {filteredReviews.length === 0 ? (
            <Card className="p-8"><EmptyState icon={ClipboardCheck} title="No reviews" description="Performance reviews will appear here." /></Card>
          ) : (
            filteredReviews.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{r.employeeName}</div>
                    <div className="text-sm text-fg-secondary">{r.type.replace('_', ' ')} · {r.period || 'No period'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.rating !== 'not_applicable' && <Badge variant={ratingVariant(r.rating)}>{r.rating}</Badge>}
                    <Badge variant={statusVariant(r.status)}>{r.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'goals' && (
        <div className="space-y-3">
          {filteredGoals.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Target} title="No goals" description="Performance goals will appear here." /></Card>
          ) : (
            filteredGoals.map((g) => (
              <Card key={g.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{g.title}</div>
                    <div className="text-sm text-fg-secondary">{g.employeeName} · {g.type.replace('_', ' ')}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={priorityVariant(g.priority)}>{g.priority}</Badge>
                    {g.progress > 0 && <Badge variant="default">{g.progress}%</Badge>}
                    <Badge variant={statusVariant(g.status)}>{g.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'feedback' && (
        <div className="space-y-3">
          {filteredFeedback.length === 0 ? (
            <Card className="p-8"><EmptyState icon={MessageSquare} title="No feedback" description="Feedback entries will appear here." /></Card>
          ) : (
            filteredFeedback.map((f) => (
              <Card key={f.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{f.title || f.type.replace('_', ' ')}</div>
                    <div className="text-sm text-fg-secondary">{f.employeeName} · {f.givenBy || 'Anonymous'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">{f.type.replace('_', ' ')}</Badge>
                    <Badge variant={statusVariant(f.status)}>{f.status.replace('_', ' ')}</Badge>
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
            <Card className="p-8"><EmptyState icon={TrendingUp} title="No development plans" description="Development plans will appear here." /></Card>
          ) : (
            filteredPlans.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.title}</div>
                    <div className="text-sm text-fg-secondary">{p.employeeName} · {p.type.replace('_', ' ')}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.progress > 0 && <Badge variant="default">{p.progress}%</Badge>}
                    <Badge variant={statusVariant(p.status)}>{p.status.replace('_', ' ')}</Badge>
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
