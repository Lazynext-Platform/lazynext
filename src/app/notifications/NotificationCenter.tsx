'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Bell,
  MessageSquare,
  Mail,
  AtSign,
  Settings,
  CheckCheck,
  Check,
  Archive,
  Trash2,
  AlertTriangle,
  Shield,
  Bot,
  Rocket,
  DollarSign,
  Calendar,
  Target,
  FileText,
  X,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState, Switch } from '@/components/ui';
import {
  type NotificationCategory,
  type NotificationPriority,
  type NotificationPreferences,
  type NotificationType,
  NOTIFICATION_TYPES,
  DIGEST_FREQUENCIES,
  getCategoryLabel,
  getTypeLabel,
  getPriorityColor,
} from '@/lib/services/notification-defaults';
import type { NotificationStats } from '@/lib/services/notification-service';

// ── Types ──

interface NotificationItem {
  id: string;
  userId: string;
  workspaceId: string | null;
  organizationId: string | null;
  type: string;
  title: string;
  body: string | null;
  category: NotificationCategory;
  priority: NotificationPriority;
  actionUrl: string | null;
  metadata: Record<string, unknown>;
  createdBy: string | null;
  archived: boolean;
  read: boolean;
  createdAt: Date | string;
}

interface NotificationCenterProps {
  initialNotifications: NotificationItem[];
  initialUnreadCount: number;
  initialStats: NotificationStats;
  initialPreferences: NotificationPreferences;
}

type Filter = 'all' | 'unread' | NotificationCategory;

// ── Category icons ──

const CATEGORY_ICONS: Record<NotificationCategory, typeof Bell> = {
  task: Check,
  agent: Bot,
  approval: CheckCheck,
  security: Shield,
  system: Bell,
  social: AtSign,
  financial: DollarSign,
  deployment: Rocket,
};

const ALL_CATEGORIES: NotificationCategory[] = [
  'task',
  'agent',
  'approval',
  'security',
  'social',
  'financial',
  'deployment',
  'system',
];

function formatTime(iso: Date | string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
    return d.toLocaleDateString();
  } catch {
    return String(iso);
  }
}

// ── Component ──

