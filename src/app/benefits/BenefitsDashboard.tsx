'use client';

import { useState, useMemo } from 'react';
import {
  HeartPulse, Users, FileText, DollarSign, Plus, Search,
  Shield, CheckCircle, XCircle, Clock,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

// ── Types ──

type BenefitPlanType = 'health' | 'dental' | 'vision' | 'retirement' | 'life_insurance' | 'other';
type CoverageLevel = 'individual' | 'family' | 'dependent';
type ClaimType = 'medical' | 'dental' | 'vision' | 'other';
type ClaimStatus = 'pending' | 'approved' | 'denied' | 'paid';
type EnrollmentStatus = 'active' | 'cancelled';

interface BenefitPlan {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: BenefitPlanType;
  description: string;
  provider: string;
  costPerEmployee: number;
  employerContribution: number;
  eligibilityCriteria: string;
  enrollmentOpen: boolean;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface BenefitEnrollment {
  id: string;
  organizationId: string;
  workspaceId: string;
  planId: string;
  planName: string;
  employeeId: string;
  employeeName: string;
  enrollmentDate: string;
  coverageLevel: CoverageLevel;
  beneficiary: string;
  contributionAmount: number;
  status: EnrollmentStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface BenefitClaim {
  id: string;
  organizationId: string;
  workspaceId: string;
  enrollmentId: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  date: string;
  description: string;
  type: ClaimType;
  status: ClaimStatus;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CostAnalysis {
  totalCost: number;
  costPerPlan: Record<string, number>;
  costPerEmployee: Record<string, number>;
}

interface BenefitsStats {
  planCount: number;
  enrollmentCount: number;
  claimCount: number;
  totalCost: number;
}

interface BenefitsDashboardProps {
  organizationId: string;
  plans: BenefitPlan[];
  enrollments: BenefitEnrollment[];
  claims: BenefitClaim[];
  costAnalysis: CostAnalysis;
  stats: BenefitsStats;
}

// ── Helpers ──

const planTypeVariant: Record<BenefitPlanType, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  health: 'danger',
  dental: 'info',
  vision: 'accent',
  retirement: 'success',
  life_insurance: 'warning',
  other: 'default',
};

const claimStatusVariant: Record<ClaimStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  pending: 'warning',
  approved: 'info',
  denied: 'danger',
  paid: 'success',
};

const enrollmentStatusVariant: Record<EnrollmentStatus, 'success' | 'danger'> = {
  active: 'success',
  cancelled: 'danger',
};

function formatCurrency(amount: number): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function formatDate(d: Date | string | null): string {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
}

// ── Component ──

export function BenefitsDashboard({
  organizationId: _organizationId,
  plans,
  enrollments,
  claims,
  costAnalysis,
  stats,
}: BenefitsDashboardProps) {
  const [tab, setTab] = useState<'plans' | 'enrollments' | 'claims' | 'cost'>('plans');
  const [search, setSearch] = useState('');

  const filteredPlans = useMemo(() => {
    if (!search) return plans;
    const q = search.toLowerCase();
    return plans.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.provider.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q),
    );
  }, [plans, search]);

  const filteredEnrollments = useMemo(() => {
    if (!search) return enrollments;
    const q = search.toLowerCase();
    return enrollments.filter(
      (e) =>
        e.employeeName.toLowerCase().includes(q) ||
        e.planName.toLowerCase().includes(q) ||
        e.employeeId.toLowerCase().includes(q),
    );
  }, [enrollments, search]);

  const filteredClaims = useMemo(() => {
    if (!search) return claims;
    const q = search.toLowerCase();
    return claims.filter(
      (c) =>
        c.employeeName.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.type.toLowerCase().includes(q),
    );
  }, [claims, search]);

  const tabs: { id: typeof tab; label: string; icon: typeof HeartPulse }[] = [
    { id: 'plans', label: 'Plans', icon: Shield },
    { id: 'enrollments', label: 'Enrollments', icon: Users },
    { id: 'claims', label: 'Claims', icon: FileText },
    { id: 'cost', label: 'Cost Analysis', icon: DollarSign },
  ];

  return (
    <div className="space-y-6">
      {/* Stats overview */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Plans</span>
          </div>
          <p className="text-2xl font-semibold">{stats.planCount}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Enrollments</span>
          </div>
          <p className="text-2xl font-semibold">{stats.enrollmentCount}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Claims</span>
          </div>
          <p className="text-2xl font-semibold">{stats.claimCount}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Total Cost</span>
          </div>
          <p className="text-2xl font-semibold">{formatCurrency(stats.totalCost)}</p>
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

      {/* Tab content */}
      {tab === 'plans' && (
        <div className="space-y-4">
          {filteredPlans.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Shield}
                title="No benefit plans"
                description="Create a benefit plan to get started."
              />
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredPlans.map((plan) => (
                <Card key={plan.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{plan.name}</h3>
                      <p className="text-xs text-fg-secondary">{plan.provider || 'No provider'}</p>
                    </div>
                    <Badge variant={planTypeVariant[plan.type]}>{plan.type}</Badge>
                  </div>
                  {plan.description && (
                    <p className="text-sm text-fg-secondary mb-3 line-clamp-2">{plan.description}</p>
                  )}
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Cost/employee</span>
                      <span className="font-medium">{formatCurrency(plan.costPerEmployee)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Employer contribution</span>
                      <span className="font-medium">{formatCurrency(plan.employerContribution)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Enrollment</span>
                      <span className="font-medium">{plan.enrollmentOpen ? 'Open' : 'Closed'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Status</span>
                      <span className="font-medium">{plan.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'enrollments' && (
        <div className="space-y-4">
          {filteredEnrollments.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Users}
                title="No enrollments"
                description="Enroll employees in benefit plans to see them here."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Employee</th>
                    <th className="p-3 font-medium">Plan</th>
                    <th className="p-3 font-medium">Coverage</th>
                    <th className="p-3 font-medium">Enrolled</th>
                    <th className="p-3 font-medium">Contribution</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEnrollments.map((enrollment) => (
                    <tr key={enrollment.id} className="border-b last:border-0">
                      <td className="p-3">
                        <p className="font-medium">{enrollment.employeeName}</p>
                        <p className="text-xs text-fg-secondary">{enrollment.employeeId}</p>
                      </td>
                      <td className="p-3">{enrollment.planName || '—'}</td>
                      <td className="p-3 capitalize">{enrollment.coverageLevel}</td>
                      <td className="p-3">{formatDate(enrollment.enrollmentDate)}</td>
                      <td className="p-3">{formatCurrency(enrollment.contributionAmount)}</td>
                      <td className="p-3">
                        <Badge variant={enrollmentStatusVariant[enrollment.status]}>
                          {enrollment.status}
                        </Badge>
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
                description="Claims will appear here once submitted."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Employee</th>
                    <th className="p-3 font-medium">Type</th>
                    <th className="p-3 font-medium">Amount</th>
                    <th className="p-3 font-medium">Date</th>
                    <th className="p-3 font-medium">Description</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClaims.map((claim) => (
                    <tr key={claim.id} className="border-b last:border-0">
                      <td className="p-3">
                        <p className="font-medium">{claim.employeeName}</p>
                        <p className="text-xs text-fg-secondary">{claim.employeeId}</p>
                      </td>
                      <td className="p-3 capitalize">{claim.type}</td>
                      <td className="p-3 font-medium">{formatCurrency(claim.amount)}</td>
                      <td className="p-3">{formatDate(claim.date)}</td>
                      <td className="p-3 max-w-xs truncate text-fg-secondary">{claim.description || '—'}</td>
                      <td className="p-3">
                        <Badge variant={claimStatusVariant[claim.status]}>{claim.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'cost' && (
        <div className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-5 w-5 text-accent-primary" />
              <h2 className="heading-display text-lg">Total Cost</h2>
            </div>
            <p className="text-3xl font-bold">{formatCurrency(costAnalysis.totalCost)}</p>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-6">
              <h3 className="font-semibold mb-3">Cost per Plan</h3>
              {Object.keys(costAnalysis.costPerPlan).length === 0 ? (
                <p className="text-sm text-fg-secondary">No cost data.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(costAnalysis.costPerPlan).map(([planId, cost]) => {
                    const plan = plans.find((p) => p.id === planId);
                    return (
                      <div key={planId} className="flex justify-between text-sm">
                        <span className="text-fg-secondary">{plan?.name || planId}</span>
                        <span className="font-medium">{formatCurrency(cost)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-3">Cost per Employee</h3>
              {Object.keys(costAnalysis.costPerEmployee).length === 0 ? (
                <p className="text-sm text-fg-secondary">No cost data.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(costAnalysis.costPerEmployee).map(([employeeId, cost]) => {
                    const enrollment = enrollments.find((e) => e.employeeId === employeeId);
                    return (
                      <div key={employeeId} className="flex justify-between text-sm">
                        <span className="text-fg-secondary">{enrollment?.employeeName || employeeId}</span>
                        <span className="font-medium">{formatCurrency(cost)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
