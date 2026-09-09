'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Users, Calendar, Smile, Mail, Grid, Search, BarChart3,
  CheckCircle, AlertTriangle,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

// ── Types ──

type StakeholderType = 'investor' | 'board_member' | 'executive' | 'employee' | 'customer' | 'partner' | 'regulator' | 'community' | 'media' | 'supplier' | 'other';
type InfluenceLevel = 'low' | 'medium' | 'high' | 'very_high';
type InterestLevel = 'low' | 'medium' | 'high' | 'very_high';
type EngagementStrategy = 'manage_closely' | 'keep_satisfied' | 'keep_informed' | 'monitor';
type EngagementType = 'meeting' | 'call' | 'email' | 'presentation' | 'report' | 'event' | 'consultation' | 'other';
type EngagementStatus = 'planned' | 'completed' | 'cancelled';
type SentimentLevel = 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative';
type SentimentTrend = 'improving' | 'declining' | 'stable';
type CommunicationChannel = 'email' | 'letter' | 'press_release' | 'social_media' | 'newsletter' | 'briefing' | 'other';
type CommunicationStatus = 'draft' | 'sent' | 'responded' | 'archived';

interface Stakeholder {
  id: string;
  name: string;
  type: StakeholderType;
  organization: string;
  role: string;
  email: string;
  phone: string;
  influence: InfluenceLevel;
  interest: InterestLevel;
  category: string;
  notes: string;
  engagementStrategy: EngagementStrategy;
  createdAt: Date;
}

interface Engagement {
  id: string;
  stakeholderId: string;
  type: EngagementType;
  date: Date;
  topic: string;
  outcome: string;
  actionItems: string[];
  nextSteps: string;
  attendees: string[];
  status: EngagementStatus;
  completedBy: string;
  completedAt: Date | null;
  createdAt: Date;
}

interface Sentiment {
  id: string;
  stakeholderId: string;
  sentiment: SentimentLevel;
  score: number | null;
  date: Date;
  reason: string;
  trend: SentimentTrend;
  recordedBy: string;
  createdAt: Date;
}

interface Communication {
  id: string;
  stakeholderId: string;
  channel: CommunicationChannel;
  subject: string;
  content: string;
  date: Date;
  sentBy: string;
  status: CommunicationStatus;
  response: string;
  responseDate: Date | null;
  createdAt: Date;
}

interface StakeholderMatrix {
  manageClosely: Stakeholder[];
  keepSatisfied: Stakeholder[];
  keepInformed: Stakeholder[];
  monitor: Stakeholder[];
}

interface StakeholderMetrics {
  stakeholderCount: number;
  stakeholderCountByType: Record<string, number>;
  avgSentiment: number;
  engagementFrequency: number;
  atRiskStakeholders: number;
}

interface StakeholderStats {
  stakeholderCount: number;
  engagementCount: number;
  sentimentCount: number;
  communicationCount: number;
  completedEngagementCount: number;
  sentCommunicationCount: number;
  avgSentimentScore: number;
  byStakeholderType: Record<string, number>;
  byEngagementStatus: Record<string, number>;
  bySentiment: Record<string, number>;
  byCommunicationStatus: Record<string, number>;
}

interface StakeholderDashboardProps {
  organizationId: string;
  stakeholders: Stakeholder[];
  engagements: Engagement[];
  sentiments: Sentiment[];
  communications: Communication[];
  matrix: StakeholderMatrix;
  metrics: StakeholderMetrics;
  stats: StakeholderStats;
}

// ── Helpers ──

const strategyVariant: Record<EngagementStrategy, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  manage_closely: 'danger',
  keep_satisfied: 'warning',
  keep_informed: 'info',
  monitor: 'default',
};

const influenceVariant: Record<InfluenceLevel, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  low: 'default',
  medium: 'info',
  high: 'warning',
  very_high: 'danger',
};

const interestVariant: Record<InterestLevel, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  low: 'default',
  medium: 'info',
  high: 'warning',
  very_high: 'danger',
};

const engagementStatusVariant: Record<EngagementStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  planned: 'info',
  completed: 'success',
  cancelled: 'default',
};

