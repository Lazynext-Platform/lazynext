'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Activity, Loader2, AlertCircle, Radio } from 'lucide-react';
import { AuthModal } from '@/components/AuthModal';

interface ActivityEvent {
  id: string;
  type: string;
  actor: string;
  actorType: string;
  resourceType?: string;
  resourceId?: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

const EVENT_COLORS: Record<string, string> = {
  'agent.': 'text-blue-500',
  'company.bootstrap.': 'text-purple-500',
  'email.': 'text-orange-500',
  'site.': 'text-green-500',
  'task.': 'text-cyan-500',
  'goal.': 'text-indigo-500',
};

function getEventColor(type: string): string {
  for (const [prefix, color] of Object.entries(EVENT_COLORS)) {
    if (type.startsWith(prefix)) return color;
  }
  return 'text-muted';
}

function formatEventType(type: string): string {
  return type.split('.').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return date.toLocaleDateString();
}

export default function ActivityFeedPage() {
  const { data: session } = useSession();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  // Get the user's organization ID
  useEffect(() => {
    if (!session?.user) return;
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(() => {
        // For now, use a placeholder — in production this would come from the session
        // or a user profile API
        setOrganizationId('current');
      })
      .catch(() => {});
  }, [session]);

  const connect = useCallback(() => {
    if (!session?.user) {
      setShowAuth(true);
      return;
    }
    if (!organizationId) return;

    setLoading(true);
    setError('');

    // Use polling fallback (SSE may not work in all environments)
    const poll = async () => {
      try {
        const res = await fetch(`/api/activity-feed?organizationId=${organizationId}&limit=50`);
        if (!res.ok) {
          setError('connection_failed');
          setLoading(false);
          return;
        }
        // SSE stream — read events as they arrive
        const reader = res.body?.getReader();
        if (!reader) {
          setError('no_stream');
          setLoading(false);
          return;
        }

        setConnected(true);
        setLoading(false);

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const event = JSON.parse(line.slice(6)) as ActivityEvent;
                setEvents(prev => [event, ...prev].slice(0, 100));
              } catch {
                // Skip invalid JSON
              }
            } else if (line.startsWith('event: connected')) {
              setConnected(true);
            } else if (line.startsWith('event: error')) {
              const dataLine = line.split('\n')[1];
              if (dataLine?.startsWith('data: ')) {
                try {
                  const err = JSON.parse(dataLine.slice(6));
                  setError(err.error || 'stream_error');
                } catch {
                  setError('stream_error');
                }
              }
            }
          }
        }
      } catch {
        setError('network_error');
        setLoading(false);
      }
    };

    poll();
  }, [session, organizationId]);

  // Auto-connect on mount
  useEffect(() => {
    if (session?.user && organizationId) {
      connect();
    }
  }, [session, organizationId, connect]);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-brand-accent" />
            Live Activity
          </h1>
          <p className="text-muted text-sm mt-1">
            Real-time stream of everything happening across your company.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {connected ? (
            <span className="flex items-center gap-1 text-success">
              <Radio className="w-4 h-4 animate-pulse" />
              Live
            </span>
          ) : loading ? (
            <span className="flex items-center gap-1 text-muted">
              <Loader2 className="w-4 h-4 animate-spin" />
              Connecting...
            </span>
          ) : (
            <span className="text-muted">Disconnected</span>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg border border-danger/30 bg-danger/10 flex items-center gap-2 text-sm text-danger">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-2">
        {events.length === 0 && !loading && (
          <div className="text-center text-muted text-sm py-8">
            No activity yet. Events will appear here in real-time.
          </div>
        )}
        {events.map((event) => (
          <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-surface">
            <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${getEventColor(event.type).replace('text-', 'bg-')}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-sm font-medium ${getEventColor(event.type)}`}>
                  {formatEventType(event.type)}
                </span>
                <span className="text-xs text-muted">
                  by {event.actor || 'system'}
                </span>
                <span className="text-xs text-muted ml-auto shrink-0">
                  {formatTime(event.timestamp)}
                </span>
              </div>
              {event.resourceType && (
                <div className="text-xs text-muted mt-1">
                  {event.resourceType}{event.resourceId ? `: ${event.resourceId.slice(0, 12)}...` : ''}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
}
