'use client';

import { useState, useMemo } from 'react';
import {
  Leaf, Globe, TrendingDown, Recycle, Target, FileText, Search, BarChart3,
  Award, CheckCircle,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  ESGMetric, ESGTarget, ESGInitiative, ESGReport, CarbonEmission, ESGAssessment,
  SustainabilityStats, CarbonFootprint, ESGScore,
  ESGCategory, ESGTargetStatus, ESGInitiativeStatus, ESGReportStatus, ESGAssessmentStatus,
} from '@/lib/services/sustainability-service';

// ── Variant maps ──

const categoryVariant: Record<ESGCategory, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  environmental: 'success',
  social: 'info',
  governance: 'accent',
};

const targetStatusVariant: Record<ESGTargetStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  on_track: 'info',
  ahead: 'success',
  behind: 'warning',
  achieved: 'success',
  at_risk: 'danger',
};

const initiativeStatusVariant: Record<ESGInitiativeStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  planned: 'info',
  in_progress: 'accent',
  completed: 'success',
  on_hold: 'warning',
  cancelled: 'default',
};

const reportStatusVariant: Record<ESGReportStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  draft: 'default',
  in_review: 'warning',
  published: 'success',
};

const assessmentStatusVariant: Record<ESGAssessmentStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  pending: 'warning',
  in_progress: 'accent',
  completed: 'success',
};

// ── Helpers ──

