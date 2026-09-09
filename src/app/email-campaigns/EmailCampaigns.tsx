'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mail, Send, Plus, Copy, Trash2, Users, FileText, List, BarChart3,
  FlaskConical, GitBranch, X,
} from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';

export interface CampaignRecord {
  id: string;
  name: string;
  subject: string;
  status: string;
  stats?: { sent: number; delivered: number; opens: number; clicks: number; bounces: number; unsubscribes: number };
  createdAt: Date;
  updatedAt: Date;
  [key: string]: unknown;
}
export interface TemplateRecord {
  id: string;
  name: string;
  category: string;
  subject: string;
  isDefault?: boolean;
  usageCount?: number;
  [key: string]: unknown;
}
export interface SubscriberRecord {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  status: string;
  [key: string]: unknown;
}
export interface ListRecord {
  id: string;
  name: string;
  description?: string;
  subscriberCount?: number;
  [key: string]: unknown;
}
interface OverviewData {
  total: number;
  byStatus: Record<string, number>;
  totalSent: number;
  totalDelivered: number;
  totalOpens: number;
  totalClicks: number;
  totalBounces: number;
  totalUnsubscribes: number;
  avgOpenRate: number;
  avgClickRate: number;
}
interface ABTestStatsData {
  total: number;
  byStatus: Record<string, number>;
  completed: number;
  running: number;
}
interface DripStatsData {
  total: number;
  byStatus: Record<string, number>;
  totalEnrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
}

type Tab = 'overview' | 'campaigns' | 'templates' | 'subscribers' | 'lists' | 'ab-tests' | 'drip';

