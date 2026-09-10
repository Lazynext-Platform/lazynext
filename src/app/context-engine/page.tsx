import type { Metadata } from 'next';
import { BrainCircuit } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Context Engine — Lazynext',
  description: 'Manage context snapshots, sources, retrievals, and assemblies for AI agents.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ContextEngineService } from '@/lib/services/context-engine-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { ContextEngineDashboard } from './ContextEngineDashboard';

export const dynamic = 'force-dynamic';

export default async function ContextEnginePage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Context Engine</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage context snapshots, sources, retrievals, and assemblies for AI agents.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={BrainCircuit}
            title="No workspace yet"
            description="Create a company first to access the context engine."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [snapshots, sources, retrievals, assemblies, metrics, stats] = await Promise.all([
    ContextEngineService.listContextSnapshots(organizationId),
    ContextEngineService.listContextSources(organizationId),
    ContextEngineService.listContextRetrievals(organizationId),
    ContextEngineService.listContextAssemblies(organizationId),
    ContextEngineService.getContextEngineMetrics(organizationId),
    ContextEngineService.getContextEngineStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Context Engine</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage context snapshots, sources, retrievals, and assemblies for AI agents.</p>
      </div>

      <ContextEngineDashboard
        organizationId={organizationId}
        snapshots={snapshots}
        sources={sources}
        retrievals={retrievals}
        assemblies={assemblies}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