function formatNumber(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatDate(d: Date | string | null): string {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
}

// ── Props ──

interface SustainabilityDashboardProps {
  organizationId: string;
  metrics: ESGMetric[];
  targets: ESGTarget[];
  initiatives: ESGInitiative[];
  reports: ESGReport[];
  carbonEmissions: CarbonEmission[];
  assessments: ESGAssessment[];
  stats: SustainabilityStats;
  carbonFootprint: CarbonFootprint;
  esgScore: ESGScore;
}

// ── Component ──

type TabId = 'overview' | 'metrics' | 'targets' | 'initiatives' | 'reports' | 'carbon' | 'assessments';

export function SustainabilityDashboard({
  organizationId: _organizationId,
  metrics,
  targets,
  initiatives,
  reports,
  carbonEmissions,
  assessments,
  stats,
  carbonFootprint,
  esgScore,
}: SustainabilityDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const metricName = (id: string) => {
    const m = metrics.find((m) => m.id === id);
    return m ? m.name : id;
  };

  const filteredMetrics = useMemo(() => {
    if (!search) return metrics;
    const q = search.toLowerCase();
    return metrics.filter(
      (m) => m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q) || m.period.toLowerCase().includes(q),
    );
  }, [metrics, search]);

  const filteredTargets = useMemo(() => {
    if (!search) return targets;
    const q = search.toLowerCase();
    return targets.filter(
      (t) => t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q) || t.status.toLowerCase().includes(q),
    );
  }, [targets, search]);

  const filteredInitiatives = useMemo(() => {
    if (!search) return initiatives;
    const q = search.toLowerCase();
    return initiatives.filter(
      (i) => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q) || i.status.toLowerCase().includes(q) || i.owner.toLowerCase().includes(q),
    );
  }, [initiatives, search]);

  const filteredReports = useMemo(() => {
    if (!search) return reports;
    const q = search.toLowerCase();
    return reports.filter(
      (r) => r.title.toLowerCase().includes(q) || r.type.toLowerCase().includes(q) || r.status.toLowerCase().includes(q) || r.period.toLowerCase().includes(q),
    );
  }, [reports, search]);

  const filteredEmissions = useMemo(() => {
    if (!search) return carbonEmissions;
    const q = search.toLowerCase();
    return carbonEmissions.filter(
      (e) => e.source.toLowerCase().includes(q) || e.period.toLowerCase().includes(q) || e.facility.toLowerCase().includes(q),
    );
  }, [carbonEmissions, search]);

  const filteredAssessments = useMemo(() => {
    if (!search) return assessments;
    const q = search.toLowerCase();
    return assessments.filter(
      (a) => a.framework.toLowerCase().includes(q) || a.assessor.toLowerCase().includes(q) || a.status.toLowerCase().includes(q),
    );
  }, [assessments, search]);

  const tabs: { id: TabId; label: string; icon: typeof Leaf }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'metrics', label: 'Metrics', icon: Leaf },
    { id: 'targets', label: 'Targets', icon: Target },
    { id: 'initiatives', label: 'Initiatives', icon: Recycle },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'carbon', label: 'Carbon', icon: TrendingDown },
    { id: 'assessments', label: 'Assessments', icon: Award },
  ];

  return (
    <div className="space-y-6">
      {/* Stats overview */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Leaf className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Metrics</span>
          </div>
          <p className="text-2xl font-semibold">{stats.metricCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.targetCount} targets</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Recycle className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Initiatives</span>
          </div>
          <p className="text-2xl font-semibold">{stats.initiativeCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.reportCount} reports</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Net Emissions</span>
          </div>
          <p className="text-2xl font-semibold">{formatNumber(stats.netEmissions)}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{formatNumber(stats.totalOffset)} offset</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Award className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">ESG Score</span>
          </div>
          <p className="text-2xl font-semibold">{esgScore.overall}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.assessmentCount} assessments</p>
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
                <Globe className="h-5 w-5 text-accent-primary" />
                <h2 className="heading-display text-lg">Carbon Footprint</h2>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Scope 1</span>
                  <span className="font-medium">{formatNumber(carbonFootprint.scope1)} tCO₂e</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Scope 2</span>
                  <span className="font-medium">{formatNumber(carbonFootprint.scope2)} tCO₂e</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Scope 3</span>
                  <span className="font-medium">{formatNumber(carbonFootprint.scope3)} tCO₂e</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Total offset</span>
                  <span className="font-medium">{formatNumber(carbonFootprint.totalOffset)} tCO₂e</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Net total</span>
                  <span>{formatNumber(carbonFootprint.netTotal)} tCO₂e</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Award className="h-5 w-5 text-accent-primary" />
                <h2 className="heading-display text-lg">ESG Score</h2>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Environmental</span>
                  <span className="font-medium">{esgScore.environmental}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Social</span>
                  <span className="font-medium">{esgScore.social}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Governance</span>
                  <span className="font-medium">{esgScore.governance}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Overall</span>
                  <span>{esgScore.overall}</span>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="font-semibold mb-3">Active Targets</h3>
            {targets.filter((t) => t.status !== 'achieved').length === 0 ? (
              <p className="text-sm text-fg-secondary">No active targets.</p>
            ) : (
              <div className="space-y-2">
                {targets.filter((t) => t.status !== 'achieved').slice(0, 5).map((t) => {
                  const range = t.target - t.baseline;
                  const progress = range !== 0 ? Math.min(Math.max(((t.current - t.baseline) / range) * 100, 0), 100) : 100;
                  return (
                    <div key={t.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium">{t.name}</p>
                        <p className="text-xs text-fg-secondary">{t.category} · {progress.toFixed(0)}% progress</p>
                      </div>
                      <Badge variant={targetStatusVariant[t.status]}>{t.status.replace(/_/g, ' ')}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'metrics' && (
        <div className="space-y-4">
          {filteredMetrics.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Leaf}
                title="No metrics"
                description="Create an ESG metric to get started."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Name</th>
                    <th className="p-3 font-medium">Category</th>
                    <th className="p-3 font-medium">Value</th>
                    <th className="p-3 font-medium">Target</th>
                    <th className="p-3 font-medium">Unit</th>
                    <th className="p-3 font-medium">Period</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMetrics.map((m) => (
                    <tr key={m.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{m.name}</td>
                      <td className="p-3">
                        <Badge variant={categoryVariant[m.category]}>{m.category}</Badge>
                      </td>
                      <td className="p-3">{formatNumber(m.value)}</td>
                      <td className="p-3">{formatNumber(m.target)}</td>
                      <td className="p-3">{m.unit || '—'}</td>
                      <td className="p-3">{m.period || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'targets' && (
        <div className="space-y-4">
          {filteredTargets.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Target}
                title="No targets"
                description="ESG targets will appear here."
              />
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTargets.map((t) => {
                const range = t.target - t.baseline;
                const progress = range !== 0 ? Math.min(Math.max(((t.current - t.baseline) / range) * 100, 0), 100) : 100;
                return (
                  <Card key={t.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold">{t.name}</h3>
                        <p className="text-xs text-fg-secondary">{t.metricId ? metricName(t.metricId) : '—'}</p>
                      </div>
                      <Badge variant={targetStatusVariant[t.status]}>{t.status.replace(/_/g, ' ')}</Badge>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-fg-secondary">Baseline</span>
                        <span className="font-medium">{formatNumber(t.baseline)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-fg-secondary">Current</span>
                        <span className="font-medium">{formatNumber(t.current)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-fg-secondary">Target</span>
                        <span className="font-medium">{formatNumber(t.target)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-fg-secondary">Target date</span>
                        <span className="font-medium">{formatDate(t.targetDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-fg-secondary">Progress</span>
                        <span className="font-medium">{progress.toFixed(0)}%</span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'initiatives' && (
        <div className="space-y-4">
          {filteredInitiatives.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Recycle}
                title="No initiatives"
                description="Sustainability initiatives will appear here."
              />
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredInitiatives.map((i) => (
                <Card key={i.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{i.name}</h3>
                      <p className="text-xs text-fg-secondary">{i.owner || 'Unassigned'}</p>
                    </div>
                    <Badge variant={initiativeStatusVariant[i.status]}>{i.status.replace(/_/g, ' ')}</Badge>
                  </div>
                  {i.description && (
                    <p className="text-sm text-fg-secondary mb-3 line-clamp-2">{i.description}</p>
                  )}
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Category</span>
                      <span className="font-medium">{i.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Budget</span>
                      <span className="font-medium">{i.budget > 0 ? `$${formatNumber(i.budget)}` : '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Start</span>
                      <span className="font-medium">{formatDate(i.startDate)}</span>
                    </div>
                    {i.sdgGoals.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-fg-secondary">SDG Goals</span>
                        <span className="font-medium">{i.sdgGoals.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'reports' && (
        <div className="space-y-4">
          {filteredReports.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={FileText}
                title="No reports"
                description="ESG reports will appear here."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Title</th>
                    <th className="p-3 font-medium">Type</th>
                    <th className="p-3 font-medium">Period</th>
                    <th className="p-3 font-medium">Frameworks</th>
                    <th className="p-3 font-medium">Published</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{r.title}</td>
                      <td className="p-3 capitalize">{r.type}</td>
                      <td className="p-3">{r.period || '—'}</td>
                      <td className="p-3">{r.frameworks.length > 0 ? r.frameworks.join(', ') : '—'}</td>
                      <td className="p-3">{formatDate(r.publishedDate)}</td>
                      <td className="p-3">
                        <Badge variant={reportStatusVariant[r.status]}>{r.status.replace(/_/g, ' ')}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'carbon' && (
        <div className="space-y-4">
          {filteredEmissions.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={TrendingDown}
                title="No carbon emissions"
                description="Carbon emission records will appear here."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Scope</th>
                    <th className="p-3 font-medium">Source</th>
                    <th className="p-3 font-medium">Amount</th>
                    <th className="p-3 font-medium">Offset</th>
                    <th className="p-3 font-medium">Net</th>
                    <th className="p-3 font-medium">Period</th>
                    <th className="p-3 font-medium">Facility</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmissions.map((e) => (
                    <tr key={e.id} className="border-b last:border-0">
                      <td className="p-3">
                        <Badge variant={e.scope === 1 ? 'danger' : e.scope === 2 ? 'warning' : 'info'}>
                          Scope {e.scope}
                        </Badge>
                      </td>
                      <td className="p-3 font-medium">{e.source}</td>
                      <td className="p-3">{formatNumber(e.amount)} {e.unit}</td>
                      <td className="p-3">{formatNumber(e.offset)}</td>
                      <td className="p-3">{formatNumber(e.netEmission)}</td>
                      <td className="p-3">{e.period || '—'}</td>
                      <td className="p-3">{e.facility || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'assessments' && (
        <div className="space-y-4">
          {filteredAssessments.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Award}
                title="No assessments"
                description="ESG assessments will appear here."
              />
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredAssessments.map((a) => (
                <Card key={a.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{a.framework}</h3>
                      <p className="text-xs text-fg-secondary">{a.assessor || '—'}</p>
                    </div>
                    <Badge variant={assessmentStatusVariant[a.status]}>{a.status.replace(/_/g, ' ')}</Badge>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Rating</span>
                      <span className="font-medium">{a.rating || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Score</span>
                      <span className="font-medium">{a.score}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Date</span>
                      <span className="font-medium">{formatDate(a.assessmentDate)}</span>
                    </div>
                  </div>
                  {a.findings && (
                    <p className="text-sm text-fg-secondary mt-2 line-clamp-2">{a.findings}</p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
