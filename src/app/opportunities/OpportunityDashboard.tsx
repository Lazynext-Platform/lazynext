'use client';

import { useState, useMemo } from 'react';
import {
  Lightbulb, Target, Gauge, ScanLine, ListChecks, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  Opportunity, DetectionRule, OpportunityScore, OpportunityAction,
  OpportunityDetectionMetrics, OpportunityDetectionStats,
} from '@/lib/services/opportunity-service';

type TabId = 'overview' | 'opportunities' | 'rules' | 'scores' | 'actions';

interface OpportunityDashboardProps {
  organizationId: string;
  opportunities: Opportunity[];
  rules: DetectionRule[];
  scores: OpportunityScore[];
  actions: OpportunityAction[];
  metrics: OpportunityDetectionMetrics;
  stats: OpportunityDetectionStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['active', 'completed', 'verified', 'executed', 'preferred', 'allowed', 'achieved', 'approved', 'pursuing', 'realized'].includes(status)) return 'success';
  if (['draft', 'pending', 'placed', 'scheduled', 'planned', 'set', 'submitted', 'under_review', 'generated', 'presented', 'calculated', 'reviewed', 'recorded', 'detected', 'evaluating', 'in_progress'].includes(status)) return 'warning';
  if (['cancelled', 'expired', 'terminated', 'deactivated', 'missed', 'failed', 'suspended', 'denied', 'rejected', 'revoked', 'deprecated', 'archived', 'dismissed', 'error', 'paused'].includes(status)) return 'danger';
  return 'info';
};

export function OpportunityDashboard({
  opportunities, rules, scores, actions, metrics, stats,
}: OpportunityDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const filteredOpportunities = useMemo(() => {
    if (!search) return opportunities;
    const q = search.toLowerCase();
    return opportunities.filter(
      (o) => o.name.toLowerCase().includes(q) || o.type.toLowerCase().includes(q) || o.status.toLowerCase().includes(q),
    );
  }, [opportunities, search]);

  const filteredRules = useMemo(() => {
    if (!search) return rules;
    const q = search.toLowerCase();
    return rules.filter(
      (r) => r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q) || r.status.toLowerCase().includes(q),
    );
  }, [rules, search]);

  const filteredScores = useMemo(() => {
    if (!search) return scores;
    const q = search.toLowerCase();
    return scores.filter(
      (s) => s.name.toLowerCase().includes(q) || s.type.toLowerCase().includes(q) || s.status.toLowerCase().includes(q),
    );
  }, [scores, search]);

  const filteredActions = useMemo(() => {
    if (!search) return actions;
    const q = search.toLowerCase();
    return actions.filter(
      (a) => a.name.toLowerCase().includes(q) || a.type.toLowerCase().includes(q) || a.status.toLowerCase().includes(q),
    );
  }, [actions, search]);

  const tabs: { id: TabId; label: string; icon: typeof Lightbulb }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'opportunities', label: 'Opportunities', icon: Lightbulb },
    { id: 'rules', label: 'Rules', icon: ScanLine },
    { id: 'scores', label: 'Scores', icon: Gauge },
    { id: 'actions', label: 'Actions', icon: ListChecks },
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
              <div className="text-xs text-fg-tertiary">Detected Opportunities</div>
              <div className="mt-1 text-2xl font-bold">{metrics.detectedOpportunities}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Approved Opportunities</div>
              <div className="mt-1 text-2xl font-bold">{metrics.approvedOpportunities}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Pursuing Opportunities</div>
              <div className="mt-1 text-2xl font-bold">{metrics.pursuingOpportunities}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Realized Opportunities</div>
              <div className="mt-1 text-2xl font-bold">{metrics.realizedOpportunities}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Rules</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeRules}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Opportunity Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byOpportunityType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Opportunity Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byOpportunityStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Rule Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byRuleStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Action Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byActionStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'opportunities' && (
        <div className="space-y-3">
          {filteredOpportunities.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Lightbulb} title="No opportunities" description="Detected opportunities will appear here." /></Card>
          ) : (
            filteredOpportunities.map((o) => (
              <Card key={o.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{o.name}</div>
                    <div className="text-sm text-fg-secondary">{o.type.replace('_', ' ')} · impact: {o.impact} · effort: {o.effort} · score: {o.score}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {o.confidence > 0 && <Badge variant="default">{o.confidence} confidence</Badge>}
                    <Badge variant={statusVariant(o.status)}>{o.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'rules' && (
        <div className="space-y-3">
          {filteredRules.length === 0 ? (
            <Card className="p-8"><EmptyState icon={ScanLine} title="No detection rules" description="Detection rules will appear here." /></Card>
          ) : (
            filteredRules.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-sm text-fg-secondary">{r.type.replace('_', ' ')} · {r.schedule || 'No schedule'} · triggers: {r.triggerCount}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.lastTriggered && <Badge variant="default">last: {new Date(r.lastTriggered).toLocaleDateString()}</Badge>}
                    <Badge variant={statusVariant(r.status)}>{r.status.replace('_', ' ')}</Badge>
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
            <Card className="p-8"><EmptyState icon={Gauge} title="No opportunity scores" description="Opportunity scores will appear here." /></Card>
          ) : (
            filteredScores.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-sm text-fg-secondary">{s.type.replace('_', ' ')} · total: {s.total} · by {s.calculatedBy || 'N/A'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.opportunityId && <Badge variant="default">opp: {s.opportunityId}</Badge>}
                    <Badge variant={statusVariant(s.status)}>{s.status.replace('_', ' ')}</Badge>
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
            <Card className="p-8"><EmptyState icon={ListChecks} title="No opportunity actions" description="Opportunity actions will appear here." /></Card>
          ) : (
            filteredActions.map((a) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{a.name}</div>
                    <div className="text-sm text-fg-secondary">{a.type.replace('_', ' ')} · {a.action || 'No action'} · {a.assignee || 'Unassigned'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.priority && <Badge variant="default">{a.priority}</Badge>}
                    <Badge variant={statusVariant(a.status)}>{a.status.replace('_', ' ')}</Badge>
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
