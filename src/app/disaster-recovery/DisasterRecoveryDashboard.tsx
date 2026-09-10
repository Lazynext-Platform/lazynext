'use client';

import { useState, useMemo } from 'react';
import {
  ServerCog, ClipboardList, Database, TestTube, Building2, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  RecoveryPlan, BackupStrategy, RecoveryTest, RecoverySite,
  DisasterRecoveryMetrics, DisasterRecoveryStats,
} from '@/lib/services/disaster-recovery-service';

type TabId = 'overview' | 'plans' | 'backups' | 'tests' | 'sites';

interface DisasterRecoveryDashboardProps {
  organizationId: string;
  plans: RecoveryPlan[];
  backups: BackupStrategy[];
  tests: RecoveryTest[];
  sites: RecoverySite[];
  metrics: DisasterRecoveryMetrics;
  stats: DisasterRecoveryStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['active', 'completed', 'verified', 'executed', 'approved', 'implemented', 'tested', 'published', 'sent', 'responded'].includes(status)) return 'success';
  if (['draft', 'pending', 'placed', 'scheduled', 'planned', 'set', 'submitted', 'under_review', 'in_progress', 'standby', 'testing', 'received', 'responding'].includes(status)) return 'warning';
  if (['cancelled', 'expired', 'terminated', 'deactivated', 'missed', 'failed', 'suspended', 'deprecated', 'archived', 'blocked', 'unreachable', 'retracted', 'declined', 'decommissioned', 'paused'].includes(status)) return 'danger';
  return 'info';
};

export function DisasterRecoveryDashboard({
  plans, backups, tests, sites, metrics, stats,
}: DisasterRecoveryDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const filteredPlans = useMemo(() => {
    if (!search) return plans;
    const q = search.toLowerCase();
    return plans.filter(
      (p) => p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q) || p.status.toLowerCase().includes(q),
    );
  }, [plans, search]);

  const filteredBackups = useMemo(() => {
    if (!search) return backups;
    const q = search.toLowerCase();
    return backups.filter(
      (b) => b.name.toLowerCase().includes(q) || b.type.toLowerCase().includes(q) || b.status.toLowerCase().includes(q),
    );
  }, [backups, search]);

  const filteredTests = useMemo(() => {
    if (!search) return tests;
    const q = search.toLowerCase();
    return tests.filter(
      (t) => t.name.toLowerCase().includes(q) || t.type.toLowerCase().includes(q) || t.status.toLowerCase().includes(q),
    );
  }, [tests, search]);

  const filteredSites = useMemo(() => {
    if (!search) return sites;
    const q = search.toLowerCase();
    return sites.filter(
      (s) => s.name.toLowerCase().includes(q) || s.type.toLowerCase().includes(q) || s.status.toLowerCase().includes(q),
    );
  }, [sites, search]);

  const tabs: { id: TabId; label: string; icon: typeof ServerCog }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'plans', label: 'Plans', icon: ClipboardList },
    { id: 'backups', label: 'Backups', icon: Database },
    { id: 'tests', label: 'Tests', icon: TestTube },
    { id: 'sites', label: 'Sites', icon: Building2 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-accent-primary text-white' : 'bg-bg-secondary text-fg-secondary hover:bg-bg-tertiary'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab !== 'overview' && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-tertiary" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border-primary bg-bg-primary px-10 py-2 text-sm focus:border-accent-primary focus:outline-none"
          />
        </div>
      )}

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Plans</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activePlans}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Backups</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeBackups}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Scheduled Tests</div>
              <div className="mt-1 text-2xl font-bold">{metrics.scheduledTests}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Sites</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeSites}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Completed Tests</div>
              <div className="mt-1 text-2xl font-bold">{metrics.completedTests}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Plan Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byPlanType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Plan Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byPlanStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Backup Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byBackupStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'plans' && (
        <div className="space-y-3">
          {filteredPlans.length === 0 ? (
            <Card className="p-8"><EmptyState icon={ClipboardList} title="No recovery plans" description="Recovery plans will appear here." /></Card>
          ) : (
            filteredPlans.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-fg-secondary">{p.type.replace('_', ' ')} · {p.owner || 'No owner'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.rto && <Badge variant="default">RTO {p.rto}</Badge>}
                    <Badge variant={statusVariant(p.status)}>{p.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'backups' && (
        <div className="space-y-3">
          {filteredBackups.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Database} title="No backup strategies" description="Backup strategies will appear here." /></Card>
          ) : (
            filteredBackups.map((b) => (
              <Card key={b.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{b.name}</div>
                    <div className="text-sm text-fg-secondary">{b.type.replace('_', ' ')} · {b.frequency || 'No frequency'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {b.storage && <Badge variant="default">{b.storage}</Badge>}
                    <Badge variant={statusVariant(b.status)}>{b.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'tests' && (
        <div className="space-y-3">
          {filteredTests.length === 0 ? (
            <Card className="p-8"><EmptyState icon={TestTube} title="No recovery tests" description="Recovery tests will appear here." /></Card>
          ) : (
            filteredTests.map((t) => (
              <Card key={t.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-sm text-fg-secondary">{t.type.replace('_', ' ')} · {t.duration > 0 ? `${t.duration} min` : 'No duration'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.scope && <Badge variant="default">{t.scope}</Badge>}
                    <Badge variant={statusVariant(t.status)}>{t.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'sites' && (
        <div className="space-y-3">
          {filteredSites.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Building2} title="No recovery sites" description="Recovery sites will appear here." /></Card>
          ) : (
            filteredSites.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-sm text-fg-secondary">{s.type.replace('_', ' ')} · {s.location || 'No location'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.capacity && <Badge variant="default">{s.capacity}</Badge>}
                    <Badge variant={statusVariant(s.status)}>{s.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
