'use client';

import { useState, useMemo } from 'react';
import {
  Shield, FileText, DollarSign, AlertCircle, Search, BarChart3,
  Building2, CheckCircle, XCircle,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  InsurancePolicy, InsuranceClaim, InsuranceCoverage, InsuranceBroker,
  InsuranceMetrics, InsuranceStats,
  InsurancePolicyType, InsurancePolicyStatus, InsuranceClaimStatus,
} from '@/lib/services/insurance-service';

// ── Variant maps ──

const policyTypeVariant: Record<InsurancePolicyType, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  general_liability: 'info',
  property: 'accent',
  cyber: 'warning',
  professional_liability: 'info',
  workers_comp: 'danger',
  auto: 'default',
  directors_officers: 'accent',
  health: 'success',
  life: 'default',
  umbrella: 'info',
  other: 'default',
};

const policyStatusVariant: Record<InsurancePolicyStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  active: 'success',
  expired: 'danger',
  cancelled: 'default',
  pending: 'warning',
  renewed: 'info',
};

const claimStatusVariant: Record<InsuranceClaimStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  filed: 'info',
  under_review: 'accent',
  approved: 'success',
  denied: 'danger',
  settled: 'info',
};

// ── Helpers ──

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

function formatDate(d: Date | string | null): string {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
}

// ── Props ──

interface InsuranceDashboardProps {
  organizationId: string;
  policies: InsurancePolicy[];
  claims: InsuranceClaim[];
  coverages: InsuranceCoverage[];
  brokers: InsuranceBroker[];
  stats: InsuranceStats;
  metrics: InsuranceMetrics;
}

// ── Component ──

type TabId = 'overview' | 'policies' | 'claims' | 'coverages' | 'brokers';

