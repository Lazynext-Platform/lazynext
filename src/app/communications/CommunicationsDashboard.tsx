'use client';

import { useState, useMemo } from 'react';
import {
  Megaphone, Newspaper, Users, AlertCircle, MessageSquare, Mic,
  Search, BarChart3,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

// ── Types ──

type PressReleaseStatus = 'draft' | 'review' | 'approved' | 'published' | 'embargoed';
type MediaContactStatus = 'active' | 'inactive' | 'blacklisted';
type CrisisSeverity = 'low' | 'medium' | 'high' | 'critical';
type CrisisType = 'product' | 'reputation' | 'data_breach' | 'executive' | 'legal' | 'operational' | 'other';
type CrisisStatus = 'monitoring' | 'active' | 'contained' | 'resolved' | 'post_mortem';
type MentionSource = 'news' | 'blog' | 'social' | 'podcast' | 'video' | 'other';
type MentionSentiment = 'positive' | 'neutral' | 'negative';
type SpeakerStatus = 'identified' | 'pitched' | 'accepted' | 'declined' | 'completed';

interface PressRelease {
  id: string;
  title: string;
  summary: string;
  status: PressReleaseStatus;
  publishDate: Date | null;
  author: string;
  tags: string[];
  publishedAt: Date | null;
  createdAt: Date;
}

interface MediaContact {
  id: string;
  name: string;
  outlet: string;
  role: string;
  email: string;
  beat: string;
  relationship: string;
  status: MediaContactStatus;
  createdAt: Date;
}

interface Crisis {
  id: string;
  title: string;
  description: string;
  severity: CrisisSeverity;
  type: CrisisType;
  status: CrisisStatus;
  spokesperson: string;
  mediaInquiries: number;
  activatedAt: Date | null;
  resolvedAt: Date | null;
  createdAt: Date;
}

interface Mention {
  id: string;
  source: MentionSource;
  outlet: string;
  title: string;
  url: string;
  sentiment: MentionSentiment;
  reach: number | null;
  date: Date;
  author: string;
  createdAt: Date;
}

interface SpeakerOpportunity {
  id: string;
  event: string;
  date: Date;
  location: string;
  audience: string;
  topic: string;
  speaker: string;
  status: SpeakerStatus;
  deadline: Date | null;
  createdAt: Date;
}

interface PRMetrics {
  pressReleasesByStatus: Record<string, number>;
  mentionsBySentiment: Record<string, number>;
  shareOfVoice: number;
  avgSentiment: number;
  crisisCount: number;
  activeCrisisCount: number;
  speakerOpportunities: number;
  acceptedSpeakerCount: number;
}

interface PRStats {
  pressReleaseCount: number;
  publishedPressReleaseCount: number;
  mediaContactCount: number;
  activeMediaContactCount: number;
  crisisCount: number;
  activeCrisisCount: number;
  mentionCount: number;
  positiveMentionCount: number;
  negativeMentionCount: number;
  speakerOpportunityCount: number;
  acceptedSpeakerCount: number;
  byPressReleaseStatus: Record<string, number>;
  byMentionSentiment: Record<string, number>;
  byCrisisSeverity: Record<string, number>;
  bySpeakerStatus: Record<string, number>;
}

interface CommunicationsDashboardProps {
  organizationId: string;
  pressReleases: PressRelease[];
  mediaContacts: MediaContact[];
  crises: Crisis[];
  mentions: Mention[];
  speakerOpportunities: SpeakerOpportunity[];
  metrics: PRMetrics;
  stats: PRStats;
}

// ── Helpers ──

const pressReleaseStatusVariant: Record<PressReleaseStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  draft: 'default',
  review: 'info',
  approved: 'accent',
  published: 'success',
  embargoed: 'warning',
};

const mediaContactStatusVariant: Record<MediaContactStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  active: 'success',
  inactive: 'default',
  blacklisted: 'danger',
};

const crisisSeverityVariant: Record<CrisisSeverity, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  low: 'default',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
};

const crisisStatusVariant: Record<CrisisStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  monitoring: 'info',
  active: 'danger',
  contained: 'warning',
  resolved: 'success',
  post_mortem: 'default',
};

const mentionSentimentVariant: Record<MentionSentiment, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  positive: 'success',
  neutral: 'default',
  negative: 'danger',
};

