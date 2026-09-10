import type { Metadata } from 'next';
import { Archive } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Corporate Archives — Lazynext',
  description: 'Manage corporate records, collections, access requests, and digitization projects.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CorporateArchivesService } from '@/lib/services/corporate-archives-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { CorporateArchivesDashboard } from './CorporateArchivesDashboard';

export const dynamic = 'force-dynamic';

export default async function CorporateArchivesPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Corporate Archives</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage corporate records, collections, access requests, and digitization projects.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Archive}
            title="No workspace yet"
            description="Create a company first to access corporate archives management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [records, collections, access, digitization, metrics, stats] = await Promise.all([
    CorporateArchivesService.listRecords(organizationId),
    CorporateArchivesService.listCollections(organizationId),
    CorporateArchivesService.listAccess(organizationId),
    CorporateArchivesService.listDigitization(organizationId),
    CorporateArchivesService.getCorporateArchivesMetrics(organizationId),
    CorporateArchivesService.getCorporateArchivesStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Archive className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Corporate Archives</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage corporate records, collections, access requests, and digitization projects.</p>
      </div>

      <CorporateArchivesDashboard
        organizationId={organizationId}
        records={records}
        collections={collections}
        access={access}
        digitization={digitization}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
