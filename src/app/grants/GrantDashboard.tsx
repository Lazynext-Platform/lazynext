'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Award, FileText, DollarSign, Calendar, CheckCircle, Search,
  BarChart3, Target, TrendingUp,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

// ── Types ──

type OpportunityStatus = 'identified' | 'researching' | 'applying' | 'submitted' | 'awarded' | 'rejected' | 'withdrawn';
type ApplicationStatus = 'draft' | 'in_review' | 'submitted' | 'under_review' | 'awarded' | 'rejected' | 'withdrawn';
type AwardStatus = 'offered' | 'accepted' | 'active' | 'closed' | 'declined';
type ReportType = 'progress' | 'final' | 'financial' | 'interim' | 'other';
type ReportStatus = 'pending' | 'in_progress' | 'submitted' | 'overdue' | 'accepted';
type DisbursementStatus = 'pending' | 'approved' | 'released' | 'rejected';

interface Opportunity {
  id: string;
  name: string;
  funder: string;
  program: string;
  amount: number;
  deadline: Date | null;
  status: OpportunityStatus;
  category: string;
  matchScore: number;
  createdAt: Date;
}

interface Application {
  id: string;
  opportunityId: string | null;
  title: string;
  funder: string;
  amountRequested: number;
  status: ApplicationStatus;
  submittedDate: Date | null;
  deadline: Date | null;
  createdAt: Date;
}

interface GrantAward {
  id: string;
  applicationId: string | null;
  title: string;
  funder: string;
  amountAwarded: number;
  startDate: Date;
  endDate: Date | null;
  status: AwardStatus;
  createdAt: Date;
}

interface Report {
  id: string;
  awardId: string;
  type: ReportType;
  dueDate: Date;
  submittedDate: Date | null;
  status: ReportStatus;
  budgetUtilized: number | null;
  createdAt: Date;
}

interface Disbursement {
  id: string;
  awardId: string;
  amount: number;
  date: Date;
  purpose: string;
  status: DisbursementStatus;
  createdAt: Date;
}

interface GrantMetrics {
  totalAwarded: number;
  pendingApplications: number;
  reportComplianceRate: number;
  fundUtilization: number;
  upcomingDeadlines: number;
}

interface GrantStats {
  opportunityCount: number;
  applicationCount: number;
  awardCount: number;
  activeAwardCount: number;
  reportCount: number;
  disbursementCount: number;
  totalAwarded: number;
  pendingApplicationCount: number;
  overdueReportCount: number;
  byOpportunityStatus: Record<string, number>;
  byApplicationStatus: Record<string, number>;
  byAwardStatus: Record<string, number>;
}

interface GrantDashboardProps {
  organizationId: string;
  opportunities: Opportunity[];
  applications: Application[];
  awards: GrantAward[];
  reports: Report[];
  disbursements: Disbursement[];
  metrics: GrantMetrics;
  stats: GrantStats;
}

// ── Helpers ──

const oppStatusVariant: Record<OpportunityStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  identified: 'default',
  researching: 'info',
  applying: 'accent',
  submitted: 'warning',
  awarded: 'success',
  rejected: 'danger',
  withdrawn: 'default',
};

const appStatusVariant: Record<ApplicationStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  draft: 'default',
  in_review: 'info',
  submitted: 'accent',
  under_review: 'warning',
  awarded: 'success',
  rejected: 'danger',
  withdrawn: 'default',
};

const awardStatusVariant: Record<AwardStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  offered: 'info',
  accepted: 'accent',
  active: 'success',
  closed: 'default',
  declined: 'danger',
};

const reportStatusVariant: Record<ReportStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  pending: 'default',
  in_progress: 'accent',
  submitted: 'info',
  overdue: 'danger',
  accepted: 'success',
};

const disbursementStatusVariant: Record<DisbursementStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  pending: 'default',
  approved: 'info',
  released: 'success',
  rejected: 'danger',
};

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function formatDate(d: Date | string | null): string {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
}

