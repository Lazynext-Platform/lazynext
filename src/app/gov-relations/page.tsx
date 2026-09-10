import type { Metadata } from 'next';
import { Landmark } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Government Relations — Lazynext',
  description: 'Manage government contacts, policy monitoring, lobbying activities, and compliance filings.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { GovRelationsService } from '@/lib/services/gov-relations-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { GovRelationsDashboard } from './GovRelationsDashboard';

export const dynamic = 'force-dynamic';

export default async function GovRelationsPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Government Relations</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage government contacts, policy monitoring, lobbying activities, and compliance filings.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Landmark}
            title="No workspace yet"
            description="Create a company first to access government relations management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [contacts, policies, lobbying, compliance, metrics, stats] = await Promise.all([
    GovRelationsService.listContacts(organizationId),
    GovRelationsService.listPolicies(organizationId),
    GovRelationsService.listLobbying(organizationId),
    GovRelationsService.listCompliance(organizationId),
    GovRelationsService.getGovRelationsMetrics(organizationId),
    GovRelationsService.getGovRelationsStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Landmark className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Government Relations</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage government contacts, policy monitoring, lobbying activities, and compliance filings.</p>
      </div>

      <GovRelationsDashboard
        organizationId={organizationId}
        contacts={contacts}
        policies={policies}
        lobbying={lobbying}
        compliance={compliance}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
