'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Ticket as TicketIcon,
  Plus,
  X,
  Clock,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

interface TicketComment {
  id: string;
  ticketId: string;
  authorId?: string | null;
  authorType: string;
  body: string;
  isInternal: boolean;
  createdAt: Date;
}

interface Ticket {
  id: string;
  organizationId: string;
  workspaceId?: string | null;
  customerId?: string | null;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  channel: string;
  assigneeId?: string | null;
  reporterId?: string | null;
  slaDueAt?: Date | null;
  resolvedAt?: Date | null;
  closedAt?: Date | null;
  firstResponseAt?: Date | null;
  tags: string;
  metadata: string;
  createdAt: Date;
  updatedAt: Date;
  _count?: { comments: number };
  comments?: TicketComment[];
}

interface Stats {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byCategory: Record<string, number>;
  open: number;
  resolved: number;
  avgResolutionMs: number;
  slaComplianceRate: number;
}

interface TicketDashboardProps {
  workspaceId: string;
  organizationId: string;
  workspaces: { id: string; organizationId: string; name: string }[];
  initialTickets: Ticket[];
  initialStats: Stats;
  initialSlaTickets: Ticket[];
}

const statusVariant: Record<string, BadgeVariant> = {
  open: 'info',
  in_progress: 'accent',
  waiting_on_customer: 'warning',
  resolved: 'success',
  closed: 'default',
  escalated: 'danger',
};

const priorityVariant: Record<string, BadgeVariant> = {
  low: 'default',
  medium: 'info',
  high: 'warning',
  urgent: 'danger',
};

function formatSlaCountdown(slaDueAt?: Date | string | null): { text: string; variant: BadgeVariant } {
  if (!slaDueAt) return { text: 'No SLA', variant: 'default' };
  const due = new Date(slaDueAt).getTime();
  const now = Date.now();
  const diff = due - now;
  if (diff <= 0) return { text: 'Breached', variant: 'danger' };
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours < 1) return { text: `${minutes}m left`, variant: 'warning' };
  if (hours < 4) return { text: `${hours}h ${minutes}m left`, variant: 'warning' };
  return { text: `${hours}h left`, variant: 'default' };
}

function formatDuration(ms: number): string {
  if (ms <= 0) return '—';
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours >= 1) return `${hours.toFixed(1)}h`;
  const minutes = Math.floor(ms / (1000 * 60));
  return `${minutes}m`;
}

