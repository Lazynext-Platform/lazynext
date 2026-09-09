'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  DollarSign, Layers, FlaskConical, Percent, TrendingUp,
  Search, BarChart3, CheckCircle,
} from 'lucide-react';
import { Card, Badge, EmptyState } from '@/components/ui';

// ── Types ──

type PricingModelType = 'subscription' | 'usage_based' | 'tiered' | 'freemium' | 'per_seat' | 'one_time' | 'hybrid' | 'value_based';
type PricingModelStatus = 'active' | 'inactive' | 'archived' | 'draft';
type BillingPeriod = 'monthly' | 'quarterly' | 'annual' | 'one_time';
type TierStatus = 'active' | 'inactive' | 'archived';
type ExperimentStatus = 'planned' | 'running' | 'completed' | 'cancelled' | 'paused';
type DiscountType = 'percentage' | 'fixed' | 'volume' | 'loyalty' | 'promotional' | 'partner';
type DiscountStatus = 'active' | 'inactive' | 'expired' | 'archived';
type RevenueStreamType = 'recurring' | 'one_time' | 'usage' | 'service' | 'licensing' | 'transaction' | 'advertising' | 'other';
type RevenueStreamStatus = 'active' | 'inactive' | 'paused' | 'discontinued';

interface PricingModel {
  id: string;
  name: string;
  type: PricingModelType;
  description: string;
  currency: string;
  status: PricingModelStatus;
  effectiveDate: Date | null;
  version: string;
  createdAt: Date;
}

interface PricingTier {
  id: string;
  modelId: string;
  name: string;
  price: number;
  billingPeriod: BillingPeriod;
  features: string[];
  limits: Array<{ name: string; value: string; unit: string }>;
  targetSegment: string;
  status: TierStatus;
  sortOrder: number;
  createdAt: Date;
}

interface ExperimentVariant {
  name: string;
  price: number;
  description: string;
  weight: number;
}

interface PriceExperiment {
  id: string;
  name: string;
  description: string;
  modelId: string | null;
  variants: ExperimentVariant[];
  startDate: Date;
  endDate: Date | null;
  status: ExperimentStatus;
  targetSegment: string;
  successMetric: string;
  results: string;
  startedBy: string;
  startedAt: Date | null;
  endedBy: string;
  endedAt: Date | null;
  createdAt: Date;
}

interface DiscountRule {
  id: string;
  name: string;
  type: DiscountType;
  value: number;
  conditions: string;
  minQuantity: number | null;
  maxQuantity: number | null;
  validFrom: Date | null;
  validTo: Date | null;
  appliesTo: string;
  stackable: boolean;
  status: DiscountStatus;
  usageLimit: number | null;
  usageCount: number;
  createdAt: Date;
}

interface RevenueStream {
  id: string;
  name: string;
  type: RevenueStreamType;
  description: string;
  pricingModelId: string | null;
  currentMrr: number;
  projectedMrr: number;
  growthRate: number;
  status: RevenueStreamStatus;
  startDate: Date | null;
  createdAt: Date;
}

interface PricingMetrics {
  totalMrr: number;
  projectedMrr: number;
  revenueByStream: Array<{ name: string; type: RevenueStreamType; currentMrr: number; projectedMrr: number }>;
  activeExperiments: number;
  discountUtilization: number;
  pricingModelCoverage: number;
}

interface PricingStats {
  modelCount: number;
  activeModelCount: number;
  tierCount: number;
  experimentCount: number;
  runningExperimentCount: number;
  discountCount: number;
  activeDiscountCount: number;
  revenueStreamCount: number;
  activeRevenueStreamCount: number;
  totalMrr: number;
  projectedMrr: number;
  byModelType: Record<string, number>;
  byDiscountType: Record<string, number>;
  byRevenueStreamType: Record<string, number>;
}

interface PricingDashboardProps {
  organizationId: string;
  models: PricingModel[];
  tiers: PricingTier[];
  experiments: PriceExperiment[];
  discounts: DiscountRule[];
  revenueStreams: RevenueStream[];
  metrics: PricingMetrics;
  stats: PricingStats;
}

// ── Helpers ──

const modelStatusVariant: Record<PricingModelStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  active: 'success',
  inactive: 'default',
  archived: 'default',
  draft: 'info',
};

const tierStatusVariant: Record<TierStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  active: 'success',
  inactive: 'default',
  archived: 'default',
};

const experimentStatusVariant: Record<ExperimentStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  planned: 'info',
  running: 'accent',
  completed: 'success',
  cancelled: 'default',
  paused: 'warning',
};

const discountStatusVariant: Record<DiscountStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  active: 'success',
  inactive: 'default',
  expired: 'danger',
  archived: 'default',
};

const streamStatusVariant: Record<RevenueStreamStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  active: 'success',
  inactive: 'default',
  paused: 'warning',
  discontinued: 'danger',
};

function formatDate(d: Date | string | null): string {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
}

function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

// ── Component ──

