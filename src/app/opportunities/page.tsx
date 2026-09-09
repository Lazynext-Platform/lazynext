import type { Metadata } from 'next';
import { Lightbulb } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Opportunity Detection — Lazynext',
  description: 'Manage detected opportunities, detection rules, scoring, and actions.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { OpportunityService } from '@/lib/services/opportunity-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { OpportunityDashboard } from './OpportunityDashboard';

export const dynamic = 'force-dynamic';

export default async function OpportunitiesPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Opportunity Detection</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage detected opportunities, detection rules, scoring, and actions.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Lightbulb}
            title="No workspace yet"
            description="Create a company first to access opportunity detection."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [opportunities, rules, scores, actions, metrics, stats] = await Promise.all([
    OpportunityService.listOpportunities(organizationId),
    OpportunityService.listDetectionRules(organizationId),
    OpportunityService.listOpportunityScores(organizationId),
    OpportunityService.listOpportunityActions(organizationId),
    OpportunityService.getOpportunityDetectionMetrics(organizationId),
    OpportunityService.getOpportunityDetectionStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Opportunity Detection</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage detected opportunities, detection rules, scoring, and actions.</p>
      </div>

      <OpportunityDashboard
        organizationId={organizationId}
        opportunities={opportunities}
        rules={rules}
        scores={scores}
        actions={actions}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
