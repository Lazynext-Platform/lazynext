'use client';

import { useState, useMemo } from 'react';
import {
  FlaskConical, Beaker, FileText, Lightbulb, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  RndProject, RndExperiment, RndPatent, RndInnovation,
  RndMetrics, RndStats,
} from '@/lib/services/rnd-service';

type TabId = 'overview' | 'projects' | 'experiments' | 'patents' | 'innovations';

interface RndDashboardProps {
  organizationId: string;
  projects: RndProject[];
  experiments: RndExperiment[];
  patents: RndPatent[];
  innovations: RndInnovation[];
  metrics: RndMetrics;
  stats: RndStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['completed', 'granted', 'launched', 'approved', 'success'].includes(status)) return 'success';
  if (['in_progress', 'planned', 'concept', 'proposed', 'draft', 'filed', 'pending', 'idea', 'evaluating', 'in_development', 'discovery', 'ideation', 'concept', 'prototype', 'testing'].includes(status)) return 'warning';
  if (['cancelled', 'failed', 'rejected', 'expired', 'abandoned', 'partial'].includes(status)) return 'danger';
  return 'info';
};

export function RndDashboard({
  projects, experiments, patents, innovations, metrics, stats,
}: RndDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const filteredProjects = useMemo(() => {
    if (!search) return projects;
    const q = search.toLowerCase();
    return projects.filter(
      (p) => p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q) || p.status.toLowerCase().includes(q),
    );
  }, [projects, search]);

  const filteredExperiments = useMemo(() => {
    if (!search) return experiments;
    const q = search.toLowerCase();
    return experiments.filter(
      (e) => e.name.toLowerCase().includes(q) || e.type.toLowerCase().includes(q) || e.status.toLowerCase().includes(q),
    );
  }, [experiments, search]);

  const filteredPatents = useMemo(() => {
    if (!search) return patents;
    const q = search.toLowerCase();
    return patents.filter(
      (p) => p.title.toLowerCase().includes(q) || p.type.toLowerCase().includes(q) || p.status.toLowerCase().includes(q),
    );
  }, [patents, search]);

  const filteredInnovations = useMemo(() => {
    if (!search) return innovations;
    const q = search.toLowerCase();
    return innovations.filter(
      (i) => i.title.toLowerCase().includes(q) || i.type.toLowerCase().includes(q) || i.status.toLowerCase().includes(q),
    );
  }, [innovations, search]);

  const tabs: { id: TabId; label: string; icon: typeof FlaskConical }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'projects', label: 'Projects', icon: FlaskConical },
    { id: 'experiments', label: 'Experiments', icon: Beaker },
    { id: 'patents', label: 'Patents', icon: FileText },
    { id: 'innovations', label: 'Innovations', icon: Lightbulb },
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
              <div className="text-xs text-fg-tertiary">Active Projects</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeProjects}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Completed Projects</div>
              <div className="mt-1 text-2xl font-bold">{metrics.completedProjects}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Experiments</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeExperiments}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Granted Patents</div>
              <div className="mt-1 text-2xl font-bold">{metrics.grantedPatents}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Launched Innovations</div>
              <div className="mt-1 text-2xl font-bold">{metrics.launchedInnovations}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Project Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byProjectType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Project Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byProjectStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Patent Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byPatentStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Innovation Stage Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byInnovationStage).map(([stage, count]) => (
                <Badge key={stage} variant="info">{stage.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'projects' && (
        <div className="space-y-3">
          {filteredProjects.length === 0 ? (
            <Card className="p-8"><EmptyState icon={FlaskConical} title="No projects" description="R&D projects will appear here." /></Card>
          ) : (
            filteredProjects.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-fg-secondary">{p.type.replace('_', ' ')} · {p.lead || 'Unassigned'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.budget > 0 && <Badge variant="default">${p.budget.toLocaleString()}</Badge>}
                    <Badge variant={statusVariant(p.status)}>{p.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'experiments' && (
        <div className="space-y-3">
          {filteredExperiments.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Beaker} title="No experiments" description="Experiments will appear here." /></Card>
          ) : (
            filteredExperiments.map((e) => (
              <Card key={e.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{e.name}</div>
                    <div className="text-sm text-fg-secondary">{e.type.replace('_', ' ')} · {e.researcher || 'Unassigned'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant(e.result)}>{e.result}</Badge>
                    <Badge variant={statusVariant(e.status)}>{e.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'patents' && (
        <div className="space-y-3">
          {filteredPatents.length === 0 ? (
            <Card className="p-8"><EmptyState icon={FileText} title="No patents" description="Patents will appear here." /></Card>
          ) : (
            filteredPatents.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.title}</div>
                    <div className="text-sm text-fg-secondary">{p.type.replace('_', ' ')} · {p.inventor || 'Unknown'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.applicationNumber && <Badge variant="default">{p.applicationNumber}</Badge>}
                    <Badge variant={statusVariant(p.status)}>{p.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'innovations' && (
        <div className="space-y-3">
          {filteredInnovations.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Lightbulb} title="No innovations" description="Innovations will appear here." /></Card>
          ) : (
            filteredInnovations.map((i) => (
              <Card key={i.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{i.title}</div>
                    <div className="text-sm text-fg-secondary">{i.type.replace('_', ' ')} · {i.owner || 'Unassigned'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {i.estimatedValue > 0 && <Badge variant="default">${i.estimatedValue.toLocaleString()}</Badge>}
                    <Badge variant={statusVariant(i.status)}>{i.status.replace('_', ' ')}</Badge>
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
