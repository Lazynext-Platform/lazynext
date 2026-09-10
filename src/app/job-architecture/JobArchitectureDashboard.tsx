'use client';

import { useState, useMemo } from 'react';
import {
  Network, Layers, Briefcase, Route, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  JobFamily, JobLevel, JobRole, CareerPath,
  JobArchitectureMetrics, JobArchitectureStats,
} from '@/lib/services/job-architecture-service';

type TabId = 'overview' | 'families' | 'levels' | 'roles' | 'paths';

interface JobArchitectureDashboardProps {
  organizationId: string;
  families: JobFamily[];
  levels: JobLevel[];
  roles: JobRole[];
  paths: CareerPath[];
  metrics: JobArchitectureMetrics;
  stats: JobArchitectureStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['active', 'verified', 'completed'].includes(status)) return 'success';
  if (['planned', 'in_progress', 'draft', 'scheduled'].includes(status)) return 'warning';
  if (['archived', 'deprecated', 'inactive', 'cancelled'].includes(status)) return 'danger';
  return 'info';
};

export function JobArchitectureDashboard({
  families, levels, roles, paths, metrics, stats,
}: JobArchitectureDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const filteredFamilies = useMemo(() => {
    if (!search) return families;
    const q = search.toLowerCase();
    return families.filter(
      (f) => f.name.toLowerCase().includes(q) || f.type.toLowerCase().includes(q) || f.status.toLowerCase().includes(q),
    );
  }, [families, search]);

  const filteredLevels = useMemo(() => {
    if (!search) return levels;
    const q = search.toLowerCase();
    return levels.filter(
      (l) => l.name.toLowerCase().includes(q) || l.type.toLowerCase().includes(q) || l.status.toLowerCase().includes(q),
    );
  }, [levels, search]);

  const filteredRoles = useMemo(() => {
    if (!search) return roles;
    const q = search.toLowerCase();
    return roles.filter(
      (r) => r.title.toLowerCase().includes(q) || r.type.toLowerCase().includes(q) || r.status.toLowerCase().includes(q),
    );
  }, [roles, search]);

  const filteredPaths = useMemo(() => {
    if (!search) return paths;
    const q = search.toLowerCase();
    return paths.filter(
      (p) => p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q) || p.status.toLowerCase().includes(q),
    );
  }, [paths, search]);

  const tabs: { id: TabId; label: string; icon: typeof Network }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'families', label: 'Families', icon: Network },
    { id: 'levels', label: 'Levels', icon: Layers },
    { id: 'roles', label: 'Roles', icon: Briefcase },
    { id: 'paths', label: 'Career Paths', icon: Route },
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
              <div className="text-xs text-fg-tertiary">Active Families</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeFamilies}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Levels</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeLevels}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Roles</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeRoles}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Paths</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activePaths}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Total Headcount</div>
              <div className="mt-1 text-2xl font-bold">{metrics.totalHeadcount}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Family Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byFamilyType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Level Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byLevelType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Role Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byRoleStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Path Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byPathType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'families' && (
        <div className="space-y-3">
          {filteredFamilies.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Network} title="No job families" description="Job families will appear here." /></Card>
          ) : (
            filteredFamilies.map((f) => (
              <Card key={f.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{f.name}</div>
                    <div className="text-sm text-fg-secondary">{f.type.replace('_', ' ')} · {f.headcount} headcount</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {f.parentFamilyId && <Badge variant="default">Sub-family</Badge>}
                    <Badge variant={statusVariant(f.status)}>{f.status}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'levels' && (
        <div className="space-y-3">
          {filteredLevels.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Layers} title="No job levels" description="Job levels will appear here." /></Card>
          ) : (
            filteredLevels.map((l) => (
              <Card key={l.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{l.name}</div>
                    <div className="text-sm text-fg-secondary">{l.type.replace('_', ' ')} · Grade {l.grade}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {l.maxSalary > 0 && <Badge variant="default">${l.minSalary.toLocaleString()}–${l.maxSalary.toLocaleString()}</Badge>}
                    <Badge variant={statusVariant(l.status)}>{l.status}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'roles' && (
        <div className="space-y-3">
          {filteredRoles.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Briefcase} title="No job roles" description="Job roles will appear here." /></Card>
          ) : (
            filteredRoles.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{r.title}</div>
                    <div className="text-sm text-fg-secondary">{r.type.replace('_', ' ')} · {r.fte} FTE{r.reportsTo ? ` · Reports to ${r.reportsTo}` : ''}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.salaryRange && <Badge variant="default">{r.salaryRange}</Badge>}
                    <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'paths' && (
        <div className="space-y-3">
          {filteredPaths.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Route} title="No career paths" description="Career paths will appear here." /></Card>
          ) : (
            filteredPaths.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-fg-secondary">{p.type.replace('_', ' ')} · {p.steps.length} steps{p.estimatedDuration ? ` · ${p.estimatedDuration}` : ''}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
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
