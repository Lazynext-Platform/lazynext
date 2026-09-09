import type { Metadata } from 'next';
import { Crown } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Management Succession — Lazynext',
  description: 'Manage succession plans, candidates, development tracks, and reviews.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ManagementSuccessionService } from '@/lib/services/management-succession-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { ManagementSuccessionDashboard } from './ManagementSuccessionDashboard';

export const dynamic = 'force-dynamic';

export default async function ManagementSuccessionPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Management Succession</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage succession plans, candidates, development tracks, and reviews.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Crown}
            title="No workspace yet"
            description="Create a company first to access management succession."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [plans, candidates, tracks, reviews, metrics, stats] = await Promise.all([
    ManagementSuccessionService.listPlans(organizationId),
    ManagementSuccessionService.listCandidates(organizationId),
    ManagementSuccessionService.listTracks(organizationId),
    ManagementSuccessionService.listReviews(organizationId),
    ManagementSuccessionService.getManagementSuccessionMetrics(organizationId),
    ManagementSuccessionService.getManagementSuccessionStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Crown className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Management Succession</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage succession plans, candidates, development tracks, and reviews.</p>
      </div>

      <ManagementSuccessionDashboard
        organizationId={organizationId}
        plans={plans}
        candidates={candidates}
        tracks={tracks}
        reviews={reviews}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
