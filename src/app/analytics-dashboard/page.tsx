import type { Metadata } from 'next';
import Link from 'next/link';
import { BarChart3, Plus } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Analytics Dashboard — Lazynext',
  description: 'Company OS analytics — KPIs, goals, agent performance, and system health.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { CompanyService } from '@/lib/services/company';
import { AnalyticsService } from '@/lib/services/analytics';
import { Card, Button, EmptyState } from '@/components/ui';
import { AnalyticsDashboard } from './AnalyticsDashboard';

export const dynamic = 'force-dynamic';

export default async function AnalyticsDashboardPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const companies = await CompanyService.listForUser(session.user.id);

  if (companies.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Analytics Dashboard</h1>
          <p className="text-sm text-fg-secondary mt-1">
            Company OS analytics — KPIs, goals, agent performance, and system health.
          </p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={BarChart3}
            title="No company yet"
            description="Create a company first to view analytics for your Company OS."
            action={<Button href="/company/new"><Plus className="h-4 w-4" /> Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  // Use the first (most recently updated) company for the dashboard
  const defaultCompany = companies[0];

  // Fetch dashboard data for all companies in parallel, then merge
  const dashboards = await Promise.all(
    companies.map(async (company) => ({
      company,
      data: await AnalyticsService.getDashboardData(company.id),
    })),
  );

  // Merge all dashboards into one view (use the first company's data as primary,
  // but aggregate KPIs, goals, and recent metrics across all companies)
  const allKpis = dashboards.flatMap((d) =>
    d.data.kpis.map((k) => ({ ...k, companyName: d.company.name })),
  );
  const allGoals = dashboards.flatMap((d) =>
    d.data.goals.map((g) => ({ ...g, companyName: d.company.name })),
  );

  // Aggregate agent performance across all companies
  const mergedAgentPerformance = {
    totalRuns: dashboards.reduce((s, d) => s + d.data.agentPerformance.totalRuns, 0),
    byStatus: dashboards.reduce<Record<string, number>>((acc, d) => {
      for (const [status, count] of Object.entries(d.data.agentPerformance.byStatus)) {
        acc[status] = (acc[status] || 0) + count;
      }
      return acc;
    }, {}),
    successRate: (() => {
      const total = dashboards.reduce((s, d) => s + d.data.agentPerformance.totalRuns, 0);
      const completed = dashboards.reduce(
        (s, d) => s + (d.data.agentPerformance.byStatus.completed || 0),
        0,
      );
      return total > 0 ? Math.round((completed / total) * 100) : 0;
    })(),
    avgDurationSec: (() => {
      const agents = dashboards.flatMap((d) => d.data.agentPerformance.mostActiveAgents);
      const withDuration = agents.filter((a) => a.avgDurationSec > 0);
      return withDuration.length > 0
        ? Math.round(withDuration.reduce((s, a) => s + a.avgDurationSec, 0) / withDuration.length)
        : 0;
    })(),
    toolCallsPerRun: (() => {
      const total = dashboards.reduce((s, d) => s + d.data.agentPerformance.totalRuns, 0);
      const totalCalls = dashboards.reduce(
        (s, d) => s + d.data.agentPerformance.toolCallsPerRun * d.data.agentPerformance.totalRuns,
        0,
      );
      return total > 0 ? Math.round((totalCalls / total) * 100) / 100 : 0;
    })(),
    totalCredits: dashboards.reduce((s, d) => s + d.data.agentPerformance.totalCredits, 0),
    mostActiveAgents: dashboards
      .flatMap((d) => d.data.agentPerformance.mostActiveAgents)
      .sort((a, b) => b.runs - a.runs)
      .slice(0, 10),
  };

  // Aggregate system health across all companies
  const mergedSystemHealth = {
    totalEvents: dashboards.reduce((s, d) => s + d.data.systemHealth.totalEvents, 0),
    errorEvents: dashboards.reduce((s, d) => s + d.data.systemHealth.errorEvents, 0),
    automationRuns: dashboards.reduce((s, d) => s + d.data.systemHealth.automationRuns, 0),
    automationSuccessRate: (() => {
      const total = dashboards.reduce((s, d) => s + d.data.systemHealth.automationRuns, 0);
      // Estimate completed from success rate
      const completed = dashboards.reduce(
        (s, d) => s + Math.round((d.data.systemHealth.automationSuccessRate / 100) * d.data.systemHealth.automationRuns),
        0,
      );
      return total > 0 ? Math.round((completed / total) * 100) : 0;
    })(),
    pendingTasks: dashboards.reduce((s, d) => s + d.data.systemHealth.pendingTasks, 0),
    completedTasks: dashboards.reduce((s, d) => s + d.data.systemHealth.completedTasks, 0),
    activeAgents: dashboards.reduce((s, d) => s + d.data.systemHealth.activeAgents, 0),
  };

  const allRecentMetrics = dashboards
    .flatMap((d) => d.data.recentMetrics)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 20);

  const mergedData = {
    kpis: allKpis.map(({ companyName, ...k }) => k),
    goals: allGoals.map(({ companyName, ...g }) => g),
    agentPerformance: mergedAgentPerformance,
    systemHealth: mergedSystemHealth,
    recentMetrics: allRecentMetrics,
  };

  return (
    <>
      {companies.length > 1 && (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 pb-0">
          <div className="flex flex-wrap gap-2 mb-4">
            {companies.map((c) => (
              <Link
                key={c.id}
                href={`/analytics-dashboard?org=${c.id}`}
                className={`text-xs px-3 py-1.5 rounded-lg border-2 transition ${
                  c.id === defaultCompany.id ? 'text-fg font-semibold' : 'text-fg-muted hover:text-fg'
                }`}
                style={{ borderColor: 'var(--c-ink)' }}
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      )}
      <AnalyticsDashboard data={mergedData} />
    </>
  );
}
