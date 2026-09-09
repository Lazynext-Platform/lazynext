import type { Metadata } from 'next';
import { FileImage } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Digital Asset Management — Lazynext',
  description: 'Manage digital assets, collections, versions, and permissions.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DAMService } from '@/lib/services/dam-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { DAMDashboard } from './DAMDashboard';

export const dynamic = 'force-dynamic';

export default async function DAMPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Digital Asset Management</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage digital assets, collections, versions, and permissions.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={FileImage}
            title="No workspace yet"
            description="Create a company first to access digital asset management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [assets, collections, versions, permissions, metrics, stats] = await Promise.all([
    DAMService.listAssets(organizationId),
    DAMService.listCollections(organizationId),
    DAMService.listVersions(organizationId),
    DAMService.listPermissions(organizationId),
    DAMService.getDAMMetrics(organizationId),
    DAMService.getDAMStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <FileImage className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Digital Asset Management</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage digital assets, collections, versions, and permissions.</p>
      </div>

      <DAMDashboard
        organizationId={organizationId}
        assets={assets}
        collections={collections}
        versions={versions}
        permissions={permissions}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
