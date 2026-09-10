'use client';

import { useState, useMemo } from 'react';
import {
  Megaphone, Calendar, TrendingUp, Target, DollarSign,
  Users, Plus, Search, Clock, CheckCircle, BarChart3,
  Mail, Share2, Globe, Video, Podcast, FileText, XCircle,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

// ── Types ──

type ContentItemType =
  | 'blog'
  | 'social_post'
  | 'email'
  | 'video'
  | 'podcast'
  | 'webinar'
  | 'press_release'
  | 'ad_campaign';

type ContentPlatform =
  | 'facebook'
  | 'instagram'
  | 'twitter'
  | 'linkedin'
  | 'youtube'
  | 'tiktok'
  | 'email'
  | 'website';

type ContentStatus =
  | 'planned'
  | 'scheduled'
  | 'published'
  | 'draft'
  | 'cancelled';

type CampaignType =
  | 'email'
  | 'social'
  | 'paid_ads'
  | 'content'
  | 'event'
  | 'referral'
  | 'seo';

type CampaignStatus =
  | 'planned'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled';

type AttributionSource =
  | 'organic'
  | 'paid'
  | 'social'
  | 'email'
  | 'referral'
  | 'direct'
  | 'event';

interface ContentCalendarItem {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  description: string;
  type: ContentItemType;
  platform: ContentPlatform | null;
  scheduledDate: string;
  status: ContentStatus;
  owner: string;
  tags: string[];
  content: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CampaignMetric {
  date: string;
  impressions: number;
  clicks: number;
  conversions: number;
  leads: number;
  revenue: number;
  spend: number;
}

interface MarketingCampaign {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  description: string;
  type: CampaignType;
  startDate: string;
  endDate: string | null;
  budget: number;
  status: CampaignStatus;
  channels: string[];
  goals: string;
  targetAudience: string;
  metrics: CampaignMetric[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface LeadAttribution {
  id: string;
  organizationId: string;
  workspaceId: string;
  leadId: string;
  campaignId: string | null;
  source: AttributionSource;
  channel: string;
  touchpoint: string;
  conversionValue: number;
  convertedAt: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CalendarStats {
  totalItems: number;
  byType: Record<string, number>;
  byPlatform: Record<string, number>;
  byStatus: Record<ContentStatus, number>;
  publishedCount: number;
  overdueCount: number;
}

interface CampaignStats {
  totalCampaigns: number;
  byType: Record<string, number>;
  byStatus: Record<CampaignStatus, number>;
  totalBudget: number;
  totalSpend: number;
  totalRevenue: number;
  avgROI: number;
}

interface AttributionStats {
  totalAttributions: number;
  bySource: Record<string, number>;
  conversionRate: number;
  totalRevenue: number;
  avgConversionValue: number;
}

interface BudgetUtilization {
  id: string;
  name: string;
  budget: number;
  spend: number;
  utilization: number;
}

interface MarketingOpsDashboardProps {
  organizationId: string;
  contentItems: ContentCalendarItem[];
  upcomingContent: ContentCalendarItem[];
  contentByPlatform: Record<string, ContentCalendarItem[]>;
  contentByType: Record<string, ContentCalendarItem[]>;
  contentStats: CalendarStats;
  campaigns: MarketingCampaign[];
  activeCampaigns: MarketingCampaign[];
  campaignStats: CampaignStats;
  budgetUtilization: BudgetUtilization[];
  attributions: LeadAttribution[];
  attributionsBySource: Record<string, LeadAttribution[]>;
  attributionsByCampaign: Record<string, LeadAttribution[]>;
  conversionBySource: Record<string, number>;
  topPerformingSources: Array<{ source: string; conversions: number; revenue: number }>;
  revenueBySource: Record<string, number>;
  attributionStats: AttributionStats;
}

// ── Helpers ──

const contentStatusVariant: Record<ContentStatus, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  planned: 'default',
  scheduled: 'info',
  published: 'success',
  draft: 'warning',
  cancelled: 'danger',
};

const campaignStatusVariant: Record<CampaignStatus, 'default' | 'success' | 'warning' | 'info' | 'danger'> = {
  planned: 'default',
  active: 'success',
  paused: 'warning',
  completed: 'info',
  cancelled: 'danger',
};

const sourceVariant: Record<AttributionSource, 'default' | 'success' | 'accent' | 'info' | 'warning' | 'danger'> = {
  organic: 'success',
  paid: 'accent',
  social: 'info',
  email: 'warning',
  referral: 'default',
  direct: 'default',
  event: 'danger',
};

const platformIcons: Record<string, typeof Globe> = {
  facebook: Share2,
  instagram: Share2,
  twitter: Share2,
  linkedin: Share2,
  youtube: Video,
  tiktok: Video,
  email: Mail,
  website: Globe,
};

const typeIcons: Record<string, typeof FileText> = {
  blog: FileText,
  social_post: Share2,
  email: Mail,
  video: Video,
  podcast: Podcast,
  webinar: Users,
  press_release: FileText,
  ad_campaign: Target,
};

function formatCurrency(amount: number): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function formatDate(d: Date | string | null): string {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
}

function getCampaignROI(c: MarketingCampaign): number {
  const spend = c.metrics.reduce((s, m) => s + m.spend, 0);
  const revenue = c.metrics.reduce((s, m) => s + m.revenue, 0);
  if (spend === 0) return 0;
  return Math.round(((revenue - spend) / spend) * 100 * 100) / 100;
}

// ── Component ──

export function MarketingOpsDashboard({
  organizationId: _organizationId,
  contentItems,
  upcomingContent,
  contentByPlatform,
  contentByType: _contentByType,
  contentStats,
  campaigns,
  activeCampaigns,
  campaignStats,
  budgetUtilization,
  attributions,
  attributionsBySource,
  attributionsByCampaign: _attributionsByCampaign,
  conversionBySource,
  topPerformingSources,
  revenueBySource,
  attributionStats,
}: MarketingOpsDashboardProps) {
  const [tab, setTab] = useState<'overview' | 'calendar' | 'campaigns' | 'attribution'>('overview');
  const [search, setSearch] = useState('');
  const [showCreateContent, setShowCreateContent] = useState(false);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);

  const filteredContent = useMemo(() => {
    if (!search) return contentItems;
    const q = search.toLowerCase();
    return contentItems.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.content.toLowerCase().includes(q),
    );
  }, [contentItems, search]);

  const filteredCampaigns = useMemo(() => {
    if (!search) return campaigns;
    const q = search.toLowerCase();
    return campaigns.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.goals.toLowerCase().includes(q) ||
        c.targetAudience.toLowerCase().includes(q),
    );
  }, [campaigns, search]);

  const filteredAttributions = useMemo(() => {
    if (!search) return attributions;
    const q = search.toLowerCase();
    return attributions.filter(
      (a) =>
        a.leadId.toLowerCase().includes(q) ||
        a.channel.toLowerCase().includes(q) ||
        a.touchpoint.toLowerCase().includes(q) ||
        a.source.toLowerCase().includes(q),
    );
  }, [attributions, search]);

  const maxRevenue = useMemo(() => {
    const vals = Object.values(revenueBySource);
    return vals.length > 0 ? Math.max(...vals) : 0;
  }, [revenueBySource]);

  const platformKeys = useMemo(() => Object.keys(contentByPlatform).sort(), [contentByPlatform]);
  const sourceKeys = useMemo(() => Object.keys(attributionsBySource).sort(), [attributionsBySource]);

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-4 w-4 text-accent-primary" />
            <span className="text-xs text-fg-secondary">Content Items</span>
          </div>
          <div className="heading-display text-2xl">{contentStats.totalItems}</div>
          <div className="text-xs text-fg-muted mt-1">{contentStats.publishedCount} published</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-warning" />
            <span className="text-xs text-fg-secondary">Overdue</span>
          </div>
          <div className="heading-display text-2xl">{contentStats.overdueCount}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Megaphone className="h-4 w-4 text-accent-primary" />
            <span className="text-xs text-fg-secondary">Campaigns</span>
          </div>
          <div className="heading-display text-2xl">{campaignStats.totalCampaigns}</div>
          <div className="text-xs text-fg-muted mt-1">{activeCampaigns.length} active</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-success" />
            <span className="text-xs text-fg-secondary">Total Budget</span>
          </div>
          <div className="heading-display text-2xl">{formatCurrency(campaignStats.totalBudget)}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-4 w-4 text-accent-primary" />
            <span className="text-xs text-fg-secondary">Attributions</span>
          </div>
          <div className="heading-display text-2xl">{attributionStats.totalAttributions}</div>
          <div className="text-xs text-fg-muted mt-1">{attributionStats.conversionRate}% converted</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-success" />
            <span className="text-xs text-fg-secondary">Revenue</span>
          </div>
          <div className="heading-display text-2xl">{formatCurrency(attributionStats.totalRevenue)}</div>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-border">
        {([
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'calendar', label: 'Content Calendar', icon: Calendar },
          { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
          { id: 'attribution', label: 'Lead Attribution', icon: Target },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-accent-primary text-accent-primary'
                : 'border-transparent text-fg-secondary hover:text-fg-primary'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      {tab !== 'overview' && (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-muted" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 w-full"
          />
        </div>
      )}

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Upcoming Content */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-5 w-5 text-accent-primary" />
              <h2 className="heading-display text-lg">Upcoming Content</h2>
            </div>
            {upcomingContent.length === 0 ? (
              <EmptyState icon={Calendar} title="No upcoming content" description="Scheduled items will appear here." />
            ) : (
              <div className="space-y-1">
                {upcomingContent.slice(0, 5).map((i) => {
                  const Icon = typeIcons[i.type] || FileText;
                  return (
                    <div key={i.id} className="flex items-center justify-between text-xs p-2 rounded bg-surface-alt">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className="h-3 w-3 text-fg-muted flex-shrink-0" />
                        <span className="truncate">{i.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-fg-muted">{formatDate(i.scheduledDate)}</span>
                        <Badge variant={contentStatusVariant[i.status]}>{i.status}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Active Campaigns */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Megaphone className="h-5 w-5 text-success" />
                <h2 className="heading-display text-lg">Active Campaigns</h2>
              </div>
              {activeCampaigns.length === 0 ? (
                <EmptyState icon={Megaphone} title="No active campaigns" description="Active campaigns will appear here." />
              ) : (
                <div className="space-y-2">
                  {activeCampaigns.slice(0, 5).map((c) => {
                    const roi = getCampaignROI(c);
                    return (
                      <div key={c.id} className="flex items-center justify-between p-2 rounded bg-surface-alt">
                        <div className="min-w-0">
                          <div className="text-sm truncate">{c.name}</div>
                          <div className="text-xs text-fg-muted">{c.type} · {formatCurrency(c.budget)}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs ${roi >= 0 ? 'text-success' : 'text-danger'}`}>
                            ROI {roi > 0 ? '+' : ''}{roi}%
                          </span>
                          <Badge variant="success">active</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Top Performing Sources */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-5 w-5 text-accent-primary" />
                <h2 className="heading-display text-lg">Top Performing Sources</h2>
              </div>
              {topPerformingSources.length === 0 ? (
                <EmptyState icon={TrendingUp} title="No data" description="Top sources will appear here." />
              ) : (
                <div className="space-y-2">
                  {topPerformingSources.slice(0, 5).map((s, i) => (
                    <div key={s.source} className="flex items-center justify-between p-2 rounded bg-surface-alt">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-fg-muted w-5">#{i + 1}</span>
                        <span className="text-sm capitalize">{s.source}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-fg-muted">{s.conversions} conv.</span>
                        <span className="text-xs text-success">{formatCurrency(s.revenue)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Content by Platform */}
          {platformKeys.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Share2 className="h-5 w-5 text-accent-primary" />
                <h2 className="heading-display text-lg">Content by Platform</h2>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {platformKeys.map((p) => {
                  const Icon = platformIcons[p] || Globe;
                  return (
                    <div key={p} className="text-center p-3 rounded-lg border border-border">
                      <Icon className="h-5 w-5 text-accent-primary mx-auto mb-1" />
                      <div className="text-xs text-fg-secondary capitalize">{p}</div>
                      <div className="heading-display text-lg">{contentByPlatform[p].length}</div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Content Calendar Tab */}
      {tab === 'calendar' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="heading-display text-lg">Content Calendar</h2>
            <Button size="sm" onClick={() => setShowCreateContent(!showCreateContent)}>
              <Plus className="h-4 w-4 mr-1" />
              New Content
            </Button>
          </div>

          {showCreateContent && (
            <CreateContentForm onClose={() => setShowCreateContent(false)} />
          )}

          {filteredContent.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Calendar}
                title="No content items"
                description="Schedule content to start tracking your calendar."
              />
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredContent.map((i) => {
                const Icon = typeIcons[i.type] || FileText;
                return (
                  <Card key={i.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <Icon className="h-4 w-4 text-accent-primary mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{i.title}</span>
                            <Badge variant={contentStatusVariant[i.status]}>{i.status}</Badge>
                          </div>
                          {i.description && (
                            <div className="text-xs text-fg-secondary mt-1">{i.description}</div>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs text-fg-muted">{formatDate(i.scheduledDate)}</div>
                        {i.platform && (
                          <div className="text-xs text-fg-secondary capitalize mt-1">{i.platform}</div>
                        )}
                      </div>
                    </div>
                    {i.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {i.tags.map((t) => (
                          <span key={t} className="text-xs px-2 py-0.5 rounded bg-surface-alt text-fg-secondary">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Campaigns Tab */}
      {tab === 'campaigns' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="heading-display text-lg">Campaigns</h2>
            <Button size="sm" onClick={() => setShowCreateCampaign(!showCreateCampaign)}>
              <Plus className="h-4 w-4 mr-1" />
              New Campaign
            </Button>
          </div>

          {showCreateCampaign && (
            <CreateCampaignForm onClose={() => setShowCreateCampaign(false)} />
          )}

          {/* Campaign Stats */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card className="p-3 text-center">
              <div className="text-xs text-fg-secondary">Total Budget</div>
              <div className="heading-display text-xl">{formatCurrency(campaignStats.totalBudget)}</div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-xs text-fg-secondary">Total Spend</div>
              <div className="heading-display text-xl">{formatCurrency(campaignStats.totalSpend)}</div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-xs text-fg-secondary">Total Revenue</div>
              <div className="heading-display text-xl">{formatCurrency(campaignStats.totalRevenue)}</div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-xs text-fg-secondary">Avg ROI</div>
              <div className={`heading-display text-xl ${campaignStats.avgROI >= 0 ? 'text-success' : 'text-danger'}`}>
                {campaignStats.avgROI > 0 ? '+' : ''}{campaignStats.avgROI}%
              </div>
            </Card>
          </div>

          {/* Budget Utilization */}
          {budgetUtilization.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="h-5 w-5 text-accent-primary" />
                <h3 className="text-sm font-medium">Budget Utilization</h3>
              </div>
              <div className="space-y-2">
                {budgetUtilization.slice(0, 5).map((b) => (
                  <div key={b.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="truncate">{b.name}</span>
                      <span className="text-fg-muted">
                        {formatCurrency(b.spend)} / {formatCurrency(b.budget)} ({b.utilization}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-alt overflow-hidden">
                      <div
                        className={`h-full rounded-full ${b.utilization > 100 ? 'bg-danger' : 'bg-accent-primary'}`}
                        style={{ width: `${Math.min(b.utilization, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {filteredCampaigns.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Megaphone}
                title="No campaigns"
                description="Create a campaign to track marketing performance."
              />
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredCampaigns.map((c) => {
                const roi = getCampaignROI(c);
                const spend = c.metrics.reduce((s, m) => s + m.spend, 0);
                const revenue = c.metrics.reduce((s, m) => s + m.revenue, 0);
                return (
                  <Card key={c.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{c.name}</span>
                          <Badge variant={campaignStatusVariant[c.status]}>{c.status}</Badge>
                          <Badge variant="default">{c.type}</Badge>
                        </div>
                        {c.description && (
                          <div className="text-xs text-fg-secondary mt-1">{c.description}</div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-medium ${roi >= 0 ? 'text-success' : 'text-danger'}`}>
                          ROI {roi > 0 ? '+' : ''}{roi}%
                        </div>
                        <div className="text-xs text-fg-muted">{formatCurrency(c.budget)} budget</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mt-3 text-xs">
                      <div>
                        <span className="text-fg-secondary">Spend: </span>
                        <span>{formatCurrency(spend)}</span>
                      </div>
                      <div>
                        <span className="text-fg-secondary">Revenue: </span>
                        <span>{formatCurrency(revenue)}</span>
                      </div>
                      <div>
                        <span className="text-fg-secondary">Start: </span>
                        <span>{formatDate(c.startDate)}</span>
                      </div>
                      <div>
                        <span className="text-fg-secondary">End: </span>
                        <span>{formatDate(c.endDate)}</span>
                      </div>
                    </div>
                    {c.channels.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {c.channels.map((ch) => (
                          <span key={ch} className="text-xs px-2 py-0.5 rounded bg-surface-alt text-fg-secondary">
                            {ch}
                          </span>
                        ))}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Attribution Tab */}
      {tab === 'attribution' && (
        <div className="space-y-4">
          <h2 className="heading-display text-lg">Lead Attribution</h2>

          {/* Attribution Stats */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card className="p-3 text-center">
              <div className="text-xs text-fg-secondary">Total Attributions</div>
              <div className="heading-display text-xl">{attributionStats.totalAttributions}</div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-xs text-fg-secondary">Conversion Rate</div>
              <div className="heading-display text-xl">{attributionStats.conversionRate}%</div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-xs text-fg-secondary">Total Revenue</div>
              <div className="heading-display text-xl">{formatCurrency(attributionStats.totalRevenue)}</div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-xs text-fg-secondary">Avg Conversion Value</div>
              <div className="heading-display text-xl">{formatCurrency(attributionStats.avgConversionValue)}</div>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Conversion Rate by Source */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-5 w-5 text-success" />
                <h3 className="text-sm font-medium">Conversion Rate by Source</h3>
              </div>
              {sourceKeys.length === 0 ? (
                <EmptyState icon={CheckCircle} title="No data" description="Conversion data will appear here." />
              ) : (
                <div className="space-y-2">
                  {sourceKeys.map((src) => (
                    <div key={src} className="flex items-center justify-between text-xs p-2 rounded bg-surface-alt">
                      <span className="capitalize">{src}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-fg-muted">{attributionsBySource[src].length} leads</span>
                        <Badge variant={sourceVariant[src as AttributionSource] || 'default'}>
                          {conversionBySource[src] || 0}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Revenue by Source */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="h-5 w-5 text-success" />
                <h3 className="text-sm font-medium">Revenue by Source</h3>
              </div>
              {sourceKeys.length === 0 ? (
                <EmptyState icon={DollarSign} title="No data" description="Revenue data will appear here." />
              ) : (
                <div className="space-y-2">
                  {sourceKeys.map((src) => (
                    <div key={src} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="capitalize">{src}</span>
                        <span className="text-fg-muted">{formatCurrency(revenueBySource[src] || 0)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-surface-alt overflow-hidden">
                        <div
                          className="h-full bg-success rounded-full"
                          style={{ width: `${maxRevenue > 0 ? ((revenueBySource[src] || 0) / maxRevenue) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Attribution Records */}
          {filteredAttributions.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-5 w-5 text-accent-primary" />
                <h3 className="text-sm font-medium">Attribution Records</h3>
              </div>
              <div className="space-y-1 max-h-[400px] overflow-y-auto">
                {filteredAttributions.slice(0, 20).map((a) => (
                  <div key={a.id} className="flex items-center justify-between text-xs p-2 rounded bg-surface-alt">
                    <div className="min-w-0">
                      <span className="truncate">{a.leadId}</span>
                      {a.channel && <span className="text-fg-muted"> — {a.channel}</span>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-fg-muted">{formatCurrency(a.conversionValue)}</span>
                      <Badge variant={sourceVariant[a.source] || 'default'}>{a.source}</Badge>
                      {a.convertedAt && <CheckCircle className="h-3 w-3 text-success" />}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// ── Create Forms ──

function CreateContentForm({ onClose }: { onClose: () => void }) {
  return (
    <Card className="p-4 border border-border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">New Content Item</h3>
        <button onClick={onClose} className="text-fg-muted hover:text-fg-primary">
          <XCircle className="h-4 w-4" />
        </button>
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); onClose(); }}
        className="space-y-3"
      >
        <div>
          <label className="text-xs text-fg-secondary">Title</label>
          <input className="input w-full" placeholder="Blog post title" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-fg-secondary">Type</label>
            <select className="input w-full">
              <option value="blog">Blog</option>
              <option value="social_post">Social Post</option>
              <option value="email">Email</option>
              <option value="video">Video</option>
              <option value="podcast">Podcast</option>
              <option value="webinar">Webinar</option>
              <option value="press_release">Press Release</option>
              <option value="ad_campaign">Ad Campaign</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-fg-secondary">Platform</label>
            <select className="input w-full">
              <option value="">None</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="twitter">Twitter</option>
              <option value="linkedin">LinkedIn</option>
              <option value="youtube">YouTube</option>
              <option value="tiktok">TikTok</option>
              <option value="email">Email</option>
              <option value="website">Website</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs text-fg-secondary">Scheduled Date</label>
          <input type="date" className="input w-full" />
        </div>
        <Button type="submit" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Create Content
        </Button>
      </form>
    </Card>
  );
}

function CreateCampaignForm({ onClose }: { onClose: () => void }) {
  return (
    <Card className="p-4 border border-border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">New Campaign</h3>
        <button onClick={onClose} className="text-fg-muted hover:text-fg-primary">
          <XCircle className="h-4 w-4" />
        </button>
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); onClose(); }}
        className="space-y-3"
      >
        <div>
          <label className="text-xs text-fg-secondary">Campaign Name</label>
          <input className="input w-full" placeholder="Summer Launch 2025" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-fg-secondary">Type</label>
            <select className="input w-full">
              <option value="email">Email</option>
              <option value="social">Social</option>
              <option value="paid_ads">Paid Ads</option>
              <option value="content">Content</option>
              <option value="event">Event</option>
              <option value="referral">Referral</option>
              <option value="seo">SEO</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-fg-secondary">Budget</label>
            <input type="number" min={0} step={100} className="input w-full" placeholder="10000" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-fg-secondary">Start Date</label>
            <input type="date" className="input w-full" />
          </div>
          <div>
            <label className="text-xs text-fg-secondary">End Date</label>
            <input type="date" className="input w-full" />
          </div>
        </div>
        <div>
          <label className="text-xs text-fg-secondary">Goals</label>
          <input className="input w-full" placeholder="Increase brand awareness" />
        </div>
        <Button type="submit" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Create Campaign
        </Button>
      </form>
    </Card>
  );
}
