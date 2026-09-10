'use client';

import { useState, useMemo } from 'react';
import {
  BrainCircuit, Camera, Database, Search, Layers, BarChart3,
  Search as SearchIcon,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  ContextSnapshot, ContextSource, ContextRetrieval, ContextAssembly,
  ContextEngineMetrics, ContextEngineStats,
} from '@/lib/services/context-engine-service';

type TabId = 'overview' | 'snapshots' | 'sources' | 'retrievals' | 'assemblies';

interface ContextEngineDashboardProps {
  organizationId: string;
  snapshots: ContextSnapshot[];
  sources: ContextSource[];
  retrievals: ContextRetrieval[];
  assemblies: ContextAssembly[];
  metrics: ContextEngineMetrics;
  stats: ContextEngineStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['active', 'completed', 'verified', 'executed', 'preferred', 'allowed', 'achieved', 'delivered', 'assembled'].includes(status)) return 'success';
  if (['draft', 'pending', 'placed', 'scheduled', 'planned', 'set', 'submitted', 'under_review', 'generated', 'presented', 'calculated', 'reviewed', 'recorded', 'detected', 'evaluating', 'referenced'].includes(status)) return 'warning';
  if (['cancelled', 'expired', 'terminated', 'deactivated', 'missed', 'failed', 'suspended', 'denied', 'rejected', 'revoked', 'deprecated', 'archived', 'dismissed', 'error', 'timeout', 'partial', 'inactive'].includes(status)) return 'danger';
  return 'info';
};

export function ContextEngineDashboard({
  snapshots, sources, retrievals, assemblies, metrics, stats,
}: ContextEngineDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const filteredSnapshots = useMemo(() => {
    if (!search) return snapshots;
    const q = search.toLowerCase();
    return snapshots.filter(
      (s) => s.name.toLowerCase().includes(q) || s.type.toLowerCase().includes(q) || s.status.toLowerCase().includes(q),
    );
  }, [snapshots, search]);

  const filteredSources = useMemo(() => {
    if (!search) return sources;
    const q = search.toLowerCase();
    return sources.filter(
      (s) => s.name.toLowerCase().includes(q) || s.type.toLowerCase().includes(q) || s.status.toLowerCase().includes(q),
    );
  }, [sources, search]);

  const filteredRetrievals = useMemo(() => {
    if (!search) return retrievals;
    const q = search.toLowerCase();
    return retrievals.filter(
      (r) => r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q) || r.status.toLowerCase().includes(q),
    );
  }, [retrievals, search]);

  const filteredAssemblies = useMemo(() => {
    if (!search) return assemblies;
    const q = search.toLowerCase();
    return assemblies.filter(
      (a) => a.name.toLowerCase().includes(q) || a.type.toLowerCase().includes(q) || a.status.toLowerCase().includes(q),
    );
  }, [assemblies, search]);

  const tabs: { id: TabId; label: string; icon: typeof BrainCircuit }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'snapshots', label: 'Snapshots', icon: Camera },
    { id: 'sources', label: 'Sources', icon: Database },
    { id: 'retrievals', label: 'Retrievals', icon: Search },
    { id: 'assemblies', label: 'Assemblies', icon: Layers },
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
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-tertiary" />
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
              <div className="text-xs text-fg-tertiary">Active Snapshots</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeSnapshots}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Sources</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeSources}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Completed Retrievals</div>
              <div className="mt-1 text-2xl font-bold">{metrics.completedRetrievals}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Delivered Assemblies</div>
              <div className="mt-1 text-2xl font-bold">{metrics.deliveredAssemblies}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Total Tokens</div>
              <div className="mt-1 text-2xl font-bold">{metrics.totalTokens}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Snapshot Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.bySnapshotType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Source Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.bySourceStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Retrieval Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byRetrievalStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Assembly Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byAssemblyStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'snapshots' && (
        <div className="space-y-3">
          {filteredSnapshots.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Camera} title="No context snapshots" description="Context snapshots will appear here." /></Card>
          ) : (
            filteredSnapshots.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-sm text-fg-secondary">{s.type.replace('_', ' ')} · {s.scope || 'No scope'} · {s.tokens} tokens</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.relevanceScore > 0 && <Badge variant="default">{s.relevanceScore} relevance</Badge>}
                    <Badge variant={statusVariant(s.status)}>{s.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'sources' && (
        <div className="space-y-3">
          {filteredSources.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Database} title="No context sources" description="Context sources will appear here." /></Card>
          ) : (
            filteredSources.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-sm text-fg-secondary">{s.type.replace('_', ' ')} · {s.sourceType || 'No source type'} · priority {s.priority}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.reliability > 0 && <Badge variant="default">{s.reliability} reliability</Badge>}
                    <Badge variant={statusVariant(s.status)}>{s.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'retrievals' && (
        <div className="space-y-3">
          {filteredRetrievals.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Search} title="No context retrievals" description="Context retrievals will appear here." /></Card>
          ) : (
            filteredRetrievals.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-sm text-fg-secondary">{r.type.replace('_', ' ')} · {r.tokens} tokens · {r.latency}ms</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.score > 0 && <Badge variant="default">{r.score} score</Badge>}
                    <Badge variant={statusVariant(r.status)}>{r.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'assemblies' && (
        <div className="space-y-3">
          {filteredAssemblies.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Layers} title="No context assemblies" description="Context assemblies will appear here." /></Card>
          ) : (
            filteredAssemblies.map((a) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{a.name}</div>
                    <div className="text-sm text-fg-secondary">{a.type.replace('_', ' ')} · {a.tokens} tokens · priority {a.priority}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.agentId && <Badge variant="default">agent: {a.agentId}</Badge>}
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