export function TicketDashboard({
  workspaceId,
  organizationId,
  workspaces,
  initialTickets,
  initialStats,
  initialSlaTickets,
}: TicketDashboardProps) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('general');
  const [channel, setChannel] = useState('internal');
  const [slaHours, setSlaHours] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          workspaceId,
          subject,
          description,
          priority,
          category,
          channel,
          slaHours: slaHours ? parseFloat(slaHours) : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'failed_to_create_ticket');
      }
      setSubject('');
      setDescription('');
      setPriority('medium');
      setCategory('general');
      setChannel('internal');
      setSlaHours('');
      setShowCreate(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  const resolvedToday = initialStats.byStatus.resolved || 0;

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> New Ticket
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <TicketIcon className="h-3 w-3" /> Open
          </div>
          <div className="text-2xl font-semibold">{initialStats.open}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Clock className="h-3 w-3" /> In Progress
          </div>
          <div className="text-2xl font-semibold">{initialStats.byStatus.in_progress || 0}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <CheckCircle className="h-3 w-3" /> Resolved
          </div>
          <div className="text-2xl font-semibold">{resolvedToday}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <AlertCircle className="h-3 w-3" /> SLA Breaches
          </div>
          <div className="text-2xl font-semibold text-danger">{initialSlaTickets.length}</div>
        </Card>
      </div>

      {/* SLA at-risk list */}
      {initialSlaTickets.length > 0 && (
        <div>
          <h2 className="heading-display text-sm mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-danger" /> SLA At Risk / Breached
          </h2>
          <div className="space-y-2">
            {initialSlaTickets.map((t) => {
              const sla = formatSlaCountdown(t.slaDueAt);
              return (
                <Card key={t.id} className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge variant={priorityVariant[t.priority] || 'default'} className="text-xs shrink-0">{t.priority}</Badge>
                    <span className="text-sm font-medium truncate">{t.subject}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={sla.variant} className="text-xs">{sla.text}</Badge>
                    <Button href={`/support/${t.id}`} variant="ghost" size="sm">
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Ticket list */}
      <div>
        <h2 className="heading-display text-sm mb-3">Recent Tickets</h2>
        {initialTickets.length === 0 ? (
          <Card className="p-6">
            <EmptyState
              icon={TicketIcon}
              title="No tickets yet"
              description="Create your first support ticket to start tracking issues."
              action={<Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> New Ticket</Button>}
            />
          </Card>
        ) : (
          <div className="space-y-2">
            {initialTickets.map((t) => {
              const sla = formatSlaCountdown(t.slaDueAt);
              return (
                <Card key={t.id} className="p-4 hover:border-accent-primary transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={statusVariant[t.status] || 'default'} className="text-xs">{t.status}</Badge>
                        <Badge variant={priorityVariant[t.priority] || 'default'} className="text-xs">{t.priority}</Badge>
                        <Badge variant="default" className="text-xs">{t.category}</Badge>
                      </div>
                      <a href={`/support/${t.id}`} className="text-sm font-semibold block truncate hover:text-accent-primary">
                        {t.subject}
                      </a>
                      <p className="text-xs text-fg-secondary mt-0.5 line-clamp-1">{t.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-fg-muted">
                        {t._count && t._count.comments > 0 && (
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" /> {t._count.comments}
                          </span>
                        )}
                        <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Badge variant={sla.variant} className="text-xs">{sla.text}</Badge>
                      <Button href={`/support/${t.id}`} variant="ghost" size="sm">
                        View <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* SLA compliance summary */}
      <Card className="p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-fg-secondary">SLA Compliance Rate</span>
          <span className="font-semibold">
            {(initialStats.slaComplianceRate * 100).toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center justify-between text-sm mt-2">
          <span className="text-fg-secondary">Avg Resolution Time</span>
          <span className="font-semibold">{formatDuration(initialStats.avgResolutionMs)}</span>
        </div>
      </Card>

      {/* Create ticket modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCreate(false)}>
          <div
            className="w-full max-w-lg rounded-lg border-2 bg-bg-primary p-6 max-h-[90vh] overflow-y-auto"
            style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-md)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="heading-display text-lg">New Ticket</h2>
              <button onClick={() => setShowCreate(false)} className="text-fg-secondary hover:text-fg">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-fg-secondary mb-1">Subject *</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  placeholder="Brief summary of the issue"
                  className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-fg-secondary mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Detailed description…"
                  className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-fg-secondary mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-fg-secondary mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
                  >
                    <option value="general">General</option>
                    <option value="billing">Billing</option>
                    <option value="technical">Technical</option>
                    <option value="bug">Bug</option>
                    <option value="feature_request">Feature Request</option>
                    <option value="account">Account</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-fg-secondary mb-1">Channel</label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                    className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
                  >
                    <option value="internal">Internal</option>
                    <option value="email">Email</option>
                    <option value="chat">Chat</option>
                    <option value="web">Web</option>
                    <option value="api">API</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-fg-secondary mb-1">SLA Hours</label>
                  <input
                    type="number"
                    value={slaHours}
                    onChange={(e) => setSlaHours(e.target.value)}
                    placeholder="e.g. 24"
                    min="0"
                    step="1"
                    className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
                  />
                </div>
              </div>
              {error && <p className="text-xs text-danger">{error}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={loading}>
                  {loading ? 'Creating…' : 'Create Ticket'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
