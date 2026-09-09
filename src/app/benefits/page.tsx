import type { Metadata } from 'next';
import { HeartPulse } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Benefits Administration — Lazynext',
  description: 'Benefit plans, employee enrollments, claims tracking, and cost analysis.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { BenefitsService } from '@/lib/services/benefits-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { BenefitsDashboard } from './BenefitsDashboard';

export const dynamic = 'force-dynamic';

export default async function BenefitsPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Benefits Administration</h1>
          <p className="text-sm text-fg-secondary mt-1">Benefit plans, employee enrollments, claims tracking, and cost analysis.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={HeartPulse}
            title="No workspace yet"
            description="Create a company first to access benefits administration."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [plans, enrollments, claims, costAnalysis, stats] = await Promise.all([
    BenefitsService.listPlans(organizationId),
    BenefitsService.listEnrollments(organizationId),
    BenefitsService.listClaims(organizationId),
    BenefitsService.getCostAnalysis(organizationId),
    BenefitsService.getStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <HeartPulse className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Benefits Administration</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Benefit plans, employee enrollments, claims tracking, and cost analysis.</p>
      </div>

      <BenefitsDashboard
        organizationId={organizationId}
        plans={plans}
        enrollments={enrollments}
        claims={claims}
        costAnalysis={costAnalysis}
        stats={stats}
      />
    </div>
  );
}
