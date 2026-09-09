'use client';

import { useState, useMemo } from 'react';
import {
  ShieldCheck, ClipboardCheck, AlertTriangle, Wrench,
  Search, BarChart3, FileSearch, CheckCircle, XCircle,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

// ── Types ──

type StandardType = 'ISO 9001' | 'ISO 14001' | 'ISO 27001' | 'Six Sigma' | 'Lean' | 'custom';
type InspectionStatus = 'scheduled' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
type NonconformanceSeverity = 'minor' | 'major' | 'critical';
type NonconformanceStatus = 'open' | 'investigating' | 'in_review' | 'closed';
type CAPAType = 'corrective' | 'preventive' | 'both';
type CAPAStatus = 'open' | 'in_progress' | 'pending_verification' | 'completed' | 'verified' | 'cancelled';
type AuditStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

interface QualityStandard {
  id: string;
  name: string;
  standard: StandardType;
  description: string;
  requirements: string[];
  version: string;
  isActive: boolean;
  createdAt: Date;
}

interface InspectionItem {
  name: string;
  passed: boolean;
  notes?: string;
}

interface Inspection {
  id: string;
  standardId: string | null;
  title: string;
  description: string;
  inspector: string;
  date: string;
  items: InspectionItem[];
  status: InspectionStatus;
  passRate: number;
  passedCount: number;
  failedCount: number;
  totalCount: number;
  createdAt: Date;
}

interface Nonconformance {
  id: string;
  inspectionId: string | null;
  title: string;
  description: string;
  severity: NonconformanceSeverity;
  category: string;
  status: NonconformanceStatus;
  detectedBy: string;
  detectedDate: string;
  affectedProduct: string;
  affectedProcess: string;
  resolution: string | null;
  closedAt: string | null;
  createdAt: Date;
}

interface CAPA {
  id: string;
  nonconformanceId: string | null;
  title: string;
  description: string;
  type: CAPAType;
  rootCause: string;
  correctiveAction: string;
  preventiveAction: string;
  assignedTo: string;
  dueDate: string | null;
  status: CAPAStatus;
  completedAt: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  results: string | null;
  createdAt: Date;
}

interface AuditFinding {
  description: string;
  severity: NonconformanceSeverity;
  recommendation?: string;
}

interface QualityAudit {
  id: string;
  standardId: string | null;
  title: string;
  auditor: string;
  date: string;
  scope: string;
  criteria: string;
  status: AuditStatus;
  findings: AuditFinding[];
  completedAt: string | null;
  createdAt: Date;
}

interface RootCauseAnalysis {
  id: string;
  nonconformanceId: string | null;
  problem: string;
  method: string;
  rootCause: string;
  contributingFactors: string[];
  recommendations: string[];
  createdAt: Date;
}

interface QualityMetrics {
  inspectionPassRate: number;
  totalInspections: number;
  openNonconformances: number;
  openCAPAs: number;
  auditCompletionRate: number;
  totalAudits: number;
  criticalNonconformances: number;
}

interface QualityStats {
  standardCount: number;
  activeStandardCount: number;
  inspectionCount: number;
  completedInspectionCount: number;
  nonconformanceCount: number;
  openNonconformanceCount: number;
  capaCount: number;
  openCAPACount: number;
  auditCount: number;
  completedAuditCount: number;
  rootCauseCount: number;
  inspectionPassRate: number;
  auditCompletionRate: number;
}

interface QualityManagementDashboardProps {
  organizationId: string;
  standards: QualityStandard[];
  inspections: Inspection[];
  nonconformances: Nonconformance[];
  capas: CAPA[];
  audits: QualityAudit[];
  rootCauses: RootCauseAnalysis[];
  metrics: QualityMetrics;
  stats: QualityStats;
}

// ── Helpers ──

const standardVariant: Record<StandardType, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  'ISO 9001': 'info',
  'ISO 14001': 'success',
  'ISO 27001': 'accent',
  'Six Sigma': 'warning',
  'Lean': 'default',
  'custom': 'default',
};