const speakerStatusVariant: Record<SpeakerStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  identified: 'info',
  pitched: 'accent',
  accepted: 'success',
  declined: 'danger',
  completed: 'success',
};

function formatDate(d: Date | string | null): string {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
}

// ── Component ──

type TabId = 'overview' | 'press_releases' | 'media_contacts' | 'crises' | 'mentions' | 'speakers';

export function CommunicationsDashboard({
  organizationId: _organizationId,
  pressReleases,
  mediaContacts,
  crises,
  mentions,
  speakerOpportunities,
  metrics,
  stats,
}: CommunicationsDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const filteredPressReleases = useMemo(() => {
    if (!search) return pressReleases;
    const q = search.toLowerCase();
    return pressReleases.filter(
      (p) => p.title.toLowerCase().includes(q) || p.author.toLowerCase().includes(q) || p.status.toLowerCase().includes(q),
    );
  }, [pressReleases, search]);

  const filteredMediaContacts = useMemo(() => {
    if (!search) return mediaContacts;
    const q = search.toLowerCase();
    return mediaContacts.filter(
      (c) => c.name.toLowerCase().includes(q) || c.outlet.toLowerCase().includes(q) || c.beat.toLowerCase().includes(q),
    );
  }, [mediaContacts, search]);

  const filteredCrises = useMemo(() => {
    if (!search) return crises;
    const q = search.toLowerCase();
    return crises.filter(
      (c) => c.title.toLowerCase().includes(q) || c.type.toLowerCase().includes(q) || c.status.toLowerCase().includes(q),
    );
  }, [crises, search]);

  const filteredMentions = useMemo(() => {
    if (!search) return mentions;
    const q = search.toLowerCase();
    return mentions.filter(
      (m) => m.title.toLowerCase().includes(q) || m.outlet.toLowerCase().includes(q) || m.author.toLowerCase().includes(q),
    );
  }, [mentions, search]);

  const filteredSpeakers = useMemo(() => {
    if (!search) return speakerOpportunities;
    const q = search.toLowerCase();
    return speakerOpportunities.filter(
      (s) => s.event.toLowerCase().includes(q) || s.speaker.toLowerCase().includes(q) || s.topic.toLowerCase().includes(q),
    );
  }, [speakerOpportunities, search]);

  const tabs: { id: TabId; label: string; icon: typeof Megaphone }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'press_releases', label: 'Press Releases', icon: Newspaper },
    { id: 'media_contacts', label: 'Media Contacts', icon: Users },
    { id: 'crises', label: 'Crises', icon: AlertCircle },
    { id: 'mentions', label: 'Mentions', icon: MessageSquare },
    { id: 'speakers', label: 'Speaker Opportunities', icon: Mic },
  ];

  return (
    <div className="space-y-6">
      {/* Stats overview */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Newspaper className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Press Releases</span>
          </div>
          <p className="text-2xl font-semibold">{stats.pressReleaseCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.publishedPressReleaseCount} published</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Crises</span>
          </div>
          <p className="text-2xl font-semibold">{stats.crisisCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.activeCrisisCount} active</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Mentions</span>
          </div>
          <p className="text-2xl font-semibold">{stats.mentionCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.positiveMentionCount} positive · {stats.negativeMentionCount} negative</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Mic className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Speakers</span>
          </div>
          <p className="text-2xl font-semibold">{stats.speakerOpportunityCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.acceptedSpeakerCount} accepted</p>
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
                <h2 className="heading-display text-lg">PR Metrics</h2>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Share of voice</span>
                  <span className="font-medium">{metrics.shareOfVoice}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Avg sentiment</span>
                  <span className="font-medium">{metrics.avgSentiment}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Active crises</span>
                  <span className="font-medium">{metrics.activeCrisisCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Speaker opportunities</span>
                  <span className="font-medium">{metrics.speakerOpportunities}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Accepted speakers</span>
                  <span>{metrics.acceptedSpeakerCount}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Megaphone className="h-5 w-5 text-accent-primary" />
                <h2 className="heading-display text-lg">Counts</h2>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Press releases</span>
                  <span className="font-medium">{stats.pressReleaseCount} ({stats.publishedPressReleaseCount} published)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Media contacts</span>
                  <span className="font-medium">{stats.mediaContactCount} ({stats.activeMediaContactCount} active)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Crises</span>
                  <span className="font-medium">{stats.crisisCount} ({stats.activeCrisisCount} active)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Mentions</span>
                  <span className="font-medium">{stats.mentionCount}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Speaker opportunities</span>
                  <span>{stats.speakerOpportunityCount} ({stats.acceptedSpeakerCount} accepted)</span>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="font-semibold mb-3">Active Crises</h3>
            {crises.filter((c) => c.status === 'active' || c.status === 'monitoring').length === 0 ? (
              <p className="text-sm text-fg-secondary">No active crises.</p>
            ) : (
              <div className="space-y-2">
                {crises.filter((c) => c.status === 'active' || c.status === 'monitoring').slice(0, 5).map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{c.title}</p>
                      <p className="text-xs text-fg-secondary">{c.type} · {c.mediaInquiries} inquiries</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={crisisSeverityVariant[c.severity]}>{c.severity}</Badge>
                      <Badge variant={crisisStatusVariant[c.status]}>{c.status.replace(/_/g, ' ')}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'press_releases' && (
        <div className="space-y-4">
          {filteredPressReleases.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Newspaper}
                title="No press releases"
                description="Press releases will appear here."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Title</th>
                    <th className="p-3 font-medium">Author</th>
                    <th className="p-3 font-medium">Publish Date</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPressReleases.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{p.title}</td>
                      <td className="p-3">{p.author || '—'}</td>
                      <td className="p-3">{formatDate(p.publishDate)}</td>
                      <td className="p-3">
                        <Badge variant={pressReleaseStatusVariant[p.status]}>{p.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'media_contacts' && (
        <div className="space-y-4">
          {filteredMediaContacts.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Users}
                title="No media contacts"
                description="Media contacts will appear here."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Name</th>
                    <th className="p-3 font-medium">Outlet</th>
                    <th className="p-3 font-medium">Role</th>
                    <th className="p-3 font-medium">Beat</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMediaContacts.map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{c.name}</td>
                      <td className="p-3">{c.outlet}</td>
                      <td className="p-3">{c.role || '—'}</td>
                      <td className="p-3">{c.beat || '—'}</td>
                      <td className="p-3">
                        <Badge variant={mediaContactStatusVariant[c.status]}>{c.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'crises' && (
        <div className="space-y-4">
          {filteredCrises.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={AlertCircle}
                title="No crises"
                description="Crisis records will appear here."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Title</th>
                    <th className="p-3 font-medium">Type</th>
                    <th className="p-3 font-medium">Severity</th>
                    <th className="p-3 font-medium">Inquiries</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCrises.map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{c.title}</td>
                      <td className="p-3 capitalize">{c.type.replace(/_/g, ' ')}</td>
                      <td className="p-3">
                        <Badge variant={crisisSeverityVariant[c.severity]}>{c.severity}</Badge>
                      </td>
                      <td className="p-3">{c.mediaInquiries}</td>
                      <td className="p-3">
                        <Badge variant={crisisStatusVariant[c.status]}>{c.status.replace(/_/g, ' ')}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'mentions' && (
        <div className="space-y-4">
          {filteredMentions.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={MessageSquare}
                title="No mentions"
                description="Media mentions will appear here."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Title</th>
                    <th className="p-3 font-medium">Outlet</th>
                    <th className="p-3 font-medium">Source</th>
                    <th className="p-3 font-medium">Date</th>
                    <th className="p-3 font-medium">Sentiment</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMentions.map((m) => (
                    <tr key={m.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{m.title}</td>
                      <td className="p-3">{m.outlet}</td>
                      <td className="p-3 capitalize">{m.source}</td>
                      <td className="p-3">{formatDate(m.date)}</td>
                      <td className="p-3">
                        <Badge variant={mentionSentimentVariant[m.sentiment]}>{m.sentiment}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'speakers' && (
        <div className="space-y-4">
          {filteredSpeakers.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Mic}
                title="No speaker opportunities"
                description="Speaker opportunities will appear here."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Event</th>
                    <th className="p-3 font-medium">Speaker</th>
                    <th className="p-3 font-medium">Topic</th>
                    <th className="p-3 font-medium">Date</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSpeakers.map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{s.event}</td>
                      <td className="p-3">{s.speaker || '—'}</td>
                      <td className="p-3">{s.topic || '—'}</td>
                      <td className="p-3">{formatDate(s.date)}</td>
                      <td className="p-3">
                        <Badge variant={speakerStatusVariant[s.status]}>{s.status}</Badge>
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
