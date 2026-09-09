import type { Metadata } from 'next';
import { Heart } from 'lucide-react';

export const metadata: Metadata = {
  title: 'DEI — Lazynext',
  description: 'Manage diversity, equity & inclusion initiatives, metrics, training, and goals.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DeiService } from '@/lib/services/dei-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { DeiDashboard } from './DeiDashboard';

export const dynamic = 'force-dynamic';

export default async function DeiPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Diversity, Equity & Inclusion</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage DEI initiatives, metrics, training, and goals.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Heart}
            title="No workspace yet"
            description="Create a company first to access DEI management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [initiatives, deiMetrics, trainings, goals, metrics, stats] = await Promise.all([
    DeiService.listInitiatives(organizationId),
    DeiService.listMetrics(organizationId),
    DeiService.listTrainings(organizationId),
    DeiService.listGoals(organizationId),
    DeiService.getDeiMetrics(organizationId),
    DeiService.getDeiStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Heart className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Diversity, Equity & Inclusion</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage DEI initiatives, metrics, training, and goals.</p>
      </div>

      <DeiDashboard
        organizationId={organizationId}
        initiatives={initiatives}
        deiMetrics={deiMetrics}
        trainings={trainings}
        goals={goals}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