export function EmailCampaigns({
  organizationId: _organizationId,
  workspaceId: _workspaceId,
  userId: _userId,
  overview,
  campaigns: initialCampaigns,
  templates: initialTemplates,
  subscribers: initialSubscribers,
  lists: initialLists,
  abTestStats,
  dripStats,
}: {
  organizationId: string;
  workspaceId: string;
  userId: string;
  overview: OverviewData;
  campaigns: CampaignRecord[];
  templates: TemplateRecord[];
  subscribers: SubscriberRecord[];
  lists: ListRecord[];
  abTestStats: ABTestStatsData;
  dripStats: DripStatsData;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const [campaigns] = useState(initialCampaigns);
  const [templates] = useState(initialTemplates);
  const [subscribers] = useState(initialSubscribers);
  const [lists] = useState(initialLists);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: '', subject: '', fromName: '', fromEmail: '', bodyHtml: '' });

  const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
    draft: 'default',
    scheduled: 'info',
    sending: 'warning',
    sent: 'success',
    cancelled: 'danger',
    active: 'success',
    unsubscribed: 'danger',
    bounced: 'warning',
    pending: 'default',
    running: 'info',
    completed: 'success',
    paused: 'warning',
  };

  async function handleCreateCampaign() {
    if (!newCampaign.name.trim()) return;
    setCreating(true);
    try {
      await fetch('/api/email/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCampaign),
      });
      setShowCreate(false);
      setNewCampaign({ name: '', subject: '', fromName: '', fromEmail: '', bodyHtml: '' });
      router.refresh();
    } finally {
      setCreating(false);
    }
  }

  async function handleDuplicate(id: string) {
    await fetch(`/api/email/campaigns/${id}/duplicate`, { method: 'POST' });
    router.refresh();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/email/campaigns/${id}`, { method: 'DELETE' });
    router.refresh();
  }

  async function handleSend(id: string) {
    // For demo: send to all subscribers
    const subIds = subscribers.map((s) => s.id);
    if (subIds.length === 0) return;
    await fetch(`/api/email/campaigns/${id}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriberIds: subIds }),
    });
    router.refresh();
  }

  const tabs: Array<{ id: Tab; label: string; icon: typeof Mail }> = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'campaigns', label: 'Campaigns', icon: Mail },
    { id: 'templates', label: 'Templates', icon: FileText },
    { id: 'subscribers', label: 'Subscribers', icon: Users },
    { id: 'lists', label: 'Lists', icon: List },
    { id: 'ab-tests', label: 'A/B Tests', icon: FlaskConical },
    { id: 'drip', label: 'Drip Sequences', icon: GitBranch },
  ];

  return (
    <div className="space-y-6">
      {/* Tab navigation */}
      <div className="flex flex-wrap gap-2 border-b border-fg-muted/20 pb-2">
        {tabs.map((t) => (
          <Button
            key={t.id}
            variant={tab === t.id ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setTab(t.id)}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </Button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card className="p-4">
              <div className="text-xs text-fg-secondary mb-1">Total Campaigns</div>
              <div className="text-2xl font-bold">{overview.total}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-secondary mb-1">Total Sent</div>
              <div className="text-2xl font-bold">{overview.totalSent}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-secondary mb-1">Avg Open Rate</div>
              <div className="text-2xl font-bold">{(overview.avgOpenRate * 100).toFixed(1)}%</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-secondary mb-1">Avg Click Rate</div>
              <div className="text-2xl font-bold">{(overview.avgClickRate * 100).toFixed(1)}%</div>
            </Card>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Card className="p-4">
              <div className="text-xs text-fg-secondary mb-1">Total Opens</div>
              <div className="text-2xl font-bold">{overview.totalOpens}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-secondary mb-1">Total Clicks</div>
              <div className="text-2xl font-bold">{overview.totalClicks}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-secondary mb-1">Bounces</div>
              <div className="text-2xl font-bold">{overview.totalBounces}</div>
            </Card>
          </div>
          <Card className="p-4">
            <h3 className="text-sm font-medium mb-3">Campaigns by Status</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(overview.byStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant[status] || 'default'} className="text-xs">
                  {status}: {count}
                </Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Campaigns Tab */}
      {tab === 'campaigns' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-accent-primary" />
              <h2 className="heading-display text-sm">Campaigns</h2>
              <Badge variant="default" className="text-xs">{campaigns.length}</Badge>
            </div>
            <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" /> New Campaign
            </Button>
          </div>
          {campaigns.length === 0 ? (
            <Card className="p-6"><div className="text-sm text-fg-secondary">No campaigns yet. Create one to get started.</div></Card>
          ) : (
            <div className="space-y-2">
              {campaigns.map((c) => {
                const stats = c.stats || { sent: 0, delivered: 0, opens: 0, clicks: 0, bounces: 0, unsubscribes: 0 };
                return (
                  <Card key={c.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">{c.name}</span>
                        <Badge variant={statusVariant[c.status] || 'default'} className="text-xs">{c.status}</Badge>
                        <span className="text-xs text-fg-secondary">{stats.sent} sent</span>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleSend(c.id)} className="text-xs">
                          <Send className="h-3 w-3" /> Send
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDuplicate(c.id)} className="text-xs">
                          <Copy className="h-3 w-3" /> Duplicate
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)} className="text-xs">
                          <Trash2 className="h-3 w-3" /> Delete
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Templates Tab */}
      {tab === 'templates' && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-accent-primary" />
            <h2 className="heading-display text-sm">Templates</h2>
            <Badge variant="default" className="text-xs">{templates.length}</Badge>
          </div>
          {templates.length === 0 ? (
            <Card className="p-6"><div className="text-sm text-fg-secondary">No templates yet.</div></Card>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {templates.map((t) => (
                <Card key={t.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium">{t.name}</span>
                      <Badge variant="info" className="text-xs ml-2">{t.category}</Badge>
                      {t.isDefault && <Badge variant="accent" className="text-xs ml-1">Default</Badge>}
                    </div>
                    <span className="text-xs text-fg-secondary">{t.usageCount || 0} uses</span>
                  </div>
                  <p className="text-xs text-fg-secondary mt-1 truncate">{t.subject}</p>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Subscribers Tab */}
      {tab === 'subscribers' && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-accent-primary" />
            <h2 className="heading-display text-sm">Subscribers</h2>
            <Badge variant="default" className="text-xs">{subscribers.length}</Badge>
          </div>
          {subscribers.length === 0 ? (
            <Card className="p-6"><div className="text-sm text-fg-secondary">No subscribers yet.</div></Card>
          ) : (
            <Card className="p-0 overflow-hidden">
              <div className="divide-y divide-fg-muted/10">
                {subscribers.slice(0, 50).map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{s.email}</span>
                      <Badge variant={statusVariant[s.status] || 'default'} className="text-xs">{s.status}</Badge>
                    </div>
                    <span className="text-xs text-fg-secondary">{s.firstName} {s.lastName}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Lists Tab */}
      {tab === 'lists' && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <List className="h-4 w-4 text-accent-primary" />
            <h2 className="heading-display text-sm">Lists</h2>
            <Badge variant="default" className="text-xs">{lists.length}</Badge>
          </div>
          {lists.length === 0 ? (
            <Card className="p-6"><div className="text-sm text-fg-secondary">No lists yet.</div></Card>
          ) : (
            <div className="space-y-2">
              {lists.map((l) => (
                <Card key={l.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{l.name}</span>
                    <span className="text-xs text-fg-secondary">{l.subscriberCount || 0} subscribers</span>
                  </div>
                  {l.description && <p className="text-xs text-fg-secondary mt-1">{l.description}</p>}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* A/B Tests Tab */}
      {tab === 'ab-tests' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="text-xs text-fg-secondary mb-1">Total Tests</div>
              <div className="text-2xl font-bold">{abTestStats.total}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-secondary mb-1">Running</div>
              <div className="text-2xl font-bold">{abTestStats.running}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-secondary mb-1">Completed</div>
              <div className="text-2xl font-bold">{abTestStats.completed}</div>
            </Card>
          </div>
          <Card className="p-4">
            <h3 className="text-sm font-medium mb-3">Tests by Status</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(abTestStats.byStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant[status] || 'default'} className="text-xs">
                  {status}: {count}
                </Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Drip Sequences Tab */}
      {tab === 'drip' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card className="p-4">
              <div className="text-xs text-fg-secondary mb-1">Sequences</div>
              <div className="text-2xl font-bold">{dripStats.total}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-secondary mb-1">Enrollments</div>
              <div className="text-2xl font-bold">{dripStats.totalEnrollments}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-secondary mb-1">Active</div>
              <div className="text-2xl font-bold">{dripStats.activeEnrollments}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-secondary mb-1">Completed</div>
              <div className="text-2xl font-bold">{dripStats.completedEnrollments}</div>
            </Card>
          </div>
          <Card className="p-4">
            <h3 className="text-sm font-medium mb-3">Sequences by Status</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(dripStats.byStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant[status] || 'default'} className="text-xs">
                  {status}: {count}
                </Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Create Campaign Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="heading-display text-lg">New Campaign</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-fg-secondary">Name</label>
                <input
                  className="input w-full mt-1"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  placeholder="Campaign name"
                />
              </div>
              <div>
                <label className="text-xs text-fg-secondary">Subject</label>
                <input
                  className="input w-full mt-1"
                  value={newCampaign.subject}
                  onChange={(e) => setNewCampaign({ ...newCampaign, subject: e.target.value })}
                  placeholder="Email subject"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-fg-secondary">From Name</label>
                  <input
                    className="input w-full mt-1"
                    value={newCampaign.fromName}
                    onChange={(e) => setNewCampaign({ ...newCampaign, fromName: e.target.value })}
                    placeholder="Sender name"
                  />
                </div>
                <div>
                  <label className="text-xs text-fg-secondary">From Email</label>
                  <input
                    className="input w-full mt-1"
                    value={newCampaign.fromEmail}
                    onChange={(e) => setNewCampaign({ ...newCampaign, fromEmail: e.target.value })}
                    placeholder="sender@example.com"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-fg-secondary">Body HTML</label>
                <textarea
                  className="input w-full mt-1 min-h-24"
                  value={newCampaign.bodyHtml}
                  onChange={(e) => setNewCampaign({ ...newCampaign, bodyHtml: e.target.value })}
                  placeholder="<h1>Hello {{first_name}}</h1>"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button variant="primary" size="sm" onClick={handleCreateCampaign} disabled={creating || !newCampaign.name.trim()}>
                  {creating ? 'Creating...' : 'Create Campaign'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
