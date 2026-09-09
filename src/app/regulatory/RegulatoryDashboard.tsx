'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  FileText, AlertCircle, CheckSquare, Send, Eye,
  Search, BarChart3, Clock, ShieldAlert, Activity,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

// ── Types ──

type FilingStatus = 'pending' | 'submitted' | 'accepted' | 'rejected' | 'withdrawn' | 'expired';
type ImpactLevel = 'low' | 'medium' | 'high' | 'critical';
type ChangeStatus = 'monitoring' | 'assessed' | 'implementing' | 'implemented' | 'archived';
type RequirementStatus = 'active' | 'inactive' | 'archived' | 'non_compliant' | 'compliant';
type SubmissionStatus = 'draft' | 'submitted' | 'responded' | 'archived';
type MonitoringStatus = 'active' | 'paused' | 'archived';

interface RegulatoryFiling {
  id: string;
  title: string;
  type: string;
  jurisdiction: string;
  agency: string;
  status: FilingStatus;
  dueDate: Date | null;
  submittedDate: Date | null;
  acceptedDate: Date | null;
  description: string;
  requirements: string[];
  fees: string;
  notes: string;
  createdAt: Date;
}

interface RegulatoryChange {
  id: string;
  title: string;
  type: string;
  jurisdiction: string;
  agency: string;
  description: string;
  effectiveDate: Date | null;
  impactLevel: ImpactLevel;
  impactAreas: string[];
  status: ChangeStatus;
  source: string;
  reference: string;
  createdAt: Date;
}

interface RegulatoryRequirement {
  id: string;
  title: string;
  description: string;
  jurisdiction: string;
  agency: string;
  category: string;
  frequency: string;
  owner: string;
  status: RequirementStatus;
  nextAssessment: Date | null;
  references: string[];
  createdAt: Date;
}

interface RegulatorySubmission {
  id: string;
  filingId: string | null;
  title: string;
  type: string;
  recipient: string;
  submittedDate: Date | null;
  status: SubmissionStatus;
  response: string;
  responseDate: Date | null;
  createdAt: Date;
}

interface RegulatoryMonitoring {
  id: string;
  topic: string;
  jurisdiction: string;
  agency: string;
  sources: string[];
  frequency: string;
  status: MonitoringStatus;
  lastChecked: Date | null;
  findings: Array<{ date: Date; description: string; severity: string }>;
  assignedTo: string;
  createdAt: Date;
}

interface RegulatoryMetrics {
  pendingFilings: number;
  upcomingDeadlines: number;
  highImpactChanges: number;
  complianceRate: number;
  monitoringCoverage: number;
  activeRequirements: number;
  openSubmissions: number;
}

interface RegulatoryStats {
  filingCount: number;
  changeCount: number;
  requirementCount: number;
  submissionCount: number;
  monitoringCount: number;
  pendingFilingCount: number;
  acceptedFilingCount: number;
  rejectedFilingCount: number;
  highImpactChangeCount: number;
  activeRequirementCount: number;
  activeMonitoringCount: number;
  byFilingStatus: Record<string, number>;
  byChangeStatus: Record<string, number>;
  byRequirementStatus: Record<string, number>;
}

interface RegulatoryDashboardProps {
  organizationId: string;
  filings: RegulatoryFiling[];
  changes: RegulatoryChange[];
  requirements: RegulatoryRequirement[];
  submissions: RegulatorySubmission[];
  monitoring: RegulatoryMonitoring[];
  metrics: RegulatoryMetrics;
  stats: RegulatoryStats;
}

// ── Helpers ──

const filingStatusVariant: Record<FilingStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  pending: 'warning',
  submitted: 'info',
  accepted: 'success',
  rejected: 'danger',
  withdrawn: 'default',
  expired: 'default',
};

const impactLevelVariant: Record<ImpactLevel, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  low: 'default',
  medium: 'info',
  high: 'warning',
  critical: 'danger',
};

const changeStatusVariant: Record<ChangeStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  monitoring: 'info',
  assessed: 'accent',
  implementing: 'warning',
  implemented: 'success',
  archived: 'default',
};

const requirementStatusVariant: Record<RequirementStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  active: 'info',
  inactive: 'default',
  archived: 'default',
  non_compliant: 'danger',
  compliant: 'success',
};

const submissionStatusVariant: Record<SubmissionStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  draft: 'default',
  submitted: 'info',
  responded: 'success',
  archived: 'default',
};

const monitoringStatusVariant: Record<MonitoringStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  active: 'success',
  paused: 'warning',
  archived: 'default',
};