type TabId = 'overview' | 'models' | 'tiers' | 'experiments' | 'discounts' | 'revenue_streams';

export function PricingDashboard({
  organizationId: _organizationId,
  models,
  tiers,
  experiments,
  discounts,
  revenueStreams,
  metrics,
  stats,
}: PricingDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const modelName = useCallback(
    (id: string | null) => (id ? models.find((m) => m.id === id)?.name || id : '—'),
    [models],
  );

  const filteredModels = useMemo(() => {
    if (!search) return models;
    const q = search.toLowerCase();
    return models.filter(
      (m) => m.name.toLowerCase().includes(q) || m.type.toLowerCase().includes(q) || m.description.toLowerCase().includes(q),
    );
  }, [models, search]);

  const filteredTiers = useMemo(() => {
    if (!search) return tiers;
    const q = search.toLowerCase();
    return tiers.filter(
      (t) => t.name.toLowerCase().includes(q) || t.targetSegment.toLowerCase().includes(q) || t.billingPeriod.toLowerCase().includes(q),
    );
  }, [tiers, search]);

  const filteredExperiments = useMemo(() => {
    if (!search) return experiments;
    const q = search.toLowerCase();
    return experiments.filter(
      (e) => e.name.toLowerCase().includes(q) || e.targetSegment.toLowerCase().includes(q) || e.successMetric.toLowerCase().includes(q),
    );
  }, [experiments, search]);

  const filteredDiscounts = useMemo(() => {
    if (!search) return discounts;
    const q = search.toLowerCase();
    return discounts.filter(
      (d) => d.name.toLowerCase().includes(q) || d.type.toLowerCase().includes(q) || d.appliesTo.toLowerCase().includes(q),
    );
  }, [discounts, search]);

  const filteredStreams = useMemo(() => {
    if (!search) return revenueStreams;
    const q = search.toLowerCase();
    return revenueStreams.filter(
      (s) => s.name.toLowerCase().includes(q) || s.type.toLowerCase().includes(q) || s.description.toLowerCase().includes(q),
    );
  }, [revenueStreams, search]);

  const tabs: { id: TabId; label: string; icon: typeof DollarSign }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'models', label: 'Models', icon: DollarSign },
    { id: 'tiers', label: 'Tiers', icon: Layers },
    { id: 'experiments', label: 'Experiments', icon: FlaskConical },
    { id: 'discounts', label: 'Discounts', icon: Percent },
    { id: 'revenue_streams', label: 'Revenue Streams', icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      {/* Stats overview */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Pricing Models</span>
          </div>
          <p className="text-2xl font-semibold">{stats.modelCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.activeModelCount} active</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Layers className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Tiers</span>
          </div>
          <p className="text-2xl font-semibold">{stats.tierCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.experimentCount} experiments</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Percent className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Discounts</span>
          </div>
          <p className="text-2xl font-semibold">{stats.discountCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.activeDiscountCount} active</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Total MRR</span>
          </div>
          <p className="text-2xl font-semibold">{formatCurrency(stats.totalMrr)}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{formatCurrency(stats.projectedMrr)} projected</p>
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
                <h2 className="heading-display text-lg">Revenue Metrics</h2>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Total MRR</span>
                  <span className="font-medium">{formatCurrency(metrics.totalMrr)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Projected MRR</span>
                  <span className="font-medium">{formatCurrency(metrics.projectedMrr)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Active experiments</span>
                  <span className="font-medium">{metrics.activeExperiments}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Discount utilization</span>
                  <span className="font-medium">{metrics.discountUtilization}%</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Pricing model coverage</span>
                  <span>{metrics.pricingModelCoverage}%</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-accent-primary" />
                <h2 className="heading-display text-lg">Revenue by Stream</h2>
              </div>
              {metrics.revenueByStream.length === 0 ? (
                <p className="text-sm text-fg-secondary">No active revenue streams.</p>
              ) : (
                <div className="space-y-2">
                  {metrics.revenueByStream.map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-fg-secondary capitalize">{s.type}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(s.currentMrr)}</p>
                        <p className="text-xs text-fg-secondary">{formatCurrency(s.projectedMrr)} projected</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="font-semibold mb-3">Running Experiments</h3>
            {experiments.filter((e) => e.status === 'running').length === 0 ? (
              <p className="text-sm text-fg-secondary">No running experiments.</p>
            ) : (
              <div className="space-y-2">
                {experiments.filter((e) => e.status === 'running').slice(0, 5).map((e) => (
                  <div key={e.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{e.name}</p>
                      <p className="text-xs text-fg-secondary">{e.variants.length} variants · {e.successMetric || 'No metric'}</p>
                    </div>
                    <Badge variant={experimentStatusVariant[e.status]}>{e.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'models' && (
        <div className="space-y-4">
          {filteredModels.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={DollarSign}
                title="No pricing models"
                description="Create a pricing model to get started."
              />
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredModels.map((model) => (
                <Card key={model.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{model.name}</h3>
                      <p className="text-xs text-fg-secondary">v{model.version} · {model.currency}</p>
                    </div>
                    <Badge variant={modelStatusVariant[model.status]}>{model.status}</Badge>
                  </div>
                  {model.description && (
                    <p className="text-sm text-fg-secondary mb-3 line-clamp-2">{model.description}</p>
                  )}
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Type</span>
                      <span className="font-medium capitalize">{model.type.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Effective</span>
                      <span className="font-medium">{formatDate(model.effectiveDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Tiers</span>
                      <span className="font-medium">{tiers.filter((t) => t.modelId === model.id).length}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'tiers' && (
        <div className="space-y-4">
          {filteredTiers.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Layers}
                title="No pricing tiers"
                description="Create a pricing tier to see it here."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Name</th>
                    <th className="p-3 font-medium">Model</th>
                    <th className="p-3 font-medium">Price</th>
                    <th className="p-3 font-medium">Billing</th>
                    <th className="p-3 font-medium">Features</th>
                    <th className="p-3 font-medium">Segment</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTiers.map((tier) => (
                    <tr key={tier.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{tier.name}</td>
                      <td className="p-3">{modelName(tier.modelId)}</td>
                      <td className="p-3">{formatCurrency(tier.price)}</td>
                      <td className="p-3 capitalize">{tier.billingPeriod.replace('_', ' ')}</td>
                      <td className="p-3">{tier.features.length}</td>
                      <td className="p-3">{tier.targetSegment || '—'}</td>
                      <td className="p-3">
                        <Badge variant={tierStatusVariant[tier.status]}>{tier.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'experiments' && (
        <div className="space-y-4">
          {filteredExperiments.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={FlaskConical}
                title="No pricing experiments"
                description="Create a price experiment to see it here."
              />
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredExperiments.map((exp) => (
                <Card key={exp.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{exp.name}</h3>
                      <p className="text-xs text-fg-secondary">
                        {formatDate(exp.startDate)} — {formatDate(exp.endDate)}
                      </p>
                    </div>
                    <Badge variant={experimentStatusVariant[exp.status]}>{exp.status}</Badge>
                  </div>
                  {exp.description && (
                    <p className="text-sm text-fg-secondary mb-3 line-clamp-2">{exp.description}</p>
                  )}
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Variants</span>
                      <span className="font-medium">{exp.variants.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Success metric</span>
                      <span className="font-medium">{exp.successMetric || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Target segment</span>
                      <span className="font-medium">{exp.targetSegment || '—'}</span>
                    </div>
                    {exp.results && (
                      <div className="pt-2 border-t">
                        <p className="text-fg-secondary">Results</p>
                        <p className="font-medium line-clamp-2">{exp.results}</p>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'discounts' && (
        <div className="space-y-4">
          {filteredDiscounts.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Percent}
                title="No discount rules"
                description="Create a discount rule to see it here."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Name</th>
                    <th className="p-3 font-medium">Type</th>
                    <th className="p-3 font-medium">Value</th>
                    <th className="p-3 font-medium">Valid Period</th>
                    <th className="p-3 font-medium">Usage</th>
                    <th className="p-3 font-medium">Stackable</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDiscounts.map((discount) => (
                    <tr key={discount.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{discount.name}</td>
                      <td className="p-3 capitalize">{discount.type}</td>
                      <td className="p-3">
                        {discount.type === 'percentage' ? `${discount.value}%` : formatCurrency(discount.value)}
                      </td>
                      <td className="p-3">{formatDate(discount.validFrom)} — {formatDate(discount.validTo)}</td>
                      <td className="p-3">
                        {discount.usageCount}{discount.usageLimit ? `/${discount.usageLimit}` : ''}
                      </td>
                      <td className="p-3">
                        {discount.stackable ? (
                          <CheckCircle className="h-4 w-4 text-success" />
                        ) : '—'}
                      </td>
                      <td className="p-3">
                        <Badge variant={discountStatusVariant[discount.status]}>{discount.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'revenue_streams' && (
        <div className="space-y-4">
          {filteredStreams.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={TrendingUp}
                title="No revenue streams"
                description="Create a revenue stream to see it here."
              />
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredStreams.map((stream) => (
                <Card key={stream.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{stream.name}</h3>
                      <p className="text-xs text-fg-secondary capitalize">{stream.type.replace('_', ' ')}</p>
                    </div>
                    <Badge variant={streamStatusVariant[stream.status]}>{stream.status}</Badge>
                  </div>
                  {stream.description && (
                    <p className="text-sm text-fg-secondary mb-3 line-clamp-2">{stream.description}</p>
                  )}
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Current MRR</span>
                      <span className="font-medium">{formatCurrency(stream.currentMrr)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Projected MRR</span>
                      <span className="font-medium">{formatCurrency(stream.projectedMrr)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Growth rate</span>
                      <span className="font-medium">{stream.growthRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Start date</span>
                      <span className="font-medium">{formatDate(stream.startDate)}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
