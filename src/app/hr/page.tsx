import type { Metadata } from 'next';
import { Users } from 'lucide-react';

export const metadata: Metadata = {
  title: 'HR & People Ops — Lazynext',
  description: 'Employee management, time-off, performance reviews, and payroll.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EmployeeService } from '@/lib/services/employee-service';
import { TimeOffService } from '@/lib/services/time-off-service';
import { PerformanceReviewService } from '@/lib/services/performance-review-service';
import { PayrollService } from '@/lib/services/payroll-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { HRDashboard } from './HRDashboard';

export const dynamic = 'force-dynamic';

export default async function HRPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">HR & People Ops</h1>
          <p className="text-sm text-fg-secondary mt-1">Employee management, time-off, performance reviews, and payroll.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Users}
            title="No workspace yet"
            description="Create a company first to access HR & People Ops."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [employees, departments, timeOff, reviews, payrollSummary, employeeStats, timeOffStats, reviewStats, payrollStats] = await Promise.all([
    EmployeeService.list(organizationId),
    EmployeeService.getDepartments(organizationId),
    TimeOffService.list(organizationId, { status: 'pending' }),
    PerformanceReviewService.list(organizationId, { status: 'in_progress' }),
    PayrollService.getPayrollSummary(organizationId),
    EmployeeService.getStats(organizationId),
    TimeOffService.getStats(organizationId),
    PerformanceReviewService.getStats(organizationId),
    PayrollService.getStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">HR & People Ops</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Employee management, time-off, performance reviews, and payroll.</p>
      </div>

      <HRDashboard
        organizationId={organizationId}
        employees={employees}
        departments={departments}
        pendingTimeOff={timeOff}
        inProgressReviews={reviews}
        payrollSummary={payrollSummary}
        employeeStats={employeeStats}
        timeOffStats={timeOffStats}
        reviewStats={reviewStats}
        payrollStats={payrollStats}
      />
    </div>
  );
}
