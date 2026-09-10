'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Database, Workflow, Table, CheckCircle, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  DataPipeline, EtlJob, DataModel, DataQuality,
  DataWarehouseMetrics, DataWarehouseStats,
  PipelineStatus, JobStatus, ModelStatus, QualityStatus,
} from '@/lib/services/data-warehouse-service';

type TabId = 'overview' | 'pipelines' | 'jobs' | 'models' | 'quality';

interface DataWarehouseDashboardProps {
  organizationId: string;
  pipelines: DataPipeline[];
  jobs: EtlJob[];
  models: DataModel[];
  qualities: DataQuality[];
  metrics: DataWarehouseMetrics;
  stats: DataWarehouseStats;
}

const pipelineStatusVariant = (status: PipelineStatus): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (status === 'active') return 'success';
  if (status === 'draft' || status === 'paused') return 'warning';
  if (status === 'error' || status === 'deprecated' || status === 'archived') return 'danger';
  return 'info';
};

const jobStatusVariant = (status: JobStatus): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (status === 'completed') return 'success';
  if (status === 'pending' || status === 'scheduled' || status === 'running') return 'warning';
  if (status === 'failed' || status === 'cancelled') return 'danger';
  return 'info';
};

const modelStatusVariant = (status: ModelStatus): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (status === 'published') return 'success';
  if (status === 'draft') return 'warning';
  if (status === 'deprecated' || status === 'archived') return 'danger';
  return 'info';
};

const qualityStatusVariant = (status: QualityStatus): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (status === 'pass') return 'success';
  if (status === 'warning' || status === 'pending') return 'warning';
  if (status === 'fail') return 'danger';
  return 'info';
};

export function DataWarehouseDashboard({
  pipelines, jobs, models, qualities, metrics, stats,
}: DataWarehouseDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const pipelineName = useCallback(
    (id: string) => pipelines.find((p) => p.id === id)?.name || id,
    [pipelines],
  );

  const modelName = useCallback(
    (id: string) => models.find((m) => m.id === id)?.name || id,
    [models],
  );

  const filteredPipelines = useMemo(() => {
    if (!search) return pipelines;
    const q = search.toLowerCase();
    return pipelines.filter(
      (p) => p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q) || p.status.toLowerCase().includes(q),
    );
  }, [pipelines, search]);

  const filteredJobs = useMemo(() => {
    if (!search) return jobs;
    const q = search.toLowerCase();
    return jobs.filter(
      (j) => j.name.toLowerCase().includes(q) || j.type.toLowerCase().includes(q) || j.status.toLowerCase().includes(q),
    );
  }, [jobs, search]);

  const filteredModels = useMemo(() => {
    if (!search) return models;
    const q = search.toLowerCase();
    return models.filter(
      (m) => m.name.toLowerCase().includes(q) || m.type.toLowerCase().includes(q) || m.status.toLowerCase().includes(q),
    );
  }, [models, search]);

  const filteredQualities = useMemo(() => {
    if (!search) return qualities;
    const q = search.toLowerCase();
    return qualities.filter(
      (q2) => q2.type.toLowerCase().includes(q) || q2.status.toLowerCase().includes(q) || String(q2.score).includes(q),
    );
  }, [qualities, search]);

  const tabs: { id: TabId; label: string; icon: typeof Database }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'pipelines', label: 'Pipelines', icon: Database },
    { id: 'jobs', label: 'Jobs', icon: Workflow },
    { id: 'models', label: 'Models', icon: Table },
    { id: 'quality', label: 'Quality', icon: CheckCircle },
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
              <div className="text-xs text-fg-tertiary">Active Pipelines</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activePipelines}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Running Jobs</div>
              <div className="mt-1 text-2xl font-bold">{metrics.runningJobs}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Failed Jobs</div>
              <div className="mt-1 text-2xl font-bold">{metrics.failedJobs}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Published Models</div>
              <div className="mt-1 text-2xl font-bold">{metrics.publishedModels}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Quality Pass Rate</div>
              <div className="mt-1 text-2xl font-bold">{metrics.qualityPassRate}%</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Pipeline Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byPipelineType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Pipeline Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byPipelineStatus).map(([status, count]) => (
                <Badge key={status} variant={pipelineStatusVariant(status as PipelineStatus)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Job Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byJobStatus).map(([status, count]) => (
                <Badge key={status} variant={jobStatusVariant(status as JobStatus)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Model Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byModelStatus).map(([status, count]) => (
                <Badge key={status} variant={modelStatusVariant(status as ModelStatus)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Quality Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byQualityStatus).map(([status, count]) => (
                <Badge key={status} variant={qualityStatusVariant(status as QualityStatus)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'pipelines' && (
        <div className="space-y-3">
          {filteredPipelines.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Database} title="No pipelines" description="Data pipelines will appear here." /></Card>
          ) : (
            filteredPipelines.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-fg-secondary">{p.type.replace('_', ' ')} · {p.owner || 'Unassigned'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.recordsProcessed > 0 && <Badge variant="default">{p.recordsProcessed.toLocaleString()} recs</Badge>}
                    <Badge variant={pipelineStatusVariant(p.status)}>{p.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'jobs' && (
        <div className="space-y-3">
          {filteredJobs.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Workflow} title="No jobs" description="ETL jobs will appear here." /></Card>
          ) : (
            filteredJobs.map((j) => (
              <Card key={j.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{j.name}</div>
                    <div className="text-sm text-fg-secondary">{j.type.replace('_', ' ')} · {pipelineName(j.pipelineId)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {j.duration > 0 && <Badge variant="default">{j.duration}s</Badge>}
                    <Badge variant={jobStatusVariant(j.status)}>{j.status.replace('_', ' ')}</Badge>
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
            <Card className="p-8"><EmptyState icon={Table} title="No models" description="Data models will appear here." /></Card>
          ) : (
            filteredModels.map((m) => (
              <Card key={m.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{m.name}</div>
                    <div className="text-sm text-fg-secondary">{m.type.replace('_', ' ')} · v{m.version} · {m.owner || 'Unassigned'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">{m.dependencies.length} deps</Badge>
                    <Badge variant={modelStatusVariant(m.status)}>{m.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'quality' && (
        <div className="space-y-3">
          {filteredQualities.length === 0 ? (
            <Card className="p-8"><EmptyState icon={CheckCircle} title="No quality checks" description="Data quality checks will appear here." /></Card>
          ) : (
            filteredQualities.map((q) => (
              <Card key={q.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{q.type.replace('_', ' ')}</div>
                    <div className="text-sm text-fg-secondary">
                      {q.modelId ? modelName(q.modelId) : q.pipelineId ? pipelineName(q.pipelineId) : 'General'} · Score: {q.score}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">{q.score}</Badge>
                    <Badge variant={qualityStatusVariant(q.status)}>{q.status.replace('_', ' ')}</Badge>
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
