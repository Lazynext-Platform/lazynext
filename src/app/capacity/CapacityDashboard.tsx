'use client';

import { useState } from 'react';
import {
  Gauge, AlertTriangle, TrendingDown, Users, Plus, BarChart3, Zap, Calendar,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

interface Allocation {
  id: string; userId: string; projectId: string | null; role: string;
  allocatedHours: number; maxHours: number; status: string; startDate: Date;
  endDate: Date | null;
}
interface UserUtilization {
  userId: string; allocatedHours: number; maxHours: number; utilization: number;
  allocationCount: number;
}
interface ProjectWorkload {
  projectId: string; allocatedHours: number; userCount: number;
}
interface Bottleneck extends UserUtilization {
  projectCount: number;
}
interface ForecastPoint {
  week: number; date: Date; allocatedHours: number; utilization: number;
}
interface Stats {
  total: number; byStatus: Record<string, number>; overallocatedCount: number; underutilizedCount: number;
}

function utilizationColor(u: number): string {
  if (u > 100) return 'bg-danger';
  if (u >= 80) return 'bg-warning';
  if (u < 60) return 'bg-info';
  return 'bg-success';
}

function utilizationLabel(u: number): 'danger' | 'warning' | 'info' | 'success' | 'default' {
  if (u > 100) return 'danger';
  if (u >= 80) return 'warning';
  if (u < 60) return 'info';
  return 'success';
}

export function CapacityDashboard({
  organizationId,
  allocations: initialAllocations,
  teamUtilization,
  overallocated,
  underutilized,
  workloadByProject,
  bottlenecks,
  forecast,
  stats,
}: {
  organizationId: string;
  allocations: Allocation[];
  teamUtilization: { users: UserUtilization[]; averageUtilization: number; totalAllocated: number; totalMax: number };
  overallocated: UserUtilization[];
  underutilized: UserUtilization[];
  workloadByProject: ProjectWorkload[];
  bottlenecks: Bottleneck[];
  forecast: ForecastPoint[];
  stats: Stats;
}) {
  const [allocations] = useState(initialAllocations);
  void organizationId;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Gauge className="h-3 w-3" /> Allocations
          </div>
          <div className="text-2xl font-semibold">{stats.total}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <TrendingDown className="h-3 w-3" /> Avg Utilization
          </div>
          <div className="text-2xl font-semibold">{teamUtilization.averageUtilization}%</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <AlertTriangle className="h-3 w-3" /> Overallocated
          </div>
          <div className="text-2xl font-semibold text-danger">{stats.overallocatedCount}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Users className="h-3 w-3" /> Underutilized
          </div>
          <div className="text-2xl font-semibold text-info">{stats.underutilizedCount}</div>
        </Card>
      </div>

      {/* Alerts */}
      {(overallocated.length > 0 || underutilized.length > 0) && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {overallocated.length > 0 && (
            <Card className="p-4 border-danger">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-danger" />
                <h2 className="heading-display text-base text-danger">Overallocated (&gt;100%)</h2>
              </div>
              <div className="space-y-2">
                {overallocated.map((u) => (
                  <div key={u.userId} className="flex items-center justify-between gap-2 rounded-lg bg-surface-alt p-2">
                    <span className="text-sm font-medium truncate">{u.userId}</span>
                    <Badge variant="danger" className="text-xs">{u.utilization}%</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
          {underutilized.length > 0 && (
            <Card className="p-4 border-info">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="h-5 w-5 text-info" />
                <h2 className="heading-display text-base text-info">Underutilized (&lt;60%)</h2>
              </div>
              <div className="space-y-2">
                {underutilized.map((u) => (
                  <div key={u.userId} className="flex items-center justify-between gap-2 rounded-lg bg-surface-alt p-2">
                    <span className="text-sm font-medium truncate">{u.userId}</span>
                    <Badge variant="info" className="text-xs">{u.utilization}%</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Utilization bars */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="heading-display text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-accent-primary" /> Team Utilization
          </h2>
          <Button size="sm" href="/api/capacity/allocations">
            <Plus className="h-4 w-4" /> New Allocation
          </Button>
        </div>
        {teamUtilization.users.length === 0 ? (
          <Card className="p-6">
            <EmptyState icon={Gauge} title="No allocations" description="Add resource allocations to track utilization." />
          </Card>
        ) : (
          <div className="space-y-3">
            {teamUtilization.users.map((u) => (
              <Card key={u.userId} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">{u.userId}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-fg-muted">{u.allocatedHours}h / {u.maxHours}h</span>
                    <Badge variant={utilizationLabel(u.utilization)} className="text-xs">{u.utilization}%</Badge>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-surface-alt overflow-hidden">
                  <div
                    className={`h-full rounded-full ${utilizationColor(u.utilization)} transition-all`}
                    style={{ width: `${Math.min(u.utilization, 100)}%` }}
                  />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Workload by project */}
      <div>
        <h2 className="heading-display text-lg mb-3 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-accent-primary" /> Workload by Project
        </h2>
        {workloadByProject.length === 0 ? (
          <Card className="p-6">
            <EmptyState icon={BarChart3} title="No project workload" description="Assign allocations to projects to see workload." />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {workloadByProject.map((p) => (
              <Card key={p.projectId} className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold truncate">{p.projectId}</span>
                  <Badge variant="default" className="text-xs">{p.userCount} users</Badge>
                </div>
                <div className="text-xs text-fg-muted">{p.allocatedHours}h allocated</div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Bottlenecks */}
      {bottlenecks.length > 0 && (
        <Card className="p-4 border-warning">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-5 w-5 text-warning" />
            <h2 className="heading-display text-lg text-warning">Bottlenecks</h2>
          </div>
          <div className="space-y-2">
            {bottlenecks.map((b) => (
              <div key={b.userId} className="flex items-center justify-between gap-2 rounded-lg bg-surface-alt p-2">
                <span className="text-sm font-medium truncate">{b.userId}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="default" className="text-xs">{b.projectCount} projects</Badge>
                  <Badge variant="danger" className="text-xs">{b.utilization}%</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Forecast */}
      <div>
        <h2 className="heading-display text-lg mb-3 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-accent-primary" /> 4-Week Forecast
        </h2>
        {forecast.length === 0 ? (
          <Card className="p-6">
            <EmptyState icon={Calendar} title="No forecast data" description="Add allocations to generate a forecast." />
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {forecast.map((f) => (
              <Card key={f.week} className="p-4">
                <div className="text-xs text-fg-secondary mb-1">Week {f.week}</div>
                <div className="text-sm font-semibold">{f.allocatedHours}h</div>
                <div className="text-xs text-fg-muted mt-1">{f.utilization}% util</div>
                <div className="text-xs text-fg-muted">{new Date(f.date).toLocaleDateString()}</div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Allocations list */}
      <div>
        <h2 className="heading-display text-lg mb-3 flex items-center gap-2">
          <Users className="h-5 w-5 text-accent-primary" /> Allocations
        </h2>
        {allocations.length === 0 ? (
          <Card className="p-6">
            <EmptyState icon={Users} title="No allocations" description="Create your first resource allocation." />
          </Card>
        ) : (
          <div className="space-y-2">
            {allocations.slice(0, 15).map((a) => (
              <Card key={a.id} className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium truncate">{a.userId}</span>
                    <Badge variant="default" className="text-xs">{a.role}</Badge>
                    {a.projectId && <Badge variant="info" className="text-xs">{a.projectId}</Badge>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-fg-muted">{a.allocatedHours}h/{a.maxHours}h</span>
                    <Badge variant={a.status === 'active' ? 'success' : 'default'} className="text-xs">{a.status}</Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
