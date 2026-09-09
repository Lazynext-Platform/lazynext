import type { Metadata } from 'next';
import { ClipboardList } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Employee Surveys — Lazynext',
  description: 'Manage employee surveys, responses, questions, and campaigns.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EmployeeSurveysService } from '@/lib/services/employee-surveys-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { EmployeeSurveysDashboard } from './EmployeeSurveysDashboard';

export const dynamic = 'force-dynamic';

export default async function EmployeeSurveysPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Employee Surveys</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage employee surveys, responses, questions, and campaigns.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={ClipboardList}
            title="No workspace yet"
            description="Create a company first to access employee survey management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [surveys, responses, questions, campaigns, metrics, stats] = await Promise.all([
    EmployeeSurveysService.listSurveys(organizationId),
    EmployeeSurveysService.listResponses(organizationId),
    EmployeeSurveysService.listQuestions(organizationId),
    EmployeeSurveysService.listCampaigns(organizationId),
    EmployeeSurveysService.getEmployeeSurveyMetrics(organizationId),
    EmployeeSurveysService.getEmployeeSurveyStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Employee Surveys</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage employee surveys, responses, questions, and campaigns.</p>
      </div>

      <EmployeeSurveysDashboard
        organizationId={organizationId}
        surveys={surveys}
        responses={responses}
        questions={questions}
        campaigns={campaigns}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
