'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Bell, Check, X, Trash2 } from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  createdAt: string;
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      let res = await fetch('/api/notifications?limit=10');
      // Retry once on 500 (Cloudflare Worker cold-start resilience)
      if (!res.ok && res.status === 500) {
        await new Promise((r) => setTimeout(r, 800));
        res = await fetch('/api/notifications?limit=10');
      }
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchNotifications();

    // Try SSE first, fall back to polling
    let eventSource: EventSource | null = null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    try {
      eventSource = new EventSource('/api/notifications/stream');
      eventSource.addEventListener('notification', (e) => {
        try {
          const data = JSON.parse(e.data);
          // Prepend new notification and increment unread count
          setNotifications((prev) => {
            if (prev.some((n) => n.id === data.id)) return prev;
            return [{ ...data, read: false }, ...prev].slice(0, 20);
          });
          setUnreadCount((c) => c + 1);
        } catch {}
      });
      eventSource.onerror = () => {
        // SSE failed — fall back to polling
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        if (!pollInterval) {
          pollInterval = setInterval(fetchNotifications, 30_000);
        }
      };
    } catch {
      // EventSource not supported — fall back to polling
      pollInterval = setInterval(fetchNotifications, 30_000);
    }

    return () => {
      if (eventSource) eventSource.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [fetchNotifications]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function markAsRead(id: string) {
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch {}
  }

  async function markAllRead() {
    try {
      const res = await fetch('/api/notifications/read-all', { method: 'POST' });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch {}
  }

  async function deleteNotification(id: string) {
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch {}
  }

  return (
    <div ref={ref} className="relative">
      <button
        className="p-2 border-2 rounded-[var(--radius-sm)] bg-surface hover:bg-hover transition-colors relative"
        style={{ borderColor: 'var(--c-ink)' }}
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
          if (!open) fetchNotifications();
        }}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center text-[10px] font-bold px-1 border-2"
            style={{
              borderColor: 'var(--c-ink)',
              backgroundColor: 'var(--c-danger)',
              color: 'var(--c-surface)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-surface border-2 rounded-[var(--radius-md)] z-50"
          style={{ borderColor: 'var(--c-ink)', boxShadow: 'var(--shadow-hard)' }}
          role="menu"
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b-2"
            style={{ borderColor: 'var(--c-ink)' }}
          >
            <span className="heading-display text-sm">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-fg-secondary hover:text-fg transition-colors flex items-center gap-1"
              >
                <Check className="h-3 w-3" /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <p className="text-sm text-fg-muted text-center py-8">Loading...</p>
            ) : notifications.length === 0 ? (
              <p className="text-sm text-fg-muted text-center py-8">No notifications yet.</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className="px-4 py-3 border-b-2 last:border-0 hover:bg-hover transition-colors"
                  style={{
                    borderColor: 'var(--c-ink)',
                    backgroundColor: n.read ? undefined : 'var(--c-active)',
                  }}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{n.title}</p>
                      {n.body && <p className="text-xs text-fg-secondary mt-0.5 line-clamp-2">{n.body}</p>}
                      <p className="text-xs text-fg-muted mt-1">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!n.read && (
                        <button
                          onClick={() => markAsRead(n.id)}
                          className="p-1 hover:bg-surface rounded transition-colors"
                          aria-label="Mark as read"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(n.id)}
                        className="p-1 hover:bg-surface rounded transition-colors"
                        aria-label="Delete notification"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
