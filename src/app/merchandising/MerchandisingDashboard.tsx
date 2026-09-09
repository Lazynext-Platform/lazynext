'use client';

import { useState, useMemo } from 'react';
import {
  Tags, LayoutGrid, DollarSign, Megaphone, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  MerchAssortment, MerchPlanogram, MerchPricing, MerchPromotion,
  MerchandisingMetrics, MerchandisingStats,
} from '@/lib/services/merchandising-service';

type TabId = 'overview' | 'assortments' | 'planograms' | 'pricing' | 'promotions';

interface MerchandisingDashboardProps {
  organizationId: string;
  assortments: MerchAssortment[];
  planograms: MerchPlanogram[];
  pricings: MerchPricing[];
  promotions: MerchPromotion[];
  metrics: MerchandisingMetrics;
  stats: MerchandisingStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['active', 'published', 'completed'].includes(status)) return 'success';
  if (['planned', 'draft', 'scheduled'].includes(status)) return 'warning';
  if (['discontinued', 'archived', 'expired', 'cancelled'].includes(status)) return 'danger';
  return 'info';
};

const formatDate = (d: Date | null): string => (d ? new Date(d).toLocaleDateString() : '—');

export function MerchandisingDashboard({
  assortments, planograms, pricings, promotions, metrics, stats,
}: MerchandisingDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const filteredAssortments = useMemo(() => {
    if (!search) return assortments;
    const q = search.toLowerCase();
    return assortments.filter(
      (a) => a.name.toLowerCase().includes(q) || a.type.toLowerCase().includes(q) || a.status.toLowerCase().includes(q) || a.category.toLowerCase().includes(q),
    );
  }, [assortments, search]);

  const filteredPlanograms = useMemo(() => {
    if (!search) return planograms;
    const q = search.toLowerCase();
    return planograms.filter(
      (p) => p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q) || p.status.toLowerCase().includes(q) || p.location.toLowerCase().includes(q),
    );
  }, [planograms, search]);

  const filteredPricings = useMemo(() => {
    if (!search) return pricings;
    const q = search.toLowerCase();
    return pricings.filter(
      (p) => p.productName.toLowerCase().includes(q) || p.type.toLowerCase().includes(q) || p.status.toLowerCase().includes(q),
    );
  }, [pricings, search]);

  const filteredPromotions = useMemo(() => {
    if (!search) return promotions;
    const q = search.toLowerCase();
    return promotions.filter(
      (p) => p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q) || p.status.toLowerCase().includes(q),
    );
  }, [promotions, search]);

  const tabs: { id: TabId; label: string; icon: typeof Tags }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'assortments', label: 'Assortments', icon: Tags },
    { id: 'planograms', label: 'Planograms', icon: LayoutGrid },
    { id: 'pricing', label: 'Pricing', icon: DollarSign },
    { id: 'promotions', label: 'Promotions', icon: Megaphone },
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
              <div className="text-xs text-fg-tertiary">Active Assortments</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeAssortments}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Published Planograms</div>
              <div className="mt-1 text-2xl font-bold">{metrics.publishedPlanograms}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Pricings</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activePricings}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Promotions</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activePromotions}</div>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Assortments</div>
              <div className="mt-1 text-2xl font-bold">{stats.assortmentCount}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Planograms</div>
              <div className="mt-1 text-2xl font-bold">{stats.planogramCount}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Pricings</div>
              <div className="mt-1 text-2xl font-bold">{stats.pricingCount}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Promotions</div>
              <div className="mt-1 text-2xl font-bold">{stats.promotionCount}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Assortment Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byAssortmentType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Planogram Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byPlanogramStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Pricing Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byPricingType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Promotion Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byPromotionStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'assortments' && (
        <div className="space-y-3">
          {filteredAssortments.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Tags} title="No assortments" description="Assortments will appear here." /></Card>
          ) : (
            filteredAssortments.map((a) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{a.name}</div>
                    <div className="text-sm text-fg-secondary">{a.type.replace('_', ' ')} · {a.category || 'Uncategorized'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant(a.status)}>{a.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'planograms' && (
        <div className="space-y-3">
          {filteredPlanograms.length === 0 ? (
            <Card className="p-8"><EmptyState icon={LayoutGrid} title="No planograms" description="Planograms will appear here." /></Card>
          ) : (
            filteredPlanograms.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-fg-secondary">{p.type.replace('_', ' ')} · {p.location || 'No location'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant(p.status)}>{p.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'pricing' && (
        <div className="space-y-3">
          {filteredPricings.length === 0 ? (
            <Card className="p-8"><EmptyState icon={DollarSign} title="No pricing" description="Pricing records will appear here." /></Card>
          ) : (
            filteredPricings.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.productName}</div>
                    <div className="text-sm text-fg-secondary">{p.type.replace('_', ' ')} · {p.currency} {p.price.toLocaleString()} · {formatDate(p.startDate)} → {formatDate(p.endDate)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.originalPrice > 0 && <Badge variant="default">Was {p.originalPrice.toLocaleString()}</Badge>}
                    <Badge variant={statusVariant(p.status)}>{p.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'promotions' && (
        <div className="space-y-3">
          {filteredPromotions.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Megaphone} title="No promotions" description="Promotions will appear here." /></Card>
          ) : (
            filteredPromotions.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-fg-secondary">{p.type.replace('_', ' ')} · {p.discount}% off · {formatDate(p.startDate)} → {formatDate(p.endDate)}</div>
                  </div>
                  <div className="flex items-center gap-2">
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