function formatLabel(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Component ──

type TabId = 'overview' | 'opportunities' | 'applications' | 'awards' | 'reports' | 'disbursements';

export function GrantDashboard({
  organizationId: _organizationId,
  opportunities,
  applications,
  awards,
  reports,
  disbursements,
  metrics,
  stats,
}: GrantDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const awardTitle = useCallback(
    (id: string) => awards.find((a) => a.id === id)?.title || id,
    [awards],
  );

  const filteredOpportunities = useMemo(() => {
    if (!search) return opportunities;
    const q = search.toLowerCase();
    return opportunities.filter(
      (o) => o.name.toLowerCase().includes(q) || o.funder.toLowerCase().includes(q) || o.category.toLowerCase().includes(q),
    );
  }, [opportunities, search]);

  const filteredApplications = useMemo(() => {
    if (!search) return applications;
    const q = search.toLowerCase();
    return applications.filter(
      (a) => a.title.toLowerCase().includes(q) || a.funder.toLowerCase().includes(q) || a.status.toLowerCase().includes(q),
    );
  }, [applications, search]);

  const filteredAwards = useMemo(() => {
    if (!search) return awards;
    const q = search.toLowerCase();
    return awards.filter(
      (a) => a.title.toLowerCase().includes(q) || a.funder.toLowerCase().includes(q) || a.status.toLowerCase().includes(q),
    );
  }, [awards, search]);

  const filteredReports = useMemo(() => {
    if (!search) return reports;
    const q = search.toLowerCase();
    return reports.filter(
      (r) => awardTitle(r.awardId).toLowerCase().includes(q) || r.type.toLowerCase().includes(q) || r.status.toLowerCase().includes(q),
    );
  }, [reports, search, awardTitle]);

  const filteredDisbursements = useMemo(() => {
    if (!search) return disbursements;
    const q = search.toLowerCase();
    return disbursements.filter(
      (d) => awardTitle(d.awardId).toLowerCase().includes(q) || d.purpose.toLowerCase().includes(q) || d.status.toLowerCase().includes(q),
    );
  }, [disbursements, search, awardTitle]);

  const tabs: { id: TabId; label: string; icon: typeof Award }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'opportunities', label: 'Opportunities', icon: Target },
    { id: 'applications', label: 'Applications', icon: FileText },
    { id: 'awards', label: 'Awards', icon: Award },
    { id: 'reports', label: 'Reports', icon: Calendar },
    { id: 'disbursements', label: 'Disbursements', icon: DollarSign },
  ];

  return (
    <div className="space-y-6">
      {/* Stats overview */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Opportunities</span>
          </div>
          <p className="text-2xl font-semibold">{stats.opportunityCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{metrics.upcomingDeadlines} upcoming deadlines</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Applications</span>
          </div>
          <p className="text-2xl font-semibold">{stats.applicationCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.pendingApplicationCount} pending</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Award className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Awards</span>
          </div>
          <p className="text-2xl font-semibold">{stats.awardCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.activeAwardCount} active · {formatCurrency(metrics.totalAwarded)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Disbursements</span>
          </div>
          <p className="text-2xl font-semibold">{stats.disbursementCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{metrics.fundUtilization}% fund utilization</p>
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
                <h2 className="heading-display text-lg">Grant Metrics</h2>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Total awarded</span>
                  <span className="font-medium">{formatCurrency(metrics.totalAwarded)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Pending applications</span>
                  <span className="font-medium">{metrics.pendingApplications}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Report compliance rate</span>
                  <span className="font-medium">{metrics.reportComplianceRate}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Fund utilization</span>
                  <span className="font-medium">{metrics.fundUtilization}%</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Upcoming deadlines</span>
                  <span>{metrics.upcomingDeadlines}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-accent-primary" />
                <h2 className="heading-display text-lg">Counts</h2>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Opportunities</span>
                  <span className="font-medium">{stats.opportunityCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Applications</span>
                  <span className="font-medium">{stats.applicationCount} ({stats.pendingApplicationCount} pending)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Awards</span>
                  <span className="font-medium">{stats.awardCount} ({stats.activeAwardCount} active)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Reports</span>
                  <span className="font-medium">{stats.reportCount} ({stats.overdueReportCount} overdue)</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Disbursements</span>
                  <span>{stats.disbursementCount}</span>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="font-semibold mb-3">Overdue Reports</h3>
            {reports.filter((r) => r.status === 'overdue').length === 0 ? (
              <p className="text-sm text-fg-secondary">No overdue reports.</p>
            ) : (
              <div className="space-y-2">
                {reports.filter((r) => r.status === 'overdue').slice(0, 5).map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{awardTitle(r.awardId)}</p>
                      <p className="text-xs text-fg-secondary">{formatLabel(r.type)} · Due {formatDate(r.dueDate)}</p>
                    </div>
                    <Badge variant="danger">Overdue</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'opportunities' && (
        <div className="space-y-4">
          {filteredOpportunities.length === 0 ? (
            <Card className="p-8">
              <EmptyState icon={Target} title="No opportunities" description="Grant opportunities will appear here." />
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredOpportunities.map((opp) => (
                <Card key={opp.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{opp.name}</h3>
                      <p className="text-xs text-fg-secondary">{opp.funder}</p>
                    </div>
                    <Badge variant={oppStatusVariant[opp.status]}>{formatLabel(opp.status)}</Badge>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Amount</span>
                      <span className="font-medium">{formatCurrency(opp.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Deadline</span>
                      <span className="font-medium">{formatDate(opp.deadline)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Match score</span>
                      <span className="font-medium">{opp.matchScore}%</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'applications' && (
        <div className="space-y-4">
          {filteredApplications.length === 0 ? (
            <Card className="p-8">
              <EmptyState icon={FileText} title="No applications" description="Grant applications will appear here." />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Title</th>
                    <th className="p-3 font-medium">Funder</th>
                    <th className="p-3 font-medium">Amount Requested</th>
                    <th className="p-3 font-medium">Deadline</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.map((app) => (
                    <tr key={app.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{app.title}</td>
                      <td className="p-3">{app.funder}</td>
                      <td className="p-3">{formatCurrency(app.amountRequested)}</td>
                      <td className="p-3">{formatDate(app.deadline)}</td>
                      <td className="p-3">
                        <Badge variant={appStatusVariant[app.status]}>{formatLabel(app.status)}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'awards' && (
        <div className="space-y-4">
          {filteredAwards.length === 0 ? (
            <Card className="p-8">
              <EmptyState icon={Award} title="No awards" description="Grant awards will appear here." />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Title</th>
                    <th className="p-3 font-medium">Funder</th>
                    <th className="p-3 font-medium">Amount</th>
                    <th className="p-3 font-medium">Start Date</th>
                    <th className="p-3 font-medium">End Date</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAwards.map((award) => (
                    <tr key={award.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{award.title}</td>
                      <td className="p-3">{award.funder}</td>
                      <td className="p-3">{formatCurrency(award.amountAwarded)}</td>
                      <td className="p-3">{formatDate(award.startDate)}</td>
                      <td className="p-3">{formatDate(award.endDate)}</td>
                      <td className="p-3">
                        <Badge variant={awardStatusVariant[award.status]}>{formatLabel(award.status)}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'reports' && (
        <div className="space-y-4">
          {filteredReports.length === 0 ? (
            <Card className="p-8">
              <EmptyState icon={Calendar} title="No reports" description="Grant reports will appear here." />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Award</th>
                    <th className="p-3 font-medium">Type</th>
                    <th className="p-3 font-medium">Due Date</th>
                    <th className="p-3 font-medium">Submitted</th>
                    <th className="p-3 font-medium">Budget</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((report) => (
                    <tr key={report.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{awardTitle(report.awardId)}</td>
                      <td className="p-3 capitalize">{formatLabel(report.type)}</td>
                      <td className="p-3">{formatDate(report.dueDate)}</td>
                      <td className="p-3">{formatDate(report.submittedDate)}</td>
                      <td className="p-3">{report.budgetUtilized != null ? formatCurrency(report.budgetUtilized) : '—'}</td>
                      <td className="p-3">
                        <Badge variant={reportStatusVariant[report.status]}>{formatLabel(report.status)}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'disbursements' && (
        <div className="space-y-4">
          {filteredDisbursements.length === 0 ? (
            <Card className="p-8">
              <EmptyState icon={DollarSign} title="No disbursements" description="Grant disbursements will appear here." />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Award</th>
                    <th className="p-3 font-medium">Amount</th>
                    <th className="p-3 font-medium">Date</th>
                    <th className="p-3 font-medium">Purpose</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDisbursements.map((disb) => (
                    <tr key={disb.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{awardTitle(disb.awardId)}</td>
                      <td className="p-3">{formatCurrency(disb.amount)}</td>
                      <td className="p-3">{formatDate(disb.date)}</td>
                      <td className="p-3 text-fg-secondary">{disb.purpose || '—'}</td>
                      <td className="p-3">
                        <Badge variant={disbursementStatusVariant[disb.status]}>{formatLabel(disb.status)}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
