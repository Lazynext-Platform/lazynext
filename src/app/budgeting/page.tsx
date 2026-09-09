import type { Metadata } from 'next';
import { PieChart } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Budgeting & Forecasting — Lazynext',
  description: 'Budgets, forecasts, scenarios, and variance analysis.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { BudgetingService } from '@/lib/services/budgeting-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { BudgetingDashboard } from './BudgetingDashboard';

export const dynamic = 'force-dynamic';

export default async function BudgetingPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Budgeting & Forecasting</h1>
          <p className="text-sm text-fg-secondary mt-1">Budgets, forecasts, scenarios, and variance analysis.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={PieChart}
            title="No workspace yet"
            description="Create a company first to start managing your budgets."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const defaultWorkspace = workspaces[0];
  const organizationId = defaultWorkspace.organizationId;

  const [budgets, stats, comparisons, forecasts, scenarios, variances, rollingForecast] = await Promise.all([
    BudgetingService.listBudgets(organizationId),
    BudgetingService.getStats(organizationId),
    BudgetingService.getBudgetVsActual(organizationId),
    BudgetingService.listForecasts(organizationId),
    BudgetingService.getScenarios(organizationId),
    BudgetingService.getVarianceAnalysis(organizationId),
    BudgetingService.getRollingForecast(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <PieChart className="h-6 w-6 text-accent-primary" />
            <h1 className="heading-display text-2xl">Budgeting & Forecasting</h1>
          </div>
          <p className="text-sm text-fg-secondary mt-1">
            Budgets, forecasts, scenarios, and variance analysis.
          </p>
        </div>
        <div className="text-xs text-fg-secondary">{defaultWorkspace.name}</div>
      </div>

      <BudgetingDashboard
        organizationId={organizationId}
        budgets={budgets}
        stats={stats}
        comparisons={comparisons}
        forecasts={forecasts}
        scenarios={scenarios}
        variances={variances}
        rollingForecast={rollingForecast}
      />
    </div>
  );
}
