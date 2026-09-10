'use client';

import { useEffect, useState } from 'react';
import { Zap, Activity, CheckCircle, TrendingUp } from 'lucide-react';
import { Card, Badge } from '@/components/ui';

interface AutomationStatsData {
  total: number;
  enabled: number;
  runs24h: number;
  successRate: number;
}

interface AutomationStatsProps {
  workspaceId?: string;
}

/**
 * Client component that fetches and displays automation stats
 * (total, enabled, runs in last 24h, success rate).
 */
export function AutomationStats({ workspaceId }: AutomationStatsProps) {
  const [stats, setStats] = useState<AutomationStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchStats() {
      try {
        const params = new URLSearchParams();
        if (workspaceId) params.set('workspaceId', workspaceId);
        const res = await fetch(`/api/automations/stats?${params.toString()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('failed');
        const data = await res.json();
        if (!cancelled) {
          setStats(data.stats);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    }
    fetchStats();
    return () => { cancelled = true; };
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} className="p-4">
            <div className="h-4 w-20 bg-surface-alt rounded mb-2 animate-pulse" />
            <div className="h-8 w-12 bg-surface-alt rounded animate-pulse" />
          </Card>
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <Card className="p-4">
        <p className="text-sm text-fg-muted">Stats unavailable.</p>
      </Card>
    );
  }

  const cards = [
    { label: 'Total', value: stats.total, icon: Zap, variant: 'default' as const },
    { label: 'Enabled', value: stats.enabled, icon: CheckCircle, variant: 'success' as const },
    { label: 'Runs (24h)', value: stats.runs24h, icon: Activity, variant: 'info' as const },
    { label: 'Success Rate', value: `${stats.successRate}%`, icon: TrendingUp, variant: 'accent' as const },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.label} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-fg-secondary">{c.label}</span>
              <Icon className="h-4 w-4 text-fg-muted" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-semibold">{c.value}</span>
              <Badge variant={c.variant}>{c.label === 'Success Rate' ? (stats.successRate >= 80 ? 'Good' : stats.successRate >= 50 ? 'Fair' : 'Low') : ''}</Badge>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
