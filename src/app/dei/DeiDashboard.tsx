'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Heart, BarChart3, GraduationCap, Target,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  DeiInitiative, DeiMetric, DeiTraining, DeiGoal,
  DeiMetrics, DeiStats,
} from '@/lib/services/dei-service';

type TabId = 'overview' | 'initiatives' | 'metrics' | 'training' | 'goals';

interface DeiDashboardProps {
  organizationId: string;
  initiatives: DeiInitiative[];
  deiMetrics: DeiMetric[];
  trainings: DeiTraining[];
  goals: DeiGoal[];
  metrics: DeiMetrics;
  stats: DeiStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['active', 'completed', 'achieved'].includes(status)) return 'success';
  if (['planning', 'scheduled', 'on_track', 'in_progress'].includes(status)) return 'warning';
  if (['discontinued', 'cancelled', 'missed', 'behind'].includes(status)) return 'danger';
  if (['paused', 'at_risk'].includes(status)) return 'info';
  return 'default';
};

export function DeiDashboard({
  initiatives, deiMetrics, trainings, goals, metrics, stats,
}: DeiDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const initiativeName = useCallback(
    (id: string) => initiatives.find((i) => i.id === id)?.name || id,
    [initiatives],
  );

  const filteredInitiatives = useMemo(() => {
    if (!search) return initiatives;
    const q = search.toLowerCase();
    return initiatives.filter(
      (i) => i.name.toLowerCase().includes(q) || i.type.toLowerCase().includes(q) || i.status.toLowerCase().includes(q),
    );
  }, [initiatives, search]);

  const filteredMetrics = useMemo(() => {
    if (!search) return deiMetrics;
    const q = search.toLowerCase();
    return deiMetrics.filter(
      (m) => m.metricName.toLowerCase().includes(q) || m.category.toLowerCase().includes(q) || m.periodLabel.toLowerCase().includes(q),
    );
  }, [deiMetrics, search]);

  const filteredTrainings = useMemo(() => {
    if (!search) return trainings;
    const q = search.toLowerCase();
    return trainings.filter(
      (t) => t.title.toLowerCase().includes(q) || t.facilitator.toLowerCase().includes(q) || t.status.toLowerCase().includes(q),
    );
  }, [trainings, search]);

  const filteredGoals = useMemo(() => {
    if (!search) return goals;
    const q = search.toLowerCase();
    return goals.filter(
      (g) => g.title.toLowerCase().includes(q) || g.type.toLowerCase().includes(q) || g.status.toLowerCase().includes(q),
    );
  }, [goals, search]);

  const tabs: { id: TabId; label: string; icon: typeof Heart }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'initiatives', label: 'Initiatives', icon: Heart },
    { id: 'metrics', label: 'Metrics', icon: BarChart3 },
    { id: 'training', label: 'Training', icon: GraduationCap },
    { id: 'goals', label: 'Goals', icon: Target },
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
              <div className="text-xs text-fg-tertiary">Active Initiatives</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeInitiatives}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Training Completion</div>
              <div className="mt-1 text-2xl font-bold">{metrics.trainingCompletion}%</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Goal Progress</div>
              <div className="mt-1 text-2xl font-bold">{metrics.goalProgress}%</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Achieved Goals</div>
              <div className="mt-1 text-2xl font-bold">{stats.achievedGoalCount}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Initiative Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byInitiativeType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
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
        </div>
      )}

      {tab === 'initiatives' && (
        <div className="space-y-3">
          {filteredInitiatives.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Heart} title="No initiatives" description="DEI initiatives will appear here." /></Card>
          ) : (
            filteredInitiatives.map((i) => (
              <Card key={i.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{i.name}</div>
                    <div className="text-sm text-fg-secondary">{i.type.replace('_', ' ')} · {i.owner}</div>
                  </div>
                  <Badge variant={statusVariant(i.status)}>{i.status}</Badge>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'metrics' && (
        <div className="space-y-3">
          {filteredMetrics.length === 0 ? (
            <Card className="p-8"><EmptyState icon={BarChart3} title="No metrics" description="DEI metrics will appear here." /></Card>
          ) : (
            filteredMetrics.map((m) => (
              <Card key={m.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{m.metricName}</div>
                    <div className="text-sm text-fg-secondary">{m.category.replace('_', ' ')} · {m.periodLabel}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">{m.value}{m.unit}</Badge>
                    {m.target > 0 && <Badge variant="info">Target: {m.target}{m.unit}</Badge>}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'training' && (
        <div className="space-y-3">
          {filteredTrainings.length === 0 ? (
            <Card className="p-8"><EmptyState icon={GraduationCap} title="No trainings" description="DEI trainings will appear here." /></Card>
          ) : (
            filteredTrainings.map((t) => (
              <Card key={t.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{t.title}</div>
                    <div className="text-sm text-fg-secondary">{t.facilitator} · {t.audience}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.completionRate > 0 && <Badge variant="default">{t.completionRate}%</Badge>}
                    <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
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
            <Card className="p-8"><EmptyState icon={Target} title="No goals" description="DEI goals will appear here." /></Card>
          ) : (
            filteredGoals.map((g) => (
              <Card key={g.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{g.title}</div>
                    <div className="text-sm text-fg-secondary">{g.type.replace('_', ' ')} · {g.currentValue}/{g.targetValue}{g.unit}</div>
                  </div>
                  <Badge variant={statusVariant(g.status)}>{g.status.replace('_', ' ')}</Badge>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
