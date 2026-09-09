'use client';

import { useState, useTransition } from 'react';
import {
  Calendar, Clock, Users, CheckSquare, FileText, Sparkles,
  Plus, ListChecks, Gavel, BellRing, X,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

export interface Meeting {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  scheduledAt: string | Date;
  duration: number;
  location: string;
  organizerId: string;
  attendeeIds: unknown[];
  agenda: unknown[];
  notes: string;
  transcript: string;
  aiSummary: string;
  actionItems: Array<Record<string, unknown>>;
  decisions: Array<Record<string, unknown>>;
  followUps: Array<Record<string, unknown>>;
  tags: unknown[];
}
interface Stats {
  total: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  avgDuration: number;
  actionItemsCount: number;
  decisionsCount: number;
}
export interface ActionItem {
  id: string;
  text: string;
  status: string;
  assignee: string | null;
  meetingId: string;
  meetingTitle: string;
  meetingDate: string | Date;
}

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  scheduled: 'info',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'danger',
};

const typeVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  general: 'default',
  standup: 'info',
  review: 'accent',
  planning: 'warning',
  one_on_one: 'default',
  client: 'success',
};

function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function MeetingDashboard({
  organizationId,
  meetings: initialMeetings,
  upcoming: initialUpcoming,
  stats,
  actionItems: initialActionItems,
}: {
  organizationId: string;
  meetings: Meeting[];
  upcoming: Meeting[];
  stats: Stats;
  actionItems: ActionItem[];
}) {
  const [meetings] = useState(initialMeetings);
  const [upcoming] = useState(initialUpcoming);
  const [actionItems] = useState(initialActionItems);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [_, startTransition] = useTransition();
  void organizationId;
  void _;

  const selected = meetings.find((m) => m.id === selectedId) || null;

  async function handleGenerateSummary(id: string) {
    const res = await fetch(`/api/meetings/${id}/ai-summary`, { method: 'POST' });
    const data = await res.json();
    if (data.meeting) {
      startTransition(() => { window.location.reload(); });
    }
  }

  async function handleExtractActions(id: string) {
    const res = await fetch(`/api/meetings/${id}/action-items`, { method: 'POST' });
    const data = await res.json();
    if (data.meeting) {
      startTransition(() => { window.location.reload(); });
    }
  }

  async function handleCompleteFollowUp(meetingId: string, followUpId: string) {
    await fetch(`/api/meetings/${meetingId}/follow-ups/${followUpId}`, { method: 'PATCH' });
    startTransition(() => { window.location.reload(); });
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Calendar className="h-3 w-3" /> Total
          </div>
          <div className="text-2xl font-semibold">{stats.total}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Clock className="h-3 w-3" /> Avg Duration
          </div>
          <div className="text-2xl font-semibold">{stats.avgDuration}m</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <CheckSquare className="h-3 w-3" /> Action Items
          </div>
          <div className="text-2xl font-semibold">{stats.actionItemsCount}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Gavel className="h-3 w-3" /> Decisions
          </div>
          <div className="text-2xl font-semibold">{stats.decisionsCount}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Users className="h-3 w-3" /> Completed
          </div>
          <div className="text-2xl font-semibold">{stats.byStatus.completed || 0}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Calendar className="h-3 w-3" /> Scheduled
          </div>
          <div className="text-2xl font-semibold">{stats.byStatus.scheduled || 0}</div>
        </Card>
      </div>

      {/* Upcoming Meetings */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="heading-display text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-accent-primary" /> Upcoming Meetings
          </h2>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" /> New Meeting
          </Button>
        </div>
        {upcoming.length === 0 ? (
          <Card className="p-6">
            <EmptyState icon={Calendar} title="No upcoming meetings" description="Schedule your next meeting to get started." />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((m) => (
              <Card key={m.id} className="p-4 cursor-pointer hover:border-accent-primary transition-colors" onClick={() => setSelectedId(m.id)}>
                <div className="flex items-start justify-between mb-2">
                  <span className="text-sm font-semibold block truncate pr-2">{m.title}</span>
                  <Badge variant={statusVariant[m.status] || 'default'} className="text-xs shrink-0">{m.status}</Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-fg-muted flex-wrap">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(m.scheduledAt)}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {m.duration}m</span>
                  <Badge variant={typeVariant[m.type] || 'default'} className="text-xs">{m.type}</Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* All Meetings List */}
      <div>
        <h2 className="heading-display text-lg mb-3 flex items-center gap-2">
          <FileText className="h-5 w-5 text-accent-primary" /> All Meetings
        </h2>
        {meetings.length === 0 ? (
          <Card className="p-6">
            <EmptyState icon={FileText} title="No meetings yet" description="Create your first meeting to start tracking notes and action items." />
          </Card>
        ) : (
          <div className="space-y-2">
            {meetings.map((m) => (
              <Card key={m.id} className="p-4 cursor-pointer hover:border-accent-primary transition-colors" onClick={() => setSelectedId(m.id)}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm font-semibold truncate">{m.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-fg-secondary flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {formatDate(m.scheduledAt)}
                    </span>
                    <Badge variant={statusVariant[m.status] || 'default'} className="text-xs">{m.status}</Badge>
                    <Badge variant={typeVariant[m.type] || 'default'} className="text-xs">{m.type}</Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Action Items Tracker */}
      <div>
        <h2 className="heading-display text-lg mb-3 flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-accent-primary" /> Action Items Tracker
        </h2>
        {actionItems.length === 0 ? (
          <Card className="p-6">
            <EmptyState icon={ListChecks} title="No action items" description="Action items extracted from meeting notes will appear here." />
          </Card>
        ) : (
          <div className="space-y-2">
            {actionItems.map((item, idx) => (
              <Card key={item.id || idx} className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckSquare className="h-4 w-4 text-fg-muted shrink-0" />
                    <span className="text-sm truncate">{item.text}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-fg-secondary">{item.meetingTitle}</span>
                    <Badge variant={item.status === 'completed' ? 'success' : 'warning'} className="text-xs">{item.status}</Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Meeting Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedId(null)}>
          <Card className="max-h-[85vh] w-full max-w-3xl overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="heading-display text-xl">{selected.title}</h3>
                <div className="flex items-center gap-2 mt-1 text-xs text-fg-secondary flex-wrap">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(selected.scheduledAt)}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {selected.duration}m</span>
                  {selected.location && <span>{selected.location}</span>}
                  <Badge variant={statusVariant[selected.status] || 'default'} className="text-xs">{selected.status}</Badge>
                  <Badge variant={typeVariant[selected.type] || 'default'} className="text-xs">{selected.type}</Badge>
                </div>
              </div>
              <button onClick={() => setSelectedId(null)} className="text-fg-muted hover:text-fg-primary">
                <X className="h-5 w-5" />
              </button>
            </div>

            {selected.description && (
              <p className="text-sm text-fg-secondary mb-4">{selected.description}</p>
            )}

            {/* AI Summary */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold flex items-center gap-1">
                  <Sparkles className="h-4 w-4 text-accent-primary" /> AI Summary
                </h4>
                <Button size="sm" variant="ghost" onClick={() => handleGenerateSummary(selected.id)}>
                  <Sparkles className="h-3 w-3" /> Generate
                </Button>
              </div>
              {selected.aiSummary ? (
                <div className="rounded-lg bg-surface-alt p-3 text-sm whitespace-pre-wrap">{selected.aiSummary}</div>
              ) : (
                <p className="text-xs text-fg-muted">No AI summary yet. Click Generate to create one from notes.</p>
              )}
            </div>

            {/* Notes */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                <FileText className="h-4 w-4" /> Notes
              </h4>
              {selected.notes ? (
                <div className="rounded-lg bg-surface-alt p-3 text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">{selected.notes}</div>
              ) : (
                <p className="text-xs text-fg-muted">No notes recorded.</p>
              )}
            </div>

            {/* Action Items */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold flex items-center gap-1">
                  <CheckSquare className="h-4 w-4" /> Action Items ({selected.actionItems.length})
                </h4>
                <Button size="sm" variant="ghost" onClick={() => handleExtractActions(selected.id)}>
                  <Plus className="h-3 w-3" /> Extract
                </Button>
              </div>
              {selected.actionItems.length > 0 ? (
                <div className="space-y-1">
                  {selected.actionItems.map((item, idx) => (
                    <div key={String(item.id || idx)} className="flex items-center gap-2 text-sm">
                      <CheckSquare className="h-3 w-3 text-fg-muted" />
                      <span>{String(item.text || '')}</span>
                      <Badge variant={item.status === 'completed' ? 'success' : 'warning'} className="text-xs ml-auto">{String(item.status || 'open')}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-fg-muted">No action items. Click Extract to find them in notes.</p>
              )}
            </div>

            {/* Decisions */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                <Gavel className="h-4 w-4" /> Decisions ({selected.decisions.length})
              </h4>
              {selected.decisions.length > 0 ? (
                <div className="space-y-1">
                  {selected.decisions.map((dec, idx) => (
                    <div key={String(dec.id || idx)} className="flex items-center gap-2 text-sm">
                      <Gavel className="h-3 w-3 text-fg-muted" />
                      <span>{String(dec.text || '')}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-fg-muted">No decisions recorded.</p>
              )}
            </div>

            {/* Follow-ups */}
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                <BellRing className="h-4 w-4" /> Follow-ups ({selected.followUps.length})
              </h4>
              {selected.followUps.length > 0 ? (
                <div className="space-y-1">
                  {selected.followUps.map((fu, idx) => (
                    <div key={String(fu.id || idx)} className="flex items-center gap-2 text-sm">
                      <BellRing className="h-3 w-3 text-fg-muted" />
                      <span>{String(fu.text || '')}</span>
                      {fu.status !== 'completed' && (
                        <button
                          onClick={() => handleCompleteFollowUp(selected.id, String(fu.id))}
                          className="ml-auto text-xs text-accent-primary hover:underline"
                        >
                          Complete
                        </button>
                      )}
                      {fu.status === 'completed' && (
                        <Badge variant="success" className="text-xs ml-auto">completed</Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-fg-muted">No follow-ups.</p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Create Meeting Form */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCreate(false)}>
          <Card className="w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="heading-display text-lg">New Meeting</h3>
              <button onClick={() => setShowCreate(false)} className="text-fg-muted hover:text-fg-primary">
                <X className="h-5 w-5" />
              </button>
            </div>
            <CreateMeetingForm onClose={() => setShowCreate(false)} />
          </Card>
        </div>
      )}
    </div>
  );
}

function CreateMeetingForm({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('general');
  const [scheduledAt, setScheduledAt] = useState('');
  const [duration, setDuration] = useState('60');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !scheduledAt) return;
    setSubmitting(true);
    try {
      await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          type,
          scheduledAt,
          duration: parseInt(duration, 10),
          location,
          description,
        }),
      });
      onClose();
      window.location.reload();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="text-xs text-fg-secondary mb-1 block">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          placeholder="Weekly team sync"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-fg-secondary mb-1 block">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm">
            <option value="general">General</option>
            <option value="standup">Standup</option>
            <option value="review">Review</option>
            <option value="planning">Planning</option>
            <option value="one_on_one">1-on-1</option>
            <option value="client">Client</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-fg-secondary mb-1 block">Duration (min)</label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            min="1"
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-fg-secondary mb-1 block">Scheduled At</label>
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          required
        />
      </div>
      <div>
        <label className="text-xs text-fg-secondary mb-1 block">Location / Link</label>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          placeholder="Zoom link or room name"
        />
      </div>
      <div>
        <label className="text-xs text-fg-secondary mb-1 block">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          rows={3}
          placeholder="Meeting agenda or description"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={submitting}>{submitting ? 'Creating...' : 'Create Meeting'}</Button>
      </div>
    </form>
  );
}
