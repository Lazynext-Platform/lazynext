'use client';

import { useState } from 'react';
import {
  Activity, Users, AtSign, Edit3, MessageSquare, Smile, RefreshCw,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

// ── Types ──

interface ActivityItem {
  id: string;
  type: string;
  userId: string | null;
  resourceType: string | null;
  resourceId: string | null;
  workspaceId: string | null;
  organizationId: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

interface PresenceRecord {
  userId: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen: Date;
}

interface Comment {
  id: string;
  resourceType: string;
  resourceId: string;
  workspaceId: string;
  organizationId: string;
  body: string;
  parentId: string | null;
  mentions: string[];
  edited: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  replies?: Comment[];
  reactions?: ReactionGroup[];
  resolved?: boolean;
}

interface ReactionGroup {
  emoji: string;
  count: number;
  userIds: string[];
}

interface EditSession {
  id: string;
  resourceType: string;
  resourceId: string;
  workspaceId: string;
  organizationId: string;
  activeUsers: string[];
  startedAt: Date;
  endedAt?: Date;
  active: boolean;
  createdBy: string;
}

// ── Helpers ──

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  online: 'success',
  away: 'warning',
  busy: 'danger',
  offline: 'default',
};

const statusDot: Record<string, string> = {
  online: 'bg-success',
  away: 'bg-warning',
  busy: 'bg-danger',
  offline: 'bg-fg-muted',
};

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function durationLabel(startedAt: Date): string {
  const minutes = Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remMin = minutes % 60;
  return `${hours}h ${remMin}m`;
}

const RESOURCE_TYPES = ['task', 'goal', 'project', 'document', 'knowledge', 'approval', 'agent'];

// ── Component ──

export function CollaborationHub({
  organizationId,
  workspaceId,
  activity: initialActivity,
  presence: initialPresence,
  mentions: initialMentions,
  sessions: initialSessions,
}: {
  organizationId: string;
  workspaceId: string;
  activity: ActivityItem[];
  presence: PresenceRecord[];
  mentions: Comment[];
  sessions: EditSession[];
}) {
  const [activity] = useState(initialActivity);
  const [presence] = useState(initialPresence);
  const [mentions] = useState(initialMentions);
  const [sessions] = useState(initialSessions);

  // Comment thread viewer state.
  const [resourceType, setResourceType] = useState('task');
  const [resourceId, setResourceId] = useState('');
  const [thread, setThread] = useState<Comment[] | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [reactionsByComment, setReactionsByComment] = useState<Record<string, ReactionGroup[]>>({});

  async function loadThread() {
    if (!resourceId.trim()) return;
    setLoadingThread(true);
    try {
      const res = await fetch(
        `/api/comments/thread?resourceType=${encodeURIComponent(resourceType)}&resourceId=${encodeURIComponent(resourceId.trim())}`,
      );
      const data = await res.json();
      setThread(data.thread || []);
    } catch {
      setThread([]);
    } finally {
      setLoadingThread(false);
    }
  }

  async function loadReactions(commentId: string) {
    try {
      const res = await fetch(`/api/comments/${commentId}/reactions`);
      const data = await res.json();
      setReactionsByComment((prev) => ({ ...prev, [commentId]: data.reactions || [] }));
    } catch {
      // ignore
    }
  }

  async function toggleReaction(commentId: string, emoji: string) {
    await fetch(`/api/comments/${commentId}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji }),
    });
    await loadReactions(commentId);
  }

  function renderComment(c: Comment, depth: number = 0): React.ReactNode {
    const reactions = reactionsByComment[c.id] || c.reactions || [];
    return (
      <div key={c.id} className={depth > 0 ? 'ml-6 border-l border-fg-muted/20 pl-4' : ''}>
        <div className="py-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium">User {c.createdBy.slice(0, 6)}</span>
            <span className="text-xs text-fg-secondary">{timeAgo(c.createdAt)}</span>
            {c.edited && <Badge variant="default" className="text-xs">edited</Badge>}
            {c.resolved && <Badge variant="success" className="text-xs">resolved</Badge>}
          </div>
          <p className="text-sm">{c.body}</p>
          <div className="flex items-center gap-2 mt-2">
            {reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => toggleReaction(c.id, r.emoji)}
                className="text-xs bg-fg-muted/10 rounded px-2 py-0.5 hover:bg-fg-muted/20"
              >
                {r.emoji} {r.count}
              </button>
            ))}
            <button
              onClick={() => toggleReaction(c.id, '+1')}
              className="text-xs text-fg-secondary hover:text-fg-primary"
            >
              <Smile className="h-3 w-3 inline" /> react
            </button>
            <button
              onClick={() => loadReactions(c.id)}
              className="text-xs text-fg-secondary hover:text-fg-primary"
            >
              <RefreshCw className="h-3 w-3 inline" /> refresh
            </button>
          </div>
        </div>
        {c.replies && c.replies.length > 0 && (
          <div>{c.replies.map((r) => renderComment(r, depth + 1))}</div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Activity Feed */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-4 w-4 text-accent-primary" />
          <h2 className="heading-display text-sm">Activity Feed</h2>
          <Badge variant="default" className="text-xs">{activity.length}</Badge>
        </div>
        {activity.length === 0 ? (
          <Card className="p-6">
            <EmptyState icon={Activity} title="No recent activity" description="Actions across your workspace will appear here." />
          </Card>
        ) : (
          <Card className="p-4">
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {activity.map((item) => (
                <div key={item.id} className="flex items-start gap-3 text-sm py-2 border-b border-fg-muted/10 last:border-0">
                  <Badge variant="info" className="text-xs">{item.type}</Badge>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">
                      <span className="font-medium">{item.userId ? `User ${item.userId.slice(0, 6)}` : 'System'}</span>
                      {' — '}
                      <span className="text-fg-secondary">
                        {item.resourceType ? `${item.resourceType}/${item.resourceId}` : item.type}
                      </span>
                    </div>
                    <div className="text-xs text-fg-muted">{timeAgo(item.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Online Users */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-accent-primary" />
            <h2 className="heading-display text-sm">Online Users</h2>
            <Badge variant="success" className="text-xs">
              {presence.filter((p) => p.status === 'online').length}
            </Badge>
          </div>
          {presence.length === 0 ? (
            <Card className="p-6">
              <div className="text-sm text-fg-secondary">No one is online right now.</div>
            </Card>
          ) : (
            <Card className="p-4">
              <div className="space-y-2">
                {presence.map((p) => (
                  <div key={p.userId} className="flex items-center gap-3">
                    <div className="relative">
                      <div className="h-8 w-8 rounded-full bg-accent-primary/20 flex items-center justify-center text-xs font-medium">
                        {p.userId.slice(0, 2).toUpperCase()}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface ${statusDot[p.status] || 'bg-fg-muted'}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">User {p.userId.slice(0, 8)}</div>
                      <div className="text-xs text-fg-secondary">last seen {timeAgo(p.lastSeen)}</div>
                    </div>
                    <Badge variant={statusVariant[p.status] || 'default'} className="text-xs">{p.status}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Recent Mentions */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AtSign className="h-4 w-4 text-accent-primary" />
            <h2 className="heading-display text-sm">Recent Mentions</h2>
            <Badge variant="default" className="text-xs">{mentions.length}</Badge>
          </div>
          {mentions.length === 0 ? (
            <Card className="p-6">
              <div className="text-sm text-fg-secondary">No mentions yet.</div>
            </Card>
          ) : (
            <Card className="p-4">
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {mentions.map((m) => (
                  <div key={m.id} className="py-2 border-b border-fg-muted/10 last:border-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="accent" className="text-xs">{m.resourceType}</Badge>
                      <span className="text-xs text-fg-secondary">{timeAgo(m.createdAt)}</span>
                    </div>
                    <p className="text-sm line-clamp-2">{m.body}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Active Edit Sessions */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Edit3 className="h-4 w-4 text-accent-primary" />
          <h2 className="heading-display text-sm">Active Edit Sessions</h2>
          <Badge variant="default" className="text-xs">{sessions.length}</Badge>
        </div>
        {sessions.length === 0 ? (
          <Card className="p-6">
            <div className="text-sm text-fg-secondary">No active edit sessions.</div>
          </Card>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <Card key={s.id} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="info" className="text-xs">{s.resourceType}</Badge>
                  <span className="text-sm font-medium">{s.resourceId}</span>
                  <span className="text-xs text-fg-secondary">
                    {s.activeUsers.length} user{s.activeUsers.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-fg-secondary">
                  <span>{durationLabel(s.startedAt)}</span>
                  <div className="flex -space-x-2">
                    {s.activeUsers.slice(0, 4).map((uid) => (
                      <div
                        key={uid}
                        className="h-6 w-6 rounded-full bg-accent-primary/20 border border-surface flex items-center justify-center text-xs"
                      >
                        {uid.slice(0, 2).toUpperCase()}
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Comment Thread Viewer */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="h-4 w-4 text-accent-primary" />
          <h2 className="heading-display text-sm">Comment Thread Viewer</h2>
        </div>
        <Card className="p-4">
          <div className="flex flex-wrap gap-2 mb-4">
            <select
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value)}
              className="text-sm border border-fg-muted/30 rounded px-2 py-1 bg-surface"
            >
              {RESOURCE_TYPES.map((rt) => (
                <option key={rt} value={rt}>{rt}</option>
              ))}
            </select>
            <input
              type="text"
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
              placeholder="Resource ID"
              className="text-sm border border-fg-muted/30 rounded px-3 py-1 bg-surface flex-1 min-w-[200px]"
            />
            <Button variant="primary" onClick={loadThread} disabled={loadingThread || !resourceId.trim()} className="text-xs">
              {loadingThread ? 'Loading…' : 'Load Thread'}
            </Button>
          </div>
          {thread === null ? (
            <div className="text-sm text-fg-secondary py-8 text-center">
              Select a resource type and ID, then load the thread.
            </div>
          ) : thread.length === 0 ? (
            <EmptyState icon={MessageSquare} title="No comments" description="This resource has no comments yet." />
          ) : (
            <div className="space-y-1 max-h-[600px] overflow-y-auto">
              {thread.map((c) => renderComment(c))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
