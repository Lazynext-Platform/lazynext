import type { Metadata } from 'next';
import { Gauge } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Performance Dashboard — Lazynext',
  description: 'Database index audit, API health, slow queries, cache stats, and performance recommendations.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { CompanyService } from '@/lib/services/company';
import { PerformanceService } from '@/lib/services/performance';
import { Card, Button, EmptyState } from '@/components/ui';
import { PerformanceDashboard } from './PerformanceDashboard';

export const dynamic = 'force-dynamic';

export default async function PerformanceDashboardPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const companies = await CompanyService.listForUser(session.user.id);

  if (companies.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Performance Dashboard</h1>
          <p className="text-sm text-fg-secondary mt-1">
            Database index audit, API health, slow queries, cache stats, and performance recommendations.
          </p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Gauge}
            title="No company yet"
            description="Create a company first to view performance diagnostics for your Company OS."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  // Use the first company for the performance dashboard
  const organizationId = companies[0].id;

  // Fetch index report and API health in parallel (org-agnostic),
  // plus the org-scoped performance dashboard.
  const [indexReport, apiHealth, dashboard] = await Promise.all([
    PerformanceService.getIndexReport(),
    PerformanceService.getApiHealth(),
    PerformanceService.getPerformanceDashboard(organizationId),
  ]);

  return (
    <PerformanceDashboard
      indexReport={indexReport}
      apiHealth={apiHealth}
      slowQueries={dashboard.slowQueries}
      cacheStats={dashboard.cacheStats}
      recommendations={dashboard.recommendations}
    />
  );
}
