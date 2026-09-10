'use client';

import { useState, useMemo } from 'react';
import {
  Megaphone, ClipboardList, MessageSquare, Users, Newspaper, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  CrisisPlan, CrisisMessage, StakeholderCommunication, MediaInquiry,
  CrisisCommunicationMetrics, CrisisCommunicationStats,
} from '@/lib/services/crisis-communication-service';

type TabId = 'overview' | 'plans' | 'messages' | 'communications' | 'inquiries';

interface CrisisCommunicationDashboardProps {
  organizationId: string;
  plans: CrisisPlan[];
  messages: CrisisMessage[];
  communications: StakeholderCommunication[];
  inquiries: MediaInquiry[];
  metrics: CrisisCommunicationMetrics;
  stats: CrisisCommunicationStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['active', 'completed', 'verified', 'executed', 'approved', 'implemented', 'tested', 'published', 'sent', 'responded'].includes(status)) return 'success';
  if (['draft', 'pending', 'placed', 'scheduled', 'planned', 'set', 'submitted', 'under_review', 'in_progress', 'standby', 'testing', 'received', 'responding'].includes(status)) return 'warning';
  if (['cancelled', 'expired', 'terminated', 'deactivated', 'missed', 'failed', 'suspended', 'deprecated', 'archived', 'blocked', 'unreachable', 'retracted', 'declined', 'decommissioned', 'paused'].includes(status)) return 'danger';
  return 'info';
};

export function CrisisCommunicationDashboard({
  plans, messages, communications, inquiries, metrics, stats,
}: CrisisCommunicationDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const filteredPlans = useMemo(() => {
    if (!search) return plans;
    const q = search.toLowerCase();
    return plans.filter(
      (p) => p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q) || p.status.toLowerCase().includes(q),
    );
  }, [plans, search]);

  const filteredMessages = useMemo(() => {
    if (!search) return messages;
    const q = search.toLowerCase();
    return messages.filter(
      (m) => m.name.toLowerCase().includes(q) || m.type.toLowerCase().includes(q) || m.status.toLowerCase().includes(q),
    );
  }, [messages, search]);

  const filteredCommunications = useMemo(() => {
    if (!search) return communications;
    const q = search.toLowerCase();
    return communications.filter(
      (c) => c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q) || c.status.toLowerCase().includes(q),
    );
  }, [communications, search]);

  const filteredInquiries = useMemo(() => {
    if (!search) return inquiries;
    const q = search.toLowerCase();
    return inquiries.filter(
      (i) => i.name.toLowerCase().includes(q) || i.type.toLowerCase().includes(q) || i.status.toLowerCase().includes(q),
    );
  }, [inquiries, search]);

  const tabs: { id: TabId; label: string; icon: typeof Megaphone }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'plans', label: 'Plans', icon: ClipboardList },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'communications', label: 'Communications', icon: Users },
    { id: 'inquiries', label: 'Inquiries', icon: Newspaper },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-accent-primary text-white' : 'bg-bg-secondary text-fg-secondary hover:bg-bg-tertiary'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab !== 'overview' && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-tertiary" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border-primary bg-bg-primary px-10 py-2 text-sm focus:border-accent-primary focus:outline-none"
          />
        </div>
      )}

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Plans</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activePlans}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Sent Messages</div>
              <div className="mt-1 text-2xl font-bold">{metrics.sentMessages}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Communications</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeCommunications}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Pending Inquiries</div>
              <div className="mt-1 text-2xl font-bold">{metrics.pendingInquiries}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Published Messages</div>
              <div className="mt-1 text-2xl font-bold">{metrics.publishedMessages}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Plan Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byPlanType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Plan Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byPlanStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Message Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byMessageStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'plans' && (
        <div className="space-y-3">
          {filteredPlans.length === 0 ? (
            <Card className="p-8"><EmptyState icon={ClipboardList} title="No crisis plans" description="Crisis plans will appear here." /></Card>
          ) : (
            filteredPlans.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-fg-secondary">{p.type.replace('_', ' ')} · {p.spokesperson || 'No spokesperson'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.severity && <Badge variant="default">{p.severity}</Badge>}
                    <Badge variant={statusVariant(p.status)}>{p.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'messages' && (
        <div className="space-y-3">
          {filteredMessages.length === 0 ? (
            <Card className="p-8"><EmptyState icon={MessageSquare} title="No crisis messages" description="Crisis messages will appear here." /></Card>
          ) : (
            filteredMessages.map((m) => (
              <Card key={m.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{m.name}</div>
                    <div className="text-sm text-fg-secondary">{m.type.replace('_', ' ')} · {m.channel || 'No channel'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.audience && <Badge variant="default">{m.audience}</Badge>}
                    <Badge variant={statusVariant(m.status)}>{m.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'communications' && (
        <div className="space-y-3">
          {filteredCommunications.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Users} title="No stakeholder communications" description="Stakeholder communications will appear here." /></Card>
          ) : (
            filteredCommunications.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-sm text-fg-secondary">{c.type.replace('_', ' ')} · {c.stakeholderGroup || 'No group'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.contactMethod && <Badge variant="default">{c.contactMethod}</Badge>}
                    <Badge variant={statusVariant(c.status)}>{c.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'inquiries' && (
        <div className="space-y-3">
          {filteredInquiries.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Newspaper} title="No media inquiries" description="Media inquiries will appear here." /></Card>
          ) : (
            filteredInquiries.map((i) => (
              <Card key={i.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{i.name}</div>
                    <div className="text-sm text-fg-secondary">{i.type.replace('_', ' ')} · {i.outlet || 'No outlet'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {i.journalist && <Badge variant="default">{i.journalist}</Badge>}
                    <Badge variant={statusVariant(i.status)}>{i.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
