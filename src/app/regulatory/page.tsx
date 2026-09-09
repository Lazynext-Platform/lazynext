import type { Metadata } from 'next';
import { FileText } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Regulatory Affairs — Lazynext',
  description: 'Manage regulatory filings, changes, requirements, submissions, and monitoring.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { RegulatoryService } from '@/lib/services/regulatory-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { RegulatoryDashboard } from './RegulatoryDashboard';

export const dynamic = 'force-dynamic';

export default async function RegulatoryPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Regulatory Affairs</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage regulatory filings, changes, requirements, submissions, and monitoring.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={FileText}
            title="No workspace yet"
            description="Create a company first to access regulatory affairs."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [filings, changes, requirements, submissions, monitoring, metrics, stats] = await Promise.all([
    RegulatoryService.listFilings(organizationId),
    RegulatoryService.listChanges(organizationId),
    RegulatoryService.listRequirements(organizationId),
    RegulatoryService.listSubmissions(organizationId),
    RegulatoryService.listMonitoring(organizationId),
    RegulatoryService.getRegulatoryMetrics(organizationId),
    RegulatoryService.getStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Regulatory Affairs</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage regulatory filings, changes, requirements, submissions, and monitoring.</p>
      </div>

      <RegulatoryDashboard
        organizationId={organizationId}
        filings={filings}
        changes={changes}
        requirements={requirements}
        submissions={submissions}
        monitoring={monitoring}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
