'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  TrendingUp, Users, DollarSign, PieChart, Mail, FileText,
  Search, BarChart3, CheckCircle, ArrowUpRight,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

// ── Types ──

type InvestorType = 'angel' | 'vc' | 'pe' | 'strategic' | 'institutional' | 'individual' | 'family_office';
type InvestorStatus = 'active' | 'inactive' | 'passed' | 'invested';
type FundingRoundStatus = 'planned' | 'open' | 'closed' | 'cancelled';
type FundingRoundType = 'pre_seed' | 'seed' | 'series_a' | 'series_b' | 'series_c' | 'growth' | 'bridge' | 'debt' | 'convertible';
type StakeholderType = 'founder' | 'investor' | 'employee' | 'advisor' | 'pool';
type ShareClass = 'common' | 'preferred_a' | 'preferred_b' | 'preferred_c' | 'options' | 'warrants' | 'convertible';
type CommunicationStatus = 'sent' | 'received' | 'scheduled' | 'draft' | 'cancelled';
type CommunicationType = 'email' | 'call' | 'meeting' | 'report' | 'update' | 'other';
type UpdateStatus = 'draft' | 'scheduled' | 'published' | 'archived';

interface Investor {
  id: string;
  name: string;
  type: InvestorType;
  firm: string;
  email: string;
  investmentFocus: string;
  checkSize: string;
  stage: string;
  status: InvestorStatus;
  notes: string;
  createdAt: Date;
}

interface FundingRound {
  id: string;
  name: string;
  type: FundingRoundType;
  targetAmount: number;
  raisedAmount: number;
  preMoneyValuation: number | null;
  postMoneyValuation: number | null;
  dilution: number | null;
  leadInvestor: string;
  status: FundingRoundStatus;
  startDate: Date | null;
  closeDate: Date | null;
  createdAt: Date;
}

interface CapTableEntry {
  id: string;
  stakeholderName: string;
  stakeholderType: StakeholderType;
  shares: number;
  shareClass: ShareClass;
  pricePerShare: number | null;
  ownershipPercent: number | null;
  grantDate: Date | null;
  createdAt: Date;
}

interface Communication {
  id: string;
  investorId: string;
  type: CommunicationType;
  subject: string;
  date: Date;
  summary: string;
  outcome: string;
  followUp: string;
  status: CommunicationStatus;
  createdAt: Date;
}

interface IRUpdate {
  id: string;
  title: string;
  period: string;
  content: string;
  highlights: string[];
  challenges: string[];
  status: UpdateStatus;
  date: Date;
  publishedAt: Date | null;
  createdAt: Date;
}

interface CapTableSummary {
  totalShares: number;
  byStakeholderType: Record<string, number>;
  byShareClass: Record<string, number>;
  entries: number;
}

interface IRMetrics {
  totalRaised: number;
  capTableSummary: CapTableSummary;
  investorCountByType: Record<string, number>;
  fundingProgress: Array<{ id: string; name: string; type: FundingRoundType; targetAmount: number; raisedAmount: number; progress: number; status: FundingRoundStatus }>;
  lastUpdateDate: Date | null;
}

interface IRStats {
  investorCount: number;
  fundingRoundCount: number;
  capTableEntryCount: number;
  communicationCount: number;
  updateCount: number;
  totalRaised: number;
  totalTarget: number;
  activeInvestorCount: number;
  byInvestorType: Record<string, number>;
  byFundingRoundStatus: Record<string, number>;
}

interface InvestorRelationsDashboardProps {
  organizationId: string;
  investors: Investor[];
  fundingRounds: FundingRound[];
  capTable: CapTableEntry[];
  communications: Communication[];
  updates: IRUpdate[];
  metrics: IRMetrics;
  stats: IRStats;
}

// ── Helpers ──

const investorStatusVariant: Record<InvestorStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  active: 'success',
  inactive: 'default',
  passed: 'danger',
  invested: 'accent',
};

const fundingRoundStatusVariant: Record<FundingRoundStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  planned: 'info',
  open: 'accent',
  closed: 'success',
  cancelled: 'default',
};

const communicationStatusVariant: Record<CommunicationStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  sent: 'success',
  received: 'info',
  scheduled: 'accent',
  draft: 'default',
  cancelled: 'danger',
};

const updateStatusVariant: Record<UpdateStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  draft: 'default',
  scheduled: 'accent',
  published: 'success',
  archived: 'default',
};

function formatDate(d: Date | string | null): string {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}

// ── Component ──

type TabId = 'overview' | 'investors' | 'funding_rounds' | 'cap_table' | 'communications' | 'updates';

