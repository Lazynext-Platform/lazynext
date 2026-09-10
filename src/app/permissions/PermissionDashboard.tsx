'use client';

import { useState, useMemo } from 'react';
import {
  KeyRound, Shield, Users, UserCheck, CheckSquare, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  PermissionPolicy, PermissionRole, PermissionGrant, PermissionCheck,
  PermissionMetrics, PermissionStats,
} from '@/lib/services/permission-service';

type TabId = 'overview' | 'policies' | 'roles' | 'grants' | 'checks';

interface PermissionDashboardProps {
  organizationId: string;
  policies: PermissionPolicy[];
  roles: PermissionRole[];
  grants: PermissionGrant[];
  checks: PermissionCheck[];
  metrics: PermissionMetrics;
  stats: PermissionStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['active', 'completed', 'verified', 'executed', 'preferred', 'allowed', 'achieved'].includes(status)) return 'success';
  if (['draft', 'pending', 'placed', 'scheduled', 'planned', 'set', 'submitted', 'under_review', 'generated', 'presented', 'calculated', 'reviewed', 'recorded', 'detected', 'evaluating'].includes(status)) return 'warning';
  if (['cancelled', 'expired', 'terminated', 'deactivated', 'missed', 'failed', 'suspended', 'denied', 'rejected', 'revoked', 'deprecated', 'archived', 'dismissed', 'error'].includes(status)) return 'danger';
  return 'info';
};

export function PermissionDashboard({
  policies, roles, grants, checks, metrics, stats,
}: PermissionDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const filteredPolicies = useMemo(() => {
    if (!search) return policies;
    const q = search.toLowerCase();
    return policies.filter(
      (p) => p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q) || p.status.toLowerCase().includes(q),
    );
  }, [policies, search]);

  const filteredRoles = useMemo(() => {
    if (!search) return roles;
    const q = search.toLowerCase();
    return roles.filter(
      (r) => r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q) || r.status.toLowerCase().includes(q),
    );
  }, [roles, search]);

  const filteredGrants = useMemo(() => {
    if (!search) return grants;
    const q = search.toLowerCase();
    return grants.filter(
      (g) => g.name.toLowerCase().includes(q) || g.type.toLowerCase().includes(q) || g.status.toLowerCase().includes(q),
    );
  }, [grants, search]);

  const filteredChecks = useMemo(() => {
    if (!search) return checks;
    const q = search.toLowerCase();
    return checks.filter(
      (c) => c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q) || c.status.toLowerCase().includes(q),
    );
  }, [checks, search]);

  const tabs: { id: TabId; label: string; icon: typeof KeyRound }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'policies', label: 'Policies', icon: Shield },
    { id: 'roles', label: 'Roles', icon: Users },
    { id: 'grants', label: 'Grants', icon: UserCheck },
    { id: 'checks', label: 'Checks', icon: CheckSquare },
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
              <div className="text-xs text-fg-tertiary">Active Policies</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activePolicies}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Roles</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeRoles}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Grants</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeGrants}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Allowed Checks</div>
              <div className="mt-1 text-2xl font-bold">{metrics.allowedChecks}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Denied Checks</div>
              <div className="mt-1 text-2xl font-bold">{metrics.deniedChecks}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Policy Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byPolicyType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Role Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byRoleStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Grant Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byGrantStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Check Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byCheckStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'policies' && (
        <div className="space-y-3">
          {filteredPolicies.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Shield} title="No permission policies" description="Permission policies will appear here." /></Card>
          ) : (
            filteredPolicies.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-fg-secondary">{p.type.replace('_', ' ')} · {p.resource || 'No resource'} · {p.effect}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.priority > 0 && <Badge variant="default">P{p.priority}</Badge>}
                    <Badge variant={statusVariant(p.status)}>{p.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'roles' && (
        <div className="space-y-3">
          {filteredRoles.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Users} title="No permission roles" description="Permission roles will appear here." /></Card>
          ) : (
            filteredRoles.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-sm text-fg-secondary">{r.type.replace('_', ' ')} · {r.scope || 'No scope'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.assignable && <Badge variant="default">assignable</Badge>}
                    <Badge variant={statusVariant(r.status)}>{r.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'grants' && (
        <div className="space-y-3">
          {filteredGrants.length === 0 ? (
            <Card className="p-8"><EmptyState icon={UserCheck} title="No permission grants" description="Permission grants will appear here." /></Card>
          ) : (
            filteredGrants.map((g) => (
              <Card key={g.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{g.name}</div>
                    <div className="text-sm text-fg-secondary">{g.type.replace('_', ' ')} · {g.principalId || 'No principal'} → {g.resourceId || 'No resource'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {g.grantedBy && <Badge variant="default">by {g.grantedBy}</Badge>}
                    <Badge variant={statusVariant(g.status)}>{g.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'checks' && (
        <div className="space-y-3">
          {filteredChecks.length === 0 ? (
            <Card className="p-8"><EmptyState icon={CheckSquare} title="No permission checks" description="Permission checks will appear here." /></Card>
          ) : (
            filteredChecks.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-sm text-fg-secondary">{c.type.replace('_', ' ')} · {c.action || 'No action'} · {c.result || 'No result'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.policyId && <Badge variant="default">policy: {c.policyId}</Badge>}
                    <Badge variant={statusVariant(c.status)}>{c.status.replace('_', ' ')}</Badge>
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