const sentimentVariant: Record<SentimentLevel, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  very_positive: 'success',
  positive: 'success',
  neutral: 'default',
  negative: 'warning',
  very_negative: 'danger',
};

const trendVariant: Record<SentimentTrend, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  improving: 'success',
  declining: 'danger',
  stable: 'default',
};

const commStatusVariant: Record<CommunicationStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  draft: 'default',
  sent: 'info',
  responded: 'success',
  archived: 'default',
};

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

type TabId = 'overview' | 'stakeholders' | 'engagements' | 'sentiment' | 'communications';

export function StakeholderDashboard({
  organizationId: _organizationId,
  stakeholders,
  engagements,
  sentiments,
  communications,
  matrix,
  metrics,
  stats,
}: StakeholderDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const stakeholderName = useCallback(
    (id: string) => stakeholders.find((s) => s.id === id)?.name || id,
    [stakeholders],
  );

  const filteredStakeholders = useMemo(() => {
    if (!search) return stakeholders;
    const q = search.toLowerCase();
    return stakeholders.filter(
      (s) => s.name.toLowerCase().includes(q) || s.type.toLowerCase().includes(q) || s.organization.toLowerCase().includes(q),
    );
  }, [stakeholders, search]);

  const filteredEngagements = useMemo(() => {
    if (!search) return engagements;
    const q = search.toLowerCase();
    return engagements.filter(
      (e) => e.topic.toLowerCase().includes(q) || stakeholderName(e.stakeholderId).toLowerCase().includes(q) || e.status.toLowerCase().includes(q),
    );
  }, [engagements, search, stakeholderName]);

  const filteredSentiments = useMemo(() => {
    if (!search) return sentiments;
    const q = search.toLowerCase();
    return sentiments.filter(
      (s) => stakeholderName(s.stakeholderId).toLowerCase().includes(q) || s.sentiment.toLowerCase().includes(q) || s.reason.toLowerCase().includes(q),
    );
  }, [sentiments, search, stakeholderName]);

  const filteredCommunications = useMemo(() => {
    if (!search) return communications;
    const q = search.toLowerCase();
    return communications.filter(
      (c) => c.subject.toLowerCase().includes(q) || stakeholderName(c.stakeholderId).toLowerCase().includes(q) || c.channel.toLowerCase().includes(q),
    );
  }, [communications, search, stakeholderName]);

  const tabs: { id: TabId; label: string; icon: typeof Users }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'stakeholders', label: 'Stakeholders', icon: Users },
    { id: 'engagements', label: 'Engagements', icon: Calendar },
    { id: 'sentiment', label: 'Sentiment', icon: Smile },
    { id: 'communications', label: 'Communications', icon: Mail },
  ];

  return (
    <div className="space-y-6">
      {/* Stats overview */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Stakeholders</span>
          </div>
          <p className="text-2xl font-semibold">{stats.stakeholderCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{metrics.atRiskStakeholders} at risk</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Engagements</span>
          </div>
          <p className="text-2xl font-semibold">{stats.engagementCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.completedEngagementCount} completed</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Smile className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Sentiment</span>
          </div>
          <p className="text-2xl font-semibold">{stats.avgSentimentScore}</p>
          <p className="text-xs text-fg-secondary mt-0.5">avg score</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Mail className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Communications</span>
          </div>
          <p className="text-2xl font-semibold">{stats.communicationCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.sentCommunicationCount} sent</p>
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
                <h2 className="heading-display text-lg">Metrics</h2>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Stakeholder count</span>
                  <span className="font-medium">{metrics.stakeholderCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Average sentiment</span>
                  <span className="font-medium">{metrics.avgSentiment}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Engagement frequency (30d)</span>
                  <span className="font-medium">{metrics.engagementFrequency}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>At-risk stakeholders</span>
                  <span>{metrics.atRiskStakeholders}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Grid className="h-5 w-5 text-accent-primary" />
                <h2 className="heading-display text-lg">Influence / Interest Matrix</h2>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Manage Closely</span>
                  <span className="font-medium">{matrix.manageClosely.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Keep Satisfied</span>
                  <span className="font-medium">{matrix.keepSatisfied.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Keep Informed</span>
                  <span className="font-medium">{matrix.keepInformed.length}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Monitor</span>
                  <span>{matrix.monitor.length}</span>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="font-semibold mb-3">Stakeholders by Type</h3>
            {Object.keys(stats.byStakeholderType).length === 0 ? (
              <p className="text-sm text-fg-secondary">No stakeholders yet.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(stats.byStakeholderType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between text-sm">
                    <span className="capitalize">{formatLabel(type)}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'stakeholders' && (
        <div className="space-y-4">
          {filteredStakeholders.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Users}
                title="No stakeholders"
                description="Create a stakeholder to get started."
              />
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredStakeholders.map((stakeholder) => (
                <Card key={stakeholder.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{stakeholder.name}</h3>
                      <p className="text-xs text-fg-secondary">{stakeholder.role || stakeholder.organization || '—'}</p>
                    </div>
                    <Badge variant="default">{formatLabel(stakeholder.type)}</Badge>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Influence</span>
                      <Badge variant={influenceVariant[stakeholder.influence]}>{formatLabel(stakeholder.influence)}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Interest</span>
                      <Badge variant={interestVariant[stakeholder.interest]}>{formatLabel(stakeholder.interest)}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Strategy</span>
                      <Badge variant={strategyVariant[stakeholder.engagementStrategy]}>{formatLabel(stakeholder.engagementStrategy)}</Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'engagements' && (
        <div className="space-y-4">
          {filteredEngagements.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Calendar}
                title="No engagements"
                description="Engagements will appear here once created."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Topic</th>
                    <th className="p-3 font-medium">Stakeholder</th>
                    <th className="p-3 font-medium">Type</th>
                    <th className="p-3 font-medium">Date</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEngagements.map((engagement) => (
                    <tr key={engagement.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{engagement.topic}</td>
                      <td className="p-3">{stakeholderName(engagement.stakeholderId)}</td>
                      <td className="p-3 capitalize">{formatLabel(engagement.type)}</td>
                      <td className="p-3">{formatDate(engagement.date)}</td>
                      <td className="p-3">
                        <Badge variant={engagementStatusVariant[engagement.status]}>{formatLabel(engagement.status)}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'sentiment' && (
        <div className="space-y-4">
          {filteredSentiments.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Smile}
                title="No sentiment records"
                description="Sentiment tracking will appear here once recorded."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Stakeholder</th>
                    <th className="p-3 font-medium">Sentiment</th>
                    <th className="p-3 font-medium">Score</th>
                    <th className="p-3 font-medium">Trend</th>
                    <th className="p-3 font-medium">Date</th>
                    <th className="p-3 font-medium">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSentiments.map((sentiment) => (
                    <tr key={sentiment.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{stakeholderName(sentiment.stakeholderId)}</td>
                      <td className="p-3">
                        <Badge variant={sentimentVariant[sentiment.sentiment]}>{formatLabel(sentiment.sentiment)}</Badge>
                      </td>
                      <td className="p-3">{sentiment.score ?? '—'}</td>
                      <td className="p-3">
                        <Badge variant={trendVariant[sentiment.trend]}>{formatLabel(sentiment.trend)}</Badge>
                      </td>
                      <td className="p-3">{formatDate(sentiment.date)}</td>
                      <td className="p-3 text-fg-secondary">{sentiment.reason || '—'}</td>
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
                description="Communications will appear here once created."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Subject</th>
                    <th className="p-3 font-medium">Stakeholder</th>
                    <th className="p-3 font-medium">Channel</th>
                    <th className="p-3 font-medium">Date</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCommunications.map((communication) => (
                    <tr key={communication.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{communication.subject}</td>
                      <td className="p-3">{stakeholderName(communication.stakeholderId)}</td>
                      <td className="p-3 capitalize">{formatLabel(communication.channel)}</td>
                      <td className="p-3">{formatDate(communication.date)}</td>
                      <td className="p-3">
                        <Badge variant={commStatusVariant[communication.status]}>{formatLabel(communication.status)}</Badge>
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
