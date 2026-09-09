'use client';

import { useState } from 'react';
import {
  Sparkles, Megaphone, TrendingUp, Palette, DollarSign,
  Target, Zap, BarChart3, RefreshCw, ExternalLink,
  Users, CheckCircle2, Circle, Coins,
} from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';
import type { GrowthDashboard as GrowthDashboardData } from '@/lib/services/creative-integration';

interface AgentStatus {
  name: string;
  role: string;
  exists: boolean;
  agentId?: string;
}

interface CreativeBudgetSummaryData {
  totalSpent: number;
  byCreativeType: Record<string, number>;
  spentThisMonth: number;
  trend: Array<{ createdAt: string; amount: number; creativeType: string }>;
  entryCount: number;
}

interface GrowthDashboardProps {
  dashboard: GrowthDashboardData;
  agentStatus?: AgentStatus[];
  creativeBudget?: CreativeBudgetSummaryData;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  draft: 'default',
  pending_approval: 'warning',
  active: 'success',
  paused: 'info',
  completed: 'default',
  pending: 'info',
  processing: 'info',
  completed_creative: 'success',
  failed: 'danger',
};

export function GrowthDashboard({ dashboard, agentStatus, creativeBudget }: GrowthDashboardProps) {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  const { summary, insights, activeCampaigns, recentCreations, linkedPlans, linkedTasks } = dashboard;

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/creative-integration/sync', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSyncResult(`Synced ${data.insights?.totalRecords ?? 0} performance records to memory.`);
      } else {
        setSyncResult('Sync failed. Try again.');
      }
    } catch {
      setSyncResult('Sync failed. Try again.');
    } finally {
      setSyncing(false);
    }
  }

  async function handleSeedAgents() {
    setSeeding(true);
    setSeedResult(null);
    try {
      const res = await fetch('/api/agents/seed', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSeedResult(`Seeded ${data.created ?? 0} new agents (${data.total ?? 0} total).`);
      } else {
        setSeedResult('Seeding failed. Try again.');
      }
    } catch {
      setSeedResult('Seeding failed. Try again.');
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Palette className="h-3 w-3" /> Total Creations
          </div>
          <div className="text-2xl font-semibold">{formatNumber(summary.totalCreations)}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Megaphone className="h-3 w-3" /> Active Campaigns
          </div>
          <div className="text-2xl font-semibold">{summary.activeCampaigns}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <DollarSign className="h-3 w-3" /> Total Spend
          </div>
          <div className="text-2xl font-semibold">{formatCurrency(summary.totalSpend)}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <TrendingUp className="h-3 w-3" /> Avg ROAS
          </div>
          <div className="text-2xl font-semibold">{summary.avgRoas.toFixed(2)}x</div>
        </Card>
      </div>

      {/* Sync Performance Button */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSync} disabled={syncing} variant="secondary">
          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync Performance to Memory'}
        </Button>
        {syncResult && <span className="text-sm text-fg-secondary">{syncResult}</span>}
      </div>

      {/* Performance Insights */}
      <div>
        <h2 className="heading-display text-lg mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-accent-primary" /> Performance Insights
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Top Hooks */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-1">
              <Zap className="h-4 w-4 text-warning" /> Top Hooks
            </h3>
            {insights.topHooks.length === 0 ? (
              <p className="text-xs text-fg-muted">No hook data yet.</p>
            ) : (
              <ul className="space-y-2">
                {insights.topHooks.map((h) => (
                  <li key={h.hookType} className="flex items-center justify-between text-xs">
                    <span className="truncate">{h.hookType}</span>
                    <Badge variant="accent" className="text-xs">{h.avgRoas.toFixed(2)}x</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Top Angles */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-1">
              <Target className="h-4 w-4 text-info" /> Top Angles
            </h3>
            {insights.topAngles.length === 0 ? (
              <p className="text-xs text-fg-muted">No angle data yet.</p>
            ) : (
              <ul className="space-y-2">
                {insights.topAngles.map((a) => (
                  <li key={a.angleName} className="flex items-center justify-between text-xs">
                    <span className="truncate">{a.angleName}</span>
                    <Badge variant="info" className="text-xs">{a.avgRoas.toFixed(2)}x</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Top Platforms */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-1">
              <Megaphone className="h-4 w-4 text-success" /> Top Platforms
            </h3>
            {insights.topPlatforms.length === 0 ? (
              <p className="text-xs text-fg-muted">No platform data yet.</p>
            ) : (
              <ul className="space-y-2">
                {insights.topPlatforms.map((p) => (
                  <li key={p.platform} className="flex items-center justify-between text-xs">
                    <span className="truncate capitalize">{p.platform}</span>
                    <div className="flex items-center gap-1">
                      <Badge variant="success" className="text-xs">{p.avgRoas.toFixed(2)}x</Badge>
                      <span className="text-fg-muted">{formatCurrency(p.spend)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* ROAS Trend */}
        {insights.roasTrend.length > 0 && (
          <Card className="p-4 mt-4">
            <h3 className="text-sm font-semibold mb-3">ROAS Trend</h3>
            <div className="flex items-end gap-2 h-24">
              {insights.roasTrend.map((t, i) => {
                const maxRoas = Math.max(...insights.roasTrend.map((r) => r.avgRoas), 1);
                const heightPct = Math.max(5, (t.avgRoas / maxRoas) * 100);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end" title={t.avgRoas.toFixed(2)}>
                    <div
                      className="w-full bg-accent-primary rounded-t"
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      {/* Recent Creations + Active Campaigns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Creations */}
        <div>
          <h2 className="heading-display text-lg mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent-primary" /> Recent Creations
          </h2>
          {recentCreations.length === 0 ? (
            <Card className="p-6">
              <p className="text-sm text-fg-muted text-center">No creations yet.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {recentCreations.map((c) => (
                <Card key={c.id} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{c.prompt}</p>
                      <p className="text-xs text-fg-muted mt-0.5">
                        {c.model} · {new Date(c.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={statusVariant[c.status] || 'default'} className="text-xs shrink-0">
                      {c.status}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Active Campaigns */}
        <div>
          <h2 className="heading-display text-lg mb-4 flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-accent-primary" /> Active Campaigns
          </h2>
          {activeCampaigns.length === 0 ? (
            <Card className="p-6">
              <p className="text-sm text-fg-muted text-center">No campaigns yet.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {activeCampaigns.map((c) => (
                <Card key={c.id} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-xs text-fg-muted mt-0.5 capitalize">
                        {c.platform}
                        {c.budgetDaily ? ` · ${formatCurrency(c.budgetDaily)}/day` : ''}
                      </p>
                    </div>
                    <Badge variant={statusVariant[c.status] || 'default'} className="text-xs shrink-0">
                      {c.status}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Linked Plans & Tasks */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h2 className="heading-display text-lg mb-4">Linked Plans</h2>
          {linkedPlans.length === 0 ? (
            <Card className="p-6">
              <p className="text-sm text-fg-muted text-center">No linked plans yet.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {linkedPlans.map((p) => (
                <Card key={p.id} className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{p.title}</span>
                    <Badge variant={statusVariant[p.status] || 'default'} className="text-xs">{p.status}</Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="heading-display text-lg mb-4">Linked Tasks</h2>
          {linkedTasks.length === 0 ? (
            <Card className="p-6">
              <p className="text-sm text-fg-muted text-center">No linked tasks yet.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {linkedTasks.map((t) => (
                <Card key={t.id} className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{t.title}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant="default" className="text-xs">{t.priority}</Badge>
                      <Badge variant={statusVariant[t.status] || 'default'} className="text-xs">{t.status}</Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Default Agents Status */}
      {agentStatus && agentStatus.length > 0 && (
        <div>
          <h2 className="heading-display text-lg mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-accent-primary" /> Default Agents
          </h2>
          <div className="flex items-center gap-3 mb-4">
            <Button onClick={handleSeedAgents} disabled={seeding} variant="secondary">
              <Sparkles className={`h-4 w-4 ${seeding ? 'animate-spin' : ''}`} />
              {seeding ? 'Seeding...' : 'Seed Default Agents'}
            </Button>
            {seedResult && <span className="text-sm text-fg-secondary">{seedResult}</span>}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {agentStatus.map((a) => (
              <Card key={a.name} className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-0">
                    <p className="text-sm font-medium truncate">{a.name}</p>
                    <p className="text-xs text-fg-muted capitalize">{a.role}</p>
                  </div>
                  {a.exists ? (
                    <Badge variant="success" className="text-xs shrink-0 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Seeded
                    </Badge>
                  ) : (
                    <Badge variant="default" className="text-xs shrink-0 flex items-center gap-1">
                      <Circle className="h-3 w-3" /> Missing
                    </Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Creative Budget Summary */}
      {creativeBudget && (
        <div>
          <h2 className="heading-display text-lg mb-4 flex items-center gap-2">
            <Coins className="h-5 w-5 text-accent-primary" /> Creative Budget
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Card className="p-4">
              <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
                <Coins className="h-3 w-3" /> Total Spent
              </div>
              <div className="text-2xl font-semibold">{formatNumber(creativeBudget.totalSpent)} credits</div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
                <TrendingUp className="h-3 w-3" /> This Month
              </div>
              <div className="text-2xl font-semibold">{formatNumber(creativeBudget.spentThisMonth)} credits</div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
                <BarChart3 className="h-3 w-3" /> Entries
              </div>
              <div className="text-2xl font-semibold">{formatNumber(creativeBudget.entryCount)}</div>
            </Card>
          </div>
          {Object.keys(creativeBudget.byCreativeType).length > 0 && (
            <Card className="p-4 mt-4">
              <h3 className="text-sm font-semibold mb-3">Spending by Type</h3>
              <ul className="space-y-2">
                {Object.entries(creativeBudget.byCreativeType)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, amount]) => (
                    <li key={type} className="flex items-center justify-between text-xs">
                      <span className="truncate capitalize">{type}</span>
                      <Badge variant="accent" className="text-xs">{formatNumber(amount)} credits</Badge>
                    </li>
                  ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {/* Quick Links */}
      <div>
        <h2 className="heading-display text-lg mb-4">Creative Tools</h2>
        <div className="flex flex-wrap gap-2">
          <Button href="/creative-studio" variant="secondary" size="sm">
            <Palette className="h-4 w-4" /> Creative Studio <ExternalLink className="h-3 w-3" />
          </Button>
          <Button href="/creative/director" variant="secondary" size="sm">
            <Sparkles className="h-4 w-4" /> Creative Director <ExternalLink className="h-3 w-3" />
          </Button>
          <Button href="/performance-loop" variant="secondary" size="sm">
            <TrendingUp className="h-4 w-4" /> Performance Loop <ExternalLink className="h-3 w-3" />
          </Button>
          <Button href="/ads" variant="secondary" size="sm">
            <Megaphone className="h-4 w-4" /> Ad Campaigns <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
