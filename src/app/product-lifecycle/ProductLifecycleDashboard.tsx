'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Package, GitBranch, Tag, CalendarX, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  ProductItem, LifecyclePhase, ProductVersion, EndOfLife,
  ProductLifecycleMetrics, ProductLifecycleStats,
  EolReason,
} from '@/lib/services/product-lifecycle-service';

type TabId = 'overview' | 'products' | 'phases' | 'versions' | 'eol';

interface ProductLifecycleDashboardProps {
  organizationId: string;
  products: ProductItem[];
  phases: LifecyclePhase[];
  versions: ProductVersion[];
  eols: EndOfLife[];
  metrics: ProductLifecycleMetrics;
  stats: ProductLifecycleStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['completed', 'released', 'launched', 'verified', 'in_effect'].includes(status)) return 'success';
  if (['concept', 'development', 'testing', 'draft', 'beta', 'rc', 'not_started', 'in_progress', 'planned', 'announced', 'mature', 'growth'].includes(status)) return 'warning';
  if (['cancelled', 'discontinued', 'end_of_life', 'eol', 'deprecated', 'declining', 'decline', 'on_hold', 'retirement'].includes(status)) return 'danger';
  return 'info';
};

const reasonVariant = (reason: EolReason): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (reason === 'security') return 'danger';
  if (reason === 'compliance') return 'warning';
  if (reason === 'replaced') return 'info';
  return 'default';
};

export function ProductLifecycleDashboard({
  products, phases, versions, eols, metrics, stats,
}: ProductLifecycleDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const productName = useCallback(
    (id: string) => products.find((p) => p.id === id)?.name || id,
    [products],
  );

  const filteredProducts = useMemo(() => {
    if (!search) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.status.toLowerCase().includes(q) || p.category.toLowerCase().includes(q),
    );
  }, [products, search]);

  const filteredPhases = useMemo(() => {
    if (!search) return phases;
    const q = search.toLowerCase();
    return phases.filter(
      (p) => p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q) || p.status.toLowerCase().includes(q),
    );
  }, [phases, search]);

  const filteredVersions = useMemo(() => {
    if (!search) return versions;
    const q = search.toLowerCase();
    return versions.filter(
      (v) => v.version.toLowerCase().includes(q) || v.status.toLowerCase().includes(q) || productName(v.productId).toLowerCase().includes(q),
    );
  }, [versions, search, productName]);

  const filteredEols = useMemo(() => {
    if (!search) return eols;
    const q = search.toLowerCase();
    return eols.filter(
      (e) => e.reason.toLowerCase().includes(q) || e.status.toLowerCase().includes(q) || productName(e.productId).toLowerCase().includes(q),
    );
  }, [eols, search, productName]);

  const tabs: { id: TabId; label: string; icon: typeof Package }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'phases', label: 'Phases', icon: GitBranch },
    { id: 'versions', label: 'Versions', icon: Tag },
    { id: 'eol', label: 'End of Life', icon: CalendarX },
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
              <div className="text-xs text-fg-tertiary">Active Products</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeProducts}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Upcoming Launches</div>
              <div className="mt-1 text-2xl font-bold">{metrics.upcomingLaunches}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">EOL Items</div>
              <div className="mt-1 text-2xl font-bold">{metrics.eolItems}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Total Products</div>
              <div className="mt-1 text-2xl font-bold">{stats.productCount}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Total Versions</div>
              <div className="mt-1 text-2xl font-bold">{stats.versionCount}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Products by Stage</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(metrics.productsByStage).map(([stage, count]) => (
                <Badge key={stage} variant={statusVariant(stage)}>{stage.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Phase Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byPhaseType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Version Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byVersionStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">EOL Reason Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byEolReason).map(([reason, count]) => (
                <Badge key={reason} variant={reasonVariant(reason as EolReason)}>{reason.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'products' && (
        <div className="space-y-3">
          {filteredProducts.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Package} title="No products" description="Products will appear here." /></Card>
          ) : (
            filteredProducts.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-fg-secondary">{p.category || 'Uncategorized'} · {p.owner || 'Unassigned'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.budget > 0 && <Badge variant="default">${p.budget.toLocaleString()}</Badge>}
                    <Badge variant="default">{p.priority}</Badge>
                    <Badge variant={statusVariant(p.status)}>{p.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'phases' && (
        <div className="space-y-3">
          {filteredPhases.length === 0 ? (
            <Card className="p-8"><EmptyState icon={GitBranch} title="No phases" description="Lifecycle phases will appear here." /></Card>
          ) : (
            filteredPhases.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-fg-secondary">{p.type.replace('_', ' ')} · {productName(p.productId)}</div>
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

      {tab === 'versions' && (
        <div className="space-y-3">
          {filteredVersions.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Tag} title="No versions" description="Product versions will appear here." /></Card>
          ) : (
            filteredVersions.map((v) => (
              <Card key={v.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">v{v.version}</div>
                    <div className="text-sm text-fg-secondary">{productName(v.productId)} · {v.releaseDate ? new Date(v.releaseDate).toLocaleDateString() : 'Not released'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant(v.status)}>{v.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'eol' && (
        <div className="space-y-3">
          {filteredEols.length === 0 ? (
            <Card className="p-8"><EmptyState icon={CalendarX} title="No end-of-life items" description="EOL records will appear here." /></Card>
          ) : (
            filteredEols.map((e) => (
              <Card key={e.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{e.reason.replace('_', ' ')}</div>
                    <div className="text-sm text-fg-secondary">{productName(e.productId)} · {e.effectiveDate ? new Date(e.effectiveDate).toLocaleDateString() : 'No effective date'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={reasonVariant(e.reason)}>{e.reason.replace('_', ' ')}</Badge>
                    <Badge variant={statusVariant(e.status)}>{e.status.replace('_', ' ')}</Badge>
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
