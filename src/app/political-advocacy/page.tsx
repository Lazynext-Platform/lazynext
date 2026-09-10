import type { Metadata } from 'next';
import { Megaphone } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Political Advocacy — Lazynext',
  description: 'Manage advocacy campaigns, lobbying activities, policy positions, and PAC contributions.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PoliticalAdvocacyService } from '@/lib/services/political-advocacy-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { PoliticalAdvocacyDashboard } from './PoliticalAdvocacyDashboard';

export const dynamic = 'force-dynamic';

export default async function PoliticalAdvocacyPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Political Advocacy</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage advocacy campaigns, lobbying activities, policy positions, and PAC contributions.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Megaphone}
            title="No workspace yet"
            description="Create a company first to access political advocacy management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [campaigns, lobbying, positions, contributions, metrics, stats] = await Promise.all([
    PoliticalAdvocacyService.listCampaigns(organizationId),
    PoliticalAdvocacyService.listLobbying(organizationId),
    PoliticalAdvocacyService.listPositions(organizationId),
    PoliticalAdvocacyService.listContributions(organizationId),
    PoliticalAdvocacyService.getPoliticalAdvocacyMetrics(organizationId),
    PoliticalAdvocacyService.getPoliticalAdvocacyStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Political Advocacy</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage advocacy campaigns, lobbying activities, policy positions, and PAC contributions.</p>
      </div>

      <PoliticalAdvocacyDashboard
        organizationId={organizationId}
        campaigns={campaigns}
        lobbying={lobbying}
        positions={positions}
        contributions={contributions}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