function formatDate(d: Date | string | null): string {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
}

// ── Component ──

type TabId = 'overview' | 'filings' | 'changes' | 'requirements' | 'submissions' | 'monitoring';

export function RegulatoryDashboard({
  organizationId: _organizationId,
  filings,
  changes,
  requirements,
  submissions,
  monitoring,
  metrics,
  stats,
}: RegulatoryDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const filterBySearch = useCallback(<T,>(items: T[], fields: Array<keyof T>): T[] => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter((item) =>
      fields.some((field) => {
        const val = item[field];
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(q);
      }),
    );
  }, [search]);

  const filteredFilings = useMemo(
    () => filterBySearch(filings, ['title', 'type', 'jurisdiction', 'agency', 'status']),
    [filterBySearch, filings],
  );

  const filteredChanges = useMemo(
    () => filterBySearch(changes, ['title', 'type', 'jurisdiction', 'agency', 'status']),
    [filterBySearch, changes],
  );

  const filteredRequirements = useMemo(
    () => filterBySearch(requirements, ['title', 'jurisdiction', 'agency', 'category', 'owner', 'status']),
    [filterBySearch, requirements],
  );

  const filteredSubmissions = useMemo(
    () => filterBySearch(submissions, ['title', 'type', 'recipient', 'status']),
    [filterBySearch, submissions],
  );

  const filteredMonitoring = useMemo(
    () => filterBySearch(monitoring, ['topic', 'jurisdiction', 'agency', 'status', 'frequency']),
    [filterBySearch, monitoring],
  );

  const tabs: { id: TabId; label: string; icon: typeof FileText }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'filings', label: 'Filings', icon: FileText },
    { id: 'changes', label: 'Changes', icon: AlertCircle },
    { id: 'requirements', label: 'Requirements', icon: CheckSquare },
    { id: 'submissions', label: 'Submissions', icon: Send },
    { id: 'monitoring', label: 'Monitoring', icon: Eye },
  ];

  return (
    <div className="space-y-6">
      {/* Stats overview */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Filings</span>
          </div>
          <p className="text-2xl font-semibold">{stats.filingCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.pendingFilingCount} pending · {stats.acceptedFilingCount} accepted</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Changes</span>
          </div>
          <p className="text-2xl font-semibold">{stats.changeCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.highImpactChangeCount} high impact</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckSquare className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Requirements</span>
          </div>
          <p className="text-2xl font-semibold">{stats.requirementCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.activeRequirementCount} active</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Eye className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Monitoring</span>
          </div>
          <p className="text-2xl font-semibold">{stats.monitoringCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.activeMonitoringCount} active</p>
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
                <h2 className="heading-display text-lg">Regulatory Metrics</h2>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Pending filings</span>
                  <span className="font-medium">{metrics.pendingFilings}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Upcoming deadlines (30d)</span>
                  <span className="font-medium">{metrics.upcomingDeadlines}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">High-impact changes</span>
                  <span className="font-medium">{metrics.highImpactChanges}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Open submissions</span>
                  <span className="font-medium">{metrics.openSubmissions}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Compliance rate</span>
                  <span>{metrics.complianceRate}%</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-5 w-5 text-accent-primary" />
                <h2 className="heading-display text-lg">Counts</h2>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Filings</span>
                  <span className="font-medium">{stats.filingCount} ({stats.acceptedFilingCount} accepted)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Changes</span>
                  <span className="font-medium">{stats.changeCount} ({stats.highImpactChangeCount} high impact)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Requirements</span>
                  <span className="font-medium">{stats.requirementCount} ({stats.activeRequirementCount} active)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Submissions</span>
                  <span className="font-medium">{stats.submissionCount}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Monitoring</span>
                  <span>{stats.monitoringCount} ({stats.activeMonitoringCount} active)</span>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="font-semibold mb-3">Pending Filings</h3>
            {filings.filter((f) => f.status === 'pending').length === 0 ? (
              <p className="text-sm text-fg-secondary">No pending filings.</p>
            ) : (
              <div className="space-y-2">
                {filings.filter((f) => f.status === 'pending').slice(0, 5).map((f) => (
                  <div key={f.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{f.title}</p>
                      <p className="text-xs text-fg-secondary">{f.jurisdiction} · {f.agency}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {f.dueDate && (
                        <Badge variant="warning">
                          <Clock className="mr-1 h-3 w-3" />
                          {formatDate(f.dueDate)}
                        </Badge>
                      )}
                      <Badge variant={filingStatusVariant[f.status]}>{f.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'filings' && (
        <div className="space-y-4">
          {filteredFilings.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={FileText}
                title="No regulatory filings"
                description="Create a filing to get started."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Title</th>
                    <th className="p-3 font-medium">Type</th>
                    <th className="p-3 font-medium">Jurisdiction</th>
                    <th className="p-3 font-medium">Agency</th>
                    <th className="p-3 font-medium">Due Date</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFilings.map((filing) => (
                    <tr key={filing.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{filing.title}</td>
                      <td className="p-3 capitalize">{filing.type}</td>
                      <td className="p-3">{filing.jurisdiction}</td>
                      <td className="p-3">{filing.agency}</td>
                      <td className="p-3">{formatDate(filing.dueDate)}</td>
                      <td className="p-3">
                        <Badge variant={filingStatusVariant[filing.status]}>{filing.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'changes' && (
        <div className="space-y-4">
          {filteredChanges.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={AlertCircle}
                title="No regulatory changes"
                description="Regulatory changes will appear here once tracked."
              />
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredChanges.map((change) => (
                <Card key={change.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{change.title}</h3>
                      <p className="text-xs text-fg-secondary">{change.jurisdiction} · {change.agency}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant={impactLevelVariant[change.impactLevel]}>{change.impactLevel}</Badge>
                      <Badge variant={changeStatusVariant[change.status]}>{change.status}</Badge>
                    </div>
                  </div>
                  {change.description && (
                    <p className="text-sm text-fg-secondary mb-2 line-clamp-2">{change.description}</p>
                  )}
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Type</span>
                      <span className="font-medium capitalize">{change.type.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Effective</span>
                      <span className="font-medium">{formatDate(change.effectiveDate)}</span>
                    </div>
                    {change.impactAreas.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-fg-secondary">Impact areas</span>
                        <span className="font-medium">{change.impactAreas.length}</span>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'requirements' && (
        <div className="space-y-4">
          {filteredRequirements.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={CheckSquare}
                title="No regulatory requirements"
                description="Create a requirement to get started."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Title</th>
                    <th className="p-3 font-medium">Jurisdiction</th>
                    <th className="p-3 font-medium">Agency</th>
                    <th className="p-3 font-medium">Category</th>
                    <th className="p-3 font-medium">Owner</th>
                    <th className="p-3 font-medium">Next Assessment</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequirements.map((req) => (
                    <tr key={req.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{req.title}</td>
                      <td className="p-3">{req.jurisdiction}</td>
                      <td className="p-3">{req.agency}</td>
                      <td className="p-3">{req.category || '—'}</td>
                      <td className="p-3">{req.owner || '—'}</td>
                      <td className="p-3">{formatDate(req.nextAssessment)}</td>
                      <td className="p-3">
                        <Badge variant={requirementStatusVariant[req.status]}>{req.status.replace(/_/g, ' ')}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'submissions' && (
        <div className="space-y-4">
          {filteredSubmissions.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Send}
                title="No submissions"
                description="Regulatory submissions will appear here."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Title</th>
                    <th className="p-3 font-medium">Type</th>
                    <th className="p-3 font-medium">Recipient</th>
                    <th className="p-3 font-medium">Submitted</th>
                    <th className="p-3 font-medium">Response Date</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubmissions.map((sub) => (
                    <tr key={sub.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{sub.title}</td>
                      <td className="p-3">{sub.type}</td>
                      <td className="p-3">{sub.recipient}</td>
                      <td className="p-3">{formatDate(sub.submittedDate)}</td>
                      <td className="p-3">{formatDate(sub.responseDate)}</td>
                      <td className="p-3">
                        <Badge variant={submissionStatusVariant[sub.status]}>{sub.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'monitoring' && (
        <div className="space-y-4">
          {filteredMonitoring.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Eye}
                title="No monitoring"
                description="Set up regulatory monitoring to track changes."
              />
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredMonitoring.map((mon) => (
                <Card key={mon.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{mon.topic}</h3>
                      <p className="text-xs text-fg-secondary">{mon.jurisdiction} · {mon.agency || '—'}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="info">{mon.frequency}</Badge>
                      <Badge variant={monitoringStatusVariant[mon.status]}>{mon.status}</Badge>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Sources</span>
                      <span className="font-medium">{mon.sources.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Findings</span>
                      <span className="font-medium">{mon.findings.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Last checked</span>
                      <span className="font-medium">{formatDate(mon.lastChecked)}</span>
                    </div>
                    {mon.assignedTo && (
                      <div className="flex justify-between">
                        <span className="text-fg-secondary">Assigned to</span>
                        <span className="font-medium">{mon.assignedTo}</span>
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
