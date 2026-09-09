'use client';

import { useState, useMemo } from 'react';
import {
  Heart, FileText, Building, DollarSign, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  BenefitPlan, PlanEnrollment, PlanProvider, PlanClaim,
  PlanManagementMetrics, PlanManagementStats,
} from '@/lib/services/plan-management-service';

type TabId = 'overview' | 'plans' | 'enrollments' | 'providers' | 'claims';

interface PlanManagementDashboardProps {
  organizationId: string;
  plans: BenefitPlan[];
  enrollments: PlanEnrollment[];
  providers: PlanProvider[];
  claims: PlanClaim[];
  metrics: PlanManagementMetrics;
  stats: PlanManagementStats;
}

const planStatusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['active', 'renewed'].includes(status)) return 'success';
  if (['draft', 'open_enrollment', 'closed'].includes(status)) return 'warning';
  if (['suspended', 'terminated'].includes(status)) return 'danger';
  return 'info';
};

const enrollmentStatusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['active'].includes(status)) return 'success';
  if (['pending'].includes(status)) return 'warning';
  if (['terminated', 'cancelled', 'suspended'].includes(status)) return 'danger';
  if (['waived'].includes(status)) return 'default';
  return 'info';
};

const providerStatusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['active', 'preferred'].includes(status)) return 'success';
  if (['under_review'].includes(status)) return 'warning';
  if (['terminated'].includes(status)) return 'danger';
  if (['inactive'].includes(status)) return 'default';
  return 'info';
};

const claimStatusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['approved', 'paid', 'partially_paid'].includes(status)) return 'success';
  if (['submitted', 'in_review', 'appealed'].includes(status)) return 'warning';
  if (['denied', 'cancelled'].includes(status)) return 'danger';
  return 'info';
};

export function PlanManagementDashboard({
  plans, enrollments, providers, claims, metrics, stats,
}: PlanManagementDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const planName = useMemo(
    () => (id: string) => plans.find((p) => p.id === id)?.name || id,
    [plans],
  );

  const filteredPlans = useMemo(() => {
    if (!search) return plans;
    const q = search.toLowerCase();
    return plans.filter(
      (p) => p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q) || p.status.toLowerCase().includes(q),
    );
  }, [plans, search]);

  const filteredEnrollments = useMemo(() => {
    if (!search) return enrollments;
    const q = search.toLowerCase();
    return enrollments.filter(
      (e) => e.employeeName.toLowerCase().includes(q) || e.type.toLowerCase().includes(q) || e.status.toLowerCase().includes(q),
    );
  }, [enrollments, search]);

  const filteredProviders = useMemo(() => {
    if (!search) return providers;
    const q = search.toLowerCase();
    return providers.filter(
      (p) => p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q) || p.status.toLowerCase().includes(q),
    );
  }, [providers, search]);

  const filteredClaims = useMemo(() => {
    if (!search) return claims;
    const q = search.toLowerCase();
    return claims.filter(
      (c) => c.employeeName.toLowerCase().includes(q) || c.type.toLowerCase().includes(q) || c.status.toLowerCase().includes(q),
    );
  }, [claims, search]);

  const tabs: { id: TabId; label: string; icon: typeof Heart }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'plans', label: 'Plans', icon: Heart },
    { id: 'enrollments', label: 'Enrollments', icon: FileText },
    { id: 'providers', label: 'Providers', icon: Building },
    { id: 'claims', label: 'Claims', icon: DollarSign },
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
              <div className="text-xs text-fg-tertiary">Active Enrollments</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeEnrollments}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Providers</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeProviders}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Pending Claims</div>
              <div className="mt-1 text-2xl font-bold">{metrics.pendingClaims}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Total Claim Amount</div>
              <div className="mt-1 text-2xl font-bold">${metrics.totalClaimAmount.toLocaleString()}</div>
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
                <Badge key={status} variant={planStatusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Claim Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byClaimStatus).map(([status, count]) => (
                <Badge key={status} variant={claimStatusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Provider Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byProviderType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'plans' && (
        <div className="space-y-3">
          {filteredPlans.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Heart} title="No benefit plans" description="Benefit plans will appear here." /></Card>
          ) : (
            filteredPlans.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-fg-secondary">{p.type.replace('_', ' ')} · {p.providerId || 'No provider'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.effectiveDate && <Badge variant="default">{new Date(p.effectiveDate).toLocaleDateString()}</Badge>}
                    <Badge variant={planStatusVariant(p.status)}>{p.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'enrollments' && (
        <div className="space-y-3">
          {filteredEnrollments.length === 0 ? (
            <Card className="p-8"><EmptyState icon={FileText} title="No enrollments" description="Plan enrollments will appear here." /></Card>
          ) : (
            filteredEnrollments.map((e) => (
              <Card key={e.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{e.employeeName}</div>
                    <div className="text-sm text-fg-secondary">{planName(e.planId)} · {e.type.replace('_', ' ')}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {e.effectiveDate && <Badge variant="default">{new Date(e.effectiveDate).toLocaleDateString()}</Badge>}
                    <Badge variant={enrollmentStatusVariant(e.status)}>{e.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'providers' && (
        <div className="space-y-3">
          {filteredProviders.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Building} title="No providers" description="Plan providers will appear here." /></Card>
          ) : (
            filteredProviders.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-fg-secondary">{p.type.replace('_', ' ')} · {p.contactName || 'No contact'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.rating > 0 && <Badge variant="default">{p.rating}★</Badge>}
                    <Badge variant={providerStatusVariant(p.status)}>{p.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'claims' && (
        <div className="space-y-3">
          {filteredClaims.length === 0 ? (
            <Card className="p-8"><EmptyState icon={DollarSign} title="No claims" description="Plan claims will appear here." /></Card>
          ) : (
            filteredClaims.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{c.employeeName}</div>
                    <div className="text-sm text-fg-secondary">{c.type.replace('_', ' ')} · {planName(c.planId)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">${c.amount.toLocaleString()} {c.currency}</Badge>
                    <Badge variant={claimStatusVariant(c.status)}>{c.status.replace('_', ' ')}</Badge>
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
