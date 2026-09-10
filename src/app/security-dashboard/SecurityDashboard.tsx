'use client';

import { useState } from 'react';
import { Shield, ShieldAlert, ShieldCheck, Key, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';

interface SecurityEventRecord {
  id: string;
  type: string;
  severity: string;
  description: string;
  resolved: boolean;
  createdAt: Date;
  actorId?: string | null;
}

interface SecuritySummary {
  counts: { critical: number; high: number; medium: number; low: number };
  unresolvedCount: number;
  total: number;
}

interface SecurityDashboardProps {
  workspaceId: string;
  summary: SecuritySummary;
  recentEvents: SecurityEventRecord[];
}

const severityVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  critical: 'danger',
  high: 'warning',
  medium: 'info',
  low: 'default',
};

const severityIcon: Record<string, typeof Shield> = {
  critical: ShieldAlert,
  high: AlertTriangle,
  medium: Shield,
  low: ShieldCheck,
};

export function SecurityDashboard({ workspaceId, summary, recentEvents: initialEvents }: SecurityDashboardProps) {
  const [events, setEvents] = useState(initialEvents);
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  async function handleResolve(eventId: string) {
    setResolvingId(eventId);
    try {
      const res = await fetch(`/api/security/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setEvents((prev) => prev.map((e) => (e.id === eventId ? { ...e, resolved: true } : e)));
      }
    } catch {
      // ignore
    } finally {
      setResolvingId(null);
    }
  }

  async function handleMigrateTokens() {
    setMigrating(true);
    setMigrationResult(null);
    try {
      const res = await fetch('/api/security/migrate-tokens', {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.result) {
        const { total, migrated, errors } = data.result;
        if (errors.length > 0) {
          setMigrationResult(`Migrated ${migrated}/${total} tokens. ${errors.length} error(s).`);
        } else if (migrated === 0) {
          setMigrationResult(`All ${total} token(s) are already encrypted. No migration needed.`);
        } else {
          setMigrationResult(`Successfully migrated ${migrated}/${total} token(s) to encrypted storage.`);
        }
      } else {
        setMigrationResult('Migration failed. Please try again.');
      }
    } catch {
      setMigrationResult('Migration failed. Please try again.');
    } finally {
      setMigrating(false);
    }
  }

  const severityCards = [
    { key: 'critical' as const, label: 'Critical', count: summary.counts.critical },
    { key: 'high' as const, label: 'High', count: summary.counts.high },
    { key: 'medium' as const, label: 'Medium', count: summary.counts.medium },
    { key: 'low' as const, label: 'Low', count: summary.counts.low },
  ];

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {severityCards.map((card) => {
          const Icon = severityIcon[card.key] || Shield;
          return (
            <Card key={card.key} className="p-4">
              <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
                <Icon className="h-3 w-3" /> {card.label}
              </div>
              <div className="text-2xl font-semibold">{card.count}</div>
            </Card>
          );
        })}
      </div>

      {/* Unresolved + total summary */}
      <div className="flex items-center gap-4 flex-wrap">
        <Badge variant={summary.unresolvedCount > 0 ? 'warning' : 'success'}>
          {summary.unresolvedCount} unresolved
        </Badge>
        <Badge variant="default">{summary.total} total events</Badge>
      </div>

      {/* Token migration */}
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Key className="h-4 w-4 text-accent-primary" />
              <h2 className="heading-display text-sm">Token Encryption Migration</h2>
            </div>
            <p className="text-xs text-fg-secondary">
              Migrate all stored platform tokens from plaintext to AES-256-GCM encrypted storage.
            </p>
          </div>
          <Button onClick={handleMigrateTokens} disabled={migrating}>
            {migrating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
            {migrating ? 'Migrating...' : 'Migrate Tokens'}
          </Button>
        </div>
        {migrationResult && (
          <div className="mt-3 text-xs text-fg-secondary bg-bg-secondary rounded-lg p-3">
            {migrationResult}
          </div>
        )}
      </Card>

      {/* Recent events */}
      <div>
        <h2 className="heading-display text-sm mb-3">Recent Security Events</h2>
        {events.length === 0 ? (
          <Card className="p-6">
            <div className="flex items-center gap-2 text-sm text-fg-secondary">
              <CheckCircle className="h-4 w-4 text-fg-muted" />
              No security events recorded.
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <Card key={event.id} className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant={severityVariant[event.severity] || 'default'} className="text-xs">
                        {event.severity}
                      </Badge>
                      <span className="text-xs text-fg-muted">{event.type}</span>
                      {event.resolved && (
                        <Badge variant="success" className="text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" /> Resolved
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm truncate">{event.description}</p>
                    <div className="flex items-center gap-3 text-xs text-fg-muted mt-1">
                      <span>{new Date(event.createdAt).toLocaleString()}</span>
                      {event.actorId && <span>by {event.actorId}</span>}
                    </div>
                  </div>
                  {!event.resolved && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleResolve(event.id)}
                      disabled={resolvingId === event.id}
                    >
                      {resolvingId === event.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                      Resolve
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
