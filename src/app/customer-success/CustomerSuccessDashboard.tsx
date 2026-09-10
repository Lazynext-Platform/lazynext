'use client';

import { useState, useMemo } from 'react';
import {
  Heart, Target, AlertTriangle, TrendingUp, RefreshCw, MessageSquare,
  Search, BarChart3,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

// ── Types ──

type HealthScoreCategory = 'product_usage' | 'support' | 'financial' | 'relationship' | 'sentiment';
type HealthTrend = 'improving' | 'declining' | 'stable';
type SuccessPlanStatus = 'active' | 'completed' | 'on_hold' | 'cancelled';
type ChurnRiskLevel = 'low' | 'medium' | 'high' | 'critical';
type ChurnRiskStatus = 'open' | 'mitigating' | 'resolved' | 'accepted';
type ExpansionType = 'upsell' | 'cross_sell' | 'renewal_upgrade' | 'seat_expansion' | 'feature_add';
type ExpansionStatus = 'identified' | 'qualified' | 'proposed' | 'negotiating' | 'won' | 'lost';
type RenewalStatus = 'pending' | 'in_review' | 'renewed' | 'churned' | 'downgraded';
type TouchpointType = 'call' | 'email' | 'meeting' | 'check_in' | 'qbr' | 'training' | 'onsite' | 'other';
type TouchpointSentiment = 'positive' | 'neutral' | 'negative';

interface HealthScore {
  id: string;
  customerId: string;
  score: number;
  category: HealthScoreCategory;
  trend: HealthTrend;
  calculatedAt: Date;
  notes: string;
  createdAt: Date;
}

interface SuccessPlan {
  id: string;
  customerId: string;
  name: string;
  description: string;
  status: SuccessPlanStatus;
  owner: string;
  startDate: Date;
  endDate: Date | null;
  createdAt: Date;
}

interface ChurnRisk {
  id: string;
  customerId: string;
  riskLevel: ChurnRiskLevel;
  reasons: string[];
  status: ChurnRiskStatus;
  assignedTo: string;
  identifiedDate: Date;
  createdAt: Date;
}

interface Expansion {
  id: string;
  customerId: string;
  type: ExpansionType;
  opportunity: string;
  estimatedValue: number;
  probability: number;
  status: ExpansionStatus;
  createdAt: Date;
}

interface Renewal {
  id: string;
  customerId: string;
  renewalDate: Date;
  renewalValue: number | null;
  status: RenewalStatus;
  probability: number;
  createdAt: Date;
}

interface Touchpoint {
  id: string;
  customerId: string;
  type: TouchpointType;
  date: Date;
  participant: string;
  summary: string;
  sentiment: TouchpointSentiment;
  createdAt: Date;
}

interface CSMetrics {
  avgHealthScore: number;
  atRiskCustomers: number;
  openChurnRisks: number;
  expansionPipelineValue: number;
  upcomingRenewals: number;
  touchpointFrequency: number;
}

interface CSStats {
  healthScoreCount: number;
  successPlanCount: number;
  churnRiskCount: number;
  openChurnRiskCount: number;
  expansionCount: number;
  renewalCount: number;
  touchpointCount: number;
  avgHealthScore: number;
  expansionPipelineValue: number;
  byChurnRiskLevel: Record<string, number>;
  byExpansionStatus: Record<string, number>;
  byRenewalStatus: Record<string, number>;
}

interface CustomerSuccessDashboardProps {
  organizationId: string;
  healthScores: HealthScore[];
  successPlans: SuccessPlan[];
  churnRisks: ChurnRisk[];
  expansions: Expansion[];
  renewals: Renewal[];
  touchpoints: Touchpoint[];
  metrics: CSMetrics;
  stats: CSStats;
}

// ── Helpers ──

const trendVariant: Record<HealthTrend, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  improving: 'success',
  declining: 'danger',
  stable: 'default',
};

const planStatusVariant: Record<SuccessPlanStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  active: 'success',
  completed: 'info',
  on_hold: 'warning',
  cancelled: 'default',
};