export function NotificationCenter({
  initialNotifications,
  initialUnreadCount,
  initialStats,
  initialPreferences,
}: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [stats, setStats] = useState<NotificationStats>(initialStats);
  const [preferences, setPreferences] = useState<NotificationPreferences>(initialPreferences);
  const [filter, setFilter] = useState<Filter>('all');
  const [showPrefs, setShowPrefs] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  // ── Real-time SSE ──
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/notifications/stream');
      es.addEventListener('notification', (e) => {
        try {
          const data = JSON.parse(e.data) as {
            id: string;
            type: string;
            title: string;
            body: string | null;
            createdAt: string;
          };
          // Parse the body envelope client-side.
          let parsedBody = data.body;
          let category: NotificationCategory = 'system';
          let priority: NotificationPriority = 'normal';
          let actionUrl: string | null = null;
          let metadata: Record<string, unknown> = {};
          let organizationId: string | null = null;
          let createdBy: string | null = null;
          let archived = false;
          try {
            const env = JSON.parse(data.body || '');
            if (env && typeof env === 'object' && 'category' in env) {
              parsedBody = env.text ?? null;
              category = env.category ?? 'system';
              priority = env.priority ?? 'normal';
              actionUrl = env.actionUrl ?? null;
              metadata = env.metadata ?? {};
              organizationId = env.organizationId ?? null;
              createdBy = env.createdBy ?? null;
              archived = env.archived ?? false;
            }
          } catch {}
          const item: NotificationItem = {
            id: data.id,
            userId: '',
            workspaceId: null,
            organizationId,
            type: data.type,
            title: data.title,
            body: parsedBody,
            category,
            priority,
            actionUrl,
            metadata,
            createdBy,
            archived,
            read: false,
            createdAt: data.createdAt,
          };
          setNotifications((prev) => {
            if (prev.some((n) => n.id === item.id)) return prev;
            return [item, ...prev].slice(0, 100);
          });
          setUnreadCount((c) => c + 1);
        } catch {}
      });
      es.onerror = () => {
        // EventSource auto-reconnects; nothing to do here.
      };
    } catch {}
    return () => {
      try { es?.close(); } catch {}
    };
  }, []);

  // ── Filtered list ──
  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (n.archived) return false;
      if (filter === 'all') return true;
      if (filter === 'unread') return !n.read;
      return n.category === filter;
    });
  }, [notifications, filter]);

  // ── Actions ──
  const refreshStats = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/stats');
      if (res.ok) {
        const data = await res.json();
        if (data.stats) setStats(data.stats);
      }
    } catch {}
  }, []);

  const markRead = useCallback(async (id: string) => {
    setBusy(id);
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read' }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      void refreshStats();
    } finally {
      setBusy(null);
    }
  }, [refreshStats]);

  const markUnread = useCallback(async (id: string) => {
    setBusy(id);
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unread' }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: false } : n)),
      );
      setUnreadCount((c) => c + 1);
      void refreshStats();
    } finally {
      setBusy(null);
    }
  }, [refreshStats]);

  const archive = useCallback(async (id: string) => {
    setBusy(id);
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive' }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, archived: true } : n)),
      );
      void refreshStats();
    } finally {
      setBusy(null);
    }
  }, [refreshStats]);

  const remove = useCallback(async (id: string) => {
    setBusy(id);
    try {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      void refreshStats();
    } finally {
      setBusy(null);
    }
  }, [refreshStats]);

  const markAllRead = useCallback(async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      void refreshStats();
    } catch {}
  }, [refreshStats]);

  const savePrefs = useCallback(async () => {
    setSavingPrefs(true);
    try {
      await fetch('/api/notifications/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });
    } finally {
      setSavingPrefs(false);
    }
  }, [preferences]);

  const sendDigest = useCallback(async () => {
    setSavingPrefs(true);
    try {
      await fetch('/api/notifications/digest', { method: 'POST' });
    } finally {
      setSavingPrefs(false);
    }
  }, []);

  // ── Render ──
  const filterTabs: { label: string; value: Filter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Unread', value: 'unread' },
    ...ALL_CATEGORIES.map((c) => ({ label: getCategoryLabel(c), value: c as Filter })),
  ];

  return (
    <div className="space-y-6">
      {/* Filter tabs + actions */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap gap-2">
          {filterTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-3 py-1.5 text-sm rounded-[var(--radius-sm)] border-2 transition-colors ${
                filter === tab.value ? 'btn-primary' : 'btn-ghost'
              }`}
            >
              {tab.label}
              {tab.value === 'unread' && unreadCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center text-xs font-semibold" style={{ minWidth: '1.25rem' }}>
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={markAllRead} disabled={unreadCount === 0}>
            <CheckCheck className="h-4 w-4 mr-1" /> Mark all read
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowPrefs((s) => !s)}>
            <Settings className="h-4 w-4 mr-1" /> Preferences
          </Button>
        </div>
      </div>

      {/* Preferences panel */}
      {showPrefs && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="heading-display text-lg flex items-center gap-2">
              <Settings className="h-5 w-5" /> Notification Preferences
            </h2>
            <button onClick={() => setShowPrefs(false)} className="text-fg-secondary hover:text-fg">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Global toggles */}
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">In-app notifications</p>
                  <p className="text-xs text-fg-secondary">Show notifications in the app</p>
                </div>
                <Switch
                  checked={preferences.inAppEnabled}
                  onChange={(v) => setPreferences((p) => ({ ...p, inAppEnabled: v }))}
                  label="In-app"
                />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Email notifications</p>
                  <p className="text-xs text-fg-secondary">Send notifications via email</p>
                </div>
                <Switch
                  checked={preferences.emailEnabled}
                  onChange={(v) => setPreferences((p) => ({ ...p, emailEnabled: v }))}
                  label="Email"
                />
              </div>
            </Card>
          </div>

          {/* Digest frequency */}
          <div className="mb-6">
            <p className="text-sm font-medium mb-2">Digest frequency</p>
            <div className="flex flex-wrap gap-2">
              {DIGEST_FREQUENCIES.map((freq) => (
                <button
                  key={freq}
                  onClick={() => setPreferences((p) => ({ ...p, digestFrequency: freq }))}
                  className={`px-3 py-1.5 text-sm rounded-[var(--radius-sm)] border-2 transition-colors capitalize ${
                    preferences.digestFrequency === freq ? 'btn-primary' : 'btn-ghost'
                  }`}
                >
                  {freq}
                </button>
              ))}
            </div>
          </div>

          {/* Per-type toggles */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-fg-secondary text-xs">
                  <th className="pb-2 pr-4">Type</th>
                  <th className="pb-2 px-2 text-center">In-app</th>
                  <th className="pb-2 px-2 text-center">Email</th>
                </tr>
              </thead>
              <tbody>
                {NOTIFICATION_TYPES.map((meta) => {
                  const t = preferences.types[meta.type as NotificationType];
                  return (
                    <tr key={meta.type} className="border-t" style={{ borderColor: 'var(--c-border)' }}>
                      <td className="py-2 pr-4">
                        <div className="font-medium">{meta.label}</div>
                        <div className="text-xs text-fg-muted">{getCategoryLabel(meta.category)}</div>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <Switch
                          checked={t?.inApp ?? meta.defaultInApp}
                          onChange={(v) =>
                            setPreferences((p) => ({
                              ...p,
                              types: {
                                ...p.types,
                                [meta.type]: { ...(p.types[meta.type as NotificationType] || { email: meta.defaultEmail, inApp: meta.defaultInApp }), inApp: v },
                              },
                            }))
                          }
                        />
                      </td>
                      <td className="py-2 px-2 text-center">
                        <Switch
                          checked={t?.email ?? meta.defaultEmail}
                          onChange={(v) =>
                            setPreferences((p) => ({
                              ...p,
                              types: {
                                ...p.types,
                                [meta.type]: { ...(p.types[meta.type as NotificationType] || { email: meta.defaultEmail, inApp: meta.defaultInApp }), email: v },
                              },
                            }))
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-3 mt-6">
            <Button onClick={savePrefs} disabled={savingPrefs}>
              {savingPrefs ? 'Saving…' : 'Save preferences'}
            </Button>
            <Button variant="secondary" onClick={sendDigest} disabled={savingPrefs}>
              <Mail className="h-4 w-4 mr-1" /> Send digest now
            </Button>
          </div>
        </Card>
      )}

      {/* Notification list */}
      {filtered.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={Bell}
            title={filter === 'unread' ? 'No unread notifications' : 'No notifications in this category'}
            description="New notifications will appear here as they happen."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((n) => {
            const Icon = CATEGORY_ICONS[n.category] || Bell;
            return (
              <Card key={n.id} className={`p-4 ${n.read ? '' : 'border-l-4'}`} style={!n.read ? { borderLeftColor: 'var(--c-accent)' } : undefined}>
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border-2"
                    style={{ borderColor: 'var(--c-ink)', backgroundColor: 'var(--c-surface-alt)' }}
                  >
                    <Icon className="h-4 w-4" style={{ color: 'var(--c-fg-muted)' }} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{n.title}</p>
                      {!n.read && <Badge variant="accent" className="text-xs">new</Badge>}
                      <Badge variant={getPriorityColor(n.priority)} className="text-xs">{n.priority}</Badge>
                      <span className="text-xs text-fg-muted">{getTypeLabel(n.type)}</span>
                    </div>
                    {n.body && <p className="text-sm text-fg-secondary mt-1">{n.body}</p>}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="text-xs text-fg-muted">{formatTime(n.createdAt)}</span>
                      {n.actionUrl && (
                        <a href={n.actionUrl} className="text-xs text-accent hover:underline">View</a>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {!n.read ? (
                      <button
                        onClick={() => markRead(n.id)}
                        disabled={busy === n.id}
                        title="Mark as read"
                        className="p-1.5 text-fg-secondary hover:text-fg transition"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => markUnread(n.id)}
                        disabled={busy === n.id}
                        title="Mark as unread"
                        className="p-1.5 text-fg-secondary hover:text-fg transition"
                      >
                        <Bell className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => archive(n.id)}
                      disabled={busy === n.id}
                      title="Archive"
                      className="p-1.5 text-fg-secondary hover:text-fg transition"
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => remove(n.id)}
                      disabled={busy === n.id}
                      title="Delete"
                      className="p-1.5 text-fg-secondary hover:text-fg transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
