'use client';

import { useState, useMemo } from 'react';
import {
  Handshake, Users, Target, Megaphone, Award,
  Search, BarChart3, DollarSign,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

// ── Types ──

type PartnerType = 'reseller' | 'referral' | 'technology' | 'strategic' | 'distributor' | 'affiliate' | 'system_integrator';
type PartnerTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'none';
type PartnerStatus = 'active' | 'inactive' | 'suspended' | 'terminated';
type ProgramType = 'channel' | 'alliance' | 'referral' | 'marketplace' | 'co_sell';
type ProgramStatus = 'active' | 'inactive' | 'archived';
type DealStage = 'registered' | 'qualified' | 'proposed' | 'negotiating' | 'closed_won' | 'closed_lost' | 'expired';
type DealStatus = 'active' | 'inactive' | 'archived';
type CoMarketingType = 'webinar' | 'event' | 'content' | 'email' | 'social' | 'co_branded' | 'other';
type CoMarketingStatus = 'planned' | 'active' | 'completed' | 'cancelled';
type TierLevel = 'bronze' | 'silver' | 'gold' | 'platinum';

interface Partner {
  id: string;
  name: string;
  type: PartnerType;
  tier: PartnerTier;
  status: PartnerStatus;
  contactName: string;
  contactEmail: string;
  region: string;
  industry: string;
  dealRegistrationEnabled: boolean;
  marginRate: number | null;
  joinedDate: Date | null;
  createdAt: Date;
}

interface Program {
  id: string;
  name: string;
  description: string;
  type: ProgramType;
  requirements: string[];
  benefits: string[];
  marginRate: number | null;
  status: ProgramStatus;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
}

interface Deal {
  id: string;
  partnerId: string;
  customerName: string;
  dealValue: number;
  stage: DealStage;
  expectedCloseDate: Date | null;
  dealType: string;
  margin: number | null;
  registeredDate: Date;
  status: DealStatus;
  createdAt: Date;
}

interface CoMarketing {
  id: string;
  partnerId: string;
  campaignName: string;
  type: CoMarketingType;
  description: string;
  budget: number | null;
  costShare: number | null;
  startDate: Date | null;
  endDate: Date | null;
  status: CoMarketingStatus;
  expectedLeads: number | null;
  actualLeads: number | null;
  createdAt: Date;
}

interface TierDef {
  id: string;
  name: string;
  level: TierLevel;
  requirements: {
    minRevenue?: number;
    minDeals?: number;
    certificationRequired?: boolean;
    trainingRequired?: boolean;
  };
  benefits: {
    marginRate?: number;
    marketingFund?: number;
    dedicatedSupport?: boolean;
    leadSharing?: boolean;
    priorityListing?: boolean;
  };
  description: string;
  createdAt: Date;
}

interface PartnerMetrics {
  partnersByTier: Record<string, number>;
  activeDealsByStage: Record<string, number>;
  totalDealValue: number;
  coMarketingROI: number;
  partnerSourcedRevenue: number;
}

interface PartnerStats {
  partnerCount: number;
  activePartnerCount: number;
  programCount: number;
  activeProgramCount: number;
  dealCount: number;
  activeDealCount: number;
  closedWonDealCount: number;
  totalDealValue: number;
  coMarketingCount: number;
  activeCoMarketingCount: number;
  tierCount: number;
  byPartnerType: Record<string, number>;
  byPartnerTier: Record<string, number>;
  byDealStage: Record<string, number>;
}

interface PartnerDashboardProps {
  organizationId: string;
  partners: Partner[];
  programs: Program[];
  deals: Deal[];
  comarketing: CoMarketing[];
  tiers: TierDef[];
  metrics: PartnerMetrics;
  stats: PartnerStats;
}

// ── Helpers ──

const partnerStatusVariant: Record<PartnerStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  active: 'success',
  inactive: 'default',
  suspended: 'warning',
  terminated: 'danger',
};

const partnerTierVariant: Record<PartnerTier, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  bronze: 'default',
  silver: 'info',
  gold: 'warning',
  platinum: 'accent',
  none: 'default',
};

const programStatusVariant: Record<ProgramStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  active: 'success',
  inactive: 'default',
  archived: 'default',
};

const dealStageVariant: Record<DealStage, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  registered: 'info',
  qualified: 'accent',
  proposed: 'accent',
  negotiating: 'warning',
  closed_won: 'success',
  closed_lost: 'danger',
  expired: 'default',
};

const coMarketingStatusVariant: Record<CoMarketingStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  planned: 'info',
  active: 'accent',
  completed: 'success',
  cancelled: 'default',
};

