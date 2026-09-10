'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageSquare,
  Send,
  Lock,
} from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';

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
  comments?: TicketComment[];
}

interface TicketDetailProps {
  ticket: Ticket;
  userId: string;
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

export function TicketDetail({ ticket, userId }: TicketDetailProps) {
  const router = useRouter();
  const [comments, setComments] = useState<TicketComment[]>(ticket.comments || []);
  const [commentBody, setCommentBody] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [assigneeId, setAssigneeId] = useState(ticket.assigneeId || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentBody.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorType: 'agent',
          body: commentBody,
          isInternal,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'failed_to_add_comment');
      }
      const data = await res.json();
      setComments([...comments, data.comment]);
      setCommentBody('');
      setIsInternal(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(status: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'failed_to_change_status');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleEscalate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/escalate`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'failed_to_escalate');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!assigneeId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigneeId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'failed_to_assign');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  const sla = formatSlaCountdown(ticket.slaDueAt);
  const isClosed = ticket.status === 'closed';
  const isResolved = ticket.status === 'resolved';

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Button href="/support" variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4" /> Back to Support
        </Button>
      </div>

      {/* Ticket header */}
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant={statusVariant[ticket.status] || 'default'}>{ticket.status}</Badge>
              <Badge variant={priorityVariant[ticket.priority] || 'default'}>{ticket.priority}</Badge>
              <Badge variant="default">{ticket.category}</Badge>
              <Badge variant="default">{ticket.channel}</Badge>
            </div>
            <h1 className="heading-display text-xl mb-2">{ticket.subject}</h1>
            <p className="text-sm text-fg-secondary whitespace-pre-wrap">{ticket.description}</p>
          </div>
          <div className="shrink-0">
            <Badge variant={sla.variant} className="text-xs">
              <Clock className="h-3 w-3 mr-1" /> {sla.text}
            </Badge>
          </div>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-4 text-xs text-fg-secondary border-t border-border-primary pt-4 sm:grid-cols-4">
          <div>
            <span className="block text-fg-muted mb-1">Created</span>
            <span>{new Date(ticket.createdAt).toLocaleString()}</span>
          </div>
          <div>
            <span className="block text-fg-muted mb-1">Updated</span>
            <span>{new Date(ticket.updatedAt).toLocaleString()}</span>
          </div>
          {ticket.firstResponseAt && (
            <div>
              <span className="block text-fg-muted mb-1">First Response</span>
              <span>{new Date(ticket.firstResponseAt).toLocaleString()}</span>
            </div>
          )}
          {ticket.resolvedAt && (
            <div>
              <span className="block text-fg-muted mb-1">Resolved</span>
              <span>{new Date(ticket.resolvedAt).toLocaleString()}</span>
            </div>
          )}
        </div>

        {error && <p className="text-xs text-danger mt-4">{error}</p>}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border-primary">
          {!isResolved && !isClosed && (
            <Button size="sm" variant="secondary" onClick={() => handleStatusChange('in_progress')} disabled={loading}>
              <Clock className="h-4 w-4" /> Start
            </Button>
          )}
          {!isResolved && !isClosed && (
            <Button size="sm" variant="primary" onClick={() => handleStatusChange('resolved')} disabled={loading}>
              <CheckCircle className="h-4 w-4" /> Resolve
            </Button>
          )}
          {!isClosed && (
            <Button size="sm" variant="ghost" onClick={() => handleStatusChange('closed')} disabled={loading}>
              <XCircle className="h-4 w-4" /> Close
            </Button>
          )}
          {ticket.status !== 'escalated' && (
            <Button size="sm" variant="danger" onClick={handleEscalate} disabled={loading}>
              <AlertCircle className="h-4 w-4" /> Escalate
            </Button>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Comments thread */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="heading-display text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Comments ({comments.length})
          </h2>
          {comments.length === 0 ? (
            <Card className="p-4">
              <p className="text-xs text-fg-muted text-center">No comments yet</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {comments.map((c) => (
                <Card key={c.id} className={`p-4 ${c.isInternal ? 'border-warning' : ''}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={c.authorType === 'system' ? 'default' : c.isInternal ? 'warning' : 'info'} className="text-xs">
                        {c.authorType}
                      </Badge>
                      {c.isInternal && (
                        <span className="flex items-center gap-1 text-xs text-fg-muted">
                          <Lock className="h-3 w-3" /> Internal
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-fg-muted">{new Date(c.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{c.body}</p>
                </Card>
              ))}
            </div>
          )}

          {/* Add comment form */}
          {!isClosed && (
            <Card className="p-4">
              <form onSubmit={handleAddComment} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-fg-secondary mb-1">Add Comment</label>
                  <textarea
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    rows={3}
                    placeholder="Type your reply…"
                    className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-fg-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="rounded"
                    />
                    <Lock className="h-3 w-3" /> Internal note
                  </label>
                  <Button type="submit" size="sm" disabled={loading || !commentBody.trim()}>
                    <Send className="h-4 w-4" /> Comment
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </div>

        {/* Sidebar — assign ticket */}
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="heading-display text-sm mb-3">Assignment</h3>
            <form onSubmit={handleAssign} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-fg-secondary mb-1">Assignee ID</label>
                <input
                  type="text"
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  placeholder="User ID"
                  className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
                />
              </div>
              <Button type="submit" size="sm" disabled={loading || !assigneeId.trim()}>
                Assign
              </Button>
            </form>
            {ticket.assigneeId && (
              <p className="text-xs text-fg-muted mt-2">Currently assigned: {ticket.assigneeId}</p>
            )}
          </Card>

          <Card className="p-4">
            <h3 className="heading-display text-sm mb-3">Details</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-fg-secondary">Ticket ID</span>
                <span className="font-mono">{ticket.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-fg-secondary">Channel</span>
                <span>{ticket.channel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-fg-secondary">Category</span>
                <span>{ticket.category}</span>
              </div>
              {ticket.customerId && (
                <div className="flex justify-between">
                  <span className="text-fg-secondary">Customer</span>
                  <span className="font-mono">{ticket.customerId}</span>
                </div>
              )}
              {ticket.reporterId && (
                <div className="flex justify-between">
                  <span className="text-fg-secondary">Reporter</span>
                  <span className="font-mono">{ticket.reporterId}</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