export function InvestorRelationsDashboard({
  organizationId: _organizationId,
  investors,
  fundingRounds,
  capTable,
  communications,
  updates,
  metrics,
  stats,
}: InvestorRelationsDashboardProps) {
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

  const filteredInvestors = useMemo(
    () => filterBySearch(investors, ['name', 'type', 'firm', 'email', 'status']),
    [filterBySearch, investors],
  );

  const filteredFundingRounds = useMemo(
    () => filterBySearch(fundingRounds, ['name', 'type', 'leadInvestor', 'status']),
    [filterBySearch, fundingRounds],
  );

  const filteredCapTable = useMemo(
    () => filterBySearch(capTable, ['stakeholderName', 'stakeholderType', 'shareClass']),
    [filterBySearch, capTable],
  );

  const filteredCommunications = useMemo(
    () => filterBySearch(communications, ['subject', 'type', 'status']),
    [filterBySearch, communications],
  );

  const filteredUpdates = useMemo(
    () => filterBySearch(updates, ['title', 'period', 'status']),
    [filterBySearch, updates],
  );

  const tabs: { id: TabId; label: string; icon: typeof TrendingUp }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'investors', label: 'Investors', icon: Users },
    { id: 'funding_rounds', label: 'Funding Rounds', icon: DollarSign },
    { id: 'cap_table', label: 'Cap Table', icon: PieChart },
    { id: 'communications', label: 'Communications', icon: Mail },
    { id: 'updates', label: 'Updates', icon: FileText },
  ];

  return (
    <div className="space-y-6">
      {/* Stats overview */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Investors</span>
          </div>
          <p className="text-2xl font-semibold">{stats.investorCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.activeInvestorCount} active</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Total Raised</span>
          </div>
          <p className="text-2xl font-semibold">{formatCurrency(stats.totalRaised)}</p>
          <p className="text-xs text-fg-secondary mt-0.5">of {formatCurrency(stats.totalTarget)} target</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <PieChart className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Cap Table</span>
          </div>
          <p className="text-2xl font-semibold">{stats.capTableEntryCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{formatCurrency(metrics.capTableSummary.totalShares)} shares</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Mail className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Communications</span>
          </div>
          <p className="text-2xl font-semibold">{stats.communicationCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.updateCount} updates</p>
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
                <TrendingUp className="h-5 w-5 text-accent-primary" />
                <h2 className="heading-display text-lg">Funding Metrics</h2>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Total raised</span>
                  <span className="font-medium">{formatCurrency(metrics.totalRaised)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Active investors</span>
                  <span className="font-medium">{stats.activeInvestorCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Cap table entries</span>
                  <span className="font-medium">{metrics.capTableSummary.entries}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Total shares</span>
                  <span className="font-medium">{metrics.capTableSummary.totalShares.toLocaleString()}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Last update</span>
                  <span>{formatDate(metrics.lastUpdateDate)}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="h-5 w-5 text-accent-primary" />
                <h2 className="heading-display text-lg">Funding Progress</h2>
              </div>
              {metrics.fundingProgress.length === 0 ? (
                <p className="text-sm text-fg-secondary">No funding rounds yet.</p>
              ) : (
                <div className="space-y-3">
                  {metrics.fundingProgress.slice(0, 5).map((round) => (
                    <div key={round.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{round.name}</span>
                        <span className="text-fg-secondary">{round.progress}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-surface-alt overflow-hidden">
                        <div
                          className="h-full bg-accent-primary"
                          style={{ width: `${Math.min(round.progress, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-fg-secondary mt-0.5">
                        <span>{formatCurrency(round.raisedAmount)}</span>
                        <span>of {formatCurrency(round.targetAmount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="font-semibold mb-3">Investor Types</h3>
            {Object.keys(metrics.investorCountByType).length === 0 ? (
              <p className="text-sm text-fg-secondary">No investors yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {Object.entries(metrics.investorCountByType).map(([type, count]) => (
                  <Badge key={type} variant="info">
                    {type.replace(/_/g, ' ')}: {count}
                  </Badge>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'investors' && (
        <div className="space-y-4">
          {filteredInvestors.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Users}
                title="No investors"
                description="Add investors to get started."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Name</th>
                    <th className="p-3 font-medium">Type</th>
                    <th className="p-3 font-medium">Firm</th>
                    <th className="p-3 font-medium">Check Size</th>
                    <th className="p-3 font-medium">Stage</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvestors.map((inv) => (
                    <tr key={inv.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{inv.name}</td>
                      <td className="p-3 capitalize">{inv.type.replace(/_/g, ' ')}</td>
                      <td className="p-3">{inv.firm || '—'}</td>
                      <td className="p-3">{inv.checkSize || '—'}</td>
                      <td className="p-3">{inv.stage || '—'}</td>
                      <td className="p-3">
                        <Badge variant={investorStatusVariant[inv.status]}>{inv.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'funding_rounds' && (
        <div className="space-y-4">
          {filteredFundingRounds.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={DollarSign}
                title="No funding rounds"
                description="Create a funding round to get started."
              />
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredFundingRounds.map((round) => {
                const progress = round.targetAmount > 0 ? Math.round((round.raisedAmount / round.targetAmount) * 100) : 0;
                return (
                  <Card key={round.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold">{round.name}</h3>
                        <p className="text-xs text-fg-secondary capitalize">{round.type.replace(/_/g, ' ')}</p>
                      </div>
                      <Badge variant={fundingRoundStatusVariant[round.status]}>{round.status}</Badge>
                    </div>
                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-fg-secondary">Progress</span>
                        <span className="font-medium">{progress}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-surface-alt overflow-hidden">
                        <div
                          className="h-full bg-accent-primary"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-fg-secondary mt-0.5">
                        <span>{formatCurrency(round.raisedAmount)}</span>
                        <span>of {formatCurrency(round.targetAmount)}</span>
                      </div>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-fg-secondary">Lead investor</span>
                        <span className="font-medium">{round.leadInvestor || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-fg-secondary">Pre-money</span>
                        <span className="font-medium">{round.preMoneyValuation ? formatCurrency(round.preMoneyValuation) : '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-fg-secondary">Close date</span>
                        <span className="font-medium">{formatDate(round.closeDate)}</span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'cap_table' && (
        <div className="space-y-4">
          {filteredCapTable.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={PieChart}
                title="No cap table entries"
                description="Add cap table entries to track ownership."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Stakeholder</th>
                    <th className="p-3 font-medium">Type</th>
                    <th className="p-3 font-medium">Shares</th>
                    <th className="p-3 font-medium">Class</th>
                    <th className="p-3 font-medium">Price/Share</th>
                    <th className="p-3 font-medium">Ownership</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCapTable.map((entry) => (
                    <tr key={entry.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{entry.stakeholderName}</td>
                      <td className="p-3 capitalize">{entry.stakeholderType}</td>
                      <td className="p-3">{entry.shares.toLocaleString()}</td>
                      <td className="p-3 capitalize">{entry.shareClass.replace(/_/g, ' ')}</td>
                      <td className="p-3">{entry.pricePerShare ? formatCurrency(entry.pricePerShare) : '—'}</td>
                      <td className="p-3">
                        {entry.ownershipPercent !== null ? (
                          <span className="inline-flex items-center gap-1">
                            <ArrowUpRight className="h-3.5 w-3.5 text-success" />
                            {entry.ownershipPercent}%
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'communications' && (
        <div className="space-y-4">
          {filteredCommunications.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Mail}
                title="No communications"
                description="Log investor communications to track engagement."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Subject</th>
                    <th className="p-3 font-medium">Type</th>
                    <th className="p-3 font-medium">Date</th>
                    <th className="p-3 font-medium">Outcome</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCommunications.map((comm) => (
                    <tr key={comm.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{comm.subject}</td>
                      <td className="p-3 capitalize">{comm.type}</td>
                      <td className="p-3">{formatDate(comm.date)}</td>
                      <td className="p-3">{comm.outcome || '—'}</td>
                      <td className="p-3">
                        <Badge variant={communicationStatusVariant[comm.status]}>{comm.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'updates' && (
        <div className="space-y-4">
          {filteredUpdates.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={FileText}
                title="No updates"
                description="Create investor updates to keep stakeholders informed."
              />
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredUpdates.map((update) => (
                <Card key={update.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{update.title}</h3>
                      <p className="text-xs text-fg-secondary">{update.period}</p>
                    </div>
                    <Badge variant={updateStatusVariant[update.status]}>{update.status}</Badge>
                  </div>
                  {update.content && (
                    <p className="text-sm text-fg-secondary mb-3 line-clamp-2">{update.content}</p>
                  )}
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Date</span>
                      <span className="font-medium">{formatDate(update.date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Highlights</span>
                      <span className="font-medium">{update.highlights.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Challenges</span>
                      <span className="font-medium">{update.challenges.length}</span>
                    </div>
                    {update.publishedAt && (
                      <div className="flex justify-between">
                        <span className="text-fg-secondary">Published</span>
                        <span className="font-medium">{formatDate(update.publishedAt)}</span>
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
