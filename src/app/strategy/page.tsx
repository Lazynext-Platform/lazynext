import type { Metadata } from 'next';
import { Target } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Strategy & OKRs — Lazynext',
  description: 'Strategic initiatives, OKRs, milestones, and alignment.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { StrategyService } from '@/lib/services/strategy-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { StrategyDashboard } from './StrategyDashboard';

export const dynamic = 'force-dynamic';

export default async function StrategyPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Strategy & OKRs</h1>
          <p className="text-sm text-fg-secondary mt-1">Strategic initiatives, OKRs, milestones, and alignment.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Target}
            title="No workspace yet"
            description="Create a company first to start managing strategy."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;
  const [initiatives, milestones, okrs, stats, roadmap] = await Promise.all([
    StrategyService.listInitiatives(organizationId),
    StrategyService.listMilestones(organizationId),
    StrategyService.getOkRs(organizationId),
    StrategyService.getStats(organizationId),
    StrategyService.getRoadmap(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Target className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Strategy & OKRs</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Strategic initiatives, OKRs, milestones, and alignment.</p>
      </div>

      <StrategyDashboard
        organizationId={organizationId}
        initiatives={initiatives}
        milestones={milestones}
        okrs={okrs}
        stats={stats}
        roadmap={roadmap}
      />
    </div>
  );
}