const tierLevelVariant: Record<TierLevel, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  bronze: 'default',
  silver: 'info',
  gold: 'warning',
  platinum: 'accent',
};

function formatDate(d: Date | string | null): string {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
}

function formatCurrency(v: number | null): string {
  if (v == null) return '—';
  return `$${v.toLocaleString()}`;
}

// ── Component ──

type TabId = 'overview' | 'partners' | 'programs' | 'deals' | 'comarketing' | 'tiers';

export function PartnerDashboard({
  organizationId: _organizationId,
  partners,
  programs,
  deals,
  comarketing,
  tiers,
  metrics,
  stats,
}: PartnerDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const partnerName = (id: string) => partners.find((p) => p.id === id)?.name || id;

  const filteredPartners = useMemo(() => {
    if (!search) return partners;
    const q = search.toLowerCase();
    return partners.filter(
      (p) => p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q) || p.region.toLowerCase().includes(q),
    );
  }, [partners, search]);

  const filteredPrograms = useMemo(() => {
    if (!search) return programs;
    const q = search.toLowerCase();
    return programs.filter(
      (p) => p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q) || p.description.toLowerCase().includes(q),
    );
  }, [programs, search]);

  const filteredDeals = useMemo(() => {
    if (!search) return deals;
    const q = search.toLowerCase();
    return deals.filter(
      (d) => d.customerName.toLowerCase().includes(q) || d.dealType.toLowerCase().includes(q) || d.stage.toLowerCase().includes(q),
    );
  }, [deals, search]);

  const filteredCoMarketing = useMemo(() => {
    if (!search) return comarketing;
    const q = search.toLowerCase();
    return comarketing.filter(
      (c) => c.campaignName.toLowerCase().includes(q) || c.type.toLowerCase().includes(q) || c.description.toLowerCase().includes(q),
    );
  }, [comarketing, search]);

  const filteredTiers = useMemo(() => {
    if (!search) return tiers;
    const q = search.toLowerCase();
    return tiers.filter(
      (t) => t.name.toLowerCase().includes(q) || t.level.toLowerCase().includes(q),
    );
  }, [tiers, search]);

  const tabs: { id: TabId; label: string; icon: typeof Handshake }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'partners', label: 'Partners', icon: Handshake },
    { id: 'programs', label: 'Programs', icon: Target },
    { id: 'deals', label: 'Deals', icon: DollarSign },
    { id: 'comarketing', label: 'Co-Marketing', icon: Megaphone },
    { id: 'tiers', label: 'Tiers', icon: Award },
  ];

  return (
    <div className="space-y-6">
      {/* Stats overview */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Handshake className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Partners</span>
          </div>
          <p className="text-2xl font-semibold">{stats.partnerCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.activePartnerCount} active</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Deals</span>
          </div>
          <p className="text-2xl font-semibold">{stats.dealCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.closedWonDealCount} won · {formatCurrency(stats.totalDealValue)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Programs</span>
          </div>
          <p className="text-2xl font-semibold">{stats.programCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.activeProgramCount} active</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Megaphone className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Co-Marketing</span>
          </div>
          <p className="text-2xl font-semibold">{stats.coMarketingCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.activeCoMarketingCount} active · ROI {metrics.coMarketingROI}</p>
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
                <h2 className="heading-display text-lg">Partner Metrics</h2>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Total deal value</span>
                  <span className="font-medium">{formatCurrency(metrics.totalDealValue)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Partner-sourced revenue</span>
                  <span className="font-medium">{formatCurrency(metrics.partnerSourcedRevenue)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Co-marketing ROI</span>
                  <span className="font-medium">{metrics.coMarketingROI}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Partners by tier</span>
                  <span>{Object.entries(metrics.partnersByTier).map(([k, v]) => `${k}: ${v}`).join(', ') || '—'}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-accent-primary" />
                <h2 className="heading-display text-lg">Counts</h2>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Partners</span>
                  <span className="font-medium">{stats.partnerCount} ({stats.activePartnerCount} active)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Programs</span>
                  <span className="font-medium">{stats.programCount} ({stats.activeProgramCount} active)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Deals</span>
                  <span className="font-medium">{stats.dealCount} ({stats.activeDealCount} active)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Co-marketing</span>
                  <span className="font-medium">{stats.coMarketingCount} ({stats.activeCoMarketingCount} active)</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Tiers</span>
                  <span>{stats.tierCount}</span>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="font-semibold mb-3">Active Deals</h3>
            {deals.filter((d) => d.status === 'active').length === 0 ? (
              <p className="text-sm text-fg-secondary">No active deals.</p>
            ) : (
              <div className="space-y-2">
                {deals.filter((d) => d.status === 'active').slice(0, 5).map((d) => (
                  <div key={d.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{d.customerName}</p>
                      <p className="text-xs text-fg-secondary">{partnerName(d.partnerId)} · {formatCurrency(d.dealValue)}</p>
                    </div>
                    <Badge variant={dealStageVariant[d.stage]}>{d.stage}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'partners' && (
        <div className="space-y-4">
          {filteredPartners.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Handshake}
                title="No partners"
                description="Channel partners will appear here."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Name</th>
                    <th className="p-3 font-medium">Type</th>
                    <th className="p-3 font-medium">Tier</th>
                    <th className="p-3 font-medium">Region</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPartners.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{p.name}</td>
                      <td className="p-3 capitalize">{p.type.replace(/_/g, ' ')}</td>
                      <td className="p-3">
                        <Badge variant={partnerTierVariant[p.tier]}>{p.tier}</Badge>
                      </td>
                      <td className="p-3">{p.region || '—'}</td>
                      <td className="p-3">
                        <Badge variant={partnerStatusVariant[p.status]}>{p.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'programs' && (
        <div className="space-y-4">
          {filteredPrograms.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Target}
                title="No programs"
                description="Partner programs will appear here."
              />
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredPrograms.map((p) => (
                <Card key={p.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{p.name}</h3>
                      <p className="text-xs text-fg-secondary capitalize">{p.type.replace(/_/g, ' ')}</p>
                    </div>
                    <Badge variant={programStatusVariant[p.status]}>{p.status}</Badge>
                  </div>
                  {p.description && (
                    <p className="text-sm text-fg-secondary mb-3 line-clamp-2">{p.description}</p>
                  )}
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Requirements</span>
                      <span className="font-medium">{p.requirements.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Benefits</span>
                      <span className="font-medium">{p.benefits.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Margin</span>
                      <span className="font-medium">{p.marginRate != null ? `${p.marginRate}%` : '—'}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'deals' && (
        <div className="space-y-4">
          {filteredDeals.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={DollarSign}
                title="No deals"
                description="Registered deals will appear here."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Customer</th>
                    <th className="p-3 font-medium">Partner</th>
                    <th className="p-3 font-medium">Value</th>
                    <th className="p-3 font-medium">Stage</th>
                    <th className="p-3 font-medium">Expected Close</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDeals.map((d) => (
                    <tr key={d.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{d.customerName}</td>
                      <td className="p-3">{partnerName(d.partnerId)}</td>
                      <td className="p-3">{formatCurrency(d.dealValue)}</td>
                      <td className="p-3">
                        <Badge variant={dealStageVariant[d.stage]}>{d.stage.replace(/_/g, ' ')}</Badge>
                      </td>
                      <td className="p-3">{formatDate(d.expectedCloseDate)}</td>
                      <td className="p-3 capitalize">{d.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'comarketing' && (
        <div className="space-y-4">
          {filteredCoMarketing.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Megaphone}
                title="No co-marketing campaigns"
                description="Co-marketing campaigns will appear here."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Campaign</th>
                    <th className="p-3 font-medium">Partner</th>
                    <th className="p-3 font-medium">Type</th>
                    <th className="p-3 font-medium">Budget</th>
                    <th className="p-3 font-medium">Leads</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCoMarketing.map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{c.campaignName}</td>
                      <td className="p-3">{partnerName(c.partnerId)}</td>
                      <td className="p-3 capitalize">{c.type}</td>
                      <td className="p-3">{formatCurrency(c.budget)}</td>
                      <td className="p-3">{c.actualLeads ?? '—'}</td>
                      <td className="p-3">
                        <Badge variant={coMarketingStatusVariant[c.status]}>{c.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'tiers' && (
        <div className="space-y-4">
          {filteredTiers.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Award}
                title="No tiers"
                description="Partner tier definitions will appear here."
              />
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTiers.map((t) => (
                <Card key={t.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{t.name}</h3>
                      <p className="text-xs text-fg-secondary capitalize">{t.level}</p>
                    </div>
                    <Badge variant={tierLevelVariant[t.level]}>{t.level}</Badge>
                  </div>
                  {t.description && (
                    <p className="text-sm text-fg-secondary mb-3 line-clamp-2">{t.description}</p>
                  )}
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Min revenue</span>
                      <span className="font-medium">{t.requirements.minRevenue != null ? formatCurrency(t.requirements.minRevenue) : '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Min deals</span>
                      <span className="font-medium">{t.requirements.minDeals ?? '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Margin rate</span>
                      <span className="font-medium">{t.benefits.marginRate != null ? `${t.benefits.marginRate}%` : '—'}</span>
                    </div>
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
