import type { Metadata } from 'next';
import { GraduationCap } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Employee Development — Lazynext',
  description: 'Onboarding, training plans, certifications, skills matrix, and career paths.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { OnboardingService } from '@/lib/services/onboarding-service';
import { EmployeeDevelopmentService } from '@/lib/services/employee-development-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { EmployeeDevelopmentDashboard } from './EmployeeDevelopmentDashboard';

export const dynamic = 'force-dynamic';

export default async function EmployeeDevelopmentPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Employee Development</h1>
          <p className="text-sm text-fg-secondary mt-1">Onboarding, training plans, certifications, skills matrix, and career paths.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={GraduationCap}
            title="No workspace yet"
            description="Create a company first to start developing your employees."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;
  const [
    onboardingTasks, onboardingStats,
    trainingPlans, trainingStats,
    certifications,
    skillsMatrix,
  ] = await Promise.all([
    OnboardingService.listTasks(organizationId),
    OnboardingService.getStats(organizationId),
    EmployeeDevelopmentService.listTrainingPlans(organizationId),
    EmployeeDevelopmentService.getStats(organizationId),
    EmployeeDevelopmentService.listCertifications(organizationId),
    EmployeeDevelopmentService.getSkillsMatrix(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Employee Development</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Onboarding, training plans, certifications, skills matrix, and career paths.</p>
      </div>

      <EmployeeDevelopmentDashboard
        organizationId={organizationId}
        onboardingTasks={onboardingTasks}
        onboardingStats={onboardingStats}
        trainingPlans={trainingPlans}
        trainingStats={trainingStats}
        certifications={certifications}
        skillsMatrix={skillsMatrix}
      />
    </div>
  );
}
