'use client';

import { useState, useMemo } from 'react';
import {
  Sparkles, MessageSquare, ListChecks, Cpu, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  Recommendation, RecommendationFeedback, RecommendationAction, RecommendationModel,
  RecommendationEngineMetrics, RecommendationEngineStats,
} from '@/lib/services/recommendation-service';

type TabId = 'overview' | 'recommendations' | 'feedback' | 'actions' | 'models';

interface RecommendationDashboardProps {
  organizationId: string;
  recommendations: Recommendation[];
  feedback: RecommendationFeedback[];
  actions: RecommendationAction[];
  models: RecommendationModel[];
  metrics: RecommendationEngineMetrics;
  stats: RecommendationEngineStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['active', 'completed', 'verified', 'executed', 'preferred', 'allowed', 'achieved', 'accepted', 'acted', 'incorporated'].includes(status)) return 'success';
  if (['draft', 'pending', 'placed', 'scheduled', 'planned', 'set', 'submitted', 'under_review', 'generated', 'presented', 'calculated', 'reviewed', 'recorded', 'detected', 'evaluating', 'in_progress'].includes(status)) return 'warning';
  if (['cancelled', 'expired', 'terminated', 'deactivated', 'missed', 'failed', 'suspended', 'denied', 'rejected', 'revoked', 'deprecated', 'archived', 'dismissed', 'error'].includes(status)) return 'danger';
  return 'info';
};

export function RecommendationDashboard({
  recommendations, feedback, actions, models, metrics, stats,
}: RecommendationDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const filteredRecommendations = useMemo(() => {
    if (!search) return recommendations;
    const q = search.toLowerCase();
    return recommendations.filter(
      (r) => r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q) || r.status.toLowerCase().includes(q),
    );
  }, [recommendations, search]);

  const filteredFeedback = useMemo(() => {
    if (!search) return feedback;
    const q = search.toLowerCase();
    return feedback.filter(
      (f) => f.name.toLowerCase().includes(q) || f.type.toLowerCase().includes(q) || f.status.toLowerCase().includes(q),
    );
  }, [feedback, search]);

  const filteredActions = useMemo(() => {
    if (!search) return actions;
    const q = search.toLowerCase();
    return actions.filter(
      (a) => a.name.toLowerCase().includes(q) || a.type.toLowerCase().includes(q) || a.status.toLowerCase().includes(q),
    );
  }, [actions, search]);

  const filteredModels = useMemo(() => {
    if (!search) return models;
    const q = search.toLowerCase();
    return models.filter(
      (m) => m.name.toLowerCase().includes(q) || m.type.toLowerCase().includes(q) || m.status.toLowerCase().includes(q),
    );
  }, [models, search]);

  const tabs: { id: TabId; label: string; icon: typeof Sparkles }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'recommendations', label: 'Recommendations', icon: Sparkles },
    { id: 'feedback', label: 'Feedback', icon: MessageSquare },
    { id: 'actions', label: 'Actions', icon: ListChecks },
    { id: 'models', label: 'Models', icon: Cpu },
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
              <div className="text-xs text-fg-tertiary">Generated Recommendations</div>
              <div className="mt-1 text-2xl font-bold">{metrics.generatedRecommendations}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Accepted Recommendations</div>
              <div className="mt-1 text-2xl font-bold">{metrics.acceptedRecommendations}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Acted Recommendations</div>
              <div className="mt-1 text-2xl font-bold">{metrics.actedRecommendations}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Models</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeModels}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Avg Confidence</div>
              <div className="mt-1 text-2xl font-bold">{metrics.avgConfidence.toFixed(2)}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Recommendation Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byRecommendationType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Recommendation Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byRecommendationStatus).map(([status, count]) => (
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
            <h3 className="mb-4 text-sm font-semibold">Model Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byModelStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'recommendations' && (
        <div className="space-y-3">
          {filteredRecommendations.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Sparkles} title="No recommendations" description="Recommendations will appear here." /></Card>
          ) : (
            filteredRecommendations.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-sm text-fg-secondary">{r.type.replace('_', ' ')} · {r.priority || 'No priority'} · {r.confidence} confidence</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.target && <Badge variant="default">target: {r.target}</Badge>}
                    <Badge variant={statusVariant(r.status)}>{r.status.replace('_', ' ')}</Badge>
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
            <Card className="p-8"><EmptyState icon={MessageSquare} title="No feedback" description="Recommendation feedback will appear here." /></Card>
          ) : (
            filteredFeedback.map((f) => (
              <Card key={f.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{f.name}</div>
                    <div className="text-sm text-fg-secondary">{f.type.replace('_', ' ')} · rating: {f.rating} · {f.feedback || 'No feedback'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {f.userId && <Badge variant="default">user: {f.userId}</Badge>}
                    <Badge variant={statusVariant(f.status)}>{f.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'actions' && (
        <div className="space-y-3">
          {filteredActions.length === 0 ? (
            <Card className="p-8"><EmptyState icon={ListChecks} title="No actions" description="Recommendation actions will appear here." /></Card>
          ) : (
            filteredActions.map((a) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{a.name}</div>
                    <div className="text-sm text-fg-secondary">{a.type.replace('_', ' ')} · {a.action || 'No action'} · {a.assignee || 'Unassigned'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.recommendationId && <Badge variant="default">rec: {a.recommendationId}</Badge>}
                    <Badge variant={statusVariant(a.status)}>{a.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'models' && (
        <div className="space-y-3">
          {filteredModels.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Cpu} title="No recommendation models" description="Recommendation models will appear here." /></Card>
          ) : (
            filteredModels.map((m) => (
              <Card key={m.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{m.name}</div>
                    <div className="text-sm text-fg-secondary">{m.type.replace('_', ' ')} · v{m.version || '0.0.0'} · accuracy: {m.accuracy} · precision: {m.precision}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.recall > 0 && <Badge variant="default">recall: {m.recall}</Badge>}
                    <Badge variant={statusVariant(m.status)}>{m.status.replace('_', ' ')}</Badge>
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