const riskLevelVariant: Record<ChurnRiskLevel, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  low: 'default',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
};

const riskStatusVariant: Record<ChurnRiskStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  open: 'danger',
  mitigating: 'warning',
  resolved: 'success',
  accepted: 'default',
};

const expansionStatusVariant: Record<ExpansionStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  identified: 'default',
  qualified: 'info',
  proposed: 'accent',
  negotiating: 'warning',
  won: 'success',
  lost: 'danger',
};

const renewalStatusVariant: Record<RenewalStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  pending: 'info',
  in_review: 'accent',
  renewed: 'success',
  churned: 'danger',
  downgraded: 'warning',
};

const touchpointSentimentVariant: Record<TouchpointSentiment, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  positive: 'success',
  neutral: 'default',
  negative: 'danger',
};

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function formatDate(d: Date | string | null): string {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
}

function formatLabel(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Component ──

type TabId = 'overview' | 'health' | 'plans' | 'churn' | 'expansions' | 'renewals' | 'touchpoints';

export function CustomerSuccessDashboard({
  organizationId: _organizationId,
  healthScores,
  successPlans,
  churnRisks,
  expansions,
  renewals,
  touchpoints,
  metrics,
  stats,
}: CustomerSuccessDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const filteredHealthScores = useMemo(() => {
    if (!search) return healthScores;
    const q = search.toLowerCase();
    return healthScores.filter(
      (h) => h.customerId.toLowerCase().includes(q) || h.category.toLowerCase().includes(q) || h.notes.toLowerCase().includes(q),
    );
  }, [healthScores, search]);

  const filteredPlans = useMemo(() => {
    if (!search) return successPlans;
    const q = search.toLowerCase();
    return successPlans.filter(
      (p) => p.name.toLowerCase().includes(q) || p.customerId.toLowerCase().includes(q) || p.owner.toLowerCase().includes(q),
    );
  }, [successPlans, search]);

  const filteredChurnRisks = useMemo(() => {
    if (!search) return churnRisks;
    const q = search.toLowerCase();
    return churnRisks.filter(
      (c) => c.customerId.toLowerCase().includes(q) || c.riskLevel.toLowerCase().includes(q) || c.status.toLowerCase().includes(q),
    );
  }, [churnRisks, search]);

  const filteredExpansions = useMemo(() => {
    if (!search) return expansions;
    const q = search.toLowerCase();
    return expansions.filter(
      (e) => e.customerId.toLowerCase().includes(q) || e.opportunity.toLowerCase().includes(q) || e.type.toLowerCase().includes(q),
    );
  }, [expansions, search]);

  const filteredRenewals = useMemo(() => {
    if (!search) return renewals;
    const q = search.toLowerCase();
    return renewals.filter(
      (r) => r.customerId.toLowerCase().includes(q) || r.status.toLowerCase().includes(q),
    );
  }, [renewals, search]);

  const filteredTouchpoints = useMemo(() => {
    if (!search) return touchpoints;
    const q = search.toLowerCase();
    return touchpoints.filter(
      (t) => t.customerId.toLowerCase().includes(q) || t.summary.toLowerCase().includes(q) || t.participant.toLowerCase().includes(q),
    );
  }, [touchpoints, search]);

  const tabs: { id: TabId; label: string; icon: typeof Heart }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'health', label: 'Health Scores', icon: Heart },
    { id: 'plans', label: 'Success Plans', icon: Target },
    { id: 'churn', label: 'Churn Risk', icon: AlertTriangle },
    { id: 'expansions', label: 'Expansions', icon: TrendingUp },
    { id: 'renewals', label: 'Renewals', icon: RefreshCw },
    { id: 'touchpoints', label: 'Touchpoints', icon: MessageSquare },
  ];

  return (
    <div className="space-y-6">
      {/* Stats overview */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Heart className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Health Scores</span>
          </div>
          <p className="text-2xl font-semibold">{stats.healthScoreCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{metrics.avgHealthScore} avg · {metrics.atRiskCustomers} at risk</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Churn Risks</span>
          </div>
          <p className="text-2xl font-semibold">{stats.churnRiskCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.openChurnRiskCount} open</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Expansions</span>
          </div>
          <p className="text-2xl font-semibold">{stats.expansionCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{formatCurrency(metrics.expansionPipelineValue)} pipeline</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <RefreshCw className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Renewals</span>
          </div>
          <p className="text-2xl font-semibold">{stats.renewalCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{metrics.upcomingRenewals} upcoming</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-accent-primary text-white'
                  : 'bg-surface-alt text-fg-secondary hover:text-fg-primary'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Search */}
      {tab !== 'overview' && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 w-full"
            />
          </div>
        </div>
      )}

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-accent-primary" />
                <h2 className="heading-display text-lg">CS Metrics</h2>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Average health score</span>
                  <span className="font-medium">{metrics.avgHealthScore}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">At-risk customers</span>
                  <span className="font-medium">{metrics.atRiskCustomers}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Open churn risks</span>
                  <span className="font-medium">{metrics.openChurnRisks}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Expansion pipeline</span>
                  <span className="font-medium">{formatCurrency(metrics.expansionPipelineValue)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Upcoming renewals</span>
                  <span className="font-medium">{metrics.upcomingRenewals}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Touchpoint frequency (30d)</span>
                  <span>{metrics.touchpointFrequency}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Target className="h-5 w-5 text-accent-primary" />
                <h2 className="heading-display text-lg">Counts</h2>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Health scores</span>
                  <span className="font-medium">{stats.healthScoreCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Success plans</span>
                  <span className="font-medium">{stats.successPlanCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Churn risks</span>
                  <span className="font-medium">{stats.churnRiskCount} ({stats.openChurnRiskCount} open)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Expansions</span>
                  <span className="font-medium">{stats.expansionCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Renewals</span>
                  <span className="font-medium">{stats.renewalCount}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Touchpoints</span>
                  <span>{stats.touchpointCount}</span>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="font-semibold mb-3">Open Churn Risks</h3>
            {churnRisks.filter((c) => c.status === 'open' || c.status === 'mitigating').length === 0 ? (
              <p className="text-sm text-fg-secondary">No open churn risks.</p>
            ) : (
              <div className="space-y-2">
                {churnRisks.filter((c) => c.status === 'open' || c.status === 'mitigating').slice(0, 5).map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{c.customerId}</p>
                      <p className="text-xs text-fg-secondary">{c.reasons.join(', ') || 'No reasons specified'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={riskLevelVariant[c.riskLevel]}>{formatLabel(c.riskLevel)}</Badge>
                      <Badge variant={riskStatusVariant[c.status]}>{formatLabel(c.status)}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'health' && (
        <div className="space-y-4">
          {filteredHealthScores.length === 0 ? (
            <Card className="p-8">
              <EmptyState icon={Heart} title="No health scores" description="Health scores will appear here." />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Customer</th>
                    <th className="p-3 font-medium">Score</th>
                    <th className="p-3 font-medium">Category</th>
                    <th className="p-3 font-medium">Trend</th>
                    <th className="p-3 font-medium">Calculated</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHealthScores.map((h) => (
                    <tr key={h.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{h.customerId}</td>
                      <td className="p-3">{h.score}</td>
                      <td className="p-3 capitalize">{formatLabel(h.category)}</td>
                      <td className="p-3">
                        <Badge variant={trendVariant[h.trend]}>{formatLabel(h.trend)}</Badge>
                      </td>
                      <td className="p-3">{formatDate(h.calculatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'plans' && (
        <div className="space-y-4">
          {filteredPlans.length === 0 ? (
            <Card className="p-8">
              <EmptyState icon={Target} title="No success plans" description="Success plans will appear here." />
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredPlans.map((plan) => (
                <Card key={plan.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{plan.name}</h3>
                      <p className="text-xs text-fg-secondary">{plan.customerId}</p>
                    </div>
                    <Badge variant={planStatusVariant[plan.status]}>{formatLabel(plan.status)}</Badge>
                  </div>
                  {plan.description && (
                    <p className="text-sm text-fg-secondary mb-2 line-clamp-2">{plan.description}</p>
                  )}
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Owner</span>
                      <span className="font-medium">{plan.owner || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Start</span>
                      <span className="font-medium">{formatDate(plan.startDate)}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'churn' && (
        <div className="space-y-4">
          {filteredChurnRisks.length === 0 ? (
            <Card className="p-8">
              <EmptyState icon={AlertTriangle} title="No churn risks" description="Churn risks will appear here." />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Customer</th>
                    <th className="p-3 font-medium">Risk Level</th>
                    <th className="p-3 font-medium">Reasons</th>
                    <th className="p-3 font-medium">Assigned To</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredChurnRisks.map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{c.customerId}</td>
                      <td className="p-3">
                        <Badge variant={riskLevelVariant[c.riskLevel]}>{formatLabel(c.riskLevel)}</Badge>
                      </td>
                      <td className="p-3 text-fg-secondary">{c.reasons.join(', ') || '—'}</td>
                      <td className="p-3">{c.assignedTo || '—'}</td>
                      <td className="p-3">
                        <Badge variant={riskStatusVariant[c.status]}>{formatLabel(c.status)}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'expansions' && (
        <div className="space-y-4">
          {filteredExpansions.length === 0 ? (
            <Card className="p-8">
              <EmptyState icon={TrendingUp} title="No expansions" description="Expansion opportunities will appear here." />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Customer</th>
                    <th className="p-3 font-medium">Type</th>
                    <th className="p-3 font-medium">Opportunity</th>
                    <th className="p-3 font-medium">Est. Value</th>
                    <th className="p-3 font-medium">Probability</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpansions.map((e) => (
                    <tr key={e.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{e.customerId}</td>
                      <td className="p-3 capitalize">{formatLabel(e.type)}</td>
                      <td className="p-3">{e.opportunity}</td>
                      <td className="p-3">{formatCurrency(e.estimatedValue)}</td>
                      <td className="p-3">{e.probability}%</td>
                      <td className="p-3">
                        <Badge variant={expansionStatusVariant[e.status]}>{formatLabel(e.status)}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'renewals' && (
        <div className="space-y-4">
          {filteredRenewals.length === 0 ? (
            <Card className="p-8">
              <EmptyState icon={RefreshCw} title="No renewals" description="Renewals will appear here." />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Customer</th>
                    <th className="p-3 font-medium">Renewal Date</th>
                    <th className="p-3 font-medium">Value</th>
                    <th className="p-3 font-medium">Probability</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRenewals.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{r.customerId}</td>
                      <td className="p-3">{formatDate(r.renewalDate)}</td>
                      <td className="p-3">{r.renewalValue != null ? formatCurrency(r.renewalValue) : '—'}</td>
                      <td className="p-3">{r.probability}%</td>
                      <td className="p-3">
                        <Badge variant={renewalStatusVariant[r.status]}>{formatLabel(r.status)}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'touchpoints' && (
        <div className="space-y-4">
          {filteredTouchpoints.length === 0 ? (
            <Card className="p-8">
              <EmptyState icon={MessageSquare} title="No touchpoints" description="Customer touchpoints will appear here." />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Customer</th>
                    <th className="p-3 font-medium">Type</th>
                    <th className="p-3 font-medium">Date</th>
                    <th className="p-3 font-medium">Participant</th>
                    <th className="p-3 font-medium">Summary</th>
                    <th className="p-3 font-medium">Sentiment</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTouchpoints.map((t) => (
                    <tr key={t.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{t.customerId}</td>
                      <td className="p-3 capitalize">{formatLabel(t.type)}</td>
                      <td className="p-3">{formatDate(t.date)}</td>
                      <td className="p-3">{t.participant || '—'}</td>
                      <td className="p-3 text-fg-secondary">{t.summary || '—'}</td>
                      <td className="p-3">
                        <Badge variant={touchpointSentimentVariant[t.sentiment]}>{formatLabel(t.sentiment)}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