export function InsuranceDashboard({
  organizationId: _organizationId,
  policies,
  claims,
  coverages,
  brokers,
  stats,
  metrics,
}: InsuranceDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const policyNumber = (id: string | null) => {
    if (!id) return '—';
    const p = policies.find((p) => p.id === id);
    return p ? p.policyNumber : id;
  };

  const filteredPolicies = useMemo(() => {
    if (!search) return policies;
    const q = search.toLowerCase();
    return policies.filter(
      (p) =>
        p.policyNumber.toLowerCase().includes(q) ||
        p.provider.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q) ||
        p.status.toLowerCase().includes(q),
    );
  }, [policies, search]);

  const filteredClaims = useMemo(() => {
    if (!search) return claims;
    const q = search.toLowerCase();
    return claims.filter(
      (c) =>
        c.claimNumber.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.status.toLowerCase().includes(q) ||
        c.adjuster.toLowerCase().includes(q),
    );
  }, [claims, search]);

  const filteredCoverages = useMemo(() => {
    if (!search) return coverages;
    const q = search.toLowerCase();
    return coverages.filter(
      (c) => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q),
    );
  }, [coverages, search]);

  const filteredBrokers = useMemo(() => {
    if (!search) return brokers;
    const q = search.toLowerCase();
    return brokers.filter(
      (b) => b.name.toLowerCase().includes(q) || b.company.toLowerCase().includes(q) || b.email.toLowerCase().includes(q),
    );
  }, [brokers, search]);

  const tabs: { id: TabId; label: string; icon: typeof Shield }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'policies', label: 'Policies', icon: Shield },
    { id: 'claims', label: 'Claims', icon: FileText },
    { id: 'coverages', label: 'Coverages', icon: AlertCircle },
    { id: 'brokers', label: 'Brokers', icon: Building2 },
  ];

  return (
    <div className="space-y-6">
      {/* Stats overview */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Policies</span>
          </div>
          <p className="text-2xl font-semibold">{stats.policyCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.activePolicyCount} active</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Claims</span>
          </div>
          <p className="text-2xl font-semibold">{stats.claimCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.openClaimCount} open</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Total Coverage</span>
          </div>
          <p className="text-2xl font-semibold">{formatCurrency(stats.totalCoverage)}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{formatCurrency(stats.totalPremiums)} premiums</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Expiring</span>
          </div>
          <p className="text-2xl font-semibold">{stats.expiringPolicies}</p>
          <p className="text-xs text-fg-secondary mt-0.5">within 90 days</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-accent-primary text-white'
                  : 'bg-surface-alt text-fg-secondary hover:text-fg-primary'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Search */}
      {tab !== 'overview' && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 w-full"
            />
          </div>
        </div>
      )}

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-accent-primary" />
                <h2 className="heading-display text-lg">Insurance Metrics</h2>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Total coverage</span>
                  <span className="font-medium">{formatCurrency(metrics.totalCoverage)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Total premiums</span>
                  <span className="font-medium">{formatCurrency(metrics.totalPremiums)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Open claims</span>
                  <span className="font-medium">{metrics.openClaims}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Claim success rate</span>
                  <span className="font-medium">{(metrics.claimSuccessRate * 100).toFixed(1)}%</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Expiring policies</span>
                  <span>{metrics.expiringPolicies}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5 text-accent-primary" />
                <h2 className="heading-display text-lg">Counts</h2>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Policies</span>
                  <span className="font-medium">{stats.policyCount} ({stats.activePolicyCount} active)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Claims</span>
                  <span className="font-medium">{stats.claimCount} ({stats.openClaimCount} open)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Coverages</span>
                  <span className="font-medium">{stats.coverageCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Brokers</span>
                  <span className="font-medium">{stats.brokerCount}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Expiring policies</span>
                  <span>{stats.expiringPolicies}</span>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="font-semibold mb-3">Open Claims</h3>
            {claims.filter((c) => c.status === 'filed' || c.status === 'under_review').length === 0 ? (
              <p className="text-sm text-fg-secondary">No open claims.</p>
            ) : (
              <div className="space-y-2">
                {claims.filter((c) => c.status === 'filed' || c.status === 'under_review').slice(0, 5).map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{c.claimNumber || c.description.slice(0, 40)}</p>
                      <p className="text-xs text-fg-secondary">{policyNumber(c.policyId)} · {formatCurrency(c.amount)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={claimStatusVariant[c.status]}>{c.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'policies' && (
        <div className="space-y-4">
          {filteredPolicies.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Shield}
                title="No policies"
                description="Create an insurance policy to get started."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Policy #</th>
                    <th className="p-3 font-medium">Type</th>
                    <th className="p-3 font-medium">Provider</th>
                    <th className="p-3 font-medium">Premium</th>
                    <th className="p-3 font-medium">Coverage</th>
                    <th className="p-3 font-medium">End Date</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPolicies.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{p.policyNumber}</td>
                      <td className="p-3">
                        <Badge variant={policyTypeVariant[p.type]}>{p.type.replace(/_/g, ' ')}</Badge>
                      </td>
                      <td className="p-3">{p.provider}</td>
                      <td className="p-3">{formatCurrency(p.premium)}</td>
                      <td className="p-3">{formatCurrency(p.coverageLimit)}</td>
                      <td className="p-3">{formatDate(p.endDate)}</td>
                      <td className="p-3">
                        <Badge variant={policyStatusVariant[p.status]}>{p.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'claims' && (
        <div className="space-y-4">
          {filteredClaims.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={FileText}
                title="No claims"
                description="Insurance claims will appear here once filed."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Claim #</th>
                    <th className="p-3 font-medium">Policy</th>
                    <th className="p-3 font-medium">Amount</th>
                    <th className="p-3 font-medium">Adjuster</th>
                    <th className="p-3 font-medium">Incident Date</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClaims.map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{c.claimNumber || '—'}</td>
                      <td className="p-3">{policyNumber(c.policyId)}</td>
                      <td className="p-3">{formatCurrency(c.amount)}</td>
                      <td className="p-3">{c.adjuster || '—'}</td>
                      <td className="p-3">{formatDate(c.incidentDate)}</td>
                      <td className="p-3">
                        <Badge variant={claimStatusVariant[c.status]}>{c.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'coverages' && (
        <div className="space-y-4">
          {filteredCoverages.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={AlertCircle}
                title="No coverages"
                description="Coverage details will appear here."
              />
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredCoverages.map((c) => (
                <Card key={c.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{c.name}</h3>
                      <p className="text-xs text-fg-secondary">{policyNumber(c.policyId)}</p>
                    </div>
                    <Badge variant="info">{formatCurrency(c.limit)}</Badge>
                  </div>
                  {c.description && (
                    <p className="text-sm text-fg-secondary mb-3 line-clamp-2">{c.description}</p>
                  )}
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Covered perils</span>
                      <span className="font-medium">{c.coveredPerils.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Exclusions</span>
                      <span className="font-medium">{c.exclusions.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Sublimits</span>
                      <span className="font-medium">{c.sublimits.length}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'brokers' && (
        <div className="space-y-4">
          {filteredBrokers.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Building2}
                title="No brokers"
                description="Insurance brokers will appear here."
              />
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredBrokers.map((b) => (
                <Card key={b.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{b.name}</h3>
                      <p className="text-xs text-fg-secondary">{b.company || '—'}</p>
                    </div>
                    {b.commissionRate > 0 && (
                      <Badge variant="accent">{b.commissionRate}%</Badge>
                    )}
                  </div>
                  <div className="space-y-1 text-xs">
                    {b.email && (
                      <div className="flex justify-between">
                        <span className="text-fg-secondary">Email</span>
                        <span className="font-medium">{b.email}</span>
                      </div>
                    )}
                    {b.phone && (
                      <div className="flex justify-between">
                        <span className="text-fg-secondary">Phone</span>
                        <span className="font-medium">{b.phone}</span>
                      </div>
                    )}
                    {b.licenseNumber && (
                      <div className="flex justify-between">
                        <span className="text-fg-secondary">License</span>
                        <span className="font-medium">{b.licenseNumber}</span>
                      </div>
                    )}
                    {b.specialties.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-fg-secondary">Specialties</span>
                        <span className="font-medium">{b.specialties.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
