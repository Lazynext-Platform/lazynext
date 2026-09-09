'use client';

import { useState, useMemo } from 'react';
import {
  Crown, Users, TrendingUp, ClipboardCheck, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  SuccessionPlan, SuccessionCandidate, SuccessionTrack, SuccessionReview,
  ManagementSuccessionMetrics, ManagementSuccessionStats,
} from '@/lib/services/management-succession-service';

type TabId = 'overview' | 'plans' | 'candidates' | 'tracks' | 'reviews';

interface ManagementSuccessionDashboardProps {
  organizationId: string;
  plans: SuccessionPlan[];
  candidates: SuccessionCandidate[];
  tracks: SuccessionTrack[];
  reviews: SuccessionReview[];
  metrics: ManagementSuccessionMetrics;
  stats: ManagementSuccessionStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['completed', 'approved', 'executed', 'ready', 'ready_now', 'placed'].includes(status)) return 'success';
  if (['draft', 'active', 'under_review', 'identified', 'in_development', 'planned', 'in_progress', 'scheduled'].includes(status)) return 'warning';
  if (['cancelled', 'archived', 'overdue', 'not_ready', 'withdrawn', 'paused'].includes(status)) return 'danger';
  return 'info';
};

const rankVariant = (rank: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (rank === 'tier1') return 'success';
  if (rank === 'tier2') return 'info';
  if (rank === 'tier3') return 'warning';
  return 'default';
};

export function ManagementSuccessionDashboard({
  plans, candidates, tracks, reviews, metrics, stats,
}: ManagementSuccessionDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const planTitle = (id: string) => plans.find((p) => p.id === id)?.title || id;
  const candidateName = (id: string) => candidates.find((c) => c.id === id)?.name || id;

  const filteredPlans = useMemo(() => {
    if (!search) return plans;
    const q = search.toLowerCase();
    return plans.filter(
      (p) => p.title.toLowerCase().includes(q) || p.type.toLowerCase().includes(q) || p.status.toLowerCase().includes(q),
    );
  }, [plans, search]);

  const filteredCandidates = useMemo(() => {
    if (!search) return candidates;
    const q = search.toLowerCase();
    return candidates.filter(
      (c) => c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q) || c.status.toLowerCase().includes(q),
    );
  }, [candidates, search]);

  const filteredTracks = useMemo(() => {
    if (!search) return tracks;
    const q = search.toLowerCase();
    return tracks.filter(
      (t) => t.type.toLowerCase().includes(q) || t.status.toLowerCase().includes(q) || candidateName(t.candidateId).toLowerCase().includes(q),
    );
  }, [tracks, search, candidates]);

  const filteredReviews = useMemo(() => {
    if (!search) return reviews;
    const q = search.toLowerCase();
    return reviews.filter(
      (r) => r.type.toLowerCase().includes(q) || r.status.toLowerCase().includes(q) || planTitle(r.planId).toLowerCase().includes(q),
    );
  }, [reviews, search, plans]);

  const tabs: { id: TabId; label: string; icon: typeof Crown }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'plans', label: 'Plans', icon: Crown },
    { id: 'candidates', label: 'Candidates', icon: Users },
    { id: 'tracks', label: 'Tracks', icon: TrendingUp },
    { id: 'reviews', label: 'Reviews', icon: ClipboardCheck },
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
              <div className="text-xs text-fg-tertiary">Active Plans</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activePlans}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Ready Candidates</div>
              <div className="mt-1 text-2xl font-bold">{metrics.readyCandidates}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Ready Now</div>
              <div className="mt-1 text-2xl font-bold">{metrics.readyNowCandidates}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">In-Progress Tracks</div>
              <div className="mt-1 text-2xl font-bold">{metrics.inProgressTracks}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Overdue Reviews</div>
              <div className="mt-1 text-2xl font-bold">{metrics.overdueReviews}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Plan Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byPlanType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
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

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Candidate Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byCandidateStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Candidate Rank Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byCandidateRank).map(([rank, count]) => (
                <Badge key={rank} variant={rankVariant(rank)}>{rank}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Track Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byTrackStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
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
        </div>
      )}

      {tab === 'plans' && (
        <div className="space-y-3">
          {filteredPlans.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Crown} title="No succession plans" description="Succession plans will appear here." /></Card>
          ) : (
            filteredPlans.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.title}</div>
                    <div className="text-sm text-fg-secondary">{p.type.replace('_', ' ')} · {p.roleTitle || 'Unassigned'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.priority && <Badge variant="default">{p.priority}</Badge>}
                    <Badge variant={statusVariant(p.status)}>{p.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'candidates' && (
        <div className="space-y-3">
          {filteredCandidates.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Users} title="No candidates" description="Succession candidates will appear here." /></Card>
          ) : (
            filteredCandidates.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-sm text-fg-secondary">{c.type.replace('_', ' ')} · {c.currentRole || 'Unknown role'} → {c.targetRole || 'TBD'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={rankVariant(c.rank)}>{c.rank}</Badge>
                    <Badge variant="default">{c.readinessLevel}%</Badge>
                    <Badge variant={statusVariant(c.status)}>{c.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'tracks' && (
        <div className="space-y-3">
          {filteredTracks.length === 0 ? (
            <Card className="p-8"><EmptyState icon={TrendingUp} title="No tracks" description="Development tracks will appear here." /></Card>
          ) : (
            filteredTracks.map((t) => (
              <Card key={t.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{t.type.replace('_', ' ')} Track</div>
                    <div className="text-sm text-fg-secondary">{candidateName(t.candidateId)} · {t.startDate ? new Date(t.startDate).toLocaleDateString() : 'No start date'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.milestones.length > 0 && <Badge variant="default">{t.milestones.length} milestones</Badge>}
                    <Badge variant={statusVariant(t.status)}>{t.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'reviews' && (
        <div className="space-y-3">
          {filteredReviews.length === 0 ? (
            <Card className="p-8"><EmptyState icon={ClipboardCheck} title="No reviews" description="Succession reviews will appear here." /></Card>
          ) : (
            filteredReviews.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{r.type.replace('_', ' ')} Review</div>
                    <div className="text-sm text-fg-secondary">{planTitle(r.planId)} · {r.reviewer || 'Unassigned'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.scheduledDate && <Badge variant="default">{new Date(r.scheduledDate).toLocaleDateString()}</Badge>}
                    <Badge variant={statusVariant(r.status)}>{r.status.replace('_', ' ')}</Badge>
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