const inspectionStatusVariant: Record<InspectionStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  scheduled: 'info',
  in_progress: 'accent',
  completed: 'success',
  failed: 'danger',
  cancelled: 'default',
};

const severityVariant: Record<NonconformanceSeverity, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  minor: 'default',
  major: 'warning',
  critical: 'danger',
};

const ncStatusVariant: Record<NonconformanceStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  open: 'danger',
  investigating: 'warning',
  in_review: 'info',
  closed: 'success',
};

const capaStatusVariant: Record<CAPAStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  open: 'danger',
  in_progress: 'accent',
  pending_verification: 'warning',
  completed: 'info',
  verified: 'success',
  cancelled: 'default',
};

const capaTypeVariant: Record<CAPAType, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  corrective: 'warning',
  preventive: 'info',
  both: 'accent',
};

const auditStatusVariant: Record<AuditStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  scheduled: 'info',
  in_progress: 'accent',
  completed: 'success',
  cancelled: 'default',
};

function formatDate(d: Date | string | null): string {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
}

// ── Component ──

type TabId = 'overview' | 'standards' | 'inspections' | 'nonconformances' | 'capas' | 'audits' | 'root_cause';

export function QualityManagementDashboard({
  organizationId: _organizationId,
  standards,
  inspections,
  nonconformances,
  capas,
  audits,
  rootCauses,
  metrics,
  stats,
}: QualityManagementDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const standardName = (id: string | null) => (id ? standards.find((s) => s.id === id)?.name || id : '—');

  const filteredStandards = useMemo(() => {
    if (!search) return standards;
    const q = search.toLowerCase();
    return standards.filter(
      (s) => s.name.toLowerCase().includes(q) || s.standard.toLowerCase().includes(q) || s.description.toLowerCase().includes(q),
    );
  }, [standards, search]);

  const filteredInspections = useMemo(() => {
    if (!search) return inspections;
    const q = search.toLowerCase();
    return inspections.filter(
      (i) => i.title.toLowerCase().includes(q) || i.inspector.toLowerCase().includes(q) || i.status.toLowerCase().includes(q),
    );
  }, [inspections, search]);

  const filteredNonconformances = useMemo(() => {
    if (!search) return nonconformances;
    const q = search.toLowerCase();
    return nonconformances.filter(
      (n) => n.title.toLowerCase().includes(q) || n.detectedBy.toLowerCase().includes(q) || n.category.toLowerCase().includes(q),
    );
  }, [nonconformances, search]);

  const filteredCAPAs = useMemo(() => {
    if (!search) return capas;
    const q = search.toLowerCase();
    return capas.filter(
      (c) => c.title.toLowerCase().includes(q) || c.assignedTo.toLowerCase().includes(q) || c.type.toLowerCase().includes(q),
    );
  }, [capas, search]);

  const filteredAudits = useMemo(() => {
    if (!search) return audits;
    const q = search.toLowerCase();
    return audits.filter(
      (a) => a.title.toLowerCase().includes(q) || a.auditor.toLowerCase().includes(q) || a.scope.toLowerCase().includes(q),
    );
  }, [audits, search]);

  const filteredRootCauses = useMemo(() => {
    if (!search) return rootCauses;
    const q = search.toLowerCase();
    return rootCauses.filter(
      (r) => r.problem.toLowerCase().includes(q) || r.rootCause.toLowerCase().includes(q) || r.method.toLowerCase().includes(q),
    );
  }, [rootCauses, search]);

  const tabs: { id: TabId; label: string; icon: typeof ShieldCheck }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'standards', label: 'Standards', icon: ShieldCheck },
    { id: 'inspections', label: 'Inspections', icon: ClipboardCheck },
    { id: 'nonconformances', label: 'Nonconformances', icon: AlertTriangle },
    { id: 'capas', label: 'CAPAs', icon: Wrench },
    { id: 'audits', label: 'Audits', icon: FileSearch },
    { id: 'root_cause', label: 'Root Cause', icon: CheckCircle },
  ];

  return (
    <div className="space-y-6">
      {/* Stats overview */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Standards</span>
          </div>
          <p className="text-2xl font-semibold">{stats.standardCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.activeStandardCount} active</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <ClipboardCheck className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Inspections</span>
          </div>
          <p className="text-2xl font-semibold">{stats.inspectionCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.inspectionPassRate}% pass rate</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Nonconformances</span>
          </div>
          <p className="text-2xl font-semibold">{stats.nonconformanceCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.openNonconformanceCount} open · {metrics.criticalNonconformances} critical</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Wrench className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">CAPAs</span>
          </div>
          <p className="text-2xl font-semibold">{stats.capaCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.openCAPACount} open</p>
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
                <h2 className="heading-display text-lg">Quality Metrics</h2>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Inspection pass rate</span>
                  <span className="font-medium">{metrics.inspectionPassRate}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Open nonconformances</span>
                  <span className="font-medium">{metrics.openNonconformances}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Critical nonconformances</span>
                  <span className="font-medium">{metrics.criticalNonconformances}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Open CAPAs</span>
                  <span className="font-medium">{metrics.openCAPAs}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Audit completion rate</span>
                  <span>{metrics.auditCompletionRate}%</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="h-5 w-5 text-accent-primary" />
                <h2 className="heading-display text-lg">Counts</h2>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Standards</span>
                  <span className="font-medium">{stats.standardCount} ({stats.activeStandardCount} active)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Inspections</span>
                  <span className="font-medium">{stats.inspectionCount} ({stats.completedInspectionCount} completed)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">CAPAs</span>
                  <span className="font-medium">{stats.capaCount} ({stats.openCAPACount} open)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Audits</span>
                  <span className="font-medium">{stats.auditCount} ({stats.completedAuditCount} completed)</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Root cause analyses</span>
                  <span>{stats.rootCauseCount}</span>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="font-semibold mb-3">Open Nonconformances</h3>
            {nonconformances.filter((n) => n.status !== 'closed').length === 0 ? (
              <p className="text-sm text-fg-secondary">No open nonconformances.</p>
            ) : (
              <div className="space-y-2">
                {nonconformances.filter((n) => n.status !== 'closed').slice(0, 5).map((n) => (
                  <div key={n.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{n.title}</p>
                      <p className="text-xs text-fg-secondary">{n.category || 'Uncategorized'} · {n.detectedBy}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={severityVariant[n.severity]}>{n.severity}</Badge>
                      <Badge variant={ncStatusVariant[n.status]}>{n.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'standards' && (
        <div className="space-y-4">
          {filteredStandards.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={ShieldCheck}
                title="No quality standards"
                description="Create a quality standard to get started."
              />
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredStandards.map((standard) => (
                <Card key={standard.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{standard.name}</h3>
                      <p className="text-xs text-fg-secondary">v{standard.version}</p>
                    </div>
                    <Badge variant={standardVariant[standard.standard]}>{standard.standard}</Badge>
                  </div>
                  {standard.description && (
                    <p className="text-sm text-fg-secondary mb-3 line-clamp-2">{standard.description}</p>
                  )}
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Requirements</span>
                      <span className="font-medium">{standard.requirements.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Status</span>
                      <span className="font-medium">{standard.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'inspections' && (
        <div className="space-y-4">
          {filteredInspections.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={ClipboardCheck}
                title="No inspections"
                description="Create an inspection to see it here."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Title</th>
                    <th className="p-3 font-medium">Standard</th>
                    <th className="p-3 font-medium">Inspector</th>
                    <th className="p-3 font-medium">Date</th>
                    <th className="p-3 font-medium">Pass Rate</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInspections.map((inspection) => (
                    <tr key={inspection.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{inspection.title}</td>
                      <td className="p-3">{standardName(inspection.standardId)}</td>
                      <td className="p-3">{inspection.inspector}</td>
                      <td className="p-3">{formatDate(inspection.date)}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1">
                          {inspection.passRate >= 100 ? (
                            <CheckCircle className="h-3.5 w-3.5 text-success" />
                          ) : inspection.failedCount > 0 ? (
                            <XCircle className="h-3.5 w-3.5 text-danger" />
                          ) : null}
                          {inspection.passRate}% ({inspection.passedCount}/{inspection.totalCount})
                        </span>
                      </td>
                      <td className="p-3">
                        <Badge variant={inspectionStatusVariant[inspection.status]}>{inspection.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'nonconformances' && (
        <div className="space-y-4">
          {filteredNonconformances.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={AlertTriangle}
                title="No nonconformances"
                description="Nonconformances will appear here once detected."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Title</th>
                    <th className="p-3 font-medium">Category</th>
                    <th className="p-3 font-medium">Detected By</th>
                    <th className="p-3 font-medium">Detected Date</th>
                    <th className="p-3 font-medium">Severity</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNonconformances.map((nc) => (
                    <tr key={nc.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{nc.title}</td>
                      <td className="p-3 capitalize">{nc.category || '—'}</td>
                      <td className="p-3">{nc.detectedBy}</td>
                      <td className="p-3">{formatDate(nc.detectedDate)}</td>
                      <td className="p-3">
                        <Badge variant={severityVariant[nc.severity]}>{nc.severity}</Badge>
                      </td>
                      <td className="p-3">
                        <Badge variant={ncStatusVariant[nc.status]}>{nc.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'capas' && (
        <div className="space-y-4">
          {filteredCAPAs.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Wrench}
                title="No CAPAs"
                description="Corrective and preventive actions will appear here."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Title</th>
                    <th className="p-3 font-medium">Type</th>
                    <th className="p-3 font-medium">Assigned To</th>
                    <th className="p-3 font-medium">Due Date</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCAPAs.map((capa) => (
                    <tr key={capa.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{capa.title}</td>
                      <td className="p-3">
                        <Badge variant={capaTypeVariant[capa.type]}>{capa.type}</Badge>
                      </td>
                      <td className="p-3">{capa.assignedTo || '—'}</td>
                      <td className="p-3">{formatDate(capa.dueDate)}</td>
                      <td className="p-3">
                        <Badge variant={capaStatusVariant[capa.status]}>{capa.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'audits' && (
        <div className="space-y-4">
          {filteredAudits.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={FileSearch}
                title="No audits"
                description="Quality audits will appear here once scheduled."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Title</th>
                    <th className="p-3 font-medium">Standard</th>
                    <th className="p-3 font-medium">Auditor</th>
                    <th className="p-3 font-medium">Date</th>
                    <th className="p-3 font-medium">Findings</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAudits.map((audit) => (
                    <tr key={audit.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{audit.title}</td>
                      <td className="p-3">{standardName(audit.standardId)}</td>
                      <td className="p-3">{audit.auditor}</td>
                      <td className="p-3">{formatDate(audit.date)}</td>
                      <td className="p-3">{audit.findings.length}</td>
                      <td className="p-3">
                        <Badge variant={auditStatusVariant[audit.status]}>{audit.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'root_cause' && (
        <div className="space-y-4">
          {filteredRootCauses.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={CheckCircle}
                title="No root cause analyses"
                description="Root cause analyses will appear here."
              />
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredRootCauses.map((rca) => (
                <Card key={rca.id} className="p-4">
                  <h3 className="font-semibold mb-1">{rca.problem}</h3>
                  {rca.method && (
                    <p className="text-xs text-fg-secondary mb-2">Method: {rca.method}</p>
                  )}
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-xs text-fg-secondary">Root Cause</p>
                      <p>{rca.rootCause}</p>
                    </div>
                    {rca.contributingFactors.length > 0 && (
                      <div>
                        <p className="text-xs text-fg-secondary">Contributing Factors</p>
                        <ul className="list-disc list-inside">
                          {rca.contributingFactors.map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {rca.recommendations.length > 0 && (
                      <div>
                        <p className="text-xs text-fg-secondary">Recommendations</p>
                        <ul className="list-disc list-inside">
                          {rca.recommendations.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
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
