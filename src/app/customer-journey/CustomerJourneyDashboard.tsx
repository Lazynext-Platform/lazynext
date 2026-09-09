'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Map, Route, MousePointerClick, Star, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  JourneyMap, JourneyStage, Touchpoint, ExperienceScore,
  CustomerJourneyMetrics, CustomerJourneyStats,
  JourneyStatus, TouchpointStatus, ScoreStatus,
} from '@/lib/services/customer-journey-service';

type TabId = 'overview' | 'journeys' | 'stages' | 'touchpoints' | 'scores';

interface CustomerJourneyDashboardProps {
  organizationId: string;
  journeys: JourneyMap[];
  stages: JourneyStage[];
  touchpoints: Touchpoint[];
  scores: ExperienceScore[];
  metrics: CustomerJourneyMetrics;
  stats: CustomerJourneyStats;
}

const journeyStatusVariant = (status: JourneyStatus): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (status === 'active') return 'success';
  if (status === 'under_review') return 'warning';
  if (status === 'archived') return 'default';
  return 'info';
};

const touchpointStatusVariant = (status: TouchpointStatus): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (status === 'active') return 'success';
  if (status === 'planned') return 'warning';
  if (status === 'deprecated') return 'danger';
  return 'default';
};

const scoreStatusVariant = (status: ScoreStatus): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (status === 'actioned') return 'success';
  if (status === 'analyzed') return 'info';
  if (status === 'pending') return 'warning';
  return 'default';
};

export function CustomerJourneyDashboard({
  journeys, stages, touchpoints, scores, metrics, stats,
}: CustomerJourneyDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const journeyTitle = useCallback(
    (id: string) => journeys.find((j) => j.id === id)?.title || id,
    [journeys],
  );

  const stageName = useCallback(
    (id: string | null) => (id ? stages.find((s) => s.id === id)?.name || id : 'Unassigned'),
    [stages],
  );

  const filteredJourneys = useMemo(() => {
    if (!search) return journeys;
    const q = search.toLowerCase();
    return journeys.filter(
      (j) => j.title.toLowerCase().includes(q) || j.status.toLowerCase().includes(q) || j.persona.toLowerCase().includes(q),
    );
  }, [journeys, search]);

  const filteredStages = useMemo(() => {
    if (!search) return stages;
    const q = search.toLowerCase();
    return stages.filter(
      (s) => s.name.toLowerCase().includes(q) || s.type.toLowerCase().includes(q) || journeyTitle(s.journeyId).toLowerCase().includes(q),
    );
  }, [stages, search, journeyTitle]);

  const filteredTouchpoints = useMemo(() => {
    if (!search) return touchpoints;
    const q = search.toLowerCase();
    return touchpoints.filter(
      (t) => t.name.toLowerCase().includes(q) || t.type.toLowerCase().includes(q) || t.status.toLowerCase().includes(q),
    );
  }, [touchpoints, search]);

  const filteredScores = useMemo(() => {
    if (!search) return scores;
    const q = search.toLowerCase();
    return scores.filter(
      (s) => s.type.toLowerCase().includes(q) || s.status.toLowerCase().includes(q) || s.respondentName.toLowerCase().includes(q),
    );
  }, [scores, search]);

  const tabs: { id: TabId; label: string; icon: typeof Map }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'journeys', label: 'Journeys', icon: Map },
    { id: 'stages', label: 'Stages', icon: Route },
    { id: 'touchpoints', label: 'Touchpoints', icon: MousePointerClick },
    { id: 'scores', label: 'Scores', icon: Star },
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
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Journeys</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeJourneys}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Total Touchpoints</div>
              <div className="mt-1 text-2xl font-bold">{metrics.totalTouchpoints}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Average Score</div>
              <div className="mt-1 text-2xl font-bold">{metrics.averageScore}%</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Stages Coverage</div>
              <div className="mt-1 text-2xl font-bold">{metrics.stagesCoverage}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Journey Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byJourneyStatus).map(([status, count]) => (
                <Badge key={status} variant={journeyStatusVariant(status as JourneyStatus)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Stage Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byStageType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Touchpoint Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byTouchpointType).map(([type, count]) => (
                <Badge key={type} variant="default">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Score Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byScoreStatus).map(([status, count]) => (
                <Badge key={status} variant={scoreStatusVariant(status as ScoreStatus)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'journeys' && (
        <div className="space-y-3">
          {filteredJourneys.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Map} title="No journeys" description="Customer journey maps will appear here." /></Card>
          ) : (
            filteredJourneys.map((j) => (
              <Card key={j.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{j.title}</div>
                    <div className="text-sm text-fg-secondary">{j.persona || 'No persona'} · {j.owner || 'Unassigned'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {j.startDate && <Badge variant="default">{new Date(j.startDate).toLocaleDateString()}</Badge>}
                    <Badge variant={journeyStatusVariant(j.status)}>{j.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'stages' && (
        <div className="space-y-3">
          {filteredStages.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Route} title="No stages" description="Journey stages will appear here." /></Card>
          ) : (
            filteredStages.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-sm text-fg-secondary">{journeyTitle(s.journeyId)} · {s.type.replace('_', ' ')}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">Order {s.order}</Badge>
                    <Badge variant="info">{s.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'touchpoints' && (
        <div className="space-y-3">
          {filteredTouchpoints.length === 0 ? (
            <Card className="p-8"><EmptyState icon={MousePointerClick} title="No touchpoints" description="Customer touchpoints will appear here." /></Card>
          ) : (
            filteredTouchpoints.map((t) => (
              <Card key={t.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-sm text-fg-secondary">{journeyTitle(t.journeyId)} · {stageName(t.stageId)} · {t.type.replace('_', ' ')}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.channel && <Badge variant="default">{t.channel}</Badge>}
                    <Badge variant={touchpointStatusVariant(t.status)}>{t.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'scores' && (
        <div className="space-y-3">
          {filteredScores.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Star} title="No scores" description="Experience scores will appear here." /></Card>
          ) : (
            filteredScores.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{s.type.toUpperCase()} · {s.value}/{s.maxValue}</div>
                    <div className="text-sm text-fg-secondary">{s.respondentName || 'Anonymous'} · {s.comment || 'No comment'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.collectedDate && <Badge variant="default">{new Date(s.collectedDate).toLocaleDateString()}</Badge>}
                    <Badge variant={scoreStatusVariant(s.status)}>{s.status.replace('_', ' ')}</Badge>
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
